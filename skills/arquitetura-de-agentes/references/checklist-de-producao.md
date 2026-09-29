# Checklist de produção para agentes

## Segurança

- [ ] Toda ferramenta tem classe de risco; ações de classe 3 e 4 exigem aprovação.
- [ ] Credenciais fora do contexto do modelo; injetadas pelo harness.
- [ ] Conteúdo externo tratado como dado; agente que o lê não tem ferramentas de alto risco
      sem aprovação.
- [ ] Execução de código em ambiente isolado com rede restrita.
- [ ] Guardrails de entrada e saída ativos (skill `guardrails-e-avaliacao`).
- [ ] Autorização por usuário aplicada pelo código em toda ferramenta que lê dados.
- [ ] Dados pessoais enviados ao provedor avaliados (skill `privacidade-e-lgpd`).

## Qualidade

- [ ] Conjunto de avaliação com casos reais, incluindo casos adversariais.
- [ ] Avaliações rodam na esteira a cada mudança de prompt, ferramenta ou modelo.
- [ ] Testado com ao menos dois modelos, ou com o modelo exato de produção fixado.
- [ ] Saídas estruturadas validadas por schema.

## Observabilidade

- [ ] Rastro por passo: entrada, ferramenta, argumentos, resultado, tokens, custo, latência.
- [ ] Identificador de correlação por tarefa.
- [ ] Painel com taxa de sucesso, custo por tarefa, latência, uso de ferramentas e recusas de
      guardrail.
- [ ] Rastros sem segredos e com dados pessoais mascarados.

## Custos e limites

- [ ] Orçamento por tarefa e por usuário, com corte no código.
- [ ] Limite de passos e de tempo por execução.
- [ ] Alerta de gasto anormal.

## Falhas

- [ ] Nova tentativa com espera crescente para erros transitórios do provedor.
- [ ] Alternativa quando o provedor está fora (outro modelo ou degradação controlada).
- [ ] Tarefas longas retomáveis a partir do estado salvo.
- [ ] Ações idempotentes (repetir não duplica efeito).

## Operação

- [ ] Modelos e versões em configuração, com identificador exato.
- [ ] Prompts e ferramentas versionados; mudança passa por PR e avaliação.
- [ ] Botão de desligar: dá para desabilitar o agente ou uma ferramenta sem deploy.
- [ ] Runbook: o que fazer quando o agente se comporta mal.
