#!/usr/bin/env node
/**
 * Varre o repositório atrás de segredos escritos em arquivo: chaves de API, tokens,
 * chaves privadas, URLs com senha, credenciais literais e o padrão de "valor padrão" para
 * variável de ambiente sensível (ex.: `process.env.X || '<literal>'`), que embute a
 * credencial no código e ainda a usa em silêncio quando a variável falta.
 *
 * É um complemento sem instalação — não um substituto — para ferramentas dedicadas
 * (gitleaks, varredura de segredos da hospedagem). Não olha o histórico do git: segredo que
 * já foi commitado continua lá mesmo depois de apagado, e exige rotação.
 *
 * Nunca imprime o segredo: só os primeiros caracteres e o tamanho.
 *
 * Lê UTF-8 e UTF-16 com BOM (o ">" do Windows PowerShell 5.1 grava UTF-16). Não varre arquivo
 * acima de 1 MB nem arquivo binário — e lista esses arquivos no resultado, porque "não
 * verifiquei" não pode parecer "verifiquei e está limpo".
 *
 * Uso:
 *   node verificar-segredos.mjs                 # arquivos do git (versionados + novos não ignorados)
 *   node verificar-segredos.mjs caminho/        # outra pasta
 *   node verificar-segredos.mjs --todos         # percorre a pasta sem usar o git
 *   node verificar-segredos.mjs --json          # saída para automação
 *
 * Falso positivo: acrescente na mesma linha o comentário "verificar-segredos: ignorar",
 * com o motivo. Nunca use isso para um segredo real.
 *
 * Código de saída: 0 nada encontrado; 1 achados; 2 uso incorreto ou erro de execução.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AJUDA = `Uso: node verificar-segredos.mjs [pasta] [--todos] [--json]

Procura segredos escritos em arquivos: chaves privadas, tokens de provedores conhecidos
(GitHub, GitLab, npm, AWS, Google, Stripe, Slack, Discord, Telegram, SendGrid, Hugging Face,
Supabase, provedores de LLM), JWT de serviço, URL com senha, credencial literal (inclusive
em JSON) e valor padrão literal para variável de ambiente sensível.
  pasta      onde varrer (padrão: pasta atual)
  --todos    percorre a pasta inteira sem usar o git
  --json     saída em JSON
Arquivos acima de 1 MB e binários não são varridos, e aparecem listados no resultado.
Para aceitar um falso positivo, comente na linha: verificar-segredos: ignorar (motivo)
Código de saída: 0 limpo, 1 achados, 2 uso incorreto ou erro.`;

const MARCA_IGNORAR = 'verificar-segredos: ignorar';
const LIMITE_BYTES = 1024 * 1024;

const EXTENSOES_BINARIAS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.pdf', '.zip', '.gz', '.tgz',
  '.7z', '.rar', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp3', '.mp4', '.webm', '.mov', '.wasm',
  '.exe', '.dll', '.so', '.dylib', '.class', '.jar', '.pyc',
]);
const EXTENSOES_CODIGO = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.vue', '.svelte', '.astro', '.py', '.rb',
  '.php', '.go', '.java', '.kt', '.kts', '.cs', '.rs', '.swift', '.dart', '.sh', '.bash', '.ps1',
]);
const EXTENSOES_CONFIG = new Set(['.yml', '.yaml', '.properties', '.ini', '.toml', '.cfg', '.conf', '.env']);
const LOCKFILES = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|uv\.lock|Cargo\.lock|composer\.lock|Gemfile\.lock|go\.sum|packages\.lock\.json)$/;
// Sem bin/: em Rails e em pacotes Node, bin/ é código (e script com credencial esquecida).
const PASTAS_IGNORADAS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt', '.venv', 'venv',
  '__pycache__', 'target', 'vendor', '.terraform', 'obj',
]);

/** Nome que denuncia credencial. */
const NOME_SENSIVEL = /(SECRET|PASSWORD|PASSWD|SENHA|TOKEN|PRIVATE_?KEY|API_?KEY|ACCESS_?KEY|SERVICE_?ROLE|CREDENTIAL|_KEY$)/i;
/**
 * Nome de configuração pública por construção (vai para o navegador). Acusar esses valores
 * ensinaria a equipe a ignorar o scanner — que é como uma checagem de segurança morre.
 */
