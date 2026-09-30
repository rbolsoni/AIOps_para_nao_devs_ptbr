/**
 * Leitura das skills do repositório: frontmatter, corpo e arquivos de cada uma.
 *
 * Compartilhado pelo validador (ferramentas/validar-skills.mjs) e pelo servidor MCP
 * (mcp/servidor.mjs), para que os dois enxerguem exatamente as mesmas skills.
 *
 * O frontmatter é lido por um parser de YAML propositalmente pequeno, sem dependências:
 * aceita apenas o que o padrão Agent Skills usa — `chave: valor`, strings entre aspas,
 * blocos `>`/`|` e um nível de mapa aninhado (`metadata`). Qualquer outra construção é
 * recusada com erro, em vez de ser interpretada pela metade.
 */
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

const LIMITE_LEITURA_BYTES = 512 * 1024;

/** Separa o bloco `---` inicial do corpo Markdown. Devolve null se não houver frontmatter. */
export function separarFrontmatter(texto) {
  const semBom = texto.replace(/^\uFEFF/, '');
  const m = semBom.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!m) return null;
  return { bruto: m[1], corpo: m[2] };
}

// O parser abaixo precisa ser pelo menos tão rígido quanto um leitor de YAML de verdade: o
// que ele aceitar e o YAML recusar (ou ler de outro jeito) passaria na CI e não carregaria no
// agente. Por isso ele recusa, com a linha e uma sugestão, tudo o que tem leitura ambígua.

const DICA_ASPAS = 'use aspas ou bloco `>-`';
/** Primeiro caractere que o YAML lê como sintaxe, e não como texto, num valor sem aspas. */
const INDICADORES = '-?:,[]{}#&*!|>\'"%@`';
/** Valor sem aspas que o YAML lê como número, booleano ou nulo, e não como texto. */
const NAO_TEXTO = /^(-?\d+(\.\d+)*|true|false|null|~)$/i;
const ESCAPES_ACEITOS = new Map([
  ['"', '"'],
  ['\\', '\\'],
  ['n', '\n'],
  ['t', '\t'],
]);

