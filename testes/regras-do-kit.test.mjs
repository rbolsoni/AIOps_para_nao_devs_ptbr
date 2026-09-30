import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CATEGORIAS } from '../ferramentas/lib/regras-do-kit.mjs';
import { carregarSkills } from '../ferramentas/lib/skills.mjs';
import { acharInvisiveis, validarSkill } from '../ferramentas/validar-skills.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALIDADOR = path.join(RAIZ, 'ferramentas', 'validar-skills.mjs');

// Orçamento de contexto (ADR 0005). O agente carrega o nome e a descrição de todas as skills
// instaladas em toda sessão, antes de qualquer pedido. No Claude Code, essa lista tem um
// orçamento que escala com 1% da janela de contexto do modelo; quando passa dele, descrições são
// descartadas (a partir das skills menos usadas) e a skill perde as palavras que a fazem ativar.
// O teto é uma catraca: só desce. 8000 cabe cerca de 27 skills com o alvo de 300 caracteres —
// skill nova cabe encurtando outras, nunca subindo o teto para um PR passar.
const TETO_SOMA_DESCRICOES = 8000;

/** Seção "### …" do catálogo do README → `metadata.categoria`. */
const SECOES_DO_CATALOGO = new Map([
  ['Fundamentos', 'fundamentos'],
  ['Projeto e entrega', 'projeto-e-entrega'],
  ['Segurança e conformidade', 'seguranca-e-conformidade'],
  ['Operação', 'operacao'],
  ['Agentes de IA', 'agentes-de-ia'],
]);

const skillsDoRepositorio = () => carregarSkills(path.join(RAIZ, 'skills'));

const frontmatterDoKit = (nome, { categoria = 'fundamentos', versao = '1.0.0', descricao = 'Use quando testar o validador.' } = {}) =>
  `name: ${nome}\ndescription: ${descricao}\nlicense: MIT\nmetadata:\n  categoria: ${categoria}\n  versao: "${versao}"`;

