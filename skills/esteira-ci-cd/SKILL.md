---
name: esteira-ci-cd
description: >-
  Use ao criar, alterar ou depurar pipelines de CI/CD (GitHub Actions, GitLab CI e
  similares), configurar deploy, release, versionamento semântico, homologação e
  produção, ou quando um workflow falhar, "passar sem rodar", ficar preso na fila,
  publicar algo indevido ou deixar passar código sem teste. Monta a esteira como trava:
  nada chega à produção sem ter passado verde, no mesmo commit, pela homologação — e
  deploy só acontece pela esteira.
license: MIT
metadata:
  categoria: projeto-e-entrega
  versao: "1.0.1"
---

# Esteira de CI/CD

A esteira é o único caminho até a produção, e é ela — não uma pessoa, não uma configuração
de painel — que impede código não testado de chegar lá. Pessoas esquecem, painéis mudam de
plano, e um check "obrigatório" pode não ser obrigatório no plano contratado. A trava que
funciona é a que vive dentro do próprio workflow.

## 1. Escolha o fluxo

| Situação | Fluxo | Modelo de release |
|---|---|---|
| Biblioteca, site estático, documentação, app sem banco compartilhado | **Tronco**: branch → PR → `main` → release | [release-tronco.modelo.yml](assets/github-actions/release-tronco.modelo.yml) |
| App com banco, migrações e deploy em homologação e produção | **Promoção**: branch → PR → `staging` (homologação) → PR → `main` (produção) | [release-promocao.modelo.yml](assets/github-actions/release-promocao.modelo.yml) |

Na dúvida, se existe banco de dados que sofre migração, use promoção: é na homologação que
a migração prova que aplica.

## 2. Etapas

1. **Validar** (todo PR e todo push): formatação, lint, tipos, testes com cobertura,
   varredura de segredos, licenças, vulnerabilidades.
2. **Build** e testes de ponta a ponta locais.
3. **Homologação** (push na `staging`): migrações no banco de homologação, checagens de
   banco que exercitam o comportamento real, deploy de homologação, teste de fumaça.
4. **Trava de promoção** (push na `main`): exige CI verde na `staging` para o mesmo commit e
   que a árvore publicada seja idêntica à dele.
5. **Versão**: calculada pelos Commits Convencionais
   ([scripts/proxima-versao.sh](scripts/proxima-versao.sh)); sem `feat`/`fix`/breaking, não há
   release nem deploy.
6. **Produção**: migrações, paridade de migrações, deploy, teste de fumaça.
7. **Tag e release** só depois do deploy bem-sucedido — a tag significa "isto está no ar".

Modelos prontos em `assets/github-actions/`: [CI](assets/github-actions/ci.modelo.yml),
[guarda de origem](assets/github-actions/guarda-origem.modelo.yml) e
[Dependabot](assets/github-actions/dependabot.modelo.yml). Para GitLab e outras
plataformas, leia [references/outras-plataformas.md](references/outras-plataformas.md).

## 3. Princípios

1. **A trava é a esteira.** Proteção de branch e rulesets podem não existir no plano
   gratuito para repositório privado; um `environment:` sem regra de proteção agrupa
   segredos mas não bloqueia nada. Não conte com o painel: a release verifica, pela API, que
   o commit promovido tem CI verde na homologação.
2. **Um único caminho para produção.** Desligue o deploy automático por git da plataforma
   de hospedagem e qualquer integração que aplique migração ao detectar merge. Dois atores
   publicando em produção é indistinguível de um no log — e o segundo não passa pela trava.
3. **Produção recebe o commit que foi homologado.** Promoção por merge commit (não
   squash); a release confere o segundo pai do merge e também que a árvore publicada é
   idêntica à dele. Squash cria um commit novo, que nunca rodou na homologação; e um commit
   que entrou direto na `main` iria junto na promoção seguinte se a release conferisse só o
   commit.
4. **Falhe alto.** Segredo ausente faz a etapa falhar com mensagem dizendo onde cadastrar.
   Nunca `if: segredo != ''` — isso termina verde sem ter feito nada.
5. **Não verificar ≠ reprovado.** Separe "não consegui consultar" (permissão, rede, API) de
   "consultei e não passou". Mensagens diferentes mandam investigar no lugar certo.
6. **Menor privilégio.** Declare `permissions:` em todo workflow. Ao declarar, todo escopo
   omitido vira `none` — a trava que consulta runs precisa de `actions: read`, ou a API
   responde 403.
7. **Segredos por ambiente.** Homologação e produção em environments separados. Um job só
   enxerga os segredos do seu `environment:`; tarefa que precisa dos dois ambientes vira dois
   jobs. Nunca promova segredo de produção a segredo do repositório inteiro.
8. **Reprodutível.** Actions fixadas por SHA completo (com a versão em comentário e o
   Dependabot atualizando); versões de ferramentas fixadas; instalação pelo lockfile.
   Prefira a CLI oficial da plataforma a wrappers de terceiros que embutem CLI antiga.
9. **Serviço opcional avisa, não bloqueia.** Envio de source maps, notificação de chat e
   afins usam `continue-on-error`. A release não pode depender deles.
10. **Saiba o que o CI do PR não prova.** Se as etapas de banco só rodam no push da
    homologação, PR verde prova lint, testes e build — não que a migração aplica. Escreva
    isso no `CONTRIBUTING.md`.
11. **Resultado se confere pela conclusão do run.** Comandos que acompanham checks podem
    sair com 0 num run que falhou. Consulte o status final e os jobs.

## 4. Como montar

- [ ] Escolher o fluxo (seção 1) e registrar num ADR.
- [ ] Copiar os modelos para `.github/workflows/` e `.github/scripts/proxima-versao.sh`.
- [ ] Substituir todos os `__MARCADORES__` pelos comandos do `AGENTS.md`; apagar etapas
      que não se aplicam. Nenhum marcador pode sobrar:
      `grep -rn "__[A-Z_]*__" .github/` deve voltar vazio.
- [ ] Resolver o SHA de cada action nova:
      `gh api repos/<dono>/<action>/git/ref/tags/<tag> --jq .object.sha` (se o tipo for
      `tag`, resolva de novo o objeto apontado até chegar num `commit`).
- [ ] Desligar deploy automático e integrações paralelas na plataforma (tarefa de painel —
      use `guiar-usuario-em-paineis`).
- [ ] Cadastrar segredos nos environments `staging` e `production` (tarefa de painel).
- [ ] Se o plano permitir, criar ruleset exigindo PR e CI verde na `main` (e na `staging`).
      Mesmo com ele, mantenha a trava na esteira.

## 5. Prove que a trava funciona

Uma trava que nunca foi vista barrando não é uma trava. Em um PR de teste (ou fork):

1. Faça um teste falhar de propósito → o CI do PR precisa ficar vermelho.
2. Remova um segredo obrigatório da homologação → a etapa precisa falhar com a mensagem
   que diz onde cadastrar.
3. Simule a promoção de um commit sem run verde na homologação → a release precisa abortar
   antes de calcular versão.
4. Num fork, faça um commit direto na `main` e depois uma promoção normal → a release
   precisa abortar mostrando o arquivo que difere da homologação.
5. Mescle só `docs:` → nenhuma tag e nenhum deploy.

Registre o resultado no PR que introduziu a esteira.

## Armadilhas

As mais caras estão acima; o catálogo completo, com contexto de cada incidente, está em
[references/licoes-de-esteira.md](references/licoes-de-esteira.md). Leia-o quando for
depurar uma esteira que falha, passa sem rodar ou fica presa na fila.
