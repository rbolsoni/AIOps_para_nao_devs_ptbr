# CSP passo a passo

## 1. Inventário

Liste, por tipo, tudo o que a página carrega. A aba *Network* do navegador e o código-fonte
ajudam; o modo Report-Only (passo 3) completa o que escapar.

| Diretiva | O que entra | Exemplos comuns |
|---|---|---|
| `script-src` | JavaScript | o próprio site, analytics, chat, pagamento |
| `style-src` | CSS | o próprio site, fontes do Google (CSS) |
| `img-src` | imagens | o próprio site, `data:`, `blob:`, storage/CDN de imagens, tiles de mapa |
| `font-src` | fontes | o próprio site, `data:`, CDN de fontes |
| `connect-src` | `fetch`, XHR, WebSocket | API, banco/BaaS (`https:` e `wss:`), monitoramento de erros, APIs públicas |
| `frame-src` | iframes que a página embute | vídeo, pagamento, captcha |
| `worker-src` | Web Workers | bibliotecas que criam worker a partir de `blob:` |
| `frame-ancestors` | quem pode embutir *esta* página | normalmente `'none'` |

## 2. Escreva a política por ambiente

Monte a string em código, a partir de listas, com o que é de desenvolvimento separado:

```javascript
const producao = process.env.NODE_ENV === 'production';
const hostsDev = producao ? [] : ['http://localhost:*', 'ws://localhost:*'];

const csp = [
  "default-src 'none'",
  `script-src 'self'${producao ? '' : " 'unsafe-eval'"}`,
  "style-src 'self'",
  `img-src 'self' data: https://imagens.exemplo.com ${hostsDev.join(' ')}`,
  "font-src 'self'",
  `connect-src 'self' https://api.exemplo.com ${hostsDev.join(' ')}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(producao ? ['upgrade-insecure-requests'] : []),
].join('; ');
```

## 3. Report-Only antes de bloquear

Publique como `Content-Security-Policy-Report-Only` (opcionalmente com `report-to` apontando
para um coletor). O navegador registra o que seria bloqueado sem bloquear. Navegue pelos
fluxos principais, ajuste e, quando o relatório ficar limpo, troque para
`Content-Security-Policy`.

## 4. Scripts e estilos inline: nonce, hash ou `'unsafe-inline'`

| Opção | Como funciona | Quando serve | Custo |
|---|---|---|---|
| **nonce** | valor aleatório por resposta, repetido no header e em cada `<script nonce>` | páginas renderizadas por requisição | exige renderização dinâmica; páginas estáticas/cacheadas não têm nonce |
| **hash** | hash do conteúdo exato do script inline | scripts inline de conteúdo fixo | qualquer script inline que muda por página/build não tem hash fixo |
| **`'unsafe-inline'`** | permite qualquer inline | quando o framework injeta inline variável e as outras opções não cabem | proteção contra XSS bem menor — registre num ADR |

Regras que pegam desprevenido:

- **Nonce ou hash na mesma diretiva desliga o `'unsafe-inline'`** nos navegadores
  modernos. Acrescentar o hash de *um* script "para melhorar" pode bloquear todos os outros
  scripts inline do framework e quebrar a hidratação do site inteiro.
- **`'strict-dynamic'` desliga a lista de origens** (`'self'`, hosts): só scripts com nonce
  (e os que eles carregam) rodam. Em página estática sem nonce, nada roda.
- **Nonce e hash não cobrem atributos `style="…"`** — só blocos `<style>`. Estilos inline
  gerados por componentes (ex.: `style={{…}}`) continuam exigindo `'unsafe-inline'` em
  `style-src`, a menos que sejam reescritos para classes.
- Frameworks com geração estática: forçar renderização dinâmica só para ter nonce muda
  custo e desempenho do site inteiro. É decisão de arquitetura, não correção de CSP.

## 5. Quebras frequentes e a diretiva certa

| Sintoma no console | Ajuste |
|---|---|
| worker de biblioteca (replay de sessão, compressão, PDF) bloqueado | `worker-src 'self' blob:` (sem `worker-src`, vale `script-src`) |
| fonte embutida como `data:` bloqueada | `font-src 'self' data:` |
| imagem gerada no navegador (`blob:`) bloqueada | `img-src … blob:` |
| WebSocket do backend bloqueado | `connect-src … wss://host` |
| envio de erros ao monitoramento bloqueado | host de ingestão em `connect-src` |
| iframe de pagamento/vídeo bloqueado | host em `frame-src` |

## 6. Verifique

- Console do navegador sem violações nos fluxos principais.
- `node scripts/verificar-headers.mjs <url>` sem erros em homologação e produção.
- Testes E2E passando com a CSP ativa.
