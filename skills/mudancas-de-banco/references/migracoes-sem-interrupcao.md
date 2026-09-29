# Migrações sem interrupção: expandir → migrar → contrair

Durante qualquer deploy existe um intervalo em que o código antigo roda contra o banco
novo (ou o contrário, num rollback). Uma migração segura mantém os dois funcionando.

## As três fases

1. **Expandir** (release N): acrescente sem remover. Coluna nova anulável, tabela nova,
   índice novo. O código antigo ignora o que é novo.
2. **Migrar** (release N e N+1): o código passa a escrever no novo (e, se preciso, também
   no antigo); um processo em lotes copia os dados existentes; as leituras migram para o
   novo.
3. **Contrair** (release N+2, depois de confirmar que nada usa o antigo): remova coluna,
   tabela ou código de compatibilidade.

Cada fase é um PR e uma release. Pular fases é o que causa erro 500 no meio do deploy.

## Exemplo: renomear `clientes.fone` para `clientes.telefone`

| Release | Migração | Código |
|---|---|---|
| N | adiciona `telefone` (anulável) | escreve em `fone` **e** `telefone`; lê `fone` |
| N | — | job em lotes copia `fone` → `telefone` onde estiver vazio |
| N+1 | — | lê `telefone`; ainda escreve nos dois |
| N+2 | remove `fone` | só `telefone` |

## Preenchimento em lotes

```sql
-- repita até afetar zero linhas; cada execução é curta e idempotente
update clientes set telefone = fone
where id in (
  select id from clientes
  where telefone is null and fone is not null
  limit 1000
);
```

## Reversão

- Migração só de expansão é segura de manter mesmo revertendo o código.
- Contração não tem volta sem backup: confirme, antes, que nenhum código lê o que vai sair
  (busca no repositório + logs de consulta, se houver).
- Tenha ponto de restauração (backup/PITR) recente antes de qualquer contração em produção.
