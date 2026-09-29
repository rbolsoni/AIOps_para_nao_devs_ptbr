#!/usr/bin/env node
/**
 * Valida todas as skills contra o padrão Agent Skills (agentskills.io) e contra as
 * regras próprias deste repositório (AGENTS.md).
 *
 * Do padrão:
 *   - SKILL.md com frontmatter; `name` e `description` obrigatórios
 *   - `name`: 1–64 caracteres, [a-z0-9] e hífen, sem hífen no início/fim nem duplo,
 *     e igual ao nome da pasta
 *   - `description`: 1–1024 caracteres; `compatibility`: até 500; `metadata`: mapa de strings
 *   - SKILL.md com no máximo 500 linhas
 *
 * Deste repositório:
 *   - links relativos precisam existir e não podem sair da pasta da skill — cada skill é
 *     instalada sozinha, então um link para outra skill quebraria na máquina do usuário
 *   - evals/evals.json (qualidade da saída) e evals/gatilhos.json (quando deve ou não ativar)
 *   - nenhum caminho absoluto de máquina local (C:\Users\..., /Users/...)
 *
 * Uso:
 *   node ferramentas/validar-skills.mjs            # valida ./skills
 *   node ferramentas/validar-skills.mjs <pasta>    # valida outra pasta de skills
 *   node ferramentas/validar-skills.mjs --json     # saída para automação
 *
 * Código de saída: 0 sem erros, 1 com erros de validação, 2 se a pasta não existir.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarSkills, listarArquivosDaSkill } from './lib/skills.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAMPOS_CONHECIDOS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const NOME_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LINHAS = 500;
const MIN_GATILHOS_POSITIVOS = 3;
const MIN_GATILHOS_NEGATIVOS = 2;

function ajuda() {
  console.log(`Uso: node ferramentas/validar-skills.mjs [pasta-de-skills] [--json]

Valida cada subpasta com SKILL.md contra o padrão Agent Skills e as regras do AGENTS.md.
Sai com 1 se houver erro, 2 se a pasta não existir.`);
}

function semBlocosDeCodigo(texto) {
  return texto.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function verificarLinks(skill, arquivoRel, texto, erros) {
  const base = path.dirname(path.join(skill.dir, arquivoRel));
  const re = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const m of semBlocosDeCodigo(texto).matchAll(re)) {
    const alvo = m[1];
    if (/^(https?:|mailto:|#)/i.test(alvo)) continue;
    let semAncora;
    try {
      semAncora = decodeURI(alvo.split('#')[0]);
    } catch {
      erros.push(`${arquivoRel}: link com codificação inválida "${alvo}"`);
      continue;
    }
    if (!semAncora) continue;
    const resolvido = path.resolve(base, semAncora);
    if (!resolvido.startsWith(skill.dir + path.sep)) {
      erros.push(`${arquivoRel}: o link "${alvo}" sai da pasta da skill; cite outra skill pelo nome, não por caminho`);
    } else if (!existsSync(resolvido)) {
      erros.push(`${arquivoRel}: link quebrado "${alvo}"`);
    }
  }
}

function lerJson(skill, rel, erros) {
  const caminho = path.join(skill.dir, rel);
  if (!existsSync(caminho)) {
    erros.push(`${rel} ausente`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (e) {
    erros.push(`${rel} não é JSON válido: ${e.message}`);
    return null;
  }
}

function validarEvals(skill, nome, erros) {
  const evals = lerJson(skill, 'evals/evals.json', erros);
  if (evals) {
    if (evals.skill_name !== nome) erros.push(`evals/evals.json: "skill_name" deve ser "${nome}"`);
    if (!Array.isArray(evals.evals) || evals.evals.length === 0) {
      erros.push('evals/evals.json: "evals" precisa ser uma lista com ao menos um caso');
    } else {
      evals.evals.forEach((c, i) => {
        for (const campo of ['prompt', 'expected_output']) {
          if (typeof c[campo] !== 'string' || !c[campo].trim()) erros.push(`evals/evals.json: caso ${i + 1} sem "${campo}"`);
        }
        if (c.assertions !== undefined && (!Array.isArray(c.assertions) || c.assertions.some((a) => typeof a !== 'string'))) {
          erros.push(`evals/evals.json: caso ${i + 1} com "assertions" que não é lista de textos`);
        }
      });
    }
  }
  const gatilhos = lerJson(skill, 'evals/gatilhos.json', erros);
  if (gatilhos) {
    if (!Array.isArray(gatilhos)) {
      erros.push('evals/gatilhos.json: deve ser uma lista de { "query", "should_trigger" }');
      return;
    }
    const invalidos = gatilhos.filter((g) => typeof g.query !== 'string' || typeof g.should_trigger !== 'boolean');
    if (invalidos.length) erros.push(`evals/gatilhos.json: ${invalidos.length} item(ns) sem "query" (texto) ou "should_trigger" (booleano)`);
    const positivos = gatilhos.filter((g) => g.should_trigger === true).length;
    const negativos = gatilhos.filter((g) => g.should_trigger === false).length;
    if (positivos < MIN_GATILHOS_POSITIVOS) erros.push(`evals/gatilhos.json: ao menos ${MIN_GATILHOS_POSITIVOS} consultas que devem ativar (tem ${positivos})`);
    if (negativos < MIN_GATILHOS_NEGATIVOS) erros.push(`evals/gatilhos.json: ao menos ${MIN_GATILHOS_NEGATIVOS} quase-acertos que NÃO devem ativar (tem ${negativos})`);
  }
}

export function validarSkill(skill) {
  const erros = [];
  const avisos = [...skill.avisosFrontmatter];
  if (skill.erroFrontmatter) {
    erros.push(skill.erroFrontmatter);
    return { erros, avisos };
  }
  const fm = skill.frontmatter;
  for (const campo of Object.keys(fm)) {
    if (!CAMPOS_CONHECIDOS.has(campo)) avisos.push(`campo "${campo}" não faz parte do padrão; use "metadata"`);
  }

  const nome = fm.name;
  if (typeof nome !== 'string' || !nome) erros.push('"name" ausente');
  else {
    if (nome.length > 64) erros.push(`"name" com ${nome.length} caracteres (máximo 64)`);
    if (!NOME_VALIDO.test(nome)) erros.push(`"name" inválido: "${nome}" (use a-z, 0-9 e hífen simples, sem hífen nas pontas)`);
    if (nome !== skill.pasta) erros.push(`"name" ("${nome}") difere do nome da pasta ("${skill.pasta}")`);
  }

  const descricao = fm.description;
  if (typeof descricao !== 'string' || !descricao.trim()) erros.push('"description" ausente ou vazia');
  else {
    if (descricao.length > 1024) erros.push(`"description" com ${descricao.length} caracteres (máximo 1024)`);
    if (!/\buse\b/i.test(descricao)) avisos.push('"description" não diz quando usar; comece por "Use quando…" ou "Use ao…"');
  }

  if (fm.compatibility !== undefined && (typeof fm.compatibility !== 'string' || fm.compatibility.length > 500)) {
    erros.push('"compatibility" deve ser texto de até 500 caracteres');
  }
  if (fm.metadata !== undefined && (typeof fm.metadata !== 'object' || Array.isArray(fm.metadata))) {
    erros.push('"metadata" deve ser um mapa de chave: valor');
  }

  const linhas = skill.texto.split(/\r?\n/).length;
  if (linhas > MAX_LINHAS) erros.push(`SKILL.md com ${linhas} linhas (máximo ${MAX_LINHAS}); mova detalhes para references/`);

  // Modelos em assets/ são copiados para o projeto do usuário: seus links apontam para
  // arquivos de lá (README, LICENSE…), não da skill, e por isso não são conferidos aqui.
  const arquivosMd = ['SKILL.md', ...listarArquivosDaSkill(skill.dir).filter((a) => a.endsWith('.md') && !a.startsWith('assets/'))];
  for (const rel of arquivosMd) {
    const texto = rel === 'SKILL.md' ? skill.texto : readFileSync(path.join(skill.dir, rel), 'utf8');
    verificarLinks(skill, rel, texto, erros);
  }
  for (const rel of ['SKILL.md', ...listarArquivosDaSkill(skill.dir)]) {
    const texto = readFileSync(path.join(skill.dir, rel), 'utf8');
    if (/[A-Za-z]:[\\/]Users[\\/]|(^|[\s"'(])\/Users\/[A-Za-z]/m.test(texto)) {
      erros.push(`${rel}: contém caminho absoluto de máquina local`);
    }
  }

  if (typeof nome === 'string' && nome) validarEvals(skill, nome, erros);
  return { erros, avisos };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return ajuda();
  const json = args.includes('--json');
  const pasta = path.resolve(args.find((a) => !a.startsWith('--')) ?? path.join(RAIZ, 'skills'));
  if (!existsSync(pasta)) {
    console.error(`Pasta de skills não encontrada: ${pasta}`);
    process.exit(2);
  }
  const skills = carregarSkills(pasta);
  const resultados = skills.map((s) => ({ skill: s.pasta, ...validarSkill(s) }));
  const totalErros = resultados.reduce((n, r) => n + r.erros.length, 0);

  if (json) {
    console.log(JSON.stringify({ skills: resultados.length, erros: totalErros, resultados }, null, 2));
  } else {
    for (const r of resultados) {
      const marca = r.erros.length ? '✗' : '✓';
      console.log(`${marca} ${r.skill}`);
      for (const e of r.erros) console.log(`    erro:  ${e}`);
      for (const a of r.avisos) console.log(`    aviso: ${a}`);
    }
    console.log(`\n${resultados.length} skill(s), ${totalErros} erro(s).`);
    if (resultados.length === 0) console.log('Nenhuma skill encontrada: cada skill é uma subpasta com SKILL.md.');
  }
  process.exit(totalErros > 0 || resultados.length === 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
