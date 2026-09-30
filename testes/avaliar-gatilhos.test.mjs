import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { detectarAtivacao } from '../ferramentas/avaliar-gatilhos.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(RAIZ, 'ferramentas', 'avaliar-gatilhos.mjs');

/**
 * CLI falsa de agente: imprime linhas no formato stream-json e chama a ferramenta Skill
 * quando a consulta contém ATIVAR. Registra cada chamada (consulta e pasta de trabalho) num
 * arquivo, para o teste conferir o que foi executado e onde.
 */
function criarCliFalsa({ demora = 0 } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'cli-falsa-'));
  const registro = path.join(dir, 'chamadas.jsonl');
  const script = path.join(dir, 'agente.mjs');
  writeFileSync(
    script,
    `import { appendFileSync, existsSync } from 'node:fs';
const consulta = process.argv[2];
appendFileSync(${JSON.stringify(registro)}, JSON.stringify({ consulta, cwd: process.cwd(), skillsInstaladas: existsSync('.claude/skills/skill-teste/SKILL.md') }) + '\\n');
if (${demora} > 0) await new Promise((r) => setTimeout(r, ${demora}));
console.log(JSON.stringify({ type: 'system', subtype: 'init' }));
const conteudo = consulta.includes('ATIVAR')
  ? [{ type: 'tool_use', id: 't1', name: 'Skill', input: { skill: 'skill-teste' } }]
  : [{ type: 'text', text: 'respondi sem skill' }];
console.log(JSON.stringify({ type: 'assistant', message: { content: conteudo } }));
console.log(JSON.stringify({ type: 'result', subtype: 'success' }));
`,
  );
  const chamadas = () => (existsSync(registro) ? readFileSync(registro, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
  return { comando: JSON.stringify([process.execPath, script, '{consulta}']), chamadas };
}

/** Pasta de skills temporária com uma skill e as consultas de gatilho dadas. */
function criarSkills(gatilhos) {
  const pasta = mkdtempSync(path.join(tmpdir(), 'skills-gatilhos-'));
  const dir = path.join(pasta, 'skill-teste');
  mkdirSync(path.join(dir, 'evals'), { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: skill-teste\ndescription: Use sempre.\n---\n# Teste\n');
  writeFileSync(path.join(dir, 'evals', 'gatilhos.json'), JSON.stringify(gatilhos));
  return pasta;
}

const rodar = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

describe('avaliar-gatilhos', () => {
  it('detecta a chamada da skill no stream-json, inclusive com prefixo de plugin', () => {
    const linha = (skill) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill } }] } });
    assert.equal(detectarAtivacao(linha('skill-teste'), 'skill-teste'), true);
    assert.equal(detectarAtivacao(linha('kit:skill-teste'), 'skill-teste'), true);
    assert.equal(detectarAtivacao(linha('outra-skill'), 'skill-teste'), false);
    assert.equal(detectarAtivacao('nada de JSON aqui', 'skill-teste'), null, 'sem JSON reconhecível não dá para dizer que não ativou');
    assert.equal(detectarAtivacao('usou a skill skill-teste', 'skill-teste', 'skill {skill}'), true);
  });

  it('consultas que se comportam como o esperado: saída 0, rodando num projeto temporário com as skills instaladas', () => {
    const cli = criarCliFalsa();
    const pasta = criarSkills([
      { query: 'ATIVAR: pedido com "aspas" e espaços; $(sem shell)', should_trigger: true },
      { query: 'pedido parecido que não deve ativar', should_trigger: false },
    ]);
    const r = rodar('--pasta', pasta, '--comando', cli.comando, '--vezes', '2', '--json');
    assert.equal(r.status, 0, r.stderr);
    const resultado = JSON.parse(r.stdout);
    assert.deepEqual(resultado.resumo, { consultas: 2, passaram: 2, falharam: 0, naoAvaliadas: 0 });
    const chamadas = cli.chamadas();
    assert.equal(chamadas.length, 4);
    assert.equal(chamadas[0].consulta, 'ATIVAR: pedido com "aspas" e espaços; $(sem shell)', 'a consulta chega inteira, como um argumento, sem shell');
    assert.ok(chamadas.every((c) => c.skillsInstaladas), 'o agente precisa ver as skills instaladas no projeto');
    assert.ok(chamadas.every((c) => !existsSync(c.cwd)), 'a pasta temporária do projeto precisa ser apagada no fim');
  });

  it('consulta que não ativa quando deveria (ou ativa quando não deveria) falha: saída 1', () => {
    const cli = criarCliFalsa();
    const pasta = criarSkills([
      { query: 'deveria ativar, mas o agente não chama a skill', should_trigger: true },
      { query: 'ATIVAR, mas não deveria', should_trigger: false },
    ]);
    const r = rodar('--pasta', pasta, '--comando', cli.comando, '--vezes', '1');
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stdout, /0 passaram, 2 falharam/);
  });

  it('tempo esgotado vira "não avaliado" (saída 2), nunca "passou" nem "falhou"', () => {
    const cli = criarCliFalsa({ demora: 5000 });
    const pasta = criarSkills([{ query: 'ATIVAR', should_trigger: true }]);
    const r = rodar('--pasta', pasta, '--comando', cli.comando, '--vezes', '1', '--tempo-limite', '1', '--json');
    assert.equal(r.status, 2, r.stderr);
    const [consulta] = JSON.parse(r.stdout).skills[0].consultas;
    assert.equal(consulta.situacao, 'nao-avaliado');
    assert.match(consulta.motivos[0], /tempo esgotado/);
  });

  it('--simular mostra o plano e não chama o agente', () => {
    const cli = criarCliFalsa();
    const pasta = criarSkills([
      { query: 'ATIVAR', should_trigger: true },
      { query: 'não', should_trigger: false },
      { query: 'ATIVAR de novo', should_trigger: true },
    ]);
    const r = rodar('--pasta', pasta, '--comando', cli.comando, '--vezes', '3', '--max-consultas', '2', '--simular');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Total: 6 chamada\(s\)/);
    assert.deepEqual(cli.chamadas(), []);
  });

  it('CLI inexistente, skill inexistente ou opção inválida saem com 2', () => {
    const pasta = criarSkills([{ query: 'ATIVAR', should_trigger: true }]);
    const semCli = rodar('--pasta', pasta, '--comando', JSON.stringify(['comando-que-nao-existe-em-lugar-nenhum', '{consulta}']));
    assert.equal(semCli.status, 2);
    assert.match(semCli.stderr, /não consegui executar/);
    assert.equal(rodar('--pasta', pasta, '--skill', 'nao-existe', '--simular').status, 2);
    assert.equal(rodar('--comando', '["sem-marcador"]').status, 2);
    assert.equal(rodar('--vezes', '0').status, 2);
    assert.equal(rodar('--opcao-inventada').status, 2);
  });

  it('com as skills do kit, --simular soma todas as consultas', () => {
    const r = rodar('--simular', '--json');
    assert.equal(r.status, 0, r.stderr);
    const { chamadas, plano } = JSON.parse(r.stdout);
    assert.ok(plano.length >= 20);
    assert.equal(chamadas, plano.reduce((n, p) => n + p.consultas.length, 0) * 3);
  });
});