const erroNaLinha = (n, mensagem) => new Error(`frontmatter, linha ${n + 1}: ${mensagem}`);
const recuoDe = (linha) => linha.match(/^ */)[0].length;
// Só o espaço conta como branco: trim() também apagaria espaço rígido (U+00A0) e BOM, que
// para o YAML são texto.
const vazia = (linha) => /^ *$/.test(linha);
/** Linha em branco ou só de comentário (fora de bloco, o YAML ignora as duas). */
const ignoravel = (linha) => /^ *(#|$)/.test(linha);
const codigoUnicode = (c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * Primeiro caractere da linha que o YAML recusa (controle, não-caractere) ou que um leitor de
 * YAML 1.1 lê como quebra de linha (U+0085, U+2028, U+2029); null se não houver. A tabulação
 * é tratada à parte.
 */
function codigoProibido(linha) {
  for (const ch of linha) {
    const c = ch.codePointAt(0);
    if ((c < 0x20 && c !== 0x09) || (c >= 0x7f && c <= 0x9f) || c === 0x2028 || c === 0x2029 || c === 0xfffe || c === 0xffff) return c;
  }
  return null;
}

function verificarChaveNova(mapa, chave, n, nome) {
  if (chave === '__proto__') throw erroNaLinha(n, `a chave "${nome}" não é aceita`);
  if (Object.hasOwn(mapa, chave)) throw erroNaLinha(n, `chave "${nome}" repetida; o YAML recusa chave duplicada`);
}

/** Depois da aspa de fechamento só pode haver espaço. */
function verificarFimDasAspas(resto, aspa, n, nome) {
  if (resto === '') return;
  if (resto.includes(aspa)) {
    throw erroNaLinha(
      n,
      aspa === '"'
        ? `o valor de "${nome}" tem aspas duplas internas sem escape; escreva \\" ou use aspas simples`
        : `o valor de "${nome}" tem apóstrofo sozinho dentro de aspas simples; escreva '' (dois apóstrofos) ou use aspas duplas`,
    );
  }
  throw erroNaLinha(
    n,
    `o valor de "${nome}" tem conteúdo depois da aspa de fechamento (${JSON.stringify(resto)}); comentário na mesma linha não é aceito, mova-o para uma linha própria`,
  );
}

/** Aspas duplas: escapes \" \\ \n \t, lidos da esquerda para a direita numa única passada. */
function lerAspasDuplas(v, n, nome) {
  let valor = '';
  for (let i = 1; i < v.length; i++) {
    const c = v[i];
    if (c === '\\') {
      const seguinte = v[i + 1];
      if (!ESCAPES_ACEITOS.has(seguinte)) {
        throw erroNaLinha(n, `o valor de "${nome}" usa o escape "\\${seguinte ?? ''}", que não é aceito; entre aspas duplas use só \\" \\\\ \\n e \\t`);
      }
      valor += ESCAPES_ACEITOS.get(seguinte);
      i++;
    } else if (c === '"') {
      verificarFimDasAspas(v.slice(i + 1), '"', n, nome);
      return valor;
    } else {
      valor += c;
    }
  }
  throw erroNaLinha(n, `o valor de "${nome}" abre aspas duplas e não as fecha na mesma linha; para texto em várias linhas use bloco \`>-\``);
}

/** Aspas simples: o único escape é '' (apóstrofo). */
function lerAspasSimples(v, n, nome) {
  let valor = '';
  for (let i = 1; i < v.length; i++) {
    if (v[i] !== "'") {
      valor += v[i];
    } else if (v[i + 1] === "'") {
      valor += "'";
      i++;
    } else {
      verificarFimDasAspas(v.slice(i + 1), "'", n, nome);
      return valor;
    }
  }
  throw erroNaLinha(n, `o valor de "${nome}" abre aspas simples e não as fecha na mesma linha; para texto em várias linhas use bloco \`>-\``);
}

/** Motivo pelo qual o YAML leria o valor sem aspas de outro jeito (ou o recusaria), ou null. */
function problemaSemAspas(v) {
  if (v.includes('\t')) return 'tem tabulação';
  if (INDICADORES.includes(v[0])) return `começa com "${v[0]}", que o YAML lê como sintaxe`;
  if (v.includes(': ')) return 'tem ": " no meio, que o YAML lê como outra chave';
  if (v.endsWith(':')) return 'termina em ":", que o YAML lê como outra chave';
  if (v.includes(' #')) return 'tem " #", que o YAML lê como início de comentário';
  return null;
}

function lerEscalar(bruto, n, nome) {
  const v = bruto.replace(/^ +| +$/g, '');
  if (v.startsWith('"')) return { valor: lerAspasDuplas(v, n, nome), comAspas: true };
  if (v.startsWith("'")) return { valor: lerAspasSimples(v, n, nome), comAspas: true };
  const problema = problemaSemAspas(v);
  if (problema) throw erroNaLinha(n, `o valor de "${nome}" ${problema}; ${DICA_ASPAS}`);
  return { valor: v, comAspas: false };
}

/**
 * Bloco `>`, como o YAML: linhas seguidas viram uma só, separadas por espaço; cada linha vazia
 * entre elas vira uma quebra de linha.
 */
function dobrarBloco(linhas) {
  let texto = '';
  let vazias = 0;
  for (const l of linhas) {
    if (l === '') {
      vazias++;
      continue;
    }
    texto += vazias ? '\n'.repeat(vazias) : texto ? ' ' : '';
    texto += l;
    vazias = 0;
  }
  return texto;
}

/** Bloco `>`/`|` que começa na linha n. Devolve o texto e o índice da primeira linha depois dele. */
function lerBloco(linhas, n, chave, cabecalho) {
  const m = cabecalho.match(/^([>|])([+-]?)$/);
  if (!m) {
    if (/^[>|](?:[1-9][+-]?|[+-][1-9])$/.test(cabecalho)) {
      throw erroNaLinha(n, `indicador de indentação em bloco ("${cabecalho}") não é suportado; remova o número e alinhe o texto`);
    }
    throw erroNaLinha(n, `cabeçalho de bloco "${cabecalho}" não é suportado; use \`>-\`, \`>\`, \`|\` ou \`|-\` sozinho na linha`);
  }
  const [, estilo, corte] = m;
  let fim = n + 1;
  while (fim < linhas.length && (vazia(linhas[fim]) || linhas[fim].startsWith(' '))) fim++;
  const bloco = linhas.slice(n + 1, fim);
  const primeira = bloco.find((l) => !vazia(l));
  if (primeira === undefined) return { valor: '', proxima: fim };

  // O recuo do bloco é o da primeira linha com texto; o YAML tira só esse recuo de cada linha.
  const recuo = recuoDe(primeira);
  const texto = bloco.map((l, k) => {
    if (vazia(l)) {
      if (l.length > recuo) {
        throw erroNaLinha(n + 1 + k, `linha só de espaços, com mais espaços que o recuo do bloco de "${chave}": o YAML guarda os que sobram como texto; apague-os`);
      }
      return '';
    }
    const r = recuoDe(l);
    if (r < recuo) throw erroNaLinha(n + 1 + k, `linha com recuo menor que o da primeira linha do bloco de "${chave}"; alinhe o texto`);
    if (estilo === '>' && r > recuo) {
      throw erroNaLinha(n + 1 + k, `linha com recuo maior dentro do bloco \`>\` de "${chave}": o YAML mantém a quebra dessa linha em vez de juntá-la; alinhe o texto`);
    }
    return l.slice(recuo);
  });
  let vaziasNoFim = 0;
  while (texto[texto.length - 1] === '') {
    texto.pop();
    vaziasNoFim++;
  }
  let valor = estilo === '>' ? dobrarBloco(texto) : texto.join('\n');
  // Indicador de corte: sem nada, fica uma quebra no fim; "-" tira; "+" mantém as linhas vazias.
  if (corte === '') valor += '\n';
  else if (corte === '+') valor += '\n'.repeat(1 + vaziasNoFim);
  return { valor, proxima: fim };
}

/** Mapa de um nível (como `metadata`) que começa na linha n, com valores de uma linha. */
function lerMapa(linhas, n, chave, avisos) {
  const mapa = {};
  let recuo = null;
  let j = n + 1;
  for (;;) {
    // Linhas em branco e comentários entre as chaves são aceitos, como no YAML.
    let k = j;
    while (k < linhas.length && ignoravel(linhas[k])) k++;
    if (k >= linhas.length || !linhas[k].startsWith(' ')) break;
    j = k;
    const linha = linhas[j];
    recuo ??= recuoDe(linha);
    if (recuoDe(linha) !== recuo) throw erroNaLinha(j, `recuo diferente do das outras chaves de "${chave}"; alinhe as chaves`);
    const mm = linha.slice(recuo).match(/^([A-Za-z0-9_.-]+):(?: +(.*))?$/);
    if (!mm) throw erroNaLinha(j, `esperado "  chave: valor" dentro de "${chave}"`);
    const nome = `${chave}.${mm[1]}`;
    verificarChaveNova(mapa, mm[1], j, nome);
    const resto = (mm[2] ?? '').replace(/ +$/, '');
    if (resto === '') {
      throw erroNaLinha(j, `"${nome}" sem valor; dentro de "${chave}" cada chave leva um texto na mesma linha (não há mapa dentro de mapa)`);
    }
    if (/^[>|][0-9+-]*$/.test(resto)) throw erroNaLinha(j, `bloco \`${resto}\` dentro de "${chave}" não é suportado; escreva o valor numa linha, entre aspas`);
    const { valor, comAspas } = lerEscalar(resto, j, nome);
    if (!comAspas && NAO_TEXTO.test(valor)) avisos.push(`"${nome}: ${valor}" sem aspas não é string em YAML; use "${valor}"`);
    mapa[mm[1]] = valor;
    j++;
  }
  if (recuo === null) throw erroNaLinha(n, `"${chave}" sem valor; preencha ou remova a linha`);
  return { mapa, proxima: j };
}

/**
 * Lê o subconjunto de YAML usado no frontmatter.
 * Devolve { dados, avisos }. Lança erro com o número da linha (contada a partir da primeira
 * linha depois do `---`) quando não reconhece a sintaxe ou quando o YAML a leria de outro
 * jeito: valor sem aspas com ": " ou " #", aspas malformadas, chave repetida, tabulação na
 * indentação, indicador de indentação em bloco e mapa dentro de mapa.
 */
export function lerYamlSimples(bruto) {
  const linhas = bruto.split(/\r?\n/);
  const dados = {};
  const avisos = [];
  linhas.forEach((linha, n) => {
    const proibido = codigoProibido(linha);
    if (proibido === 0x0d) throw erroNaLinha(n, 'retorno de carro (U+000D) solto no meio da linha, que o YAML lê como quebra de linha; salve com quebras LF');
    if (proibido !== null) {
      throw erroNaLinha(n, `caractere ${codigoUnicode(proibido)} não é aceito: é de controle ou vira quebra de linha em alguns leitores de YAML; remova`);
    }
    if (/^ *\t/.test(linha)) throw erroNaLinha(n, 'indentação com tabulação; use espaços');
  });
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    if (ignoravel(linha)) {
      i++;
      continue;
    }
    if (linha.startsWith(' ')) throw erroNaLinha(i, 'linha recuada fora de um bloco ou de "metadata"; para texto em várias linhas use bloco `>-`');
    if (/^[A-Za-z0-9_-]+:\t/.test(linha)) throw erroNaLinha(i, 'tabulação depois de ":"; use espaço');
    const m = linha.match(/^([A-Za-z0-9_-]+):(?: +(.*))?$/);
    if (!m) throw erroNaLinha(i, `esperado "chave: valor", encontrado "${linha}"`);
    const chave = m[1];
    verificarChaveNova(dados, chave, i, chave);
    const resto = (m[2] ?? '').replace(/ +$/, '');

    if (/^[>|]/.test(resto)) {
      const { valor, proxima } = lerBloco(linhas, i, chave, resto);
      dados[chave] = valor;
      i = proxima;
      continue;
    }

    if (resto === '') {
      const { mapa, proxima } = lerMapa(linhas, i, chave, avisos);
      dados[chave] = mapa;
      i = proxima;
      continue;
    }

    const { valor, comAspas } = lerEscalar(resto, i, chave);
    if (!comAspas && NAO_TEXTO.test(valor)) avisos.push(`"${chave}: ${valor}" sem aspas não é string em YAML; use "${valor}"`);
    dados[chave] = valor;
    i++;
  }
  return { dados, avisos };
}

/**
 * Diz se o caminho é uma pasta, seguindo link. O `npx skills` instala cada skill como link
 * (junction no Windows) para uma cópia central, e para link `Dirent.isDirectory()` é falso.
 */
function ehPasta(caminho) {
  try {
    return statSync(caminho).isDirectory();
  } catch {
    return false; // link quebrado ou sem permissão
  }
}

/** Lista as skills (subpastas com SKILL.md, inclusive por link) de um diretório, em ordem alfabética. */
export function carregarSkills(dirSkills) {
  if (!existsSync(dirSkills)) return [];
  return readdirSync(dirSkills)
    .filter((nome) => ehPasta(path.join(dirSkills, nome)) && existsSync(path.join(dirSkills, nome, 'SKILL.md')))
    .map((nome) => carregarSkill(path.join(dirSkills, nome)))
    .sort((a, b) => a.pasta.localeCompare(b.pasta));
}

/**
 * O SKILL.md vai para um cliente externo pelo servidor MCP: se fosse link para fora da pasta
 * da skill, entregaria qualquer arquivo da máquina. Confere antes de ler (a pasta pode ser
 * link; vale o caminho real dela) e devolve o motivo da recusa, ou null.
 */
function problemaNoSkillMd(dir, arquivo) {
  try {
    if (!realpathSync(arquivo).startsWith(realpathSync(dir) + path.sep)) {
      return 'SKILL.md é link para fora da pasta da skill e não foi lido';
    }
    const info = statSync(arquivo);
    if (!info.isFile()) return 'SKILL.md não é um arquivo';
    if (info.size > LIMITE_LEITURA_BYTES) return `SKILL.md maior que ${LIMITE_LEITURA_BYTES / 1024} KB e não foi lido`;
    return null;
  } catch (e) {
    return `SKILL.md não pôde ser lido (${e.code ?? e.message})`;
  }
}

export function carregarSkill(dir) {
  const arquivo = path.join(dir, 'SKILL.md');
  const skill = { pasta: path.basename(dir), dir, arquivo, texto: '', frontmatter: null, corpo: '', erroFrontmatter: null, avisosFrontmatter: [] };
  skill.erroFrontmatter = problemaNoSkillMd(dir, arquivo);
  if (skill.erroFrontmatter) return skill;
  skill.texto = readFileSync(arquivo, 'utf8');
  const partes = separarFrontmatter(skill.texto);
  if (!partes) {
    skill.erroFrontmatter = 'SKILL.md não começa com bloco de frontmatter delimitado por "---"';
    return skill;
  }
  skill.corpo = partes.corpo;
  try {
    const { dados, avisos } = lerYamlSimples(partes.bruto);
    skill.frontmatter = dados;
    skill.avisosFrontmatter = avisos;
  } catch (e) {
    skill.erroFrontmatter = e.message;
  }
  return skill;
}

/** Caminhos relativos (com "/") de todos os arquivos da skill, exceto SKILL.md. */
export function listarArquivosDaSkill(dir) {
  const saida = [];
  const visitar = (atual) => {
    for (const e of readdirSync(atual, { withFileTypes: true })) {
      const completo = path.join(atual, e.name);
      if (e.isDirectory()) visitar(completo);
      else if (e.isFile()) saida.push(path.relative(dir, completo).split(path.sep).join('/'));
    }
  };
  visitar(dir);
  return saida.filter((p) => p !== 'SKILL.md').sort();
}

/**
 * Lê um arquivo de dentro da skill, recusando qualquer caminho que escape da pasta dela
 * (absoluto, `..`, link simbólico), arquivo binário ou acima do limite de tamanho.
 * Usado pelo servidor MCP, que recebe o caminho de um cliente externo.
 */
export function lerArquivoDaSkill(dirSkill, caminhoRelativo) {
  if (typeof caminhoRelativo !== 'string' || caminhoRelativo.trim() === '') {
    throw new Error('informe o caminho relativo do arquivo, ex.: "references/exemplo.md"');
  }
  if (path.isAbsolute(caminhoRelativo) || /^[A-Za-z]:/.test(caminhoRelativo)) {
    throw new Error('caminho absoluto não é aceito; use um caminho relativo à pasta da skill');
  }
  const raiz = realpathSync(dirSkill);
  const alvo = path.resolve(raiz, caminhoRelativo);
  if (alvo !== raiz && !alvo.startsWith(raiz + path.sep)) {
    throw new Error('o caminho sai da pasta da skill e foi recusado');
  }
  if (!existsSync(alvo)) throw new Error(`arquivo não encontrado: ${caminhoRelativo}`);
  const info = lstatSync(alvo);
  if (info.isSymbolicLink()) throw new Error('links simbólicos não são lidos');
  // Pasta intermediária pode ser link simbólico para fora da skill; o caminho real decide.
  const real = realpathSync(alvo);
  if (!real.startsWith(raiz + path.sep)) throw new Error('o caminho sai da pasta da skill e foi recusado');
  if (!info.isFile()) throw new Error(`não é um arquivo: ${caminhoRelativo}`);
  if (info.size > LIMITE_LEITURA_BYTES) throw new Error(`arquivo maior que ${LIMITE_LEITURA_BYTES / 1024} KB`);
  const conteudo = readFileSync(alvo);
  if (conteudo.includes(0)) throw new Error('arquivo binário não é lido por esta ferramenta');
  return conteudo.toString('utf8');
}
