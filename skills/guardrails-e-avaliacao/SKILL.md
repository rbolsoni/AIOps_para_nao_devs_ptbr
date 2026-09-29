---
name: guardrails-e-avaliacao
description: >-
  Use ao proteger ou medir a qualidade de um agente, chatbot ou aplicação com LLM —
  guardrails de entrada e saída, detecção de prompt injection e jailbreak, filtragem de
  dados pessoais, controle de tópicos, validação de ações antes da execução, avaliações
  (evals), testes de regressão de prompts, LLM como juiz, red teaming, rastreamento e
  métricas de agentes — e ao avaliar se uma skill ativa e funciona. Vale para qualquer
  provedor e framework (NeMo Guardrails, NeMo Agent Toolkit, soluções próprias).
license: MIT
metadata:
  categoria: agentes-de-ia
  versao: "1.0.0"
---

# Guardrails e avaliação

Guardrails impedem que o sistema faça o que não deve; avaliações provam que ele faz o que
deve. Um sem o outro engana: guardrail sem avaliação não se sabe se bloqueia (ou se bloqueia
demais); avaliação sem guardrail mede um sistema que qualquer entrada maliciosa desvia.

## Guardrails em camadas

Coloque controles em cada ponto do fluxo, não só na entrada:

| Camada | Pergunta | Exemplos |
|---|---|---|
| **Entrada** | isto deve chegar ao modelo? | tentativa de injeção/jailbreak, dado pessoal desnecessário, tópico fora do escopo, tamanho |
| **Diálogo** | o agente deve seguir por este caminho? | fluxos permitidos, escalonamento para humano, recusa padronizada |
| **Recuperação** | este trecho pode entrar no contexto? | permissão do usuário sobre o documento, conteúdo suspeito, rótulo de origem |
| **Execução** | esta ação pode rodar com estes argumentos? | schema, classe de risco, limites, aprovação humana |
| **Saída** | isto pode ser mostrado ou enviado? | dado pessoal, segredo, prompt interno, formato/schema, afirmação sem fonte, toxicidade |

Detalhes e técnicas por camada: [references/rails-por-camada.md](references/rails-por-camada.md).

### Princípios

1. **Determinístico primeiro**: schema, lista permitida, expressão regular, verificação de
   permissão. Classificador por modelo vem depois, para o que regra não resolve.
2. **Falhar fechado no alto risco**: se o guardrail de uma ação de pagamento falhar ou
   demorar demais, a ação não acontece.
3. **Registrar toda decisão** (bloqueou, permitiu, com qual regra) para medir falsos positivos
   e falsos negativos.
4. **Separar privilégios**: quem lê conteúdo não confiável não executa ações de alto risco
   sem aprovação. Nenhum filtro de injeção é perfeito; a arquitetura precisa aguentar quando
   ele falhar (skill `arquitetura-de-agentes`).
5. **Saída do modelo é entrada não confiável para o resto do sistema**: escape ao renderizar
   (Markdown com links e imagens pode vazar dados por URL), valide antes de executar.

Frameworks como o NeMo Guardrails organizam essas camadas em configuração declarativa;
soluções próprias funcionam igual se cobrirem as cinco camadas e forem avaliadas.

## Avaliação

Método completo (conjunto de casos, tipos de verificação, juiz, linha de base, esteira):
[references/avaliacao-de-agentes.md](references/avaliacao-de-agentes.md). O essencial:

- **Casos reais** (conversas, pedidos, falhas passadas) valem mais que casos inventados;
  inclua casos adversariais e casos-limite.
- **Três tipos de verificação**: asserções por código (formato, valores, ferramenta chamada),
  juiz por modelo com rubrica e exigência de evidência, e revisão humana por amostra.
- **Sempre contra uma linha de base**: com e sem a mudança, ou versão nova contra a atual.
- **Várias execuções por caso**: modelos variam; meça taxa, não um resultado isolado.
- **Na esteira**: toda mudança de prompt, ferramenta, modelo ou guardrail roda a suíte, com
  limite mínimo de aprovação.
- **Custo e latência também são resultado**: melhora de 2 pontos que dobra o custo pode não
  valer.

## Observabilidade de agentes

- Rastro por passo, com entrada, decisão, ferramenta, argumentos, resultado, tokens, custo e
  tempo; siga as convenções do OpenTelemetry para IA generativa quando possível.
- Perfilamento para achar gargalos (qual ferramenta, qual etapa, qual modelo consome mais) —
  ferramentas como o NeMo Agent Toolkit fazem isso sobre agentes de vários frameworks.
- Amostras de produção alimentam o conjunto de avaliação (anonimizadas).

## Red teaming

Antes de publicar e periodicamente: injeção direta e indireta (em documentos, páginas,
e-mails), extração do prompt de sistema, exfiltração por links/imagens, abuso de ferramentas
(argumentos fora do esperado), escalada de privilégio, jailbreak por encenação, custo
(entradas que fazem o agente girar). Cada ataque bem-sucedido vira caso de avaliação
permanente (skill `incidente-vira-checagem`).

## Avaliando skills

Skills também se avaliam: se ativam quando devem (e só quando devem) e se melhoram o
resultado em relação a não tê-las. Formatos `evals/evals.json` e `evals/gatilhos.json` e o
procedimento: [references/avaliacao-de-skills.md](references/avaliacao-de-skills.md).

## Armadilhas

- **Juiz sem rubrica e sem evidência**: dá nota alta para resposta bem escrita e errada.
- **Suíte que só tem casos fáceis**: passa sempre, com ou sem a mudança; não mede nada.
- **Otimizar contra o conjunto inteiro**: ajusta-se aos casos e piora no mundo real. Separe
  treino e validação.
- **Guardrail que bloqueia tanto que o produto fica inútil** — meça recusas indevidas.
- **Mesmo modelo como agente e como juiz**, sem conferência humana: tende a aprovar a si
  mesmo.
