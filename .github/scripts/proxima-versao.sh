#!/usr/bin/env bash
# Calcula a próxima versão semântica a partir dos Commits Convencionais desde a última tag.
#
# Regras:
#   feat!: / fix!: / qualquer tipo com "!" ou rodapé "BREAKING CHANGE:"  -> major
#   feat:                                                                   -> minor
#   fix:                                                                    -> patch
#   qualquer outro tipo (docs, chore, test, ci, refactor, style, perf…)     -> nenhuma versão
#
# "nenhuma" é deliberado: um merge só de documentação não deve gerar tag nem deploy de
# produção. Se o projeto quiser outro comportamento (ex.: perf gera patch), mude aqui E na
# documentação — as duas precisam dizer a mesma coisa.
#
# Uso:
#   proxima-versao.sh                            # imprime ultima=, nivel=, proxima=
#   proxima-versao.sh --versao-inicial v0.1.0    # versão usada quando ainda não há tag
#   proxima-versao.sh >> "$GITHUB_OUTPUT"        # dentro do GitHub Actions
#
# Saída (stdout), uma chave por linha:
#   ultima=v1.4.2     (vazio se não houver tag)
#   nivel=minor       (major | minor | patch | nenhum)
#   proxima=v1.5.0    (vazio quando nivel=nenhum)
#
# Requer histórico e tags completos (no Actions: checkout com fetch-depth: 0).
# Código de saída: 0 sucesso; 2 uso incorreto ou fora de um repositório git.
set -euo pipefail

INICIAL="v1.0.0"

ajuda() {
  sed -n '2,29p' "$0" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --versao-inicial)
      INICIAL="${2:-}"
      shift 2 || { echo "erro: --versao-inicial exige um valor, ex.: v1.0.0" >&2; exit 2; }
      ;;
    -h|--help) ajuda; exit 0 ;;
    *) echo "erro: opção desconhecida: $1 (use --help)" >&2; exit 2 ;;
  esac
done

if ! printf '%s' "$INICIAL" | grep -qE '^v[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "erro: --versao-inicial deve ter o formato vX.Y.Z; recebido: \"$INICIAL\"" >&2
  exit 2
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "erro: execute dentro de um repositório git" >&2
  exit 2
fi

ULTIMA=$(git describe --tags --abbrev=0 --match 'v[0-9]*' 2>/dev/null || true)
if [ -n "$ULTIMA" ]; then
  INTERVALO="$ULTIMA..HEAD"
else
  INTERVALO="HEAD"
fi

# Assunto e corpo de cada commit do intervalo (vazio se o repositório não tiver commits).
MENSAGENS=$(git log --format='%s%n%b' "$INTERVALO" 2>/dev/null || true)

NIVEL="nenhum"
if printf '%s\n' "$MENSAGENS" | grep -qE '^[a-z]+(\([^)]*\))?!: |^BREAKING[ -]CHANGE: '; then
  NIVEL="major"
elif printf '%s\n' "$MENSAGENS" | grep -qE '^feat(\([^)]*\))?: '; then
  NIVEL="minor"
elif printf '%s\n' "$MENSAGENS" | grep -qE '^fix(\([^)]*\))?: '; then
  NIVEL="patch"
fi

PROXIMA=""
if [ "$NIVEL" != "nenhum" ]; then
  if [ -z "$ULTIMA" ]; then
    PROXIMA="$INICIAL"
  else
    V="${ULTIMA#v}"
    MAIOR="${V%%.*}"; RESTO="${V#*.}"
    MENOR="${RESTO%%.*}"; CORRECAO="${RESTO#*.}"
    CORRECAO="${CORRECAO%%[-+]*}"
    case "$NIVEL" in
      major) MAIOR=$((MAIOR + 1)); MENOR=0; CORRECAO=0 ;;
      minor) MENOR=$((MENOR + 1)); CORRECAO=0 ;;
      patch) CORRECAO=$((CORRECAO + 1)) ;;
    esac
    PROXIMA="v${MAIOR}.${MENOR}.${CORRECAO}"
  fi
fi

echo "ultima=${ULTIMA}"
echo "nivel=${NIVEL}"
echo "proxima=${PROXIMA}"
