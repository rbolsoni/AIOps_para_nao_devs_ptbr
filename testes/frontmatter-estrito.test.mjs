import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { carregarSkills, lerYamlSimples } from '../ferramentas/lib/skills.mjs';
import { validarSkill } from '../ferramentas/validar-skills.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// O parser do frontmatter precisa ser pelo menos tão rígido quanto um leitor de YAML de verdade
// (ADR 0002): o que ele aceitar e o YAML recusar — ou ler de outro jeito — passaria na CI e não
// carregaria no agente. Os valores esperados abaixo foram conferidos com leitores de YAML
// completos.

/** [caso, frontmatter, dados esperados] */
const VALIDOS = [
  ['valor simples', 'name: x\ndescription: Use sempre.', { name: 'x', description: 'Use sempre.' }],
  ['"#" colado no texto não é comentário', 'description: Use para C# e Java', { description: 'Use para C# e Java' }],
  ['":" sem espaço depois, como numa URL', 'description: veja https://exemplo.com/x', { description: 'veja https://exemplo.com/x' }],
  ['vírgula e colchetes no meio do valor', 'description: a, b [c] {d}', { description: 'a, b [c] {d}' }],
  ['espaços no fim do valor são descartados', 'name: x   ', { name: 'x' }],
  ['aspas duplas com os quatro escapes aceitos', 'description: "a \\"b\\" \\\\ c\\nd\\te"', { description: 'a "b" \\ c\nd\te' }],
  ['escapes lidos da esquerda para a direita', 'description: "\\\\\\"\\\\n"', { description: '\\"\\n' }],
  ['aspas simples com apóstrofo dobrado', "description: 'it''s'", { description: "it's" }],
  ['aspas vazias', 'name: ""', { name: '' }],
  ['espaços depois da aspa de fechamento', 'name: "x"   ', { name: 'x' }],
  ['bloco >- junta as linhas com espaço', 'description: >-\n  Use quando\n  algo.', { description: 'Use quando algo.' }],
  ['bloco > guarda uma quebra no fim', 'description: >\n  a\n  b\nlicense: MIT', { description: 'a b\n', license: 'MIT' }],
  ['no bloco >, cada linha vazia entre linhas vira uma quebra', 'd: >-\n  a\n\n  b\n\n\n  c', { d: 'a\nb\n\nc' }],
  ['bloco |- preserva as quebras e o recuo extra', 'd: |-\n  a\n    b', { d: 'a\n  b' }],
  ['bloco |+ mantém as linhas vazias do fim', 'd: |+\n  a\n\nx: y', { d: 'a\n\n', x: 'y' }],
  ['"#" dentro de bloco é texto', 'd: >-\n  # título\n  b', { d: '# título b' }],
  ['bloco seguido de comentário e de outra chave', 'd: >-\n  a\n# comentário\nx: y', { d: 'a', x: 'y' }],
  [
    'comentários e linhas em branco entre as chaves de metadata',
    'metadata:\n  categoria: fundamentos\n\n  # comentário\n  versao: "1.0.0"\nlicense: MIT',
    { metadata: { categoria: 'fundamentos', versao: '1.0.0' }, license: 'MIT' },
  ],
  ['metadata com recuo de 4 espaços', 'metadata:\n    a: "1"\n    b: "2"', { metadata: { a: '1', b: '2' } }],
  ['comentários no topo, mesmo recuados', '# c\n  # c2\nname: x', { name: 'x' }],
];

