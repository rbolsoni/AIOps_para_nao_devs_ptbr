#!/usr/bin/env node
/**
 * Diagnóstico de um projeto: confere, sem alterar nada, as proteções básicas e diz o que
 * falta, apontando a skill que resolve cada achado.
 *
 * Confere: arquivo de segredo versionado; .gitignore sem proteção para o .env; variável com
 * prefixo público (vai para o navegador ou para o app) e nome de segredo; tabela sem Row
 * Level Security nas migrações de projeto com Supabase; Dockerfile que copia o .env para a
 * imagem; esteira de CI; testes; arquivo de trava das dependências; atualização automática
 * de dependências; regras para o agente e bloqueio de leitura do .env pelo agente; README
 * e .env.example.
 *
 * Nunca imprime conteúdo de arquivo: só nomes de arquivo e de variável.
 *
 * Uso:
 *   node diagnosticar-projeto.mjs              # pasta atual
 *   node diagnosticar-projeto.mjs caminho/do/projeto --json
 *
 * Requer Node.js 20+. Sem dependências. Usa o git, se houver, para saber o que é versionado.
 * Código de saída: 0 sem erros (avisos não mudam a saída); 1 com pelo menos um erro; 2 uso
 * incorreto ou pasta inexistente.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AJUDA = `Uso: node diagnosticar-projeto.mjs [pasta] [--json]

Confere, sem alterar nada, as proteções básicas do projeto na pasta (padrão: a atual) e
diz o que falta, com a skill que resolve cada achado.
  --json   saída em JSON (para automação)
Nunca imprime conteúdo de arquivo, só nomes.
Código de saída: 0 sem erros (avisos não mudam a saída), 1 com pelo menos um erro, 2 uso
incorreto ou pasta inexistente.`;

// Pastas que não são código do projeto (dependências, builds, caches).
const PASTAS_IGNORADAS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.output',
  'coverage', 'vendor', '.venv', 'venv', '__pycache__', 'target', '.turbo', '.vercel', '.expo',
  'Pods', '.gradle',
]);
const LIMITE_DE_ARQUIVOS = 20000;
const LIMITE_DE_BYTES = 1024 * 1024;

const ARQUIVO_DE_SEGREDO =
  /(^|\/)(\.env(\.[^/]+)?|[^/]+\.(pem|key|p12|pfx|jks|keystore)|id_(rsa|ecdsa|ed25519)|credentials\.json|service-account[^/]*\.json)$/i;
const ARQUIVO_DE_EXEMPLO = /(^|\/)\.env\.(example|sample|template|dist|exemplo|modelo)$/i;

// Prefixos que o build copia para o navegador ou para o app.
const VARIAVEL_PUBLICA =
  /\b(?:NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|NUXT_PUBLIC_|NUXT_ENV_|GATSBY_|PUBLIC_)[A-Z0-9_]+\b/g;
const NOME_DE_SEGREDO =
  /SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|SENHA|DATABASE|DB_PASS|OPENAI|ANTHROPIC|CLAUDE|GEMINI|GROQ|MISTRAL|DEEPSEEK|PERPLEXITY|REPLICATE|ELEVENLABS|COHERE/;
const PUBLICO_POR_DESIGN =
  /ANON|PUBLISHABLE|PUBLIC_?KEY|SITE_?KEY|MEASUREMENT_ID|DSN|FIREBASE|MAPBOX|POSTHOG|SENTRY|_URL$|_HOST$|_DOMAIN$|PROJECT_ID|APP_ID/;
const NOME_SUSPEITO = /TOKEN|API_?KEY|ACCESS_?KEY|AUTH/;
const EXTENSOES_VARRIDAS = /\.([cm]?[jt]sx?|vue|svelte|astro|json|ya?ml|toml|html?|env|properties|gradle|kts|plist|xml|dart|swift|kt)$|(^|\/)\.env(\.[^/]+)?$/i;

const PASTA_DE_MIGRACOES = /(^|\/)(supabase\/migrations|migrations|db\/migrations|prisma\/migrations)\//i;
const ARQUIVO_DE_TESTE =
  /(^|\/)(__tests__|tests?|spec)\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]+\.py$|_test\.(py|go)$|Tests?\.(java|kt|cs)$|_spec\.rb$/i;

/** Executa o git sem shell; distingue "o git respondeu com erro" de "não há git". */
function git(pasta, argumentos) {
  try {
    const saida = execFileSync('git', argumentos, {
      cwd: pasta,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return { ok: true, saida };
  } catch (e) {
    return { ok: false, semGit: e.code === 'ENOENT', status: e.status };
  }
}

/** Arquivos da pasta, sem dependências nem builds, com "/" como separador. */
function listarArquivos(raiz) {
  const arquivos = [];
  const pendentes = [''];
  while (pendentes.length && arquivos.length < LIMITE_DE_ARQUIVOS) {
    const rel = pendentes.pop();
    let entradas;
    try {
      entradas = readdirSync(path.join(raiz, rel), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entradas) {
      const caminho = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!PASTAS_IGNORADAS.has(e.name)) pendentes.push(caminho);
      } else if (e.isFile()) {
        arquivos.push(caminho);
      }
    }
  }
  return arquivos;
}

function lerTexto(raiz, rel) {
  try {
    const caminho = path.join(raiz, rel);
    if (statSync(caminho).size > LIMITE_DE_BYTES) return null;
    return readFileSync(caminho, 'utf8');
  } catch {
    return null;
  }
}

function lerJson(raiz, rel) {
  const texto = lerTexto(raiz, rel);
  if (texto === null) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function listaCurta(itens, limite = 5) {
  return itens.length <= limite ? itens.join(', ') : `${itens.slice(0, limite).join(', ')} e mais ${itens.length - limite}`;
}

/** SQL sem comentários, para os comentários não contarem como comando. */
function semComentarios(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

function nomeDaTabela(bruto) {
  const partes = bruto.replace(/["\s]/g, '').toLowerCase().split('.');
  return partes.length === 2 ? { esquema: partes[0], nome: partes[1] } : { esquema: 'public', nome: partes[0] };
}

/**
 * Tabelas do esquema public criadas nas migrações e se cada uma ligou RLS. Todas as
 * migrações entram juntas: a tabela pode nascer num arquivo e ganhar RLS em outro.
 */
export function tabelasSemRls(sqls) {
  const IDENT = String.raw`((?:"?\w+"?\s*\.\s*)?"?\w+"?)`;
  const cria = new RegExp(String.raw`\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?` + IDENT, 'gi');
  const liga = new RegExp(String.raw`\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?` + IDENT + String.raw`\s+enable\s+row\s+level\s+security`, 'gi');
  const apaga = new RegExp(String.raw`\bdrop\s+table\s+(?:if\s+exists\s+)?` + IDENT, 'gi');
  const criadas = new Set();
  const comRls = new Set();
  for (const bruto of sqls) {
    const sql = semComentarios(bruto);
    for (const m of sql.matchAll(cria)) {
      const t = nomeDaTabela(m[1]);
      if (t.esquema === 'public') criadas.add(t.nome);
    }
    for (const m of sql.matchAll(liga)) {
      const t = nomeDaTabela(m[1]);
      if (t.esquema === 'public') comRls.add(t.nome);
    }
    for (const m of sql.matchAll(apaga)) {
      const t = nomeDaTabela(m[1]);
      if (t.esquema === 'public') criadas.delete(t.nome);
    }
  }
  return { total: criadas.size, sem: [...criadas].filter((t) => !comRls.has(t)).sort() };
}

/** Variáveis com prefixo público encontradas nos textos, com o primeiro lugar de cada uma. */
export function variaveisPublicas(textos) {
  const achadas = new Map();
  for (const { arquivo, texto } of textos) {
    const linhas = texto.split(/\r?\n/);
    linhas.forEach((linha, i) => {
      for (const m of linha.matchAll(VARIAVEL_PUBLICA)) {
        if (!achadas.has(m[0])) achadas.set(m[0], `${arquivo}:${i + 1}`);
      }
    });
  }
  const graves = [];
  const suspeitas = [];
  for (const [nome, onde] of achadas) {
    if (NOME_DE_SEGREDO.test(nome)) graves.push(`${nome} (${onde})`);
    else if (!PUBLICO_POR_DESIGN.test(nome) && NOME_SUSPEITO.test(nome)) suspeitas.push(`${nome} (${onde})`);
  }
  return { graves: graves.sort(), suspeitas: suspeitas.sort() };
}

export function diagnosticar(pasta) {
  const raiz = path.resolve(pasta);
  if (!existsSync(raiz) || !statSync(raiz).isDirectory()) throw new Error(`pasta inexistente: ${pasta}`);

  const resultados = [];
  const registrar = (id, nivel, mensagem, skill) => resultados.push({ id, nivel, mensagem, skill });
  const existe = (rel) => existsSync(path.join(raiz, rel));
  const algumExiste = (lista) => lista.some(existe);

  // Versionamento: o que o git rastreia define o que já foi publicado.
  const dentro = git(raiz, ['rev-parse', '--is-inside-work-tree']);
  const ehGit = dentro.ok && dentro.saida.trim() === 'true';
  let rastreados = [];
  let arquivos;
  if (ehGit) {
    rastreados = git(raiz, ['ls-files', '-z']).saida.split('\0').filter(Boolean);
    const outros = git(raiz, ['ls-files', '-z', '--others', '--exclude-standard']).saida.split('\0').filter(Boolean);
    arquivos = [...new Set([...rastreados, ...outros])];
    registrar('git', 'ok', 'repositório git', 'fluxo-de-git');
  } else {
    arquivos = listarArquivos(raiz);
    registrar(
      'git',
      'aviso',
      dentro.semGit
        ? 'git não encontrado: as checagens de versionamento não rodaram'
        : 'a pasta não é um repositório git: sem histórico, não há como voltar a uma versão que funcionava',
      'fluxo-de-git',
    );
  }
  const arquivosEnv = ['.env', '.env.local', '.env.development', '.env.production'].filter(existe);

  // Segredo versionado.
  if (ehGit) {
    const versionados = rastreados.filter((f) => ARQUIVO_DE_SEGREDO.test(f) && !ARQUIVO_DE_EXEMPLO.test(f));
    if (versionados.length) {
      registrar(
        'segredo-versionado',
        'erro',
        `arquivo de segredo versionado: ${listaCurta(versionados)}. Tirar do git não invalida a chave: rotacione primeiro`,
        'segredos-e-credenciais',
      );
    } else {
      registrar('segredo-versionado', 'ok', 'nenhum arquivo de segredo versionado', 'segredos-e-credenciais');
    }
  }

  // .gitignore protege o .env?
  let envIgnorado;
  if (ehGit) {
    const r = git(raiz, ['check-ignore', '-q', '--no-index', '.env']);
    envIgnorado = r.ok;
  } else {
    const gi = lerTexto(raiz, '.gitignore') ?? '';
    envIgnorado = gi.split(/\r?\n/).some((l) => /^\s*(\/|\*\*\/)?\.env(\*|\.\*)?\s*$/.test(l) || /^\s*\*\.env\s*$/.test(l));
  }
  if (envIgnorado) registrar('gitignore', 'ok', 'o .gitignore protege o .env', 'segredos-e-credenciais');
  else if (arquivosEnv.includes('.env') && ehGit)
    registrar('gitignore', 'erro', 'o .env existe e o .gitignore não o protege: um "git add ." o publica', 'segredos-e-credenciais');
  else registrar('gitignore', 'aviso', 'o .gitignore não protege o .env', 'segredos-e-credenciais');

  // Variável com prefixo público e nome de segredo.
  const textos = [];
  for (const arquivo of [...new Set([...arquivos, ...arquivosEnv])]) {
    if (!EXTENSOES_VARRIDAS.test(arquivo) || /(^|\/)package-lock\.json$|\.lock$/.test(arquivo)) continue;
    const texto = lerTexto(raiz, arquivo);
    if (texto !== null) textos.push({ arquivo, texto });
  }
  const { graves, suspeitas } = variaveisPublicas(textos);
  if (graves.length) {
    registrar(
      'chave-publica',
      'erro',
      `variável com prefixo público e nome de segredo: ${listaCurta(graves)}. O valor vai para o navegador ou para o app: mova a chamada para o servidor e rotacione a chave`,
      'segredos-e-credenciais',
    );
  }
  if (suspeitas.length) {
    registrar(
      'chave-publica',
      'aviso',
      `confira se é pública por design (e restrita por domínio): ${listaCurta(suspeitas)}`,
      'segredos-e-credenciais',
    );
  }
  if (!graves.length && !suspeitas.length) registrar('chave-publica', 'ok', 'nenhuma variável pública com nome de segredo', 'segredos-e-credenciais');

  // RLS, quando o navegador fala direto com o banco (Supabase).
  const pkg = lerJson(raiz, 'package.json');
  const dependencias = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const usaSupabase = existe('supabase') || Object.keys(dependencias).some((d) => d.startsWith('@supabase/'));
  if (usaSupabase) {
    const sqls = arquivos
      .filter((f) => /\.sql$/i.test(f) && PASTA_DE_MIGRACOES.test(f))
      .map((f) => lerTexto(raiz, f))
      .filter((t) => t !== null);
    if (!sqls.length) {
      registrar(
        'rls',
        'aviso',
        'projeto com Supabase sem migrações versionadas: confira o RLS de cada tabela no painel (Security Advisor)',
        'mudancas-de-banco',
      );
    } else {
      const { total, sem } = tabelasSemRls(sqls);
      if (sem.length) {
        registrar(
          'rls',
          'erro',
          `tabela sem Row Level Security nas migrações: ${listaCurta(sem)}. O navegador fala direto com o banco: sem RLS, qualquer visitante lê e altera a tabela`,
          'mudancas-de-banco',
        );
      } else {
        registrar('rls', 'ok', `as ${total} tabela(s) das migrações ligam RLS`, 'mudancas-de-banco');
      }
    }
  }

  // Dockerfile que copia a pasta inteira leva o .env para a imagem.
  const dockerfiles = arquivos.filter((f) => /(^|\/)Dockerfile[^/]*$/.test(f));
  const copiaTudo = dockerfiles.some((f) => /^\s*(COPY|ADD)\s+(--\S+\s+)*\.\s+\S+/im.test(lerTexto(raiz, f) ?? ''));
  if (copiaTudo) {
    const di = lerTexto(raiz, '.dockerignore') ?? '';
    if (/(^|\n)\s*(\*\*\/)?\.env/.test(di)) registrar('docker', 'ok', 'o .dockerignore deixa o .env fora da imagem', 'segredos-e-credenciais');
    else
      registrar(
        'docker',
        'erro',
        'o Dockerfile copia a pasta inteira e o .dockerignore não exclui o .env: o segredo vai para dentro da imagem',
        'segredos-e-credenciais',
      );
  }

  // Esteira.
  const temEsteira =
    arquivos.some((f) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f)) ||
    algumExiste(['.gitlab-ci.yml', 'azure-pipelines.yml', 'bitbucket-pipelines.yml', '.circleci/config.yml', 'Jenkinsfile']);
  if (temEsteira) registrar('esteira', 'ok', 'há esteira de CI', 'esteira-ci-cd');
  else registrar('esteira', 'aviso', 'sem esteira de CI: nada impede código quebrado de ir para produção', 'esteira-ci-cd');

  // Testes.
  const scriptDeTeste = pkg?.scripts?.test;
  const testeNode = typeof scriptDeTeste === 'string' && !/no test specified/i.test(scriptDeTeste);
  if (testeNode || arquivos.some((f) => ARQUIVO_DE_TESTE.test(f))) registrar('testes', 'ok', 'há testes', 'testes-e-qualidade');
  else registrar('testes', 'aviso', 'nenhum teste encontrado: cada mudança pode quebrar o que funcionava sem ninguém perceber', 'testes-e-qualidade');

  // Trava das dependências.
  const TRAVAS = {
    'package.json': ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'],
    'pyproject.toml': ['uv.lock', 'poetry.lock', 'pdm.lock', 'Pipfile.lock', 'requirements.txt'],
    Pipfile: ['Pipfile.lock'],
    Gemfile: ['Gemfile.lock'],
    'composer.json': ['composer.lock'],
    'Cargo.toml': ['Cargo.lock'],
  };
  // package.json sem dependências (só scripts) não precisa de trava.
  const temDependenciasNode = Object.keys(dependencias).length > 0;
  const manifestos = Object.keys(TRAVAS).filter((m) => existe(m) && (m !== 'package.json' || temDependenciasNode));
  const semTrava = manifestos.filter((m) => !algumExiste(TRAVAS[m]));
  if (semTrava.length) {
    registrar(
      'trava',
      'aviso',
      `sem arquivo de trava das dependências para ${listaCurta(semTrava)}: cada instalação pode trazer versões diferentes`,
      'dependencias-e-licencas',
    );
  } else if (manifestos.length) {
    registrar('trava', 'ok', 'dependências travadas', 'dependencias-e-licencas');
  }

  // Atualização automática de dependências.
  if (manifestos.length || temEsteira) {
    const atualiza = algumExiste([
      '.github/dependabot.yml', '.github/dependabot.yaml', 'renovate.json', 'renovate.json5', '.renovaterc',
      '.renovaterc.json', '.github/renovate.json',
    ]);
    if (atualiza) registrar('atualizacoes', 'ok', 'atualização automática de dependências configurada', 'dependencias-e-licencas');
    else
      registrar('atualizacoes', 'aviso', 'sem atualização automática de dependências (Dependabot ou Renovate): correções de segurança ficam paradas', 'dependencias-e-licencas');
  }

  // Regras para o agente.
  const regras = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.cursorrules', '.cursor/rules', '.github/copilot-instructions.md', '.windsurfrules', 'replit.md'];
  if (algumExiste(regras)) registrar('agente-regras', 'ok', 'há regras para o agente', 'iniciar-projeto');
  else registrar('agente-regras', 'aviso', 'sem AGENTS.md: o agente não recebe as regras do projeto em cada sessão', 'iniciar-projeto');

  // O agente pode ler o .env?
  const usaEnv = arquivosEnv.length > 0 || arquivos.some((f) => /(^|\/)\.env(\.[^/]+)?$/.test(f));
  if (usaEnv) {
    const mencionaEnv = (rel, padrao) => padrao.test(lerTexto(raiz, rel) ?? '');
    const bloqueia =
      mencionaEnv('.claude/settings.json', /"deny"[\s\S]*\.env/) ||
      mencionaEnv('.claude/settings.local.json', /"deny"[\s\S]*\.env/) ||
      ['.cursorignore', '.geminiignore', '.aiexclude', '.aiderignore', '.codeiumignore'].some((f) => mencionaEnv(f, /(^|\n)[^#\n]*\.env/));
    if (bloqueia) registrar('agente-env', 'ok', 'há regra que impede o agente de ler o .env', 'uso-seguro-de-agentes');
    else
      registrar(
        'agente-env',
        'aviso',
        'nenhuma regra impede o agente de ler o .env (ex.: permissions.deny no Claude Code, .cursorignore): o que o agente lê vai para o provedor do modelo',
        'uso-seguro-de-agentes',
      );
  }

  // Documentação mínima.
  if (algumExiste(['README.md', 'README', 'readme.md', 'README.rst'])) registrar('readme', 'ok', 'há README', 'documentacao-viva');
  else registrar('readme', 'aviso', 'sem README: ninguém sabe como rodar nem o que o projeto faz', 'documentacao-viva');
  if (arquivosEnv.length && !algumExiste(['.env.example', '.env.sample', '.env.template'])) {
    registrar('env-exemplo', 'aviso', 'há .env mas não há .env.example: quem clona não sabe quais variáveis configurar', 'segredos-e-credenciais');
  }

  return {
    pasta: raiz,
    resultados,
    resumo: {
      erros: resultados.filter((x) => x.nivel === 'erro').length,
      avisos: resultados.filter((x) => x.nivel === 'aviso').length,
      ok: resultados.filter((x) => x.nivel === 'ok').length,
    },
  };
}

function imprimir(relatorio) {
  const marca = { erro: '✗ erro ', aviso: '! aviso', ok: '✓ ok   ' };
  const ordem = { erro: 0, aviso: 1, ok: 2 };
  console.log(`Diagnóstico de ${relatorio.pasta}\n`);
  for (const x of [...relatorio.resultados].sort((a, b) => ordem[a.nivel] - ordem[b.nivel])) {
    const skill = x.nivel === 'ok' ? '' : `  → skill ${x.skill}`;
    console.log(`${marca[x.nivel]}  ${x.id.padEnd(18)} ${x.mensagem}${skill}`);
  }
  const { erros, avisos, ok } = relatorio.resumo;
  console.log(`\nResumo: ${erros} erro(s), ${avisos} aviso(s), ${ok} ok.`);
}

function lerArgumentos(argv) {
  const opcoes = { json: false, pasta: '.' };
  let pastaDada = false;
  for (const a of argv) {
    if (a === '--help' || a === '-h') return { ajuda: true };
    if (a === '--json') opcoes.json = true;
    else if (a.startsWith('-')) throw new Error(`opção desconhecida: ${a}`);
    else if (pastaDada) throw new Error('informe uma pasta só');
    else {
      opcoes.pasta = a;
      pastaDada = true;
    }
  }
  return opcoes;
}

function main() {
  let opcoes;
  try {
    opcoes = lerArgumentos(process.argv.slice(2));
  } catch (e) {
    console.error(`erro: ${e.message}\n\n${AJUDA}`);
    process.exitCode = 2;
    return;
  }
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return;
  }
  let relatorio;
  try {
    relatorio = diagnosticar(opcoes.pasta);
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exitCode = 2;
    return;
  }
  if (opcoes.json) console.log(JSON.stringify(relatorio, null, 2));
  else imprimir(relatorio);
  process.exitCode = relatorio.resumo.erros > 0 ? 1 : 0;
}

// Executado (e não importado)? Compare o caminho real dos dois lados: o `npx skills` instala
// a skill por link simbólico (junction no Windows), e o Node resolve o link em
// import.meta.url, mas não em process.argv[1]. Repetido em cada script de propósito: cada
// skill é instalada sozinha.
function executadoDireto() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (executadoDireto()) main();