// Fixtures em pasta temporária: uma skill inválida versionada no repositório seria encontrada
// e oferecida pelo `npx skills`.
function criarSkill(base, pasta, { frontmatter, corpo = '# Corpo\n', arquivos = {} }) {
  const dir = path.join(base, pasta);
  mkdirSync(path.join(dir, 'evals'), { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n${corpo}`);
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
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), conteudo);
  }
  return dir;
}

function validarPasta(base, opcoes) {
  return Object.fromEntries(carregarSkills(base).map((s) => [s.pasta, validarSkill(s, opcoes)]));
}

const novaBase = () => mkdtempSync(path.join(tmpdir(), 'skills-kit-'));

describe('regras do kit no validador', () => {
  it('as skills do repositório seguem as regras do kit', () => {
    const skills = skillsDoRepositorio();
    assert.ok(skills.length >= 22, `esperava ao menos 22 skills, achei ${skills.length}`);
    for (const s of skills) {
      const { erros } = validarSkill(s, { kit: true });
      assert.deepEqual(erros, [], `${s.pasta}: ${erros.join('; ')}`);
    }
  });

  it('sem o modo kit, a pasta pode ser de outro projeto; com ele, license, categoria e versão são cobradas', () => {
    const base = novaBase();
    criarSkill(base, 'alheia', { frontmatter: 'name: alheia\ndescription: Use quando testar.\nlicense: Apache-2.0' });
    assert.deepEqual(validarPasta(base).alheia.erros, []);
    const { erros } = validarPasta(base, { kit: true }).alheia;
    assert.ok(erros.includes('"license" deve ser "MIT", não "Apache-2.0"'), erros.join('; '));
    assert.ok(erros.some((e) => e.startsWith('"metadata.categoria" ausente; use uma de: fundamentos, projeto-e-entrega')));
    assert.ok(erros.some((e) => e.startsWith('"metadata.versao" ausente; use X.Y.Z entre aspas')));
  });

  it('license ausente é erro no modo kit', () => {
    const base = novaBase();
    criarSkill(base, 'sem-licenca', { frontmatter: 'name: sem-licenca\ndescription: Use quando testar.\nmetadata:\n  categoria: operacao\n  versao: "1.0.0"' });
    assert.deepEqual(validarPasta(base, { kit: true })['sem-licenca'].erros, ['"license" ausente; use "MIT"']);
  });

  it('aceita só as categorias do catálogo e versão X.Y.Z sem zero à esquerda', () => {
    const casos = [
      ['operacao', '1.10.0', null],
      ['outra', '1.0.0', '"metadata.categoria" inválida ("outra")'],
      ['fundamentos', '1.0', '"metadata.versao" inválida ("1.0")'],
      ['fundamentos', 'v1.0.0', '"metadata.versao" inválida ("v1.0.0")'],
      ['fundamentos', '01.0.0', '"metadata.versao" inválida ("01.0.0")'],
      ['fundamentos', '1.0.0-beta', '"metadata.versao" inválida ("1.0.0-beta")'],
    ];
    for (const [categoria, versao, esperado] of casos) {
      const base = novaBase();
      criarSkill(base, 'caso', { frontmatter: frontmatterDoKit('caso', { categoria, versao }) });
      const { erros } = validarPasta(base, { kit: true }).caso;
      if (esperado === null) assert.deepEqual(erros, [], `${categoria} ${versao}: ${erros.join('; ')}`);
      else assert.ok(erros.some((e) => e.startsWith(esperado)), `${categoria} ${versao}: ${erros.join('; ')}`);
    }
  });

  it('description até 300 passa; acima de 300 é aviso; acima de 360 é erro (só no modo kit)', () => {
    const base = novaBase();
    const com = (nome, tamanho) => criarSkill(base, nome, { frontmatter: frontmatterDoKit(nome, { descricao: `Use ${'x'.repeat(tamanho - 4)}` }) });
    com('no-alvo', 300);
    com('acima-do-alvo', 301);
    com('no-limite', 360);
    com('acima-do-limite', 361);
    const comKit = validarPasta(base, { kit: true });
    assert.deepEqual(comKit['no-alvo'], { erros: [], avisos: [] });
    assert.deepEqual(comKit['acima-do-alvo'].erros, []);
    assert.ok(comKit['acima-do-alvo'].avisos.some((a) => a.startsWith('"description" com 301 caracteres (alvo: até 300)')));
    assert.deepEqual(comKit['no-limite'].erros, []);
    assert.ok(comKit['acima-do-limite'].erros.some((e) => e.startsWith('"description" com 361 caracteres (máximo 360)')));
    const semKit = validarPasta(base);
    assert.deepEqual(semKit['acima-do-limite'].erros, []);
    assert.deepEqual(semKit['acima-do-limite'].avisos, []);
  });
});

describe('caracteres Unicode invisíveis', () => {
  const zwsp = String.fromCodePoint(0x200b);
  const rlo = String.fromCodePoint(0x202e);
  const tagA = String.fromCodePoint(0xe0041);
  const bom = String.fromCodePoint(0xfeff);

  it('detecta cada faixa proibida e deixa passar os vizinhos', () => {
    const proibidos = [0x200b, 0x200f, 0x202a, 0x202e, 0x2060, 0x2064, 0x2066, 0x2069, 0xfeff, 0xe0000, 0xe007f];
    const permitidos = [0x200a, 0x2010, 0x2029, 0x202f, 0x205f, 0x206a, 0xe0080, 0x00a0];
    for (const c of proibidos) {
      assert.equal(acharInvisiveis(`a${String.fromCodePoint(c)}b`).length, 1, `U+${c.toString(16)} deveria ser acusado`);
    }
    for (const c of permitidos) {
      assert.deepEqual(acharInvisiveis(`a${String.fromCodePoint(c)}b`), [], `U+${c.toString(16)} não deveria ser acusado`);
    }
  });

  it('aponta a linha e os códigos, sem repetir, e não conta o BOM do início', () => {
    assert.deepEqual(acharInvisiveis(`${bom}ok\na${zwsp}b${zwsp}c${rlo}\nx${bom}`), [
      { linha: 2, codigos: ['U+200B', 'U+202E'] },
      { linha: 3, codigos: ['U+FEFF'] },
    ]);
  });

  it('recusa em qualquer arquivo da skill, com arquivo:linha e o código', () => {
    const base = novaBase();
    const dir = criarSkill(base, 'invisivel', {
      frontmatter: frontmatterDoKit('invisivel'),
      corpo: `# Título\n\nSiga${zwsp} as regras.\n`,
      arquivos: {
        'references/ref.md': `linha 1\nlinha 2\nfaça${rlo} isto\n`,
        'assets/modelo.md': `texto${tagA}\n`,
      },
    });
    const linhaNoSkill = readFileSync(path.join(dir, 'SKILL.md'), 'utf8').split('\n').findIndex((l) => l.includes(zwsp)) + 1;
    const { erros } = validarPasta(base).invisivel;
    assert.deepEqual(erros.sort(), [
      'assets/modelo.md:1: caractere invisível U+E0041, que pode esconder instruções para o agente; remova',
      'references/ref.md:3: caractere invisível U+202E, que pode esconder instruções para o agente; remova',
      `SKILL.md:${linhaNoSkill}: caractere invisível U+200B, que pode esconder instruções para o agente; remova`,
    ].sort());
  });

  it('BOM no início do arquivo é só aviso; no meio, é erro', () => {
    const base = novaBase();
    criarSkill(base, 'bom', {
      frontmatter: frontmatterDoKit('bom'),
      arquivos: { 'references/com-bom.md': `${bom}# Ref\n`, 'references/bom-no-meio.md': `a\nb${bom}c\n` },
    });
    const { erros, avisos } = validarPasta(base).bom;
    assert.ok(avisos.includes('references/com-bom.md: começa com BOM (U+FEFF); salve em UTF-8 sem BOM'), avisos.join('; '));
    assert.deepEqual(erros, ['references/bom-no-meio.md:2: caractere invisível U+FEFF, que pode esconder instruções para o agente; remova']);
  });

  it('ignora arquivo binário e limita a lista a 10 linhas por arquivo', () => {
    const base = novaBase();
    criarSkill(base, 'muitos', {
      frontmatter: frontmatterDoKit('muitos'),
      arquivos: {
        // Bytes de U+200B depois de um byte nulo: é imagem, não texto que o agente leia.
        'assets/imagem.bin': Buffer.from([0x00, 0xe2, 0x80, 0x8b]),
        'references/muitos.md': Array.from({ length: 15 }, (_, i) => `linha ${i + 1}${zwsp}`).join('\n'),
      },
    });
    const { erros } = validarPasta(base).muitos;
    assert.equal(erros.filter((e) => /^references\/muitos\.md:\d+:/.test(e)).length, 10);
    assert.ok(erros.includes('references/muitos.md: mais 5 linha(s) com caracteres invisíveis'));
    assert.ok(!erros.some((e) => e.startsWith('assets/imagem.bin')));
  });
});

