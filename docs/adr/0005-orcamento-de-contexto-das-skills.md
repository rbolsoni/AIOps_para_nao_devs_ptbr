# 0005 — Orçamento de contexto das descrições das skills

## Status

Aceito — 2026-09-30

## Contexto

O agente carrega o **nome e a descrição de todas as skills instaladas em toda sessão**, antes de
qualquer pedido; as instruções completas só entram quando a skill ativa. A descrição é, ao mesmo
tempo, o que faz a skill ativar e um custo fixo de contexto.

Pela documentação do Claude Code (https://code.claude.com/docs/en/skills), essa lista tem um
orçamento de caracteres que escala com 1% da janela de contexto do modelo. Quando passa dele, a
ferramenta descarta descrições a partir das skills menos usadas — e a skill perde as palavras que
a fazem ativar. A mesma documentação recomenda pôr o caso de uso principal primeiro.

Medido em 2026-09-30: as 22 descrições somavam 10.816 caracteres (média de 492). Num modelo com
janela de 200 mil tokens, o kit sozinho já passava do orçamento — sem contar as outras skills do
usuário — e o kit ia ganhar cinco skills novas.

## Decisão

1. Descrição com **até 360 caracteres** (erro acima disso) e **alvo de 300** (aviso acima),
   cobradas pelo validador nas regras do kit.
2. Começa por "Use quando…/Use ao…", com os casos de uso principais primeiro e as palavras que o
   usuário realmente usa, inclusive quem não programa. O "que a skill garante" fica curto ou sai: o
   corpo explica.
3. A soma das descrições do kit tem teto de **8.000 caracteres**, conferido por teste. É uma
   catraca: só desce. Skill nova cabe encurtando outras, nunca subindo o teto.
4. Ao reescrever, cada consulta de `evals/gatilhos.json` é conferida contra a nova descrição: as
   positivas continuam cobertas, os quase-acertos continuam de fora.

Resultado: 10.816 → 5.872 caracteres (média de 267), todas abaixo de 300.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Manter as descrições longas | o kit sozinho estourava o orçamento; skills menos usadas paravam de ativar |
| Juntar skills para ter menos descrições | ativação menos precisa e instruções maiores carregadas à toa |
| Campo `when_to_use` para os gatilhos | existe no Claude Code, mas não é do padrão Agent Skills — não é portátil, e conta para o mesmo orçamento |
| Deixar o usuário aumentar o orçamento na ferramenta | exige configuração que quem não programa não sabe que existe; e o custo de contexto continua |

## Consequências

- Positivas: o kit inteiro cabe no orçamento com folga para as skills do usuário; menos tokens
  fixos em toda sessão.
- Negativas: menos sinônimos na descrição; a ativação passa a depender mais da escolha das
  palavras-chave e dos testes de gatilho.
- Invalida se: os agentes deixarem de carregar descrições em toda sessão, ou o orçamento deixar de
  existir.

## Como verificar

`npm run validar` (limite e alvo por skill) e `npm test` (teto da soma, em
`testes/regras-do-kit.test.mjs`). Para a ativação, `evals/gatilhos.json` de cada skill.
