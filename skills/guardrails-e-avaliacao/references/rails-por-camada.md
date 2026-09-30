# Guardrails por camada

## Entrada

- **Tamanho e formato**: limite de caracteres/tokens; recuse anexos de tipo inesperado.
- **Dados pessoais**: detecte (CPF, cartão, e-mail, telefone) e mascare antes de enviar ao
  provedor, quando o dado não for necessário para a tarefa.
- **Tópico**: classificador ou regras para manter o assistente no escopo; fora do escopo →
  resposta padrão, não improviso.
- **Injeção e jailbreak**: heurísticas (pedidos para ignorar instruções, trocar de papel,
  revelar o prompt) + classificador. Trate como sinal de risco, não como garantia: o que
  passar precisa encontrar a arquitetura preparada.

## Diálogo

- Fluxos permitidos definidos (ex.: consultar status, segunda via, falar com humano).
- Gatilhos de escalonamento: insatisfação, pedido de humano, tema sensível, repetição.
- Respostas padronizadas para recusa, com explicação curta e caminho alternativo.

## Recuperação

- Filtro por permissão antes da busca (o usuário só recupera o que poderia abrir).
- Rotule a origem de cada trecho no contexto ("documento enviado pelo usuário", "página
  externa").
- Remova ou neutralize instruções embutidas em documentos (texto oculto, comentários HTML).

## Execução

- Valide argumentos contra o schema **no código**.
- Aplique a classe de risco da ferramenta: executar, pedir aprovação ou recusar.
- Limites no código: valor máximo, quantidade, escopo (só dados do usuário atual), taxa.
- Confirme com o usuário ações irreversíveis, mostrando exatamente o que será feito.

## Saída

- **Formato**: valide contra o schema; tente de novo um número limitado de vezes.
- **Vazamento**: bloqueie segredos, trechos do prompt de sistema e dados pessoais de terceiros.
- **Renderização segura**: escape HTML; restrinja links e imagens a domínios permitidos (uma
  imagem com URL montada pode enviar dados do contexto para fora).
- **Fundamentação**: em respostas baseadas em documentos, exija citação da fonte e recuse
  afirmações sem suporte, quando a exatidão importa.
- **Conteúdo**: toxicidade, discurso de ódio, conselhos perigosos, conforme o domínio.

## Medindo os guardrails

Para cada guardrail, mantenha dois conjuntos:

- **deve bloquear** (ataques e violações reais) → mede falsos negativos;
- **deve permitir** (uso legítimo parecido) → mede falsos positivos.

Acompanhe as duas taxas a cada mudança. Um guardrail novo só entra se melhorar a primeira
sem estragar a segunda além do aceitável.