const NOME_PUBLICO = /^(NEXT_PUBLIC_|VITE_|PUBLIC_|EXPO_PUBLIC_|REACT_APP_|NUXT_PUBLIC_|GATSBY_)|ANON|PUBLISHABLE|PUBLIC_?KEY/i;
/** Valores que são claramente marcadores, não credenciais. */
const MARCADORES = [
  /exemplo|example|placeholder|changeme|troque|dummy|fake|sample|your[-_]|seu[-_]|sua[-_]|xxx+|<[^>]*>|\*{3,}|\.{3}/i,
  /^\$\{?[A-Za-z_]/,
  /^(test|teste|mock|local|localhost|development|production|staging|password|senha|secret|segredo|postgres|root|admin)$/i,
];
const ehMarcador = (v) => MARCADORES.some((p) => p.test(v));

function entropia(texto) {
  const freq = new Map();
  for (const c of texto) freq.set(c, (freq.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / texto.length;
    h -= p * Math.log2(p);
  }
  return h;
}

const NOME = '([A-Za-z_][A-Za-z0-9_]*)';
const LITERAL = (aspas) => `(${aspas})([^'"\`\\n]{4,})\\2`;

/**
 * Cada regra: id, descrição, padrões e, opcionalmente, `aceita(trecho, match)` para
 * descartar falsos positivos, e `onde` ('codigo' | 'config') para restringir o tipo de arquivo.
 * `segredo(match)` diz qual parte do match é o segredo (para mascarar na saída).
 */
const REGRAS = [
  {
    id: 'chave-privada',
    descricao: 'bloco de chave privada',
    padroes: [/-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g],
  },
  {
    id: 'aws-access-key',
    descricao: 'chave de acesso da AWS',
    padroes: [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
    aceita: (t) => !/EXAMPLE/.test(t),
  },
  {
    id: 'github-token',
    descricao: 'token do GitHub',
    padroes: [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, /\bgithub_pat_[A-Za-z0-9_]{22,}/g],
  },
  {
    id: 'slack-token',
    descricao: 'token do Slack',
    padroes: [/\bxox[baprs]-[A-Za-z0-9-]{10,}/g],
  },
  {
    id: 'stripe-chave-live',
    descricao: 'chave de produção do Stripe',
    padroes: [/\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/g],
  },
  {
    id: 'google-api-key',
    descricao: 'chave de API do Google',
    padroes: [/\bAIza[0-9A-Za-z_-]{35}\b/g],
  },
  {
    id: 'chave-de-llm',
    descricao: 'chave de API de provedor de LLM',
    padroes: [/\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}/g],
    aceita: (t) => entropia(t) >= 3.5,
  },
  {
    id: 'supabase-secret',
    descricao: 'chave secreta do Supabase',
    padroes: [/\bsb_secret_[A-Za-z0-9_-]{12,}/g],
  },
  {
    id: 'gitlab-token',
    descricao: 'token de acesso do GitLab',
    padroes: [/\bglpat-[A-Za-z0-9_-]{20,}/g],
  },
  {
    id: 'npm-token',
    descricao: 'token do npm (publica pacotes em seu nome)',
    padroes: [/\bnpm_[A-Za-z0-9]{36}\b/g],
  },
  {
    id: 'huggingface-token',
    descricao: 'token do Hugging Face',
    padroes: [/\bhf_[A-Za-z0-9]{30,}\b/g],
  },
  {
    id: 'sendgrid-key',
    descricao: 'chave de API do SendGrid',
    padroes: [/\bSG\.[A-Za-z0-9_-]{16,32}\.[A-Za-z0-9_-]{30,64}\b/g],
  },
  {
    id: 'stripe-webhook-secret',
    descricao: 'segredo de assinatura de webhook do Stripe',
    padroes: [/\bwhsec_[A-Za-z0-9+/=]{24,}/g],
  },
  {
    id: 'webhook-de-chat',
    descricao: 'URL de webhook do Slack ou do Discord (quem tem a URL publica no canal)',
    padroes: [
      /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{6,}\/B[A-Z0-9]{6,}\/[A-Za-z0-9]{20,}/g,
      /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d{15,22}\/[A-Za-z0-9_-]{50,}/g,
    ],
  },
  {
    id: 'telegram-bot-token',
    descricao: 'token de bot do Telegram',
    padroes: [/\b\d{6,12}:[A-Za-z0-9_-]{35}(?![A-Za-z0-9_-])/g],
  },
  {
    id: 'jwt-privilegiado',
    descricao: 'JWT com papel de serviço/administração (ignora as regras de acesso)',
    padroes: [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g],
    aceita: (t) => {
      try {
        const payload = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8'));
        return ['service_role', 'admin', 'supabase_admin'].includes(payload.role);
      } catch {
        return false;
      }
    },
  },
  {
    id: 'url-com-senha',
    descricao: 'URL com usuário e senha embutidos',
    padroes: [/\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/'"`]+:([^\s@/'"`]{3,})@([^\s/'"`:]+)/gi],
    segredo: (m) => m[1],
    aceita: (_t, m) =>
      !ehMarcador(m[1]) && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0|db|database|postgres|mysql|redis|host\.docker\.internal)$/i.test(m[2]),
  },
  {
    id: 'valor-padrao-de-credencial',
    descricao: 'variável de ambiente sensível com valor padrão literal — falhe quando faltar, não embuta o valor',
    onde: 'codigo',
    padroes: [
      new RegExp(`process\\.env\\.${NOME}\\s*(?:\\|\\||\\?\\?)\\s*${LITERAL("['\"`]")}`, 'g'),
      new RegExp(`process\\.env\\[['"]${NOME}['"]\\]\\s*(?:\\|\\||\\?\\?)\\s*${LITERAL("['\"`]")}`, 'g'),
      new RegExp(`os\\.(?:getenv|environ\\.get)\\(\\s*['"]${NOME}['"]\\s*,\\s*${LITERAL("['\"]")}`, 'g'),
      new RegExp(`ENV\\.fetch\\(\\s*['"]${NOME}['"]\\s*,\\s*${LITERAL("['\"]")}`, 'g'),
      new RegExp(`ENV\\[['"]${NOME}['"]\\]\\s*\\|\\|\\s*${LITERAL("['\"]")}`, 'g'),
      new RegExp(`getenv\\(\\s*['"]${NOME}['"]\\s*\\)\\s*\\?:\\s*${LITERAL("['\"]")}`, 'g'),
      new RegExp(`GetEnvironmentVariable\\(\\s*"${NOME}"\\s*\\)\\s*\\?\\?\\s*${LITERAL('"')}`, 'g'),
      new RegExp(`getOrDefault\\(\\s*"${NOME}"\\s*,\\s*${LITERAL('"')}`, 'g'),
    ],
    segredo: (m) => m[3],
    aceita: (_t, m) => NOME_SENSIVEL.test(m[1]) && !NOME_PUBLICO.test(m[1]) && !ehMarcador(m[3]),
  },
  {
    id: 'literal-de-credencial',
    descricao: 'valor longo e aleatório atribuído a um nome de credencial',
    padroes: [/\b([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(['"`])([^'"`\s]{20,})\2/g],
    segredo: (m) => m[3],
    aceita: (_t, m) =>
      NOME_SENSIVEL.test(m[1]) && !NOME_PUBLICO.test(m[1]) && !ehMarcador(m[3]) && entropia(m[3]) >= 3.5 && !/^(https?:)?\/\//.test(m[3]),
  },
  {
    id: 'literal-de-credencial',
    descricao: 'valor longo e aleatório atribuído a um nome de credencial',
    onde: 'config',
    padroes: [/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*[:=]\s*([^\s'"#]{20,})\s*$/gm],
    segredo: (m) => m[2],
    aceita: (_t, m) =>
      NOME_SENSIVEL.test(m[1]) && !NOME_PUBLICO.test(m[1]) && !ehMarcador(m[2]) && entropia(m[2]) >= 3.5 && !/^(https?:)?\/\//.test(m[2]),
  },
  {
    // Chave entre aspas: JSON (config de app, appsettings.json, arquivos de configuração de MCP)
    // e objetos em código escritos no mesmo formato.
    id: 'literal-de-credencial',
    descricao: 'valor longo e aleatório atribuído a um nome de credencial',
    onde: ['json', 'codigo', 'config'],
    padroes: [/"([A-Za-z_][A-Za-z0-9_.-]*)"\s*:\s*"([^"\\\s]{20,})"/g],
    segredo: (m) => m[2],
    aceita: (_t, m) =>
      NOME_SENSIVEL.test(m[1]) && !NOME_PUBLICO.test(m[1]) && !ehMarcador(m[2]) && entropia(m[2]) >= 3.5 && !/^(https?:)?\/\//.test(m[2]),
  },
];

function tipoDoArquivo(rel) {
  const base = path.posix.basename(rel);
  const ext = path.posix.extname(rel).toLowerCase();
  if (/^\.env(\..+)?$/.test(base)) return 'config';
  if (EXTENSOES_CODIGO.has(ext)) return 'codigo';
  if (EXTENSOES_CONFIG.has(ext)) return 'config';
  if (ext === '.json' || ext === '.jsonc') return 'json';
  return 'outro';
}

/**
 * Texto do arquivo, ou null se for binário. UTF-16 com BOM (FF FE ou FE FF) é decodificado:
 * sem isso, o byte 0 dos caracteres ASCII faria o arquivo parecer binário e ele nunca seria
 * varrido.
 */
function lerTexto(bruto) {
  if (bruto.length >= 2 && bruto[0] === 0xff && bruto[1] === 0xfe) return bruto.subarray(2).toString('utf16le');
  if (bruto.length >= 2 && bruto[0] === 0xfe && bruto[1] === 0xff) {
    const trocado = Buffer.from(bruto.subarray(2));
    trocado.swap16();
    return trocado.toString('utf16le');
  }
  if (bruto.includes(0)) return null;
  return bruto.toString('utf8');
}

const ehEnvReal = (rel) => /^\.env(\..+)?$/.test(path.posix.basename(rel)) && !/\.(example|sample|template|exemplo|modelo)$/i.test(rel);

function mascarar(valor) {
  const v = String(valor);
  return v.length <= 6 ? `${'*'.repeat(v.length)} (${v.length})` : `${v.slice(0, 4)}… (${v.length} caracteres)`;
}

function listarPeloGit(raiz) {
  const saida = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: raiz,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return [...new Set(saida.split('\0').filter(Boolean))];
}

function listarPercorrendo(raiz) {
  const arquivos = [];
  const visitar = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!PASTAS_IGNORADAS.has(e.name)) visitar(path.join(dir, e.name));
      } else if (e.isFile()) {
        arquivos.push(path.relative(raiz, path.join(dir, e.name)).split(path.sep).join('/'));
      }
    }
  };
  visitar(raiz);
  return arquivos;
}

export function varrer(raiz, { usarGit = true } = {}) {
  const arquivos = usarGit ? listarPeloGit(raiz) : listarPercorrendo(raiz);
  const achados = [];
  const naoVarridos = [];
  let varridos = 0;
  for (const rel of arquivos) {
    if (LOCKFILES.test(rel) || EXTENSOES_BINARIAS.has(path.posix.extname(rel).toLowerCase())) continue;
    const completo = path.join(raiz, rel);
    let info;
    try {
      info = statSync(completo);
    } catch {
      continue; // listado pelo git mas apagado da árvore de trabalho
    }
    if (!info.isFile()) continue;

    if (usarGit && ehEnvReal(rel)) {
      achados.push({ arquivo: rel, linha: 1, regra: 'arquivo-env-versionado', descricao: 'arquivo .env no repositório — deveria estar no .gitignore (e as chaves dele, rotacionadas)', trecho: path.posix.basename(rel) });
    }
    if (info.size > LIMITE_BYTES) {
      naoVarridos.push({ arquivo: rel, motivo: `acima de ${LIMITE_BYTES / (1024 * 1024)} MB` });
      continue;
    }
    const texto = lerTexto(readFileSync(completo));
    if (texto === null) {
      naoVarridos.push({ arquivo: rel, motivo: 'binário' });
      continue;
    }
    varridos++;

    const linhas = texto.split(/\r?\n/);
    const inicioDaLinha = [];
    let pos = 0;
    for (const l of texto.split('\n')) {
      inicioDaLinha.push(pos);
      pos += l.length + 1;
    }
    const linhaDe = (indice) => {
      let lo = 0;
      let hi = inicioDaLinha.length - 1;
      while (lo < hi) {
        const meio = (lo + hi + 1) >> 1;
        if (inicioDaLinha[meio] <= indice) lo = meio;
        else hi = meio - 1;
      }
      return lo + 1;
    };

    const tipo = tipoDoArquivo(rel);
    for (const regra of REGRAS) {
      if (regra.onde && ![].concat(regra.onde).includes(tipo)) continue;
      for (const padrao of regra.padroes) {
        padrao.lastIndex = 0;
        for (const m of texto.matchAll(padrao)) {
          if (regra.aceita && !regra.aceita(m[0], m)) continue;
          const linha = linhaDe(m.index);
          if ((linhas[linha - 1] ?? '').includes(MARCA_IGNORAR)) continue;
          const segredo = regra.segredo ? regra.segredo(m) : m[0];
          achados.push({ arquivo: rel, linha, regra: regra.id, descricao: regra.descricao, trecho: mascarar(segredo) });
        }
      }
    }
  }
  const vistos = new Set();
  const unicos = achados
    .filter((a) => {
      const chave = `${a.arquivo}:${a.linha}:${a.regra}:${a.trecho}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .sort((a, b) => a.arquivo.localeCompare(b.arquivo) || a.linha - b.linha);
  return { arquivosVarridos: varridos, achados: unicos, arquivosNaoVarridos: naoVarridos.sort((a, b) => a.arquivo.localeCompare(b.arquivo)) };
}

/** Uma linha com o que ficou de fora, para "não verifiquei" não passar por "está limpo". */
function resumirNaoVarridos(lista) {
  if (lista.length === 0) return null;
  const nomes = lista.slice(0, 5).map((a) => `${a.arquivo} (${a.motivo})`).join(', ');
  const resto = lista.length > 5 ? ` e mais ${lista.length - 5}` : '';
  return `${lista.length} arquivo(s) não varrido(s): ${nomes}${resto}. Confira-os de outra forma se puderem conter segredo.`;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(AJUDA);
    return;
  }
  const desconhecida = args.find((a) => a.startsWith('--') && !['--json', '--todos'].includes(a));
  if (desconhecida) {
    console.error(`erro: opção desconhecida: ${desconhecida}\n\n${AJUDA}`);
    process.exit(2);
  }
  const json = args.includes('--json');
  const raiz = path.resolve(args.find((a) => !a.startsWith('--')) ?? '.');
  let resultado;
  try {
    resultado = varrer(raiz, { usarGit: !args.includes('--todos') });
  } catch (e) {
    const semGit = /not a git repository|ENOENT/i.test(String(e.stderr ?? e.message));
    console.error(semGit ? `erro: ${raiz} não é um repositório git (ou o git não está instalado). Use --todos para varrer a pasta sem o git.` : `erro: ${e.message}`);
    process.exit(2);
  }
  const avisoNaoVarridos = resumirNaoVarridos(resultado.arquivosNaoVarridos);
  if (json) {
    console.log(JSON.stringify(resultado, null, 2));
  } else if (resultado.achados.length === 0) {
    console.log(`Nenhum segredo encontrado em ${resultado.arquivosVarridos} arquivo(s).`);
    if (avisoNaoVarridos) console.log(avisoNaoVarridos);
  } else {
    for (const a of resultado.achados) console.log(`${a.arquivo}:${a.linha}  [${a.regra}] ${a.descricao} — ${a.trecho}`);
    console.log(`\n${resultado.achados.length} possível(is) segredo(s) em ${resultado.arquivosVarridos} arquivo(s).`);
    if (avisoNaoVarridos) console.log(avisoNaoVarridos);
    console.log('Segredo real: rotacione a credencial primeiro; remover do código não a invalida.');
  }
  process.exit(resultado.achados.length > 0 ? 1 : 0);
}

// Executado (e não importado)? Compare o caminho real dos dois lados: o `npx skills` instala
// a skill por link simbólico (junction no Windows), e o Node resolve o link em
// import.meta.url, mas não em process.argv[1]. A comparação direta faria o script sair com 0
// sem verificar nada. Repetido em cada script de propósito: cada skill é instalada sozinha.
function executadoDireto() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (executadoDireto()) main();
