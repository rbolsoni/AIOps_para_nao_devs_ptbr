# 0003 — Servidor MCP somente leitura

## Status

Aceito — 2026-09-29

## Contexto

O servidor MCP entrega as skills a agentes que ainda não leem o formato nativamente. Ele roda
na máquina do usuário e recebe pedidos de um modelo de linguagem, que pode ter sido
influenciado por conteúdo não confiável.

## Decisão

1. O servidor só lê: lista skills, entrega o `SKILL.md` e arquivos de apoio.
2. Não executa scripts das skills. Quem executa é o agente, com as permissões e aprovações
   que o cliente dele já aplica.
3. A leitura recusa caminho absoluto, caminho que sai da pasta da skill (inclusive por link
   simbólico), arquivo binário e arquivo acima de 512 KB.
4. Os `evals/` não são anunciados na lista de arquivos de apoio (servem a quem mantém a
   skill, não a quem a usa).

## Consequências

- Positivas: conectar o servidor não dá ao modelo nenhuma capacidade de alterar a máquina.
- Negativas: o agente precisa copiar os modelos de `assets/` e rodar os scripts por conta
  própria.

## Como verificar

`testes/mcp.test.mjs` e `testes/validar-skills.test.mjs` (tentativas de fuga de pasta).
