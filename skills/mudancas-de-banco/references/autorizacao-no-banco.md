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

View de exposição mínima, somente leitura — por exemplo, o perfil que os outros usuários
veem (o autor de um comentário, um membro da equipe, um profissional num diretório):

```sql
create view public.perfis_publicos
with (security_invoker = false) as
  select id, nome_exibicao, foto_url from public.perfis where status = 'ativo';

-- Permissões declaradas uma a uma, sem depender do padrão da plataforma: tira tudo e
-- concede só o que a decisão pede.
revoke all on public.perfis_publicos from public, anon, authenticated;
grant select on public.perfis_publicos to authenticated;
-- Perfis visíveis sem login? Conceda também, de propósito, e registre no ADR:
-- grant select on public.perfis_publicos to anon;
```

Views que rodam com o privilégio do dono ignoram o RLS da tabela de base: isso é o que
permite expor só algumas colunas — e é também o motivo de listar colunas explicitamente e
declarar quem pode ler. Em projetos Supabase, objetos novos no schema `public` (views
incluídas) podem receber `select`, `insert`, `update` e `delete` para `anon` e
`authenticated` automaticamente: depende de quando o projeto foi criado e de a configuração
ter mudado, porque a plataforma está passando a exigir concessão explícita — confira na
documentação dela. Com essas permissões automáticas, revogar só a escrita deixa `anon` lendo
a view: qualquer visitante, sem login, vê os dados que ela expõe. Decida se a view exige
login ou é pública e registre a decisão num ADR.

Confira as permissões efetivas depois de aplicar a migração:

```sql
select
  has_table_privilege('anon', 'public.perfis_publicos', 'select') as anon_le,
  has_table_privilege('authenticated', 'public.perfis_publicos', 'select') as logado_le,
  has_table_privilege('anon', 'public.perfis_publicos', 'insert, update, delete') as anon_escreve,
  has_table_privilege('authenticated', 'public.perfis_publicos', 'insert, update, delete') as logado_escreve;
```

View só para quem fez login: `false`, `true`, `false`, `false`. View pública: `true`,
`true`, `false`, `false`. Qualquer `true` nas colunas de escrita é defeito.

Operação crítica, atômica e no servidor. O modelo consome um saldo genérico: na sua
aplicação, ele é o estoque de um produto, as vagas de uma turma ou de um horário, os
créditos de um plano, os ingressos de um evento. Troque os nomes e mantenha a estrutura.

```sql
create or replace function public.consumir_saldo(p_saldo uuid, p_qtd int)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare v_disponivel int; v_consumo uuid;
begin
  -- Primeiro os argumentos: o cliente chama a função com o que quiser. Sem esta linha,
  -- -5 passa pela checagem do saldo, soma 5 ao disponível e registra um consumo negativo;
  -- nulo também passa (comparar com nulo nunca dá verdadeiro) e apaga o saldo.
  if p_qtd is null or p_qtd <= 0 then raise exception 'quantidade inválida'; end if;
  if not privado.usuario_ativo() then raise exception 'conta inativa'; end if;
  select disponivel into v_disponivel from public.saldos where id = p_saldo for update;
  if v_disponivel is null or v_disponivel < p_qtd then raise exception 'saldo insuficiente'; end if;
  update public.saldos set disponivel = disponivel - p_qtd where id = p_saldo;
  insert into public.consumos (usuario_id, saldo_id, quantidade)
    values (auth.uid(), p_saldo, p_qtd) returning id into v_consumo;
  return v_consumo;
end;
$$;

revoke all on function public.consumir_saldo(uuid, int) from public, anon;
grant execute on function public.consumir_saldo(uuid, int) to authenticated;
-- e nenhuma política de INSERT direto em public.consumos para authenticated
```

Saldo que pertence a um usuário (os créditos do plano dele, por exemplo) confere o dono na
mesma leitura travada — `where id = p_saldo and usuario_id = auth.uid()` — ou é buscado pelo
próprio `auth.uid()`, sem receber o id do cliente. Sem isso, um usuário gasta o saldo de
outro passando o id dele.

Defesa em camadas: a tabela também recusa o absurdo, mesmo que outra função (ou um ajuste
manual) erre a conta.

```sql
alter table public.consumos add constraint consumos_quantidade_positiva check (quantidade > 0);
alter table public.saldos add constraint saldos_disponivel_nao_negativo check (disponivel >= 0);
-- CHECK aceita nulo: sem estas duas, quantidade nula passa pelas restrições acima e apaga o
-- saldo.
alter table public.consumos alter column quantidade set not null;
alter table public.saldos alter column disponivel set not null;
```

Em tabela grande que já existe, crie a restrição com `not valid` e valide depois
(`alter table … validate constraint …`), para não travar a escrita durante a varredura. Para
o `set not null`, valide antes um `check (coluna is not null)`: com ele validado, o Postgres
não varre a tabela de novo.

## Checagem empírica

Uma checagem na esteira, rodando contra a homologação já migrada, deve **tentar** o que é
proibido e exigir a recusa. Modelo de casos:

| Tentativa | Resultado esperado |
|---|---|
| Usuário A lê endereço do usuário B | zero linhas |
| Usuário bloqueado insere registro | erro de política |
| Usuário insere direto em `consumos` (sem a função) | erro de permissão |
| Usuário chama `consumir_saldo` com quantidade negativa, zero ou nula | recusada, saldo inalterado |
| Usuário consome o saldo de outro (quando o saldo tem dono) | recusada, saldo inalterado |
| Anônimo escreve na view de perfis públicos | erro de permissão |
| Anônimo lê a view de perfis públicos (quando ela exige login) | erro de permissão |
| Usuário altera o próprio papel para operador | recusado pela trigger |

Rode cada tentativa dentro de uma transação desfeita no fim (`ROLLBACK`), para não deixar
lixo no banco de homologação.