/** [caso, frontmatter, trecho esperado na mensagem de erro] */
const INVALIDOS = [
  [
    'caso reproduzido: ": " num valor sem aspas (o YAML lê como outra chave)',
    'name: x\ndescription: Use quando: o usuário pedir algo.',
    'linha 2: o valor de "description" tem ": " no meio',
  ],
  ['valor sem aspas terminando em ":"', 'description: Use quando:', 'linha 1: o valor de "description" termina em ":"'],
  ['" #" num valor sem aspas (o YAML descarta o resto como comentário)', 'description: Use quando #1 falhar', 'tem " #", que o YAML lê como início de comentário'],
  ['tabulação num valor sem aspas', 'description: Use\tsempre', 'tem tabulação; use aspas ou bloco `>-`'],
  ['tabulação na indentação', 'metadata:\n\tversao: "1.0.0"', 'linha 2: indentação com tabulação'],
  ['tabulação depois de ":"', 'name:\tx', 'tabulação depois de ":"'],
  ['escape não aceito entre aspas duplas', 'description: "a \\u00e7"', 'usa o escape "\\u", que não é aceito'],
  ['aspas duplas internas sem escape', 'description: "a "b" c"', 'aspas duplas internas sem escape'],
  ['comentário depois das aspas', 'metadata:\n  versao: "1.0.0" # atual', 'linha 2: o valor de "metadata.versao" tem conteúdo depois da aspa de fechamento'],
  ['aspas duplas que não fecham', 'description: "abc', 'abre aspas duplas e não as fecha na mesma linha'],
  ['aspa final escapada não fecha o valor', 'description: "abc\\"', 'abre aspas duplas e não as fecha'],
  ['apóstrofo sozinho dentro de aspas simples', "description: 'it's'", "apóstrofo sozinho dentro de aspas simples; escreva ''"],
  ['texto depois de aspas simples', "description: 'a' b", 'conteúdo depois da aspa de fechamento'],
  ['aspas simples que não fecham', "description: 'abc", 'abre aspas simples e não as fecha'],
  ['chave repetida no topo', 'name: a\nname: b', 'linha 2: chave "name" repetida'],
  ['chave repetida em metadata', 'metadata:\n  versao: "1"\n  versao: "2"', 'linha 3: chave "metadata.versao" repetida'],
  ['indicador de indentação em bloco', 'description: >2\n  texto', 'indicador de indentação em bloco (">2") não é suportado'],
  ['comentário no cabeçalho do bloco', 'description: >- # c\n  texto', 'cabeçalho de bloco ">- # c" não é suportado'],
  ['linha do bloco com recuo menor que a primeira', 'description: >-\n    a\n  b', 'linha 3: linha com recuo menor'],
  ['linha do bloco > com recuo maior (o YAML não a junta)', 'description: >-\n  a\n    b', 'linha 3: linha com recuo maior'],
  ['linha só de espaços com espaços sobrando dentro do bloco', 'description: |-\n  a\n     \n  b', 'linha 3: linha só de espaços'],
  ['recuo diferente entre as chaves de metadata', 'metadata:\n  a: "1"\n    b: "2"', 'linha 3: recuo diferente'],
  ['mapa dentro de metadata', 'metadata:\n  outro:\n    sub: x', 'linha 2: "metadata.outro" sem valor'],
  ['bloco dentro de metadata', 'metadata:\n  nota: >-\n    texto', 'bloco `>-` dentro de "metadata" não é suportado'],
  ['chave sem valor', 'name: x\ncompatibility:\nlicense: MIT', 'linha 2: "compatibility" sem valor'],
  ['texto continuado na linha de baixo sem bloco', 'description: Use quando\n  algo', 'linha 2: linha recuada fora de um bloco'],
  ['caractere de controle', `description: a${String.fromCodePoint(0x07)}b`, 'caractere U+0007 não é aceito'],
  ['separador de linha que o YAML 1.1 lê como quebra', `description: a${String.fromCodePoint(0x2028)}b`, 'caractere U+2028 não é aceito'],
  ['retorno de carro solto no meio da linha', 'description: a\rb', 'retorno de carro (U+000D)'],
  ['chave __proto__', '__proto__: x', 'a chave "__proto__" não é aceita'],
  ['item de lista solto', 'name: x\n- item', 'esperado "chave: valor"'],
];

// Primeiro caractere que o YAML lê como sintaxe: aspas e ">"/"|" têm casos próprios acima.
for (const c of ['-', '?', ':', ',', '[', ']', '{', '}', '#', '&', '*', '!', '%', '@', '`']) {
  INVALIDOS.push([`valor sem aspas começando com "${c}"`, `description: ${c}texto`, `começa com "${c}", que o YAML lê como sintaxe`]);
}

describe('frontmatter estrito: aceita o que o YAML lê do mesmo jeito', () => {
  for (const [caso, yaml, esperado] of VALIDOS) {
    it(caso, () => {
      assert.deepEqual(lerYamlSimples(yaml).dados, esperado);
    });
  }

  it('avisa quando um valor sem aspas vira número, booleano ou nulo', () => {
    const { avisos } = lerYamlSimples('name: x\ncompatibility: true\nmetadata:\n  versao: 1.0');
    assert.ok(avisos.some((a) => a.includes('"compatibility: true" sem aspas')));
    assert.ok(avisos.some((a) => a.includes('"metadata.versao: 1.0" sem aspas')));
  });
});

describe('frontmatter estrito: recusa o que o YAML recusaria ou leria diferente', () => {
  for (const [caso, yaml, trecho] of INVALIDOS) {
    it(caso, () => {
      assert.throws(
        () => lerYamlSimples(yaml),
        (e) => {
          assert.match(e.message, /^frontmatter, linha \d+: /);
          assert.ok(e.message.includes(trecho), `esperava "${trecho}" em: ${e.message}`);
          return true;
        },
      );
    });
  }

  it('a mensagem do caso reproduzido diz a linha e como corrigir', () => {
    assert.throws(() => lerYamlSimples('name: x\ndescription: Use quando: o usuário pedir algo.'), {
      message: 'frontmatter, linha 2: o valor de "description" tem ": " no meio, que o YAML lê como outra chave; use aspas ou bloco `>-`',
    });
  });

  it('o validador reprova a skill com o caso reproduzido', () => {
    const dir = path.join(mkdtempSync(path.join(tmpdir(), 'skills-')), 'caso');
    mkdirSync(dir);
    writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: caso\ndescription: Use quando: o usuário pedir algo.\n---\n# Caso\n');
    const [skill] = carregarSkills(path.dirname(dir));
    const { erros } = validarSkill(skill);
    assert.equal(erros.length, 1);
    assert.match(erros[0], /linha 2: o valor de "description" tem ": "/);
  });
});

describe('frontmatter estrito: skills do repositório', () => {
  it('todas continuam válidas com o parser estrito', () => {
    const skills = carregarSkills(path.join(RAIZ, 'skills'));
    assert.ok(skills.length >= 22, `esperava ao menos 22 skills, achei ${skills.length}`);
    for (const s of skills) assert.equal(s.erroFrontmatter, null, `${s.pasta}: ${s.erroFrontmatter}`);
  });
});
