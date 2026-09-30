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

function lerEscalar(bruto) {
  const v = bruto.trim();
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
    return { valor: v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\'), comAspas: true };
  }
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) {
    return { valor: v.slice(1, -1).replace(/''/g, "'"), comAspas: true };
  }
  return { valor: v, comAspas: false };
}

function dobrarBloco(linhas) {
  // Bloco `>`: linhas consecutivas viram uma só, separadas por espaço; linha vazia vira quebra.
  const paragrafos = [];
  let atual = [];
  for (const l of linhas) {
    if (l.trim() === '') {
      if (atual.length) paragrafos.push(atual.join(' '));
      atual = [];
    } else {
      atual.push(l.trim());
    }
  }
  if (atual.length) paragrafos.push(atual.join(' '));
  return paragrafos.join('\n');
}

/**
 * Lê o subconjunto de YAML usado no frontmatter.
 * Devolve { dados, avisos }. Lança erro com o número da linha quando não reconhece a sintaxe.
 */
export function lerYamlSimples(bruto) {
  const linhas = bruto.split(/\r?\n/);
  const dados = {};
  const avisos = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    if (linha.trim() === '' || linha.trimStart().startsWith('#')) {
      i++;
      continue;
    }
    const m = linha.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (!m) throw new Error(`frontmatter, linha ${i + 1}: esperado "chave: valor", encontrado "${linha}"`);
    const chave = m[1];
    const resto = (m[2] ?? '').trim();

    if (/^[>|][+-]?$/.test(resto)) {
      const bloco = [];
      i++;
      while (i < linhas.length && (linhas[i].trim() === '' || /^\s+\S/.test(linhas[i]))) {
        bloco.push(linhas[i]);
        i++;
      }
      while (bloco.length && bloco[bloco.length - 1].trim() === '') bloco.pop();
      const recuo = Math.min(...bloco.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
      const conteudo = bloco.map((l) => l.slice(Number.isFinite(recuo) ? recuo : 0));
      dados[chave] = resto.startsWith('>') ? dobrarBloco(conteudo) : conteudo.join('\n');
      continue;
    }

    if (resto === '') {
      const mapa = {};
      i++;
      while (i < linhas.length && /^\s+\S/.test(linhas[i])) {
        const mm = linhas[i].match(/^\s+([A-Za-z0-9_.-]+):\s*(.*)$/);
        if (!mm) throw new Error(`frontmatter, linha ${i + 1}: esperado "  chave: valor" dentro de "${chave}"`);
        const { valor, comAspas } = lerEscalar(mm[2]);
        if (!comAspas && /^(-?\d+(\.\d+)*|true|false|null|~)$/i.test(valor)) {
          avisos.push(`"${chave}.${mm[1]}: ${valor}" sem aspas não é string em YAML; use "${valor}"`);
        }
        mapa[mm[1]] = valor;
        i++;
      }
      dados[chave] = mapa;
      continue;
    }

    dados[chave] = lerEscalar(resto).valor;
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
