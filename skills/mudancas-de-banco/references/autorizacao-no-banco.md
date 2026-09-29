# Autorização no banco

Quando o cliente (navegador, app) acessa o banco por uma API gerada a partir do schema —
PostgREST/Supabase, Hasura, Firebase e similares — a política de acesso do banco é a última
e principal barreira. Os exemplos usam PostgreSQL com Row Level Security (RLS); o raciocínio
vale para as regras de segurança de qualquer banco exposto.

## Princípios

1. **Negar por padrão.** Habilite RLS em toda tabela exposta; sem política, nada passa.
2. **Nenhuma política que libera tudo** (`USING (true)` / `WITH CHECK (true)`) para usuário
   autenticado ou anônimo. Toda política confere quem é o usuário ou qual é o papel dele.
3. **Leitura e escrita separadas.** `SELECT` e `INSERT/UPDATE/DELETE` têm políticas
   próprias; escrita é mais restrita.
4. **Conta bloqueada não escreve.** Toda política de escrita inclui a verificação de que o
   usuário está ativo — e o bloqueio encerra as sessões existentes. Bloquear por uma coluna
   que o próprio usuário pode alterar não bloqueia nada.
5. **Papel privilegiado com barreiras independentes.** Ex.: operador validado (a) no
   middleware da aplicação, (b) por uma função do banco e (c) por uma trigger que impede
   promover a si mesmo. Uma falha isolada não entrega o acesso.
6. **Colunas sensíveis não saem por acidente.** Tabela com dados pessoais é lida só pelo
   titular ou operador; terceiros leem uma view com as colunas mínimas, sem permissão de
   escrita.
7. **Arquivos também.** Buckets de documentos são privados, com política por usuário;
   download só por URL assinada de curta duração.

## Modelos (PostgreSQL)

Funções auxiliares ficam num schema não exposto pela API e são estáveis (para o
planejador poder cacheá-las por consulta):

```sql
create schema if not exists privado;

create or replace function privado.usuario_ativo()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and status = 'ativo'
  );
$$;

revoke all on function privado.usuario_ativo() from public;
grant execute on function privado.usuario_ativo() to authenticated;
```

Tabela do próprio usuário:

```sql
alter table public.enderecos enable row level security;

create policy enderecos_ler_proprios on public.enderecos
  for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy enderecos_escrever_proprios on public.enderecos
  for insert to authenticated
  with check (usuario_id = (select auth.uid()) and (select privado.usuario_ativo()));

create policy enderecos_atualizar_proprios on public.enderecos
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and (select privado.usuario_ativo()));
```

`(select auth.uid())` entre parênteses é avaliado uma vez por consulta, não por linha.
`auth.uid()` é do Supabase; em outro ambiente, use a função que devolve o usuário da sessão.

View de exposição mínima, somente leitura:

```sql
create view public.vitrine_fornecedores
with (security_invoker = false) as
  select id, nome_fantasia, cidade from public.perfis where tipo = 'fornecedor' and status = 'ativo';

revoke insert, update, delete on public.vitrine_fornecedores from anon, authenticated;
grant select on public.vitrine_fornecedores to authenticated;
```

Views que rodam com o privilégio do dono ignoram o RLS da tabela de base: isso é o que
permite expor só algumas colunas — e é também o motivo de revogar escrita e listar
colunas explicitamente. Registre a decisão num ADR.

Operação crítica, atômica e no servidor:

```sql
create or replace function public.fechar_pedido(p_item uuid, p_qtd int)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_estoque int; v_pedido uuid;
begin
  if not privado.usuario_ativo() then raise exception 'conta inativa'; end if;
  select estoque into v_estoque from public.itens where id = p_item for update;
  if v_estoque is null or v_estoque < p_qtd then raise exception 'estoque insuficiente'; end if;
  update public.itens set estoque = estoque - p_qtd where id = p_item;
  insert into public.pedidos (comprador_id, item_id, quantidade)
    values (auth.uid(), p_item, p_qtd) returning id into v_pedido;
  return v_pedido;
end;
$$;

revoke all on function public.fechar_pedido(uuid, int) from public, anon;
grant execute on function public.fechar_pedido(uuid, int) to authenticated;
-- e nenhuma política de INSERT direto em public.pedidos para authenticated
```

## Checagem empírica

Uma checagem na esteira, rodando contra a homologação já migrada, deve **tentar** o que é
proibido e exigir a recusa. Modelo de casos:

| Tentativa | Resultado esperado |
|---|---|
| Usuário A lê endereço do usuário B | zero linhas |
| Usuário bloqueado insere registro | erro de política |
| Usuário insere direto em `pedidos` (sem a função) | erro de permissão |
| Anônimo escreve na view de vitrine | erro de permissão |
| Usuário altera o próprio papel para operador | recusado pela trigger |

Rode cada tentativa dentro de uma transação desfeita no fim (`ROLLBACK`), para não deixar
lixo no banco de homologação.
