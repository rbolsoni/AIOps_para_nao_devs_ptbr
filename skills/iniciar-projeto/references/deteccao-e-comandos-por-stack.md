# Detecção de stack e comandos padrão

Use esta tabela para (1) descobrir a stack pelo manifesto e (2) escolher um comando padrão
quando o projeto ainda não tiver um. Se o projeto já tem comando próprio, **use o do
projeto**.

Versão fixa, sempre: ferramenta que está nas dependências de desenvolvimento roda na versão
do lockfile (`npx eslint`, `uv run ruff`); ferramenta executada sob demanda, fora do
lockfile, leva a versão no próprio comando (`npx pacote@<versão>`,
`uv run --with pacote==<versão>`, `go run …@<versão>`) — senão a checagem muda sozinha entre
duas execuções. Troque `<versão>` pela mais recente que você conferiu no registro.

## Como detectar

| Arquivo encontrado | Stack | Gerenciador |
|---|---|---|
| `package.json` + `package-lock.json` | Node.js / TypeScript | npm |
| `package.json` + `pnpm-lock.yaml` | Node.js / TypeScript | pnpm |
| `package.json` + `yarn.lock` | Node.js / TypeScript | Yarn |
| `package.json` + `bun.lock` (ou `bun.lockb`, formato antigo) | JavaScript / TypeScript | Bun |
| `pyproject.toml` + `uv.lock` | Python | uv |
| `pyproject.toml` + `poetry.lock` | Python | Poetry |
| `requirements.txt` | Python | pip |
| `go.mod` | Go | módulos do Go |
| `pom.xml` | Java/Kotlin | Maven |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin | Gradle |
| `*.csproj` / `*.sln` | .NET (C#/F#) | dotnet |
| `Cargo.toml` | Rust | Cargo |
| `composer.json` | PHP | Composer |
| `Gemfile` | Ruby | Bundler |
| `pubspec.yaml` | Dart/Flutter | pub |

Também observe: `Dockerfile`/`compose.yaml` (contêiner), pasta `supabase/`, `prisma/`,
`migrations/`, `alembic/` (banco), `vercel.json`/`netlify.toml`/`fly.toml` (deploy),
`.github/workflows/`/`.gitlab-ci.yml` (esteira existente).

## Comandos padrão por stack

### Node.js / TypeScript (npm)

| Finalidade | Comando |
|---|---|
| Instalar na esteira | `npm ci` (nunca `npm install` na esteira: ele altera o lockfile) |
| Formatar (checar) | `npx prettier --check .` |
| Lint | `npx eslint .` |
| Tipos | `npx tsc --noEmit` |
| Testes + cobertura | `npx vitest run --coverage` ou `npx jest --coverage` |
| Vulnerabilidades | `npm audit --omit=dev` |
| Licenças | `npx license-checker-rseidelsohn@<versão> --production --json` (ver `dependencias-e-licencas`) |

Com outro gerenciador, a instalação na esteira também recusa lockfile desatualizado:
`pnpm install --frozen-lockfile`, `yarn install --immutable` (Yarn 2+; no Yarn 1,
`--frozen-lockfile`) e `bun install --frozen-lockfile`. O `license-checker` original está sem
atualização desde 2022; o fork `license-checker-rseidelsohn` é mantido e aceita as mesmas
opções.

### Python (uv)

| Finalidade | Comando |
|---|---|
| Instalar na esteira | `uv sync --frozen` |
| Formatar (checar) | `uv run ruff format --check .` |
| Lint | `uv run ruff check .` |
| Tipos | `uv run mypy .` ou `uv run pyright` |
| Testes + cobertura | `uv run pytest --cov` |
| Vulnerabilidades | `uv run --with pip-audit==<versão> pip-audit` |
| Licenças | `uv run --with pip-licenses==<versão> pip-licenses --format=json` |

Os dois inspecionam o ambiente em que rodam: por isso `uv run --with` (ambiente do projeto
mais a ferramenta), e não `uvx`, que roda num ambiente isolado e veria só os pacotes da
própria ferramenta. Com pip puro: `pip install -r requirements.txt`, e as mesmas ferramentas
instaladas, com versão fixa, no ambiente virtual do projeto.

### Go

| Finalidade | Comando |
|---|---|
| Instalar | `go mod download` |
| Formatar (checar) | `test -z "$(gofmt -l .)"` |
| Lint | `go vet ./...` e `golangci-lint run` |
| Testes + cobertura | `go test -race -cover ./...` |
| Vulnerabilidades | `go run golang.org/x/vuln/cmd/govulncheck@<versão> ./...` |
| Licenças | `go-licenses report ./...` (instalado com versão fixa) |

### Java / Kotlin

| Finalidade | Maven | Gradle |
|---|---|---|
| Build + testes | `mvn -B verify` | `./gradlew build` |
| Formatar | plugin Spotless (`mvn spotless:check`) | `./gradlew spotlessCheck` |
| Lint | Checkstyle / SpotBugs / PMD | idem, via plugins |
| Cobertura | JaCoCo | JaCoCo |
| Vulnerabilidades | OWASP Dependency-Check ou OSV-Scanner | idem |
| Licenças | `license-maven-plugin` | `gradle-license-report` |

### .NET

| Finalidade | Comando |
|---|---|
| Instalar | `dotnet restore --locked-mode` (exige `packages.lock.json`) |
| Formatar (checar) | `dotnet format --verify-no-changes` |
| Lint | analisadores do compilador com `TreatWarningsAsErrors` |
| Testes + cobertura | `dotnet test --collect:"XPlat Code Coverage"` |
| Vulnerabilidades | `dotnet list package --vulnerable --include-transitive` |
| Licenças | ferramenta `nuget-license` |

### Rust

| Finalidade | Comando |
|---|---|
| Instalar | `cargo fetch --locked` |
| Formatar (checar) | `cargo fmt --check` |
| Lint | `cargo clippy --all-targets -- -D warnings` |
| Testes + cobertura | `cargo test` (cobertura com `cargo llvm-cov`) |
| Vulnerabilidades | `cargo audit` |
| Licenças | `cargo deny check licenses` |

### PHP

| Finalidade | Comando |
|---|---|
| Instalar | `composer install --no-interaction --prefer-dist` |
| Formatar | `vendor/bin/php-cs-fixer fix --dry-run` ou `vendor/bin/pint --test` |
| Análise estática | `vendor/bin/phpstan analyse` |
| Testes + cobertura | `vendor/bin/phpunit --coverage-text` ou `vendor/bin/pest --coverage` |
| Vulnerabilidades | `composer audit` |
| Licenças | `composer licenses` |

### Ruby

| Finalidade | Comando |
|---|---|
| Instalar | `bundle install` com `BUNDLE_FROZEN=true` |
| Lint + formatação | `bundle exec rubocop` |
| Testes + cobertura | `bundle exec rspec` com SimpleCov |
| Vulnerabilidades | `bundle exec bundle-audit check --update` |
| Licenças | `license_finder` |

## Ferramentas que servem a qualquer stack

| Finalidade | Ferramenta |
|---|---|
| Segredos no código e no histórico | gitleaks; fallback sem instalação: o script da skill `segredos-e-credenciais` |
| Vulnerabilidades em dependências | OSV-Scanner (lê lockfiles de vários ecossistemas) |
| Vulnerabilidades, licenças e segredos em imagem/pasta | Trivy |
| Análise estática de segurança (SAST) | Semgrep; CodeQL no GitHub |
| Atualização de dependências | Dependabot ou Renovate |
