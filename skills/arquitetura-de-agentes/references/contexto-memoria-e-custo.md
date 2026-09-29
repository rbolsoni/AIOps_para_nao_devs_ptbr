# Contexto, memória e custo

## Layout do contexto

Monte o contexto do mais estável para o mais variável:

1. Instruções de sistema (mudam raramente).
2. Definições de ferramentas (mudam raramente; ordem fixa).
3. Documentos de referência fixos da tarefa.
4. Memória e resumo do que já aconteceu.
5. Mensagens recentes.
6. A entrada atual.

Por quê: provedores que oferecem **cache de prompt** reaproveitam o prefixo idêntico entre
chamadas, cobrando menos e respondendo mais rápido. Qualquer coisa variável no começo (data
e hora, ID de requisição, ferramentas em ordem aleatória) invalida o cache inteiro.

## Hierarquia de instruções

Sistema > desenvolvedor > usuário > conteúdo de ferramenta. Instruções de nível mais baixo
não sobrescrevem as de nível mais alto; conteúdo de ferramenta não dá ordens.

## Compactação

Quando o histórico se aproxima do limite:

- Resuma o antigo preservando **decisões tomadas e seus motivos, pendências, fatos
  verificados (com a fonte), erros já cometidos e o que foi tentado sem sucesso**.
- Descarte saídas brutas de ferramentas já processadas (mantenha só a conclusão).
- Mantenha literais o pedido original e os critérios de aceite.
- Depois de compactar, o agente deve conseguir continuar sem refazer trabalho.

## Memória fora do contexto

- **Estado da tarefa** (plano, progresso, pendências) em arquivo ou banco, atualizado a cada
  passo relevante.
- **Memória de longo prazo** em arquivos pequenos, um fato por arquivo, com índice (skill
  `memoria-de-projeto`). O agente consulta o índice e abre só o que é relevante.
- **Memória que aprende** (preferências, correções) precisa de revisão: o que o agente
  "aprendeu" errado passa a ser repetido com confiança.

## Recuperação (RAG)

- Recupere pouco e relevante; mais documentos pioram a resposta quando são ruído.
- Guarde a origem de cada trecho e cite-a na resposta.
- Filtre por permissão **antes** de recuperar: o índice não pode devolver documento que o
  usuário não poderia abrir.
- Avalie a recuperação separadamente da geração (o trecho certo chegou? a resposta o usou?).

## Custo

- Meça tokens e custo por tarefa, não só por chamada.
- Use o modelo mais barato que passa nas avaliações para cada etapa (classificação e roteamento
  raramente precisam do modelo maior).
- Limite o tamanho das saídas de ferramentas e do histórico.
- Cache de respostas determinísticas (mesma entrada, mesma consulta) no seu lado.
- Orçamento por usuário/tarefa com corte no código.
