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
 * Portáteis (valem para qualquer pasta de skills):
 *   - links relativos precisam existir e não podem sair da pasta da skill — cada skill é
 *     instalada sozinha, então um link para outra skill quebraria na máquina do usuário
 *   - evals/evals.json (qualidade da saída) e evals/gatilhos.json (quando deve ou não ativar)
 *   - nenhum caminho absoluto de máquina local (C:\Users\..., /Users/...)
 *   - nenhum caractere Unicode invisível em arquivo da skill: servem para esconder, de quem
 *     revisa o texto, instruções dirigidas ao agente
 *
 * Do kit (AGENTS.md), ligadas ao validar a pasta skills/ deste repositório ou com --kit:
 *   - license MIT; metadata.categoria da lista do catálogo; metadata.versao X.Y.Z
 *   - aviso quando a description passa de 360 caracteres (orçamento de contexto)
 *
 * Uso:
 *   node ferramentas/validar-skills.mjs                # valida ./skills, com as regras do kit
 *   node ferramentas/validar-skills.mjs <pasta>        # valida outra pasta de skills
 *   node ferramentas/validar-skills.mjs <pasta> --kit  # outra pasta, com as regras do kit
 *   node ferramentas/validar-skills.mjs --json         # saída para automação
 *
 * Código de saída: 0 sem erros, 1 com erros de validação (ou nenhuma skill), 2 com opção
 * desconhecida ou pasta inexistente.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALVO_DESCRICAO, CATEGORIAS, LIMITE_DESCRICAO, VERSAO_VALIDA } from './lib/regras-do-kit.mjs';
import { carregarSkills, listarArquivosDaSkill } from './lib/skills.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAMPOS_CONHECIDOS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const NOME_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LINHAS = 500;
const MIN_GATILHOS_POSITIVOS = 3;
const MIN_GATILHOS_NEGATIVOS = 2;
const OPCOES = new Set(['--json', '--kit', '--help', '-h']);

// Caracteres que não aparecem na tela e são usados para esconder instruções em arquivos que
// agentes leem: espaço e junção de largura zero e marcas de direção (U+200B–U+200F); controles
// de direção do texto (U+202A–U+202E e U+2066–U+2069), que fazem o texto exibido diferir do
// lido; junção de palavras e operadores invisíveis (U+2060–U+2064); BOM fora do início do
// arquivo (U+FEFF); e caracteres de tag (U+E0000–U+E007F), que carregam texto ASCII inteiro
// sem aparecer.
const FAIXAS_INVISIVEIS = [
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
  [0xe0000, 0xe007f],
];
const MAX_LINHAS_INVISIVEIS = 10;

function ajuda() {
  console.log(`Uso: node ferramentas/validar-skills.mjs [pasta-de-skills] [--kit] [--json]

Valida cada subpasta com SKILL.md contra o padrão Agent Skills e as regras portáteis:
links, evals, caminhos de máquina local e caracteres Unicode invisíveis.

  --kit    aplica também as regras deste kit (AGENTS.md): license MIT, metadata.categoria
           da lista do catálogo, metadata.versao no formato X.Y.Z e description de até
           ${LIMITE_DESCRICAO} caracteres (aviso acima de ${ALVO_DESCRICAO}; ADR 0005). Ligadas sempre que a
           pasta validada é a skills/ deste repositório (o padrão).
  --json   saída para automação

Sai com 0 sem erros, 1 com erros (ou nenhuma skill encontrada), 2 com opção
desconhecida ou pasta inexistente.`);
}

