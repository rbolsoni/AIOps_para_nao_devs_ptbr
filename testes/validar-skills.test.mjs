import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { carregarSkills, lerArquivoDaSkill, lerYamlSimples } from '../ferramentas/lib/skills.mjs';
import { validarSkill } from '../ferramentas/validar-skills.mjs';
import { criarLinkDePasta } from './links.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Fixtures criadas em pasta temporária: uma skill inválida versionada no repositório seria
// encontrada e oferecida pelo `npx skills`.
function criarSkill(base, pasta, { frontmatter, corpo = '# Corpo\n', arquivos = {}, semEvals = false }) {
  const dir = path.join(base, pasta);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n${corpo}`);
  if (!semEvals) {
    mkdirSync(path.join(dir, 'evals'), { recursive: true });
    writeFileSync(path.join(dir, 'evals', 'evals.json'), JSON.stringify({ skill_name: pasta, evals: [{ id: 1, prompt: 'p', expected_output: 'e' }] }));
    writeFileSync(
      path.join(dir, 'evals', 'gatilhos.json'),
      JSON.stringify([
        { query: 'a', should_trigger: true },
        { query: 'b', should_trigger: true },
        { query: 'c', should_trigger: true },
        { query: 'd', should_trigger: false },
        { query: 'e', should_trigger: false },
      ]),
    );
  }
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), conteudo);
  }
  return dir;
}

function validarPasta(base) {
  return Object.fromEntries(carregarSkills(base).map((s) => [s.pasta, validarSkill(s)]));
}

describe('skills do repositório', () => {
  it('todas passam na validação, sem erros', () => {
    const skills = carregarSkills(path.join(RAIZ, 'skills'));
    assert.ok(skills.length >= 20, `esperava ao menos 20 skills, achei ${skills.length}`);
    for (const s of skills) {
      const { erros } = validarSkill(s);
      assert.deepEqual(erros, [], `${s.pasta}: ${erros.join('; ')}`);
    }
  });
});

describe('validador', () => {
  it('aceita uma skill válida com bloco dobrado e metadata', () => {
    const base = mkdtempSync(path.join(tmpdir(), 'skills-'));
    criarSkill(base, 'skill-boa', {
      frontmatter: 'name: skill-boa\ndescription: >-\n  Use quando for testar\n  o validador.\nlicense: MIT\nmetadata:\n  versao: "1.0.0"',
      corpo: '# Boa\n\nVeja [a referência](references/ref.md).\n',
      arquivos: { 'references/ref.md': '# Ref\n' },
    });
    const r = validarPasta(base)['skill-boa'];
    assert.deepEqual(r.erros, []);
  });

  it('recusa nome inválido, nome diferente da pasta e descrição ausente', () => {
    const base = mkdtempSync(path.join(tmpdir(), 'skills-'));
    criarSkill(base, 'pasta-x', { frontmatter: 'name: Nome--Ruim' });
    const { erros } = validarPasta(base)['pasta-x'];
    assert.ok(erros.some((e) => e.includes('"name" inválido')));
    assert.ok(erros.some((e) => e.includes('difere do nome da pasta')));
    assert.ok(erros.some((e) => e.includes('"description" ausente')));
  });

  it('recusa descrição acima de 1024 caracteres', () => {
    const base = mkdtempSync(path.join(tmpdir(), 'skills-'));
    criarSkill(base, 'longa', { frontmatter: `name: longa\ndescription: Use ${'x'.repeat(1030)}` });
    assert.ok(validarPasta(base).longa.erros.some((e) => e.includes('máximo 1024')));
  });

  it('recusa SKILL.md com mais de 500 linhas', () => {
    const base = mkdtempSync(path.join(tmpdir(), 'skills-'));
    criarSkill(base, 'grande', { frontmatter: 'name: grande\ndescription: Use sempre.', corpo: 'linha\n'.repeat(520) });
    assert.ok(validarPasta(base).grande.erros.some((e) => e.includes('máximo 500')));
  });

  it('recusa link quebrado e link que sai da pasta da skill, mas ignora links em código', () => {
    const base = mkdtempSync(path.join(tmpdir(), 'skills-'));
    criarSkill(base, 'links', {
      frontmatter: 'name: links\ndescription: Use sempre.',
      corpo: '[a](references/nao-existe.md) [b](../outra/SKILL.md)\n\n```\n[c](nao/confere.md)\n```\n',
    });
    const { erros } = validarPasta(base).links;
    assert.ok(erros.some((e) => e.includes('link quebrado "references/nao-existe.md"')));
    assert.ok(erros.some((e) => e.includes('sai da pasta da skill')));
    assert.ok(!erros.some((e) => e.includes('nao/confere.md')));
  });

  it('exige evals e gatilhos com positivos e negativos suficientes', () => {
    const base = mkdtempSync(path.join(tmpdir(), 'skills-'));
    criarSkill(base, 'sem-evals', { frontmatter: 'name: sem-evals\ndescription: Use sempre.', semEvals: true });
    const { erros } = validarPasta(base)['sem-evals'];
    assert.ok(erros.some((e) => e.includes('evals/evals.json ausente')));
    assert.ok(erros.some((e) => e.includes('evals/gatilhos.json ausente')));
  });

  it('acusa caminho absoluto de máquina local', () => {
    const base = mkdtempSync(path.join(tmpdir(), 'skills-'));
    criarSkill(base, 'caminho', { frontmatter: 'name: caminho\ndescription: Use sempre.', corpo: 'Rode C:\\Users\\fulano\\script.ps1\n' });
    assert.ok(validarPasta(base).caminho.erros.some((e) => e.includes('caminho absoluto')));
  });

  it('avisa quando metadata tem valor não-string sem aspas', () => {
    const { avisos } = lerYamlSimples('name: x\nmetadata:\n  versao: 1.0');
    assert.ok(avisos.some((a) => a.includes('sem aspas')));
  });

  it('recusa sintaxe de frontmatter não reconhecida em vez de interpretar pela metade', () => {
    assert.throws(() => lerYamlSimples('name: x\n- item solto'), /esperado "chave: valor"/);
  });

  it('chamado por um caminho com link, valida as skills em vez de sair calado', (t) => {
    const link = path.join(mkdtempSync(path.join(tmpdir(), 'link-')), 'ferramentas');
    const motivo = criarLinkDePasta(path.join(RAIZ, 'ferramentas'), link);
    if (motivo) return t.skip(motivo);
    const r = spawnSync(process.execPath, [path.join(link, 'validar-skills.mjs')], { encoding: 'utf8' });
    assert.equal(r.status, 0, `saída ${r.status}; stdout: "${r.stdout}"; stderr: "${r.stderr}"`);
    assert.match(r.stdout.trim().split('\n').at(-1), /^\d+ skill\(s\), 0 erro\(s\)\.$/);
  });
});

describe('leitura segura de arquivos da skill', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'skills-'));
  const dir = criarSkill(base, 'segura', {
    frontmatter: 'name: segura\ndescription: Use sempre.',
    arquivos: { 'references/ok.md': 'conteúdo ok' },
  });
  writeFileSync(path.join(base, 'segredo.txt'), 'fora da skill');

  it('lê arquivo de dentro da skill', () => {
    assert.equal(lerArquivoDaSkill(dir, 'references/ok.md'), 'conteúdo ok');
  });

  it('recusa caminho que sai da pasta, absoluto ou vazio', () => {
    assert.throws(() => lerArquivoDaSkill(dir, '../segredo.txt'), /sai da pasta/);
    assert.throws(() => lerArquivoDaSkill(dir, path.join(base, 'segredo.txt')), /absoluto/);
    assert.throws(() => lerArquivoDaSkill(dir, ''), /caminho relativo/);
  });

  it('recusa arquivo binário', () => {
    writeFileSync(path.join(dir, 'references', 'bin.dat'), Buffer.from([0x50, 0x00, 0x51]));
    assert.throws(() => lerArquivoDaSkill(dir, 'references/bin.dat'), /binário/);
  });
});
