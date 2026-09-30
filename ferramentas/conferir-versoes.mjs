#!/usr/bin/env node
/**
 * Confere a regra 10 do AGENTS.md: mudança relevante numa skill sobe `metadata.versao`.
 *
 * Compara os commits da branch atual (HEAD) com uma base (padrão: origin/main), a partir do
 * ponto em que as duas se separaram, e olha cada skill com arquivo alterado:
 *   - skill existente alterada: a versão do HEAD precisa ser MAIOR que a da base, comparando
 *     os números (1.10.0 > 1.9.0);
 *   - skill nova (não existe na base): precisa de `metadata.versao` no formato X.Y.Z;
 *   - mudança só em `evals/` ou skill apagada: ignorada — não muda o que o agente lê.
 * Mudanças ainda não commitadas não entram na conta.
 *
 * Uso:
 *   node ferramentas/conferir-versoes.mjs                # base origin/main
 *   node ferramentas/conferir-versoes.mjs --base main    # outra base
 *   node ferramentas/conferir-versoes.mjs --json         # saída para automação
 *
 * Código de saída: 0 ok; 1 skill alterada sem subir a versão; 2 erro de uso ou do git (fora
 * de um repositório, referência inexistente) — "não consegui verificar" nunca vira 0 nem 1.
 */
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compararVersoes, VERSAO_VALIDA } from './lib/regras-do-kit.mjs';
import { lerYamlSimples, separarFrontmatter } from './lib/skills.mjs';

const BASE_PADRAO = 'origin/main';

const AJUDA = `Uso: node ferramentas/conferir-versoes.mjs [--base <ref>] [--json]

Confere se cada skill alterada subiu metadata.versao (regra 10 do AGENTS.md), comparando
os commits do HEAD com a base desde o ponto em que os dois se separaram:
  - skill existente alterada: a versão do HEAD precisa ser maior que a da base;
  - skill nova: precisa de metadata.versao no formato X.Y.Z;
  - mudança só em evals/ ou skill apagada: ignorada.
Mudanças não commitadas não entram na conta.

  --base <ref>  com o que comparar (padrão: ${BASE_PADRAO})
  --json        saída para automação

Código de saída: 0 ok; 1 skill alterada sem subir a versão; 2 erro de uso ou do git
(fora de um repositório, referência inexistente): não foi possível verificar.`;

/** Erro de uso ou do git: o resultado é "não consegui verificar" (saída 2), nunca 0 ou 1. */
export class NaoConsegui extends Error {}

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    if (e.code === 'ENOENT') throw new NaoConsegui('o git não foi encontrado; instale-o ou coloque-o no PATH');
    const detalhe = String(e.stderr ?? '').trim().split('\n')[0] || e.message;
    throw new NaoConsegui(`git ${args.find((a) => !a.startsWith('-'))} falhou: ${detalhe}`);
  }
}

