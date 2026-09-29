#!/usr/bin/env node
/**
 * Audita os headers HTTP de segurança de uma URL publicada.
 *
 * Confere Content-Security-Policy (diretivas essenciais e fontes perigosas), HSTS,
 * X-Content-Type-Options, proteção contra clickjacking (frame-ancestors/X-Frame-Options),
 * Referrer-Policy, Permissions-Policy, vazamento de versão (X-Powered-By, Server),
 * atributos de cookies e CORS com credenciais.
 *
 * Nunca imprime valor de cookie nem de header enviado com --cabecalho: só nomes.
 *
 * Uso:
 *   node verificar-headers.mjs https://exemplo.com.br
 *   node verificar-headers.mjs https://preview.exemplo.com --cabecalho "x-bypass-token: <token>"
 *   node verificar-headers.mjs https://exemplo.com.br --json
 *
 * Requer Node.js 20+ (fetch nativo). Sem dependências.
 * Código de saída: 0 sem erros; 1 com pelo menos um erro; 2 uso incorreto ou falha de rede.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AJUDA = `Uso: node verificar-headers.mjs <url> [--json] [--cabecalho "Nome: valor"]...

Audita os headers de segurança da resposta HTTP da URL.
  --json         saída em JSON (para automação)
  --cabecalho    header extra na requisição (ex.: token de bypass de prévia protegida);
                 pode repetir. O valor nunca é impresso.
Código de saída: 0 sem erros, 1 com erros, 2 uso incorreto ou falha de rede.`;

const SEIS_MESES = 15552000;

function lerArgumentos(argv) {
  const opcoes = { json: false, cabecalhos: {}, url: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') return { ajuda: true };
    if (a === '--json') opcoes.json = true;
    else if (a === '--cabecalho') {
      const valor = argv[++i];
      const m = valor?.match(/^([^:]+):\s*(.*)$/);
      if (!m) throw new Error('--cabecalho espera "Nome: valor"');
      opcoes.cabecalhos[m[1].trim()] = m[2];
    } else if (a.startsWith('--')) throw new Error(`opção desconhecida: ${a}`);
    else opcoes.url = a;
  }
  if (!opcoes.url) throw new Error('informe a URL, ex.: https://exemplo.com.br');
  let url;
  try {
    url = new URL(opcoes.url);
  } catch {
    throw new Error(`URL inválida: ${opcoes.url}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('a URL precisa começar com http:// ou https://');
  return opcoes;
}

export function lerCsp(valor) {
  const diretivas = {};
  for (const parte of valor.split(';')) {
    const tokens = parte.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    const nome = tokens[0].toLowerCase();
    if (!(nome in diretivas)) diretivas[nome] = tokens.slice(1);
  }
  return diretivas;
}

function avaliarCsp(h, registrar) {
  let problemas = 0;
  const r = (nivel, header, mensagem) => {
    if (nivel === 'erro' || nivel === 'aviso') problemas++;
    registrar(nivel, header, mensagem);
  };
  const valor = h.get('content-security-policy');
  if (!valor) {
    if (h.get('content-security-policy-report-only')) {
      r('aviso', 'content-security-policy', 'só existe a versão Report-Only: ela registra violações mas não bloqueia nada. Promova para Content-Security-Policy depois de validar.');
    } else {
      r('erro', 'content-security-policy', 'ausente: sem CSP, uma falha de XSS executa qualquer script. Comece por uma política Report-Only (veja references/csp-passo-a-passo.md).');
    }
    return;
  }
  const d = lerCsp(valor);
  const efetiva = (nome) => d[nome] ?? d['default-src'];

  if (!d['default-src']) r('aviso', 'csp default-src', "ausente: defina uma base restritiva ('none' ou 'self') para o que não tiver diretiva própria.");

  const script = efetiva('script-src');
  if (!script) {
    r('aviso', 'csp script-src', 'sem script-src nem default-src: scripts de qualquer origem são aceitos.');
  } else {
    if (script.includes('*')) r('erro', 'csp script-src', "contém '*': qualquer domínio pode servir script.");
    if (script.some((s) => ['http:', 'https:'].includes(s))) r('aviso', 'csp script-src', 'aceita qualquer host por esquema (http:/https:), o que anula a lista de origens.');
    if (script.includes('data:')) r('aviso', 'csp script-src', "aceita 'data:' — permite script embutido em URL de dados.");
    if (script.includes("'unsafe-eval'")) r('aviso', 'csp script-src', "contém 'unsafe-eval': em produção quase nunca é necessário (costuma ser exigência só do modo de desenvolvimento).");
    const temNonceOuHash = script.some((s) => /^'(nonce-|sha(256|384|512)-)/.test(s));
    if (script.includes("'unsafe-inline'")) {
      if (temNonceOuHash) {
        r('info', 'csp script-src', "tem nonce/hash junto de 'unsafe-inline': navegadores modernos ignoram o 'unsafe-inline' — scripts inline sem nonce/hash serão bloqueados.");
      } else {
        r('aviso', 'csp script-src', "contém 'unsafe-inline' sem nonce/hash: reduz a proteção contra XSS. Se for restrição do framework, registre a decisão num ADR.");
      }
    }
  }

  const objeto = efetiva('object-src');
  if (!objeto || !(objeto.length === 1 && objeto[0] === "'none'")) r('aviso', 'csp object-src', "deveria ser 'none' (plugins/objetos embutidos).");
  if (!d['base-uri']) r('aviso', 'csp base-uri', "ausente (não herda de default-src): use 'self' ou 'none' para impedir troca da URL base.");
  if (!d['form-action']) r('aviso', 'csp form-action', "ausente (não herda de default-src): use 'self' para impedir envio de formulário a outro domínio.");
  if (!d['frame-ancestors']) {
    const xfo = (h.get('x-frame-options') ?? '').toUpperCase();
    if (!['DENY', 'SAMEORIGIN'].includes(xfo)) r('erro', 'csp frame-ancestors', "ausente e sem X-Frame-Options: a página pode ser embutida em outro site (clickjacking). Use frame-ancestors 'none' ou 'self'.");
  }
  if (problemas === 0) r('ok', 'content-security-policy', 'presente, sem problemas nas diretivas essenciais');
}

function avaliarHsts(h, https, r) {
  const valor = h.get('strict-transport-security');
  if (!https) {
    r('info', 'strict-transport-security', 'a URL não é HTTPS; HSTS só vale sobre HTTPS. Verifique no ambiente publicado.');
    return;
  }
  if (!valor) {
    r('erro', 'strict-transport-security', 'ausente: o navegador aceita acessar o site por HTTP e pode ser rebaixado por um intermediário.');
    return;
  }
  const idade = Number(valor.match(/max-age=(\d+)/i)?.[1] ?? 0);
  if (idade < SEIS_MESES) r('aviso', 'strict-transport-security', `max-age=${idade} é curto; o recomendado depois de validado é 31536000 (1 ano).`);
  if (!/includesubdomains/i.test(valor)) r('aviso', 'strict-transport-security', 'sem includeSubDomains: subdomínios continuam aceitando HTTP.');
  if (/preload/i.test(valor)) r('info', 'strict-transport-security', 'preload ativo: sair da lista de preload dos navegadores leva meses — só mantenha se todo subdomínio suporta HTTPS.');
  if (idade >= SEIS_MESES && /includesubdomains/i.test(valor)) r('ok', 'strict-transport-security', valor);
}

function avaliarDemais(h, https, r) {
  const nosniff = (h.get('x-content-type-options') ?? '').toLowerCase();
  if (nosniff === 'nosniff') r('ok', 'x-content-type-options', 'nosniff');
  else r('erro', 'x-content-type-options', 'deveria ser "nosniff": sem ele, o navegador pode interpretar um upload como script.');

  const xfo = h.get('x-frame-options');
  if (xfo && !['DENY', 'SAMEORIGIN'].includes(xfo.toUpperCase())) r('aviso', 'x-frame-options', `valor "${xfo}" não é suportado; use DENY ou SAMEORIGIN (ou apenas frame-ancestors na CSP).`);

  const referrer = (h.get('referrer-policy') ?? '').toLowerCase();
  if (!referrer) r('aviso', 'referrer-policy', 'ausente: use "strict-origin-when-cross-origin" (ou mais restritivo).');
  else if (/unsafe-url|no-referrer-when-downgrade/.test(referrer)) r('aviso', 'referrer-policy', `"${referrer}" envia a URL completa (com parâmetros) para outros sites.`);
  else r('ok', 'referrer-policy', referrer);

  if (!h.get('permissions-policy')) r('aviso', 'permissions-policy', 'ausente: desligue o que o site não usa, ex.: "camera=(), microphone=(), geolocation=(), payment=()".');
  else r('ok', 'permissions-policy', 'presente');

  if (h.get('x-powered-by')) r('aviso', 'x-powered-by', 'expõe a tecnologia do servidor; remova.');
  const servidor = h.get('server');
  if (servidor && /\d/.test(servidor)) r('aviso', 'server', 'expõe a versão do servidor; remova o número de versão.');

  const origem = h.get('access-control-allow-origin');
  const credenciais = (h.get('access-control-allow-credentials') ?? '').toLowerCase() === 'true';
  if (origem === '*' && credenciais) r('erro', 'cors', 'Access-Control-Allow-Origin "*" com credenciais: configuração inválida e perigosa.');
  else if (origem === '*') r('info', 'cors', 'Access-Control-Allow-Origin "*": aceitável para conteúdo público; nunca para API autenticada.');

  const cookies = typeof h.getSetCookie === 'function' ? h.getSetCookie() : [h.get('set-cookie')].filter(Boolean);
  for (const c of cookies) {
    const nome = c.split('=')[0].trim();
    const faltando = [];
    if (https && !/;\s*secure/i.test(c)) faltando.push('Secure');
    if (!/;\s*httponly/i.test(c)) faltando.push('HttpOnly');
    if (!/;\s*samesite=/i.test(c)) faltando.push('SameSite');
    if (faltando.length) r('aviso', `cookie ${nome}`, `sem ${faltando.join(', ')} (se for cookie de sessão, todos são necessários).`);
  }
}

export async function verificar(url, cabecalhos = {}) {
  const resposta = await fetch(url, { redirect: 'follow', headers: cabecalhos, signal: AbortSignal.timeout(15000) });
  const https = new URL(resposta.url).protocol === 'https:';
  const resultados = [];
  const r = (nivel, header, mensagem) => resultados.push({ nivel, header, mensagem });
  avaliarCsp(resposta.headers, r);
  avaliarHsts(resposta.headers, https, r);
  avaliarDemais(resposta.headers, https, r);
  await resposta.body?.cancel();
  return {
    url,
    urlFinal: resposta.url,
    status: resposta.status,
    resultados,
    resumo: {
      erros: resultados.filter((x) => x.nivel === 'erro').length,
      avisos: resultados.filter((x) => x.nivel === 'aviso').length,
    },
  };
}

function imprimir(relatorio) {
  const marca = { erro: '✗ erro ', aviso: '! aviso', info: 'i info ', ok: '✓ ok   ' };
  console.log(`URL: ${relatorio.url}`);
  if (relatorio.urlFinal !== relatorio.url) console.log(`Após redirecionamentos: ${relatorio.urlFinal}`);
  console.log(`Status: ${relatorio.status}\n`);
  const ordem = { erro: 0, aviso: 1, info: 2, ok: 3 };
  for (const x of [...relatorio.resultados].sort((a, b) => ordem[a.nivel] - ordem[b.nivel])) {
    console.log(`${marca[x.nivel]}  ${x.header.padEnd(28)} ${x.mensagem}`);
  }
  console.log(`\nResumo: ${relatorio.resumo.erros} erro(s), ${relatorio.resumo.avisos} aviso(s).`);
}

async function main() {
  let opcoes;
  try {
    opcoes = lerArgumentos(process.argv.slice(2));
  } catch (e) {
    console.error(`erro: ${e.message}\n\n${AJUDA}`);
    process.exit(2);
  }
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return;
  }
  let relatorio;
  try {
    relatorio = await verificar(opcoes.url, opcoes.cabecalhos);
  } catch (e) {
    console.error(`erro: não foi possível acessar ${opcoes.url}: ${e.cause?.code ?? e.cause?.message ?? e.message}`);
    process.exit(2);
  }
  if (opcoes.json) console.log(JSON.stringify(relatorio, null, 2));
  else imprimir(relatorio);
  process.exit(relatorio.resumo.erros > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
