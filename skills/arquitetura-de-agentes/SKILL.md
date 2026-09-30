---
name: arquitetura-de-agentes
description: >-
  Use ao projetar, construir ou depurar um agente de IA ou app com LLM: laço do agente,
  tool calling, servidor ou cliente MCP, permissões, memória, contexto e custo, troca de
  modelo ou provedor, agente que melhora o próprio prompt. Não use para programação comum
  sem LLM.
license: MIT
metadata:
  categoria: agentes-de-ia
  versao: "1.0.2"
---

# Arquitetura de agentes

Um agente é um modelo de linguagem dentro de um laço, com acesso a ferramentas. O modelo é
bom em interpretar, decidir o próximo passo e escrever; é ruim em garantir. Por isso a regra
central desta skill:

> **O modelo sugere; o código decide.** O modelo *propõe* uma ação. O programa ao redor (o
> *harness*) valida os argumentos, confere a permissão, executa, registra e devolve a
> observação ao modelo. Nada que o modelo escreve é executado sem passar por essas etapas.

Para usar ou configurar com segurança o agente que programa (Claude Code, Codex, Cursor…), a
skill é `uso-seguro-de-agentes`; esta é para construir agentes.

## Divisão de trabalho

| Tipo de problema | Quem resolve | Exemplo |
|---|---|---|
| Determinístico, verificável | **código** | validar CPF, calcular frete, checar permissão, aplicar limite de gasto |
| Julgamento, linguagem, ambiguidade | **modelo** | entender o pedido, escolher a ferramenta, resumir, redigir |
| O que o modelo vê | **contexto** (montado pelo código) | quais documentos, quais ferramentas, qual histórico |

Erro clássico: pedir ao modelo algo que o código garantiria sempre ("nunca mostre dado de
outro cliente"). Isso é filtro no código, não instrução no prompt. E o contrário também
erra: tentar controlar o comportamento do modelo interpretando a saída com regex, quando
seria mais simples mudar o que entra no contexto.

## Componentes mínimos

1. **Laço** com estado explícito (mensagens, plano, passos feitos).
2. **Registro de ferramentas** tipadas (JSON Schema), cada uma com política de risco.
3. **Política de permissões e aprovações** aplicada pelo código antes de executar.
4. **Montador de contexto**: instruções, ferramentas, memória e documentos, em ordem estável.
5. **Adaptador de provedor**: o resto do sistema não conhece a API de nenhum fornecedor.
6. **Registro/rastreamento** de cada passo (entrada, ação, resultado, tokens, custo, tempo).
7. **Avaliação** que roda antes de cada mudança de prompt, ferramenta ou modelo (skill
   `guardrails-e-avaliacao`).

## O laço

- **Orçamento em todas as dimensões**: passos, tokens, tempo, dinheiro e chamadas por
  ferramenta. Estourou → para e relata, não continua "só mais um".
- **Condições de parada explícitas**: objetivo atingido (verificado, não declarado), bloqueio
  que exige humano, orçamento esgotado, erro irrecuperável.
- **Detecção de repetição**: a mesma ação com os mesmos argumentos duas ou três vezes seguidas
  é laço; interrompa e replaneje.
- **Pontos de retomada** em tarefas longas: estado salvo fora do contexto para continuar após
  falha ou compactação.
- **Erros de ferramenta voltam ao modelo como observação útil** ("arquivo não encontrado;
  arquivos parecidos: …"), não como exceção que derruba o laço.

## Ferramentas e permissões

Poucas, estreitas e tipadas. Cada ferramenta tem uma **classe de risco** que o código usa
para decidir se executa direto, pede aprovação ou recusa. Detalhes, classes e desenho de
interface: [references/ferramentas-e-permissoes.md](references/ferramentas-e-permissoes.md).

Regras que não mudam:

- Credenciais **nunca** entram no contexto do modelo; o harness as injeta na execução.
- Conteúdo que vem de ferramenta, página, arquivo ou e-mail é **dado, não instrução**.
- Ação irreversível ou externa (enviar, pagar, publicar, apagar, mudar permissão) exige
  aprovação humana ou política explícita que a autorize.
- Execução de código gerado acontece em ambiente isolado, com rede e sistema de arquivos
  restritos.

## Contexto, memória e custo

O contexto é o recurso mais escasso: cada token disputa a atenção do modelo e custa dinheiro.
Layout estável para aproveitar cache de prompt, compactação que preserva decisões e
pendências, memória fora do contexto e recuperação sob demanda:
[references/contexto-memoria-e-custo.md](references/contexto-memoria-e-custo.md).

## Independência de provedor

- **Adaptador único** traduz mensagens, ferramentas e respostas entre o formato interno e
  cada API. Troca de modelo é configuração, não reescrita.
- **Saída estruturada sempre validada** por schema no código, com nova tentativa limitada em
  caso de formato inválido.
- **Recursos exclusivos** de um provedor entram atrás de uma interface com alternativa.
- **Avalie com mais de um modelo** antes de declarar um prompt "pronto": o que funciona por
  acaso num modelo quebra em outro.
- Modelos e versões ficam em configuração, com o identificador exato (não apelidos que mudam
  de significado).

## Planejamento e tarefas longas

- Tarefa com várias etapas começa com um plano curto e verificável; o plano é revisto a cada
  observação relevante.
- Decomponha em subtarefas com critérios de aceite; subagentes recebem contexto
  autossuficiente (skill `orquestracao-multiagente`).
- Progresso e decisões ficam em arquivos/estado persistente, não só no histórico da conversa.

## Agentes que aprendem ou se modificam

Um agente que altera o próprio prompt, ferramentas, skills ou código precisa de travas que
ele não consegue alterar. Verificação mecânica, revisão independente, reversão fácil e
catálogo de antipadrões: [references/auto-evolucao-segura.md](references/auto-evolucao-segura.md).

## Antes de ir para produção

Percorra [references/checklist-de-producao.md](references/checklist-de-producao.md):
segurança, avaliação, observabilidade, custos, falhas e operação.

## Armadilhas

- **Prompt como controle de acesso** ("não revele dados de outros clientes").
- **Ferramenta genérica demais** (`executar_sql`, `rodar_shell`) exposta sem política.
- **Histórico que cresce sem limite** até estourar a janela e degradar as respostas.
- **"Concluído" declarado pelo modelo** sem verificação pelo código.
- **Trocar de modelo sem rodar as avaliações**.
