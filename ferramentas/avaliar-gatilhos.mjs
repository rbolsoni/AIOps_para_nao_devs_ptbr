#!/usr/bin/env node
/**
 * Roda as consultas de evals/gatilhos.json num agente de verdade e mede se cada skill ativa
 * quando deve (e só quando deve). O validador confere só o formato desses arquivos; esta
 * ferramenta confere o comportamento.
 *
 * Como funciona: cria uma pasta de projeto temporária com TODAS as skills do kit instaladas
 * (a skill precisa ganhar das concorrentes, como no uso real), chama a CLI do agente uma vez
 * por consulta e repetição, sem shell (a consulta vai como argumento, sem risco de injeção),
 * e procura na saída a ativação da skill. Critério (references/avaliacao-de-skills.md da
 * skill guardrails-e-avaliacao): consulta positiva passa com taxa de ativação >= 0,5;
 * negativa, com taxa < 0,5.
 *
 * Não roda na esteira: cada chamada consome a cota do agente de quem roda. Use --simular
 * antes para ver quantas chamadas serão feitas.
 *
 * Uso:
 *   node ferramentas/avaliar-gatilhos.mjs --simular
 *   node ferramentas/avaliar-gatilhos.mjs --skill segredos-e-credenciais --vezes 3
 *   node ferramentas/avaliar-gatilhos.mjs --json > resultado.json
 *
 * Código de saída: 0 todas as consultas se comportaram como esperado; 1 alguma falhou;
 * 2 erro de uso, CLI ausente ou consulta que não pôde ser avaliada (tempo esgotado, saída
 * inválida) — "não consegui avaliar" nunca vira "passou".
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarSkills } from './lib/skills.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMANDO_PADRAO = ['claude', '-p', '{consulta}', '--output-format', 'stream-json', '--verbose'];

const AJUDA = `Uso: node ferramentas/avaliar-gatilhos.mjs [opções]

Roda as consultas de evals/gatilhos.json num agente de verdade e mede a taxa de ativação de
cada skill. Consome a cota do agente: não roda na esteira. Rode --simular antes.

  --skill <nome>          só esta skill (pode repetir; padrão: todas)
  --vezes <n>             repetições de cada consulta (padrão: 3)
  --max-consultas <n>     só as primeiras n consultas de cada skill (amostra barata)
  --comando '<JSON>'      comando do agente, como lista JSON, com {consulta} no lugar da
                          consulta (padrão: ${JSON.stringify(COMANDO_PADRAO)})
  --instalar-em <pasta>   onde o agente procura skills no projeto (padrão: .claude/skills)
  --padrao '<regex>'      detecção alternativa (outros agentes): expressão procurada na saída
                          bruta; {skill} vira o nome da skill
  --tempo-limite <seg>    por chamada (padrão: 180)
  --pasta <skills>        pasta de skills (padrão: skills/ deste repositório)
  --simular               mostra o plano (consultas x vezes) sem chamar o agente
  --json                  saída para automação

A detecção padrão procura, na saída stream-json do Claude Code, a chamada da ferramenta
Skill com o nome da skill. No Windows, um comando instalado como .cmd não roda sem shell:
passe o executável (.exe) ou o Node com o script da CLI em --comando.

Código de saída: 0 tudo como esperado; 1 alguma consulta falhou; 2 erro de uso, CLI
ausente ou consulta não avaliada.`;

class ErroDeUso extends Error {}

function lerOpcoes(argv) {
  const opcoes = {
    skills: [],
    vezes: 3,
    maxConsultas: Infinity,
    comando: COMANDO_PADRAO,
    instalarEm: '.claude/skills',
    padrao: null,
    tempoLimite: 180,
    pasta: path.join(RAIZ, 'skills'),
    simular: false,
    json: false,
    ajuda: false,
  };
  const valor = (i, nome) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new ErroDeUso(`${nome} exige um valor`);
    return v;
  };
  const inteiro = (texto, nome) => {
    const n = Number(texto);
    if (!Number.isInteger(n) || n < 1) throw new ErroDeUso(`${nome} exige um número inteiro maior que zero`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opcoes.ajuda = true;
    else if (a === '--simular') opcoes.simular = true;
    else if (a === '--json') opcoes.json = true;
    else if (a === '--skill') opcoes.skills.push(valor(i++, a));
    else if (a === '--vezes') opcoes.vezes = inteiro(valor(i++, a), a);
    else if (a === '--max-consultas') opcoes.maxConsultas = inteiro(valor(i++, a), a);
    else if (a === '--tempo-limite') opcoes.tempoLimite = inteiro(valor(i++, a), a);
    else if (a === '--instalar-em') opcoes.instalarEm = valor(i++, a);
    else if (a === '--pasta') opcoes.pasta = path.resolve(valor(i++, a));
    else if (a === '--padrao') opcoes.padrao = valor(i++, a);
    else if (a === '--comando') {
      let lista;
      try {
        lista = JSON.parse(valor(i++, a));
      } catch {
        throw new ErroDeUso('--comando espera uma lista JSON, ex.: \'["claude","-p","{consulta}"]\'');
      }
      if (!Array.isArray(lista) || lista.length === 0 || !lista.every((x) => typeof x === 'string')) {
        throw new ErroDeUso('--comando espera uma lista JSON de textos');
      }
      if (!lista.some((x) => x.includes('{consulta}'))) throw new ErroDeUso('--comando precisa conter {consulta}');
      opcoes.comando = lista;
    } else throw new ErroDeUso(`opção desconhecida: ${a}`);
  }
  if (path.isAbsolute(opcoes.instalarEm) || opcoes.instalarEm.split(/[\\/]/).includes('..')) {
    throw new ErroDeUso('--instalar-em é um caminho relativo dentro do projeto, sem ".."');
  }
  return opcoes;
}

/** Consultas de cada skill escolhida, na ordem do arquivo. */
function montarPlano(opcoes) {
  if (!existsSync(opcoes.pasta)) throw new ErroDeUso(`pasta de skills não encontrada: ${opcoes.pasta}`);
  const todas = carregarSkills(opcoes.pasta).filter((s) => s.frontmatter?.name);
  const nomes = new Set(todas.map((s) => s.frontmatter.name));
  for (const nome of opcoes.skills) if (!nomes.has(nome)) throw new ErroDeUso(`skill inexistente: ${nome}`);
  const escolhidas = opcoes.skills.length ? todas.filter((s) => opcoes.skills.includes(s.frontmatter.name)) : todas;
  const plano = escolhidas.map((s) => {
    const arquivo = path.join(s.dir, 'evals', 'gatilhos.json');
    let consultas;
    try {
      consultas = JSON.parse(readFileSync(arquivo, 'utf8'));
    } catch (e) {
      throw new ErroDeUso(`${s.frontmatter.name}: não consegui ler evals/gatilhos.json (${e.message})`);
    }
    return { skill: s.frontmatter.name, consultas: consultas.slice(0, opcoes.maxConsultas) };
  });
  return { todas, plano };
}

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Procura, em qualquer ponto de um objeto JSON, a chamada da ferramenta Skill para `nome`. */
function temChamadaDaSkill(no, nome) {
  if (Array.isArray(no)) return no.some((x) => temChamadaDaSkill(x, nome));
  if (no === null || typeof no !== 'object') return false;
  if (no.type === 'tool_use' && no.name === 'Skill' && typeof no.input?.skill === 'string') {
    const chamada = no.input.skill;
    if (chamada === nome || chamada.endsWith(`:${nome}`)) return true;
  }
  return Object.values(no).some((x) => temChamadaDaSkill(x, nome));
}

