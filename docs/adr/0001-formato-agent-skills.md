# 0001 — Formato Agent Skills, uma pasta por skill

## Status

Aceito — 2026-09-29

## Contexto

O objetivo é que as boas práticas funcionem em qualquer agente que programa, sem depender de
modelo, fornecedor ou linguagem. Cada ferramenta tinha seu formato próprio de instruções; o
padrão aberto Agent Skills (agentskills.io) passou a ser lido por dezenas de agentes, com
divulgação progressiva (só nome e descrição ficam no contexto até a skill ativar).

## Decisão

1. Cada skill é uma pasta em `skills/<nome>/` com `SKILL.md` no padrão Agent Skills, e
   opcionalmente `references/`, `assets/`, `scripts/` e `evals/`.
2. Estrutura plana em `skills/` (sem subpastas de categoria): é o formato que todos os
   instaladores e agentes encontram. A categoria fica em `metadata.categoria` e no README.
3. Cada skill é autossuficiente: é instalada sozinha, então não referencia arquivos de outra
   skill por caminho — cita pelo nome.
4. Português do Brasil primeiro. A versão em inglês será um repositório separado, feito a
   partir desta quando estiver completa.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Um único arquivo grande de regras (AGENTS.md gigante) | ocupa o contexto em toda sessão; não escala para 20+ assuntos |
| Uma skill única com muitas referências | ativa em tudo ou em nada; descrição genérica demais para ativar com precisão |
| Formatos específicos de cada ferramenta | multiplica a manutenção e prende a fornecedores |

## Consequências

- Positivas: instalação por `npx skills`, cópia manual ou MCP, com o mesmo conteúdo.
- Negativas: cada skill repete um pouco de contexto que poderia ser compartilhado.
- Invalida se: o padrão mudar de forma incompatível — o validador acusa.

## Como verificar

`npm run validar`.
