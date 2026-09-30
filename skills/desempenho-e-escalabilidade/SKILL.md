---
name: desempenho-e-escalabilidade
description: >-
  Use quando o sistema estiver lento, pesado ou precisar aguentar mais usuários: consultas
  lentas, N+1, índices, paginação, cache, filas, imagens, bundle, Core Web Vitals, teste de
  carga — e ao escolher entre serverless, contêiner e servidor. Mede antes de otimizar.
license: MIT
metadata:
  categoria: projeto-e-entrega
  versao: "1.0.1"
---

# Desempenho e escalabilidade

Otimizar sem medir troca um problema conhecido por dois desconhecidos. Mas consulta N+1, tabela
grande sem índice e imagem de 5 MB na página inicial não são "otimização prematura": são
defeitos. Esta skill separa um do outro e dá o método.

## Regras

1. **Meça antes e depois, com número.** "Está lento" vira "a rota de relatórios leva 2,3 s no
   percentil 95" ou "o LCP da página inicial é 4,1 s no celular". Mude uma coisa por vez e meça
   de novo do mesmo jeito: sem o número de antes, não há como provar a melhora.
2. **Orçamento de desempenho vira checagem.** Defina metas (tempo das rotas principais, Core Web
   Vitals) e, quando der, confira na esteira, como a catraca de cobertura (`testes-e-qualidade`).
3. **Banco primeiro** — é onde mora a maior parte da lentidão:
   - **N+1**: uma consulta por item dentro de um laço. Carregue os relacionados em lote.
   - **Índice** para as colunas de filtro, junção e ordenação que as consultas usam de verdade,
     confirmado com `EXPLAIN`. Em tabela grande, crie sem travar a escrita
     (`mudancas-de-banco`).
   - **Paginação sempre**; em tabela grande, por cursor (keyset), não por `OFFSET` alto.
   - Só as colunas necessárias; transações curtas; pool de conexões — em serverless, o pooler
     do provedor.

   Plano de execução, N+1 por ORM e paginação por cursor:
   [references/banco-e-consultas.md](references/banco-e-consultas.md).
4. **Cache com regra de validade.** Estático e público vai para a CDN, com a versão no nome do
   arquivo. Dado privado nunca fica em cache compartilhado. Todo cache tem validade e
   invalidação explícitas — e mascara bug: uma "métrica zerada" já foi cache velho.
5. **Trabalho lento sai da requisição.** E-mail, PDF, integração lenta e processamento pesado vão
   para fila ou tarefa em segundo plano, idempotentes, com retentativa limitada e espera
   crescente. Toda chamada externa tem tempo limite.
6. **Front-end leve.** Imagem no tamanho e no formato certos, com largura e altura declaradas
   (evita a tela pular) e carregamento preguiçoso fora da primeira dobra; fontes que não
   bloqueiam o texto; JavaScript mínimo, dividido por rota; nada de biblioteca pesada para um
   utilitário pequeno. Metas e causas comuns:
   [references/front-end-e-web-vitals.md](references/front-end-e-web-vitals.md).
7. **Sem estado na aplicação.** Sessão, arquivos enviados e filas ficam fora da memória e do
   disco local do servidor; upload vai direto para o storage. Assim dá para ter mais de uma
   instância.
8. **Onde rodar** — decida pelo formato da carga e registre num ADR:

   | Opção | Serve bem | Cuidado |
   |---|---|---|
   | Serverless (funções) | tráfego irregular, começar sem servidor, pagar pelo uso | partida a frio, tempo máximo por execução, conexões de banco (use pooler), custo por execução em laço |
   | Contêiner gerenciado | API com tráfego constante, conexões longas, WebSocket | paga o tamanho mínimo mesmo parado, a menos que escale a zero |
   | Servidor ou VM | carga previsível, controle total, custo fixo | atualização, segurança e escala ficam com você |

9. **Teste de carga em homologação**, começando pequeno e olhando banco, erros e custo juntos
   (`controle-de-custos`). Em produção, só combinado e com plano de parada.

## Verificação

- [ ] O problema tem número antes e depois, medido do mesmo jeito.
- [ ] Consultas principais sem N+1, com índice confirmado por `EXPLAIN` e paginação.
- [ ] Cache com validade e invalidação explícitas; nada privado em cache compartilhado.
- [ ] Trabalho lento fora da requisição; toda chamada externa com tempo limite.
- [ ] Core Web Vitals dentro das metas nas páginas principais, no celular.

## Armadilhas

- **Índice em tudo**: cada índice deixa a escrita mais lenta e ocupa espaço. Crie o que uma
  consulta real usa.
- **Cache sem invalidação**: resposta velha servida como nova.
- **`OFFSET` alto** em tabela grande: o banco lê e descarta tudo o que vem antes.
- **Carregamento preguiçoso do ORM dentro de laço**: N+1 escondido.
- **`SELECT *` em tabela larga**: traz colunas pesadas que ninguém usa.
- **Conexão nova por requisição em serverless**: esgota o banco no primeiro pico.
- **Teste de carga em produção sem combinar**: derruba o sistema e gera conta.
- **Otimizar o que não é gargalo**: meça onde o tempo vai antes de mexer.
