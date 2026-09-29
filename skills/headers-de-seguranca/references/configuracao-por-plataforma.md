# Onde configurar os headers

Configure em **um** lugar. Se a plataforma de hospedagem e o framework definem o mesmo
header, um sobrescreve o outro (ou o navegador recebe duas CSPs e aplica as duas).

Nos exemplos, `CSP` representa a política montada conforme
[csp-passo-a-passo.md](csp-passo-a-passo.md).

## Frameworks

**Next.js** (`next.config.*`):

```javascript
const headersDeSeguranca = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];
const config = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: headersDeSeguranca }];
  },
};
export default config;
```

**Express** (biblioteca `helmet`, que já define a maioria com bons padrões):

```javascript
import helmet from 'helmet';
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], scriptSrc: ["'self'"], /* … */ } },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
}));
```

**Django** (`settings.py`):

```python
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# CSP: suporte nativo nas versões recentes do Django, ou o pacote django-csp nas anteriores.
```

**Ruby on Rails**: `config.force_ssl = true` (HSTS e cookies seguros) e a CSP em
`config/initializers/content_security_policy.rb`
(`Rails.application.configure { config.content_security_policy { |p| p.default_src :none; … } }`).

**Spring Security**:

```java
http.headers(h -> h
    .contentSecurityPolicy(c -> c.policyDirectives(CSP))
    .httpStrictTransportSecurity(s -> s.includeSubDomains(true).maxAgeInSeconds(31536000))
    .frameOptions(f -> f.deny())
    .referrerPolicy(r -> r.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)));
```

**ASP.NET Core**: `app.UseHsts()` em produção e um middleware que acrescenta os demais:

```csharp
app.Use(async (ctx, next) => {
    var h = ctx.Response.Headers;
    h["Content-Security-Policy"] = CSP;
    h["X-Content-Type-Options"] = "nosniff";
    h["X-Frame-Options"] = "DENY";
    h["Referrer-Policy"] = "strict-origin-when-cross-origin";
    h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});
```

**FastAPI / Starlette**: middleware que acrescenta os headers em toda resposta
(`@app.middleware("http")`), ou a biblioteca `secure`.

**Go (`net/http`)**: um handler que envolve os demais e chama `w.Header().Set(...)` antes de
`next.ServeHTTP(w, r)`.

## Servidores

**nginx** — use `always` para valer também em respostas de erro, e lembre que `add_header`
dentro de um `location` **anula todos** os herdados do bloco `server`:

```nginx
add_header Content-Security-Policy "CSP" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
server_tokens off;
```

**Apache**: `Header always set Content-Security-Policy "CSP"` (e os demais), com
`ServerTokens Prod` e `ServerSignature Off`.

**Caddy**: bloco `header { Content-Security-Policy "CSP" … -Server }`.

## Plataformas de hospedagem

**Vercel** (`vercel.json`), quando o framework não define os headers:

```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ] }
  ]
}
```

**Netlify** e **Cloudflare Pages**: arquivo `_headers` na pasta publicada:

```
/*
  Content-Security-Policy: CSP
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

**CDN/proxy na frente** (Cloudflare, CloudFront): regras de transformação de resposta.
Confira se não duplicam o que a aplicação já envia.
