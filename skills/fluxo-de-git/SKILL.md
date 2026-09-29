---
name: fluxo-de-git
description: >-
  Use ao criar branch, fazer commit, escrever mensagem de commit, abrir, descrever ou
  mesclar pull request, resolver conflito, fazer rebase ou revert, criar tag, ou quando o
  usuário pedir para "subir", "salvar no GitHub", "versionar", "commitar" ou "publicar"
  código. Define branches de trabalho, Commits Convencionais ligados ao versionamento
  semântico, PRs pequenos e revisáveis, e proíbe atalhos perigosos como force push, pular
  hooks, commitar direto na branch principal ou incluir arquivos de segredo.
license: MIT
metadata:
  categoria: projeto-e-entrega
  versao: "1.0.0"
---

# Fluxo de git

O histórico do git é o registro oficial do que mudou e por quê — e, com Commits
Convencionais, é também o que decide a próxima versão. Um commit mal feito pode vazar uma
chave, disparar uma release indevida ou apagar o trabalho de outra pessoa.

## Regras para o agente

1. **Commit e push só quando o usuário pedir.** Terminar a tarefa não autoriza publicar.
   Em repositório público, confirme antes do push: o que sobe fica visível e pode ser
   copiado ou indexado mesmo depois de apagado.
2. **Nunca na branch principal.** Crie branch de trabalho a partir da branch base definida
   no `AGENTS.md` (`main`, ou `staging` quando existe homologação).
3. **Nunca:** `push --force` em branch compartilhada, `--no-verify` para pular hooks,
   `commit --amend` em commit já publicado, reescrever histórico sem combinar com o time.
   Se um hook falhar, corrija a causa.
4. **Olhe antes de adicionar.** Rode `git status` e revise `git diff --staged` antes de cada
   commit. Evite `git add -A`/`git add .` às cegas: é assim que `.env`, chaves e arquivos
   gerados entram no histórico. Adicione arquivos pelo nome.
5. **Depois do push, confira a esteira pela conclusão do run** (status final e jobs), não
   pelo código de saída de um comando que "acompanha" os checks.

## Branches

- Nome: `tipo/descricao-curta` — `feat/filtro-por-cidade`, `fix/total-zerado`,
  `docs/guia-de-deploy`.
- Vida curta: uma branch por assunto, mesclada em dias, não em meses.
- Mantenha atualizada com a base (merge ou rebase local, conforme o costume do projeto).

Qual é a branch base e como se chega à produção (tronco único ou promoção
`staging` → `main`) é decisão da esteira; veja a skill `esteira-ci-cd`.

## Commits Convencionais

Formato: `tipo(escopo opcional): descrição no imperativo, minúscula, sem ponto final`.

| Tipo | Uso | Versão semântica |
|---|---|---|
| `feat` | funcionalidade nova para o usuário | minor |
| `fix` | correção de defeito | patch |
| `feat!` / `fix!` ou rodapé `BREAKING CHANGE:` | quebra de compatibilidade | major |
| `docs` | só documentação | nenhuma* |
| `test` | só testes | nenhuma* |
| `refactor` | reestruturação sem mudar comportamento | nenhuma* |
| `perf` | melhoria de desempenho | nenhuma* (ou patch, se o projeto decidir) |
| `ci`, `build`, `chore`, `style` | esteira, build, manutenção, formatação | nenhuma* |

\* **Confira na esteira.** A tabela descreve a convenção; o que vale é o que o workflow de
release implementa. Há esteiras que geram versão e deploy em *todo* merge — nesse caso, um
`docs:` também vai para produção. Se a doc e a esteira divergem, avise o usuário.

Mensagem boa:

```
fix(carrinho): confere o raio de entrega pelo município do IBGE

O raio era calculado pelo nome da cidade digitado, que falhava com acento e
homônimos. Agora usa o código do município.

Closes #274
```

- **Assunto** diz o que muda; **corpo** diz por quê e o que não é óbvio.
- Um commit, um assunto. Refatoração e mudança de comportamento em commits separados.
- Nunca inclua segredo, dado pessoal ou caminho da sua máquina na mensagem.

## Pull requests

- **Pequenos**: até algumas centenas de linhas de mudança real. PR grande é revisado por
  cima e esconde defeito.
- Descrição no modelo do projeto (veja `documentacao-viva`): o que muda e por quê, como
  verificar, o que rodou de fato, riscos e passos manuais.
- O CI do PR precisa fechar verde. Saiba o que ele **não** cobre: há esteiras em que as
  etapas de banco só rodam depois do merge na homologação — PR verde não prova que a
  migração aplica.
- Resolva conflito entendendo as duas mudanças; depois rode os testes de novo.

## Desfazer

- Commit já publicado: `git revert <sha>` (cria commit inverso, preserva o histórico).
- Push feito direto na branch errada: reverta por PR, no fluxo normal — não force push.
- Commit local ainda não publicado: pode ser refeito à vontade.
- **Segredo commitado**: revert não resolve, o valor continua no histórico. Siga
  `segredos-e-credenciais` (rotacionar primeiro).

## Tags e versões

Tags seguem SemVer com prefixo `v` (`v1.4.2`), são anotadas e criadas **pela esteira** a
partir dos commits — não à mão. Tag criada manualmente fora da esteira dessincroniza o
changelog e a versão publicada.

## Armadilhas

- **Hook que falha "sem motivo"**: normalmente é lint, formatação ou varredura de segredo
  pegando algo real. Leia a mensagem antes de qualquer outra coisa.
- **Terminações de linha**: se o diff mostra o arquivo inteiro alterado, é CRLF/LF. Não
  commite; corrija a causa (veja `.gitattributes` na skill `iniciar-projeto`).
- **Identidade errada**: confira `git config user.name` e `user.email` antes do primeiro
  commit num repositório novo — o autor fica gravado para sempre.
- **Revisão automática não é aprovação**: um check verde de lint não substitui a leitura
  do diff por alguém.