describe('validador na linha de comando', () => {
  const executar = (...args) => spawnSync(process.execPath, [VALIDADOR, ...args], { encoding: 'utf8' });

  it('na pasta skills/ do repositório liga as regras do kit sozinho', () => {
    const r = executar('--json');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const saida = JSON.parse(r.stdout);
    assert.equal(saida.regrasDoKit, true);
    assert.equal(saida.erros, 0);
  });

  it('em outra pasta, as regras do kit só valem com --kit', () => {
    const base = novaBase();
    criarSkill(base, 'alheia', { frontmatter: 'name: alheia\ndescription: Use quando testar.\nlicense: Apache-2.0' });
    assert.equal(executar(base).status, 0);
    const r = executar(base, '--kit');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /"license" deve ser "MIT"/);
  });

  it('opção desconhecida sai com 2 em vez de ser ignorada', () => {
    const r = executar('--kti');
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Opção desconhecida: --kti/);
  });

  it('--help documenta --kit', () => {
    const r = executar('--help');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /--kit/);
  });
});

/** Seções "### …" do "## Catálogo" do README e os nomes das skills linkadas em cada uma. */
function lerCatalogo() {
  const linhas = readFileSync(path.join(RAIZ, 'README.md'), 'utf8').split(/\r?\n/);
  const inicio = linhas.indexOf('## Catálogo');
  assert.ok(inicio >= 0, 'o README não tem a seção "## Catálogo"');
  const secoes = new Map();
  let atual = null;
  for (const linha of linhas.slice(inicio + 1)) {
    if (linha.startsWith('## ')) break;
    const titulo = linha.match(/^### (.+?)\s*$/);
    if (titulo) {
      atual = titulo[1];
      secoes.set(atual, []);
      continue;
    }
    for (const m of linha.matchAll(/\]\(skills\/([^/)]+)\/SKILL\.md\)/g)) {
      assert.ok(atual, `link para "${m[1]}" fora de uma seção "###" do catálogo`);
      secoes.get(atual).push(m[1]);
    }
  }
  return secoes;
}

