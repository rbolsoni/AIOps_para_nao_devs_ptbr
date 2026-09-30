# Ferramentas por ecossistema

Fixe a versão de toda ferramenta executada sob demanda: troque `<versão>` pela mais recente
que você conferiu no registro, e mude-a só num PR revisado.

| Ecossistema | Licenças | Vulnerabilidades |
|---|---|---|
| npm / pnpm / Yarn / Bun | `npx license-checker-rseidelsohn@<versão> --production --json` | `npm audit --omit=dev` (ou o equivalente do gerenciador) |
| Python | `uv run --with pip-licenses==<versão> pip-licenses --format=json` | `uv run --with pip-audit==<versão> pip-audit` |
| Go | `go-licenses report ./...` | `govulncheck ./...` |
| Maven | `license-maven-plugin` (`license:aggregate-third-party-report`) | OWASP Dependency-Check |
| Gradle | plugin `gradle-license-report` | OWASP Dependency-Check |
| .NET | ferramenta `nuget-license` | `dotnet list package --vulnerable --include-transitive` |
| Rust | `cargo deny check licenses` | `cargo audit` ou `cargo deny check advisories` |
| PHP | `composer licenses --format=json` | `composer audit` |
| Ruby | `license_finder` | `bundle-audit` |
| Vários / imagem | Trivy (`trivy fs --scanners license`) ou ScanCode | OSV-Scanner, Trivy |

## Como montar a checagem (qualquer ecossistema)

A ferramenta lista pacote → licença. A checagem, um script curto no projeto, aplica a
política:

1. Lê a lista (JSON) da ferramenta, separando produção e desenvolvimento quando possível.
2. Para cada pacote: licença na lista permitida → ok; pacote numa exceção nomeada → ok, e
   marca a exceção como usada; senão → erro com pacote, versão e licença.
3. Exceção nunca usada → aviso ("pacote saiu ou mudou de licença; revise o registro").
4. Imprime um resumo e sai com código diferente de zero se houver erro.
5. `--json` para automação.

Estrutura sugerida da política no script:

```javascript
const LICENCAS_PERMITIDAS = new Set(['MIT', 'MIT-0', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'CC0-1.0', 'Unlicense', 'BlueOak-1.0.0', 'Python-2.0']);

const EXCECOES = [
  {
    pacote: '<nome-do-pacote>',
    licenca: '<licença encontrada>',
    motivo: '<por que é aceitável neste projeto>',
    invalidaSe: '<condição que obriga a rever>',
    somenteDesenvolvimento: false,
  },
];
```

Licença composta: trate `A OR B` como aceita se qualquer uma for permitida; `A AND B` só se
as duas forem.
