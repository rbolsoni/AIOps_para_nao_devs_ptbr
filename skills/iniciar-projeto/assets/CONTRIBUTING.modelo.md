# Como contribuir — <Nome do projeto>

## O essencial

1. Branch nova a partir de `<branch base>`, com nome `tipo/descricao-curta`.
2. Commits no padrão [Commits Convencionais](https://www.conventionalcommits.org/pt-br/).
3. PR para `<branch base>` usando o modelo; o CI precisa fechar verde.
4. Revisão aprovada → merge. <O que acontece depois do merge.>

## Antes de abrir o PR

Rode localmente:

```bash
<comando de formatação>
<comando de lint>
<comando de tipos>
<comando de testes>
<comando de varredura de segredos>
```

No PR, marque só o que rodou de fato.

## Commits e versões

| Tipo | Quando usar | Efeito na versão |
|---|---|---|
| `feat:` | funcionalidade nova | minor (1.**2**.0) |
| `fix:` | correção de bug | patch (1.2.**1**) |
| `feat!:` ou rodapé `BREAKING CHANGE:` | quebra de compatibilidade | major (**2**.0.0) |
| `docs:`, `chore:`, `test:`, `refactor:`, `ci:`, `style:`, `perf:` | demais mudanças | <nenhum, ou patch — confira na esteira> |

## Banco de dados

Toda mudança é uma migração versionada em `<pasta>`. Nada de SQL manual em painel.
A migração é aplicada pela esteira: primeiro na homologação, depois na produção.

## Segurança e dados pessoais

- Nenhum segredo no código, nem em teste ou exemplo.
- Dados reais de produção nunca vão para desenvolvimento ou testes.
- Vulnerabilidades são reportadas conforme o [SECURITY.md](SECURITY.md).

## Quem impede de quebrar a produção

<Descreva a trava real: ex.: "o job de homologação do release exige CI verde em staging
para o mesmo commit". Não cite proteções que o plano da hospedagem não oferece.>
