# Banco e consultas

## Ler o plano de execução

`EXPLAIN ANALYZE <consulta>;` mostra o plano e os tempos reais no PostgreSQL e no MySQL 8.
Ele **executa** a consulta: rode em homologação e, para comandos que escrevem, dentro de uma
transação desfeita no fim (`ROLLBACK`).

O que procurar:

- **Varredura da tabela inteira** (`Seq Scan` no PostgreSQL; `type: ALL` no `EXPLAIN` do MySQL)
  numa tabela grande, com um filtro que deveria trazer poucas linhas → falta índice.
- **Linhas estimadas muito diferentes das reais** → estatísticas desatualizadas; atualize-as
  (`ANALYZE` no PostgreSQL, `ANALYZE TABLE` no MySQL).
- **Ordenação que vai para o disco** ou **laço aninhado sobre muitas linhas** → índice na coluna
  de ordenação ou de junção.

## N+1 e carregamento em lote

| ORM | Sintoma | Carregue em lote com |
|---|---|---|
| Prisma | `findMany` seguido de uma consulta por item | `include` ou `select` aninhado |
| Django | acesso a chave estrangeira ou relação reversa dentro do laço | `select_related` (FK e 1:1) e `prefetch_related` (N:N e reversa) |
| Rails (Active Record) | `pedido.cliente` dentro do laço | `includes` (ou `preload` e `eager_load`) |
| SQLAlchemy | relação preguiçosa acessada no laço | `selectinload` ou `joinedload` |
| Entity Framework | propriedade de navegação acessada no laço | `Include` e `ThenInclude` |

Confirme no log de consultas, ou na ferramenta de perfil do framework, que o número de consultas
não cresce com o número de itens.

## Paginação por cursor (keyset)

```sql
-- primeira página
select id, criado_em, total from pedidos
order by criado_em desc, id desc
limit 50;

-- próximas páginas: continue depois da última linha recebida
select id, criado_em, total from pedidos
where (criado_em, id) < (:ultimo_criado_em, :ultimo_id)
order by criado_em desc, id desc
limit 50;
```

Com um índice em `(criado_em, id)`, o custo não cresce com o número da página, e registros
novos não fazem a lista pular nem repetir itens. O `id` desempata linhas com o mesmo horário.

## Conexões

Cada execução serverless pode abrir conexões novas, e o banco tem um limite baixo delas. Use o
pooler de conexões do provedor, com o modo que a documentação dele indica para funções
serverless, e um limite pequeno de conexões por instância.