/** Ativou? true/false, ou null quando a saída não permite dizer (nenhuma linha JSON). */
export function detectarAtivacao(saida, nome, padrao = null) {
  if (padrao) return new RegExp(padrao.replaceAll('{skill}', escaparRegex(nome))).test(saida);
  let linhasJson = 0;
  for (const linha of saida.split(/\r?\n/)) {
    if (!linha.trim().startsWith('{')) continue;
    let objeto;
    try {
      objeto = JSON.parse(linha);
    } catch {
      continue;
    }
    linhasJson++;
    if (temChamadaDaSkill(objeto, nome)) return true;
  }
  return linhasJson > 0 ? false : null;
}

/** Uma chamada ao agente: { resultado: 'ativou' | 'nao-ativou' | 'nao-avaliado', motivo? }. */
function rodarUmaVez(opcoes, projeto, skill, consulta) {
  const [executavel, ...args] = opcoes.comando.map((parte) => parte.replaceAll('{consulta}', consulta));
  const r = spawnSync(executavel, args, {
    cwd: projeto,
    encoding: 'utf8',
    timeout: opcoes.tempoLimite * 1000,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (r.error?.code === 'ENOENT' || r.error?.code === 'EINVAL') {
    throw new ErroDeUso(`não consegui executar "${executavel}" (${r.error.code}). Confira --comando; no Windows, um .cmd não roda sem shell`);
  }
  if (r.error?.code === 'ETIMEDOUT' || r.signal) return { resultado: 'nao-avaliado', motivo: `tempo esgotado (${opcoes.tempoLimite} s)` };
  if (r.error) return { resultado: 'nao-avaliado', motivo: r.error.message };
  const ativou = detectarAtivacao(r.stdout ?? '', skill, opcoes.padrao);
  if (ativou === null) {
    const detalhe = (r.stderr ?? '').trim().split('\n')[0] || `saída ${r.status}`;
    return { resultado: 'nao-avaliado', motivo: `saída sem JSON reconhecível (${detalhe})` };
  }
  return { resultado: ativou ? 'ativou' : 'nao-ativou' };
}

export function avaliar(opcoes) {
  const { todas, plano } = montarPlano(opcoes);
  const chamadas = plano.reduce((n, p) => n + p.consultas.length, 0) * opcoes.vezes;
  if (opcoes.simular) return { simulado: true, chamadas, plano };

  const projeto = mkdtempSync(path.join(tmpdir(), 'gatilhos-'));
  try {
    const destino = path.join(projeto, opcoes.instalarEm);
    mkdirSync(destino, { recursive: true });
    for (const s of todas) cpSync(realpathSync(s.dir), path.join(destino, s.pasta), { recursive: true });

    const skills = plano.map(({ skill, consultas }) => ({
      skill,
      consultas: consultas.map(({ query, should_trigger: esperado }) => {
        const execucoes = [];
        for (let i = 0; i < opcoes.vezes; i++) execucoes.push(rodarUmaVez(opcoes, projeto, skill, query));
        const validas = execucoes.filter((e) => e.resultado !== 'nao-avaliado');
        const ativacoes = validas.filter((e) => e.resultado === 'ativou').length;
        const taxa = validas.length ? ativacoes / validas.length : null;
        const situacao = taxa === null ? 'nao-avaliado' : (esperado ? taxa >= 0.5 : taxa < 0.5) ? 'passou' : 'falhou';
        return { consulta: query, esperado, ativacoes, validas: validas.length, taxa, situacao, motivos: execucoes.filter((e) => e.motivo).map((e) => e.motivo) };
      }),
    }));
    const todasAsConsultas = skills.flatMap((s) => s.consultas);
    const contar = (situacao) => todasAsConsultas.filter((c) => c.situacao === situacao).length;
    return { simulado: false, chamadas, skills, resumo: { consultas: todasAsConsultas.length, passaram: contar('passou'), falharam: contar('falhou'), naoAvaliadas: contar('nao-avaliado') } };
  } finally {
    rmSync(projeto, { recursive: true, force: true });
  }
}

function imprimir(r) {
  if (r.simulado) {
    for (const p of r.plano) console.log(`${p.skill}: ${p.consultas.length} consulta(s)`);
    console.log(`\nTotal: ${r.chamadas} chamada(s) ao agente. Nada foi executado (--simular).`);
    return;
  }
  const marca = { passou: '✓', falhou: '✗', 'nao-avaliado': '?' };
  for (const s of r.skills) {
    console.log(`\n${s.skill}`);
    for (const c of s.consultas) {
      const taxa = c.taxa === null ? '—' : `${c.ativacoes}/${c.validas}`;
      console.log(`  ${marca[c.situacao]} ${c.esperado ? 'deve ativar    ' : 'não deve ativar'} ${taxa.padStart(5)}  ${c.consulta}`);
      for (const m of new Set(c.motivos)) console.log(`      não avaliado: ${m}`);
    }
  }
  const { consultas, passaram, falharam, naoAvaliadas } = r.resumo;
  console.log(`\n${consultas} consulta(s): ${passaram} passaram, ${falharam} falharam, ${naoAvaliadas} não avaliada(s).`);
}

function main() {
  let opcoes;
  try {
    opcoes = lerOpcoes(process.argv.slice(2));
    if (opcoes.ajuda) {
      console.log(AJUDA);
      return;
    }
    const r = avaliar(opcoes);
    if (!r.simulado && !opcoes.json) console.error(`${r.chamadas} chamada(s) ao agente — cada uma consome a cota de quem roda.`);
    if (opcoes.json) console.log(JSON.stringify(r, null, 2));
    else imprimir(r);
    if (r.simulado) return;
    process.exitCode = r.resumo.falharam > 0 ? 1 : r.resumo.naoAvaliadas > 0 ? 2 : 0;
  } catch (e) {
    // Qualquer falha aqui é "não consegui avaliar" (2), nunca "a consulta falhou" (1).
    const detalhe = e instanceof ErroDeUso ? e.message : `erro inesperado: ${e?.stack ?? e}`;
    console.error(`erro: ${detalhe}${opcoes || !(e instanceof ErroDeUso) ? '' : `\n\n${AJUDA}`}`);
    process.exitCode = 2;
  }
}

// Executado direto (inclusive por caminho com link simbólico): compara o caminho real dos dois lados.
function executadoDireto() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (executadoDireto()) main();
