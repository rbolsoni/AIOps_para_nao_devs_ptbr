---
name: headers-de-seguranca
description: >-
  Use ao configurar ou revisar cabeçalhos HTTP de segurança — CSP, HSTS, proteção contra
  iframe (frame-ancestors), nosniff, Referrer-Policy, Permissions-Policy, cookies, CORS —,
  quando um scanner apontar header ausente ou a CSP bloquear algo no console. Inclui
  verificador de URL.
license: MIT
compatibility: O script de verificação requer Node.js 20+ e acesso à URL verificada.
metadata:
  categoria: seguranca-e-conformidade
  versao: "1.0.2"
---

# Headers de segurança

Headers de segurança são a camada que o navegador aplica por você: impedem que o site seja
embutido para clickjacking, que um script injetado rode, que o navegador "adivinhe" o tipo
de um upload, que a conexão seja rebaixada para HTTP. São baratos de configurar e caros de
esquecer.

## Base recomendada

| Header | Valor inicial recomendado | Protege contra |
|---|---|---|
| `Content-Security-Policy` | política restritiva construída para o site (abaixo) | XSS, injeção de conteúdo, exfiltração |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (comece curto, veja abaixo) | rebaixamento para HTTP |
| `X-Content-Type-Options` | `nosniff` | upload interpretado como script |
| `X-Frame-Options` | `DENY` (ou `SAMEORIGIN`), junto de `frame-ancestors` na CSP | clickjacking em navegadores antigos |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | vazamento de URL com parâmetros |
| `Permissions-Policy` | desligue o que não usa: `camera=(), microphone=(), geolocation=(), payment=()` | abuso de APIs do navegador |
| Cookies de sessão | `HttpOnly; Secure; SameSite=Lax` | roubo de sessão, CSRF |
| Remover | `X-Powered-By`, versão no `Server` | reconhecimento de tecnologia |

## CSP: o esqueleto

```
default-src 'none';
script-src 'self';
style-src 'self';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
form-action 'self';
base-uri 'self';
object-src 'none';
upgrade-insecure-requests
```

Acrescente origens **por diretiva** conforme o site realmente usa (API, analytics,
monitoramento de erros, mapas, pagamentos). O passo a passo — inventário, Report-Only,
ajustes por ambiente e escolhas entre nonce, hash e `'unsafe-inline'` — está em
[references/csp-passo-a-passo.md](references/csp-passo-a-passo.md). Leia antes de escrever
ou endurecer uma CSP.

Como declarar os headers em cada framework, servidor e plataforma de hospedagem:
[references/configuracao-por-plataforma.md](references/configuracao-por-plataforma.md).

## Procedimento

1. Rode o verificador na URL atual para ter o ponto de partida:
   `node scripts/verificar-headers.mjs https://seu-site.com.br`
2. Configure os headers no lugar certo da stack (um só lugar, versionado).
3. Publique a CSP primeiro como `Content-Security-Policy-Report-Only` quando houver risco de
   quebrar o site; acompanhe as violações; depois promova.
4. Teste os fluxos reais no navegador com o console aberto (login, pagamento, upload,
   mapas, gráficos) e rode os testes E2E.
5. Rode o verificador de novo no ambiente publicado (homologação e produção). Prévia
   protegida por login da plataforma: passe o token de bypass com `--cabecalho` — ele
   nunca é impresso.
6. Registre num ADR o que foi aceito de propósito (ex.: `'unsafe-inline'` mantido e por quê).

## Script disponível

- **`scripts/verificar-headers.mjs`** — audita os headers de uma URL. Opções: `--json`,
  `--cabecalho "Nome: valor"` (repetível), `--help`. Sai com 1 se houver erro, 2 se não
  conseguir acessar a URL. Pode ser usado na esteira como teste de fumaça depois do deploy.

## Armadilhas

- **HSTS com `preload` cedo demais**: sair da lista de preload leva meses. Comece com
  `max-age` curto (ex.: 300), confirme que todo subdomínio funciona em HTTPS, suba para um
  ano, e só então considere `preload`.
- **Hosts de desenvolvimento na CSP de produção** (`localhost`, `127.0.0.1`, `ws://`):
  monte a política por ambiente e confira que a de produção não os tem.
- **`'unsafe-eval'` em produção** porque o modo de desenvolvimento precisava: muitos
  frameworks só exigem isso em desenvolvimento. Condicione ao ambiente.
- **nginx: `add_header` num bloco interno anula todos os herdados** do bloco externo. Um
  único `add_header` num `location` apaga silenciosamente os headers de segurança daquela
  rota.
- **Header configurado em dois lugares** (framework e CDN/plataforma): um sobrescreve o
  outro, ou o navegador recebe duas CSPs e aplica as duas. Escolha um lugar.
- **Headers só na página HTML**: respostas de API e arquivos estáticos também precisam de
  `nosniff`, e downloads de arquivos enviados por usuários precisam de `Content-Disposition`
  e tipo correto.