describe('catálogo do README', () => {
  it('as seções correspondem exatamente às categorias do kit', () => {
    assert.deepEqual([...SECOES_DO_CATALOGO.values()], CATEGORIAS);
    assert.deepEqual([...lerCatalogo().keys()], [...SECOES_DO_CATALOGO.keys()]);
  });

  it('toda skill aparece uma vez, na seção da sua categoria', () => {
    const catalogo = lerCatalogo();
    for (const s of skillsDoRepositorio()) {
      const categoria = s.frontmatter.metadata.categoria;
      const onde = [...catalogo].filter(([, nomes]) => nomes.includes(s.pasta)).map(([titulo]) => titulo);
      const esperada = [...SECOES_DO_CATALOGO].find(([, c]) => c === categoria)?.[0];
      assert.deepEqual(onde, [esperada], `${s.pasta} (${categoria}) está em: ${onde.join(', ') || 'nenhuma seção'}`);
      assert.equal(catalogo.get(esperada).filter((n) => n === s.pasta).length, 1, `${s.pasta} repetida no catálogo`);
    }
  });

  it('todo link do catálogo aponta para uma skill que existe', () => {
    for (const [titulo, nomes] of lerCatalogo()) {
      for (const nome of nomes) {
        assert.ok(existsSync(path.join(RAIZ, 'skills', nome, 'SKILL.md')), `"${titulo}" aponta para skills/${nome}/SKILL.md, que não existe`);
      }
    }
  });
});

describe('orçamento de contexto', () => {
  it(`a soma das descrições das skills não passa de ${TETO_SOMA_DESCRICOES} caracteres`, () => {
    const soma = skillsDoRepositorio().reduce((n, s) => n + s.frontmatter.description.length, 0);
    assert.ok(soma <= TETO_SOMA_DESCRICOES, `soma das descrições: ${soma} caracteres (teto ${TETO_SOMA_DESCRICOES}); encurte descrições em vez de subir o teto`);
  });
});

describe('arquivos de instrução do próprio repositório', () => {
  // AGENTS.md, CLAUDE.md, README, docs/ e .github/ são lidos por agentes que trabalham no kit:
  // valem para eles as mesmas regras que o validador aplica às skills.
  function listar(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const completo = path.join(dir, e.name);
      return e.isDirectory() ? listar(completo) : e.isFile() ? [completo] : [];
    });
  }

  it('não têm caracteres Unicode invisíveis', () => {
    const arquivos = [
      ...readdirSync(RAIZ).filter((n) => n.endsWith('.md')).map((n) => path.join(RAIZ, n)),
      ...listar(path.join(RAIZ, 'docs')),
      ...listar(path.join(RAIZ, '.github')),
    ];
    assert.ok(arquivos.some((a) => a.endsWith('AGENTS.md')));
    for (const arquivo of arquivos) {
      assert.deepEqual(acharInvisiveis(readFileSync(arquivo, 'utf8')), [], path.relative(RAIZ, arquivo));
    }
  });
});