const invisivel = (c) => FAIXAS_INVISIVEIS.some(([de, ate]) => c >= de && c <= ate);
const codigoUnicode = (c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * Linhas com caracteres Unicode invisíveis: [{ linha, codigos }], com os códigos U+XXXX sem
 * repetição. O BOM no início do texto não conta aqui (vira aviso à parte).
 */
export function acharInvisiveis(texto) {
  const achados = [];
  texto.split('\n').forEach((linha, n) => {
    const codigos = new Set();
    let primeiroDoTexto = n === 0;
    for (const ch of linha) {
      const c = ch.codePointAt(0);
      if (invisivel(c) && !(primeiroDoTexto && c === 0xfeff)) codigos.add(codigoUnicode(c));
      primeiroDoTexto = false;
    }
    if (codigos.size) achados.push({ linha: n + 1, codigos: [...codigos] });
  });
  return achados;
}

function verificarInvisiveis(rel, texto, erros, avisos) {
  if (texto.codePointAt(0) === 0xfeff) avisos.push(`${rel}: começa com BOM (U+FEFF); salve em UTF-8 sem BOM`);
  const achados = acharInvisiveis(texto);
  for (const { linha, codigos } of achados.slice(0, MAX_LINHAS_INVISIVEIS)) {
    erros.push(`${rel}:${linha}: caractere invisível ${codigos.join(', ')}, que pode esconder instruções para o agente; remova`);
  }
  if (achados.length > MAX_LINHAS_INVISIVEIS) {
    erros.push(`${rel}: mais ${achados.length - MAX_LINHAS_INVISIVEIS} linha(s) com caracteres invisíveis`);
  }
}

function validarRegrasDoKit(fm, erros, avisos) {
  if (fm.license !== 'MIT') erros.push(fm.license === undefined ? '"license" ausente; use "MIT"' : `"license" deve ser "MIT", não "${fm.license}"`);
  const meta = fm.metadata !== null && typeof fm.metadata === 'object' ? fm.metadata : {};
  if (!CATEGORIAS.includes(meta.categoria)) {
    const problema = meta.categoria === undefined ? 'ausente' : `inválida ("${meta.categoria}")`;
    erros.push(`"metadata.categoria" ${problema}; use uma de: ${CATEGORIAS.join(', ')}`);
  }
  if (!VERSAO_VALIDA.test(meta.versao ?? '')) {
    const problema = meta.versao === undefined ? 'ausente' : `inválida ("${meta.versao}")`;
    erros.push(`"metadata.versao" ${problema}; use X.Y.Z entre aspas, ex.: versao: "1.0.0"`);
  }
  const tamanho = typeof fm.description === 'string' ? fm.description.length : 0;
  const porque = 'o agente a carrega em toda sessão; encurte mantendo o que faz a skill ativar (ADR 0005)';
  if (tamanho > LIMITE_DESCRICAO) {
    erros.push(`"description" com ${tamanho} caracteres (máximo ${LIMITE_DESCRICAO}); ${porque}`);
  } else if (tamanho > ALVO_DESCRICAO) {
    avisos.push(`"description" com ${tamanho} caracteres (alvo: até ${ALVO_DESCRICAO}); ${porque}`);
  }
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

/** Valida uma skill carregada. Com `kit: true`, aplica também as regras deste kit. */
export function validarSkill(skill, { kit = false } = {}) {
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
  if (kit) validarRegrasDoKit(fm, erros, avisos);

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
    const bruto = readFileSync(path.join(skill.dir, rel));
    const texto = bruto.toString('utf8');
    if (/[A-Za-z]:[\\/]Users[\\/]|(^|[\s"'(])\/Users\/[A-Za-z]/m.test(texto)) {
      erros.push(`${rel}: contém caminho absoluto de máquina local`);
    }
    // Arquivo binário (com byte nulo) não é texto que o agente leia.
    if (!bruto.includes(0)) verificarInvisiveis(rel, texto, erros, avisos);
  }

  if (typeof nome === 'string' && nome) validarEvals(skill, nome, erros);
  return { erros, avisos };
}

/** Os dois caminhos levam à mesma pasta? No Windows, sem diferenciar maiúsculas. */
function mesmoCaminho(a, b) {
  const real = (p) => {
    try {
      return realpathSync(p);
    } catch {
      return path.resolve(p);
    }
  };
  const [x, y] = [real(a), real(b)];
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return ajuda();
  // Opção desconhecida é erro: um "--kti" ignorado desligaria as regras do kit em silêncio.
  const desconhecida = args.find((a) => a.startsWith('-') && !OPCOES.has(a));
  const pastas = args.filter((a) => !a.startsWith('-'));
  if (desconhecida || pastas.length > 1) {
    console.error(desconhecida ? `Opção desconhecida: ${desconhecida} (veja --help)` : 'Informe no máximo uma pasta de skills (veja --help)');
    process.exit(2);
  }
  const json = args.includes('--json');
  const padrao = path.join(RAIZ, 'skills');
  const pasta = path.resolve(pastas[0] ?? padrao);
  if (!existsSync(pasta)) {
    console.error(`Pasta de skills não encontrada: ${pasta}`);
    process.exit(2);
  }
  const kit = args.includes('--kit') || mesmoCaminho(pasta, padrao);
  const skills = carregarSkills(pasta);
  const resultados = skills.map((s) => ({ skill: s.pasta, ...validarSkill(s, { kit }) }));
  const totalErros = resultados.reduce((n, r) => n + r.erros.length, 0);
  const totalAvisos = resultados.reduce((n, r) => n + r.avisos.length, 0);

  if (json) {
    console.log(JSON.stringify({ skills: resultados.length, regrasDoKit: kit, erros: totalErros, avisos: totalAvisos, resultados }, null, 2));
  } else {
    for (const r of resultados) {
      const marca = r.erros.length ? '✗' : '✓';
      console.log(`${marca} ${r.skill}`);
      for (const e of r.erros) console.log(`    erro:  ${e}`);
      for (const a of r.avisos) console.log(`    aviso: ${a}`);
    }
    console.log(`\n${resultados.length} skill(s), ${totalErros} erro(s), ${totalAvisos} aviso(s)${kit ? '; regras do kit ligadas' : ''}.`);
    if (resultados.length === 0) console.log('Nenhuma skill encontrada: cada skill é uma subpasta com SKILL.md.');
  }
  process.exit(totalErros > 0 || resultados.length === 0 ? 1 : 0);
}

// Executado (e não importado)? Compare o caminho real dos dois lados: o Node resolve link
// simbólico em import.meta.url, mas não em process.argv[1], e a comparação direta faria o
// validador chamado por um caminho com link sair com 0 sem validar nada.
function executadoDireto() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (executadoDireto()) main();