function exigirCommit(raiz, ref, mensagem) {
  try {
    git(raiz, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  } catch {
    throw new NaoConsegui(mensagem);
  }
}

const existeNoCommit = (raiz, ref, caminho) => git(raiz, ['--literal-pathspecs', 'ls-tree', '--name-only', ref, '--', caminho]).trim() !== '';

/** `metadata.versao` da skill no commit `ref`, ou o motivo de não conseguir lê-la. */
function lerVersao(raiz, ref, nome) {
  const partes = separarFrontmatter(git(raiz, ['show', `${ref}:skills/${nome}/SKILL.md`]));
  if (!partes) return { problema: 'SKILL.md sem frontmatter' };
  try {
    const { metadata } = lerYamlSimples(partes.bruto).dados;
    return { versao: metadata !== null && typeof metadata === 'object' ? metadata.versao : undefined };
  } catch (e) {
    return { problema: e.message };
  }
}

const descrever = ({ versao, problema }) => problema ?? (versao === undefined ? 'ausente' : `"${versao}"`);

function avaliar(raiz, base, nome, arquivos) {
  const resultado = (situacao, mensagem, extra = {}) => ({
    skill: nome,
    situacao,
    violacao: ['nao-subiu', 'versao-menor', 'versao-invalida'].includes(situacao),
    versaoBase: null,
    versaoAtual: null,
    arquivos,
    mensagem,
    ...extra,
  });
  if (arquivos.every((a) => a.startsWith(`skills/${nome}/evals/`))) return resultado('so-evals', 'só evals/ mudou; a versão não precisa subir');
  const skillMd = `skills/${nome}/SKILL.md`;
  if (!existeNoCommit(raiz, 'HEAD', skillMd)) return resultado('apagada', 'skill apagada');

  const atual = lerVersao(raiz, 'HEAD', nome);
  const versaoAtual = atual.versao ?? null;
  const atualValida = VERSAO_VALIDA.test(atual.versao ?? '');
  if (!existeNoCommit(raiz, base, skillMd)) {
    return atualValida
      ? resultado('nova', `skill nova, versão ${atual.versao}`, { versaoAtual })
      : resultado('versao-invalida', `skill nova sem metadata.versao válida (${descrever(atual)}); use "1.0.0"`, { versaoAtual });
  }

  const anterior = lerVersao(raiz, base, nome);
  const versoes = { versaoBase: anterior.versao ?? null, versaoAtual };
  if (!atualValida) return resultado('versao-invalida', `metadata.versao inválida no HEAD (${descrever(atual)}); use X.Y.Z`, versoes);
  if (!VERSAO_VALIDA.test(anterior.versao ?? '')) return resultado('subiu', `a base não tinha versão válida; agora ${atual.versao}`, versoes);
  const comparacao = compararVersoes(atual.versao, anterior.versao);
  if (comparacao > 0) return resultado('subiu', `${anterior.versao} → ${atual.versao}`, versoes);
  const entre = `(base ${anterior.versao}, atual ${atual.versao})`;
  return comparacao === 0
    ? resultado('nao-subiu', `metadata.versao não subiu ${entre}`, versoes)
    : resultado('versao-menor', `metadata.versao ficou menor que a da base ${entre}`, versoes);
}

/**
 * Confere as skills alteradas entre `base` e HEAD no repositório que contém `cwd`.
 * Devolve { base, skills: [{ skill, situacao, violacao, versaoBase, versaoAtual, arquivos,
 * mensagem }], violacoes }. Lança NaoConsegui quando não dá para verificar.
 */
export function conferirVersoes({ base = BASE_PADRAO, cwd = process.cwd() } = {}) {
  // Referência começando com "-" seria lida pelo git como opção.
  if (typeof base !== 'string' || base === '' || base.startsWith('-')) throw new NaoConsegui(`referência de base inválida: "${base}"`);
  let raiz;
  try {
    raiz = git(cwd, ['rev-parse', '--show-toplevel']).trim();
  } catch (e) {
    throw new NaoConsegui(`${cwd} não está dentro de um repositório git (${e.message})`);
  }
  exigirCommit(raiz, base, `a base "${base}" não existe neste repositório; confira o nome ou, no CI, faça o checkout com fetch-depth: 0`);
  exigirCommit(raiz, 'HEAD', 'o repositório ainda não tem commits');

  const alterados = git(raiz, ['diff', '--name-only', '-z', '--no-renames', '--no-color', `${base}...HEAD`, '--', 'skills/']).split('\0').filter(Boolean);
  const porSkill = new Map();
  for (const arquivo of alterados) {
    const [pasta, nome, ...resto] = arquivo.split('/');
    if (pasta !== 'skills' || resto.length === 0) continue; // arquivo solto em skills/ não é skill
    porSkill.set(nome, [...(porSkill.get(nome) ?? []), arquivo]);
  }
  const skills = [...porSkill.keys()].sort().map((nome) => avaliar(raiz, base, nome, porSkill.get(nome)));
  return { base, skills, violacoes: skills.filter((s) => s.violacao).length };
}

function imprimir({ base, skills, violacoes }) {
  if (skills.length === 0) {
    console.log(`Nenhuma skill alterada em relação a ${base}.`);
    return;
  }
  console.log(`Skills alteradas em relação a ${base}:`);
  for (const s of skills) {
    const marca = s.violacao ? '✗' : ['so-evals', 'apagada'].includes(s.situacao) ? '-' : '✓';
    console.log(`${marca} ${s.skill}: ${s.mensagem}`);
    if (s.violacao) for (const a of s.arquivos) console.log(`    ${a}`);
  }
  console.log(
    violacoes
      ? `\n${violacoes} skill(s) sem a versão certa. Suba metadata.versao no SKILL.md: correção → patch (1.0.0 → 1.0.1); conteúdo novo → minor (1.0.0 → 1.1.0).`
      : '\nVersões em ordem.',
  );
}

function lerOpcoes(argv) {
  const opcoes = { base: BASE_PADRAO, json: false, ajuda: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opcoes.ajuda = true;
    else if (a === '--json') opcoes.json = true;
    else if (a === '--base') {
      opcoes.base = argv[++i];
      if (opcoes.base === undefined || opcoes.base.startsWith('-')) throw new Error('--base exige uma referência, ex.: --base origin/main');
    } else if (a.startsWith('--base=')) opcoes.base = a.slice('--base='.length);
    else throw new Error(`opção desconhecida: ${a}`);
  }
  return opcoes;
}

function main() {
  let opcoes;
  try {
    opcoes = lerOpcoes(process.argv.slice(2));
  } catch (e) {
    console.error(`erro: ${e.message}\n\n${AJUDA}`);
    process.exitCode = 2;
    return;
  }
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return;
  }
  let resultado;
  try {
    resultado = conferirVersoes({ base: opcoes.base });
  } catch (e) {
    // Qualquer falha aqui é "não consegui verificar" (2), nunca "verifiquei e falhou" (1).
    console.error(`erro: não consegui verificar: ${e.message}`);
    process.exitCode = 2;
    return;
  }
  if (opcoes.json) console.log(JSON.stringify(resultado, null, 2));
  else imprimir(resultado);
  process.exitCode = resultado.violacoes > 0 ? 1 : 0;
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
