# 0002 — Nenhuma dependência de terceiros

## Status

Aceito — 2026-09-29

## Contexto

Um kit de segurança e governança que puxa dezenas de pacotes contradiz o que ensina
(`dependencias-e-licencas`) e amplia a superfície de ataque de quem o instala — inclusive via
`npx`, que executa o pacote na máquina do usuário.

## Decisão

Validador, servidor MCP e scripts das skills usam apenas a biblioteca padrão do Node.js 20+.
O frontmatter é lido por um parser de YAML propositalmente restrito ao subconjunto do padrão
Agent Skills, que recusa qualquer construção fora dele em vez de interpretá-la pela metade.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Biblioteca de YAML completa | dependência para ler meia dúzia de campos |
| SDK oficial de MCP | o servidor usa três métodos simples de JSON-RPC; o SDK traria dependências transitivas |

## Consequências

- Positivas: `npx` rápido, nada a auditar além deste repositório, sem Dependabot de pacotes.
- Negativas: o protocolo MCP é implementado à mão; mudanças no protocolo exigem atualizar
  `mcp/servidor.mjs` (coberto por `testes/mcp.test.mjs`).
- Invalida se: o servidor MCP precisar de recursos que tornem a implementação própria mais
  arriscada que a dependência.
