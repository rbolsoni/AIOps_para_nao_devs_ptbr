# Avaliação de agentes e aplicações com LLM

## 1. Monte o conjunto de casos

- Comece com 10 a 30 casos reais e representativos; cresça com cada falha encontrada.
- Cada caso: entrada (e arquivos/contexto), resultado esperado em linguagem humana e, depois
  da primeira rodada, asserções verificáveis.
- Cubra: caminho feliz, casos-limite, entradas malformadas, casos adversariais, casos em que
  o certo é recusar ou pedir esclarecimento.
- Separe **treino** (~60%, usado para ajustar) e **validação** (~40%, só para conferir se a
  melhora generaliza), com a mesma proporção de tipos em cada um.

## 2. Escolha as verificações

| Tipo | Serve para | Exemplo |
|---|---|---|
| Asserção por código | o que é objetivo | JSON válido; ferramenta `buscar_pedido` chamada com o ID certo; resposta contém o número do pedido |
| Juiz por modelo | qualidade com critério claro | "a resposta explica o motivo da recusa e oferece alternativa" — com rubrica e exigência de citar o trecho |
| Revisão humana | o que ninguém pensou em verificar | amostra de saídas lidas por alguém do domínio |

Boas asserções são específicas e observáveis. Evite as vagas ("a resposta é boa") e as
frágeis (exigir uma frase exata).

## 3. Rode com linha de base

- Mesma suíte, duas configurações: atual × proposta (ou sem × com a mudança).
- Cada caso executado várias vezes (3 é um bom começo); registre taxa de aprovação, tokens,
  tempo e custo.
- Cada execução começa com contexto limpo.

## 4. Analise

- Asserção que passa sempre nas duas configurações não mede nada — troque.
- Asserção que falha sempre nas duas pode estar errada — revise.
- Casos que passam só com a mudança mostram o valor dela; entenda por quê.
- Alta variação entre execuções indica instrução ambígua ou caso instável.
- Leia os rastros dos piores casos, não só a nota final.

## 5. Coloque na esteira

- Suíte rápida (asserções por código + subconjunto) em todo PR que mexe em prompt,
  ferramenta, modelo ou guardrail.
- Suíte completa (com juiz) antes de release e em mudança de modelo.
- Limite mínimo de aprovação por categoria; regressão em casos de segurança bloqueia.

## Juiz por modelo: como não se enganar

- Rubrica explícita, com o que conta como aprovado e reprovado.
- Exija **evidência** (trecho da saída) para cada aprovação; sem evidência, reprova.
- Para comparar versões, use comparação às cegas (o juiz não sabe qual é qual) e alterne a
  ordem.
- Calibre o juiz com casos já avaliados por humanos antes de confiar nele.
