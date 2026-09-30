# Os mesmos princípios em outras plataformas

Os modelos da skill são para GitHub Actions. Os princípios valem em qualquer plataforma;
esta tabela mostra onde cada peça mora.

| Conceito | GitHub Actions | GitLab CI/CD | Azure Pipelines | Bitbucket Pipelines |
|---|---|---|---|---|
| Arquivo | `.github/workflows/*.yml` | `.gitlab-ci.yml` | `azure-pipelines.yml` | `bitbucket-pipelines.yml` |
| Segredos por ambiente | Environments + secrets | Variables com escopo de environment, "Protected" e "Masked" | Variable groups + Environments | Deployment variables |
| Aprovação/proteção de ambiente | Environment protection rules (depende do plano) | Protected environments (depende do plano) | Approvals and checks | Deployment permissions (depende do plano) |
| Menor privilégio do token | `permissions:` | `CI_JOB_TOKEN` com allowlist | Permissões do service connection | Escopo do app password/token |
| Fixar dependência de pipeline | action por SHA | `include:` com `ref:` fixo; imagem por digest | template com `ref:` fixo | pipe e imagem por versão/digest |
| Disparo após outro pipeline | `workflow_run` | `needs:` entre jobs / pipeline downstream | `resources.pipelines` | etapa seguinte no mesmo pipeline |

## A trava de promoção em qualquer plataforma

A lógica não muda:

1. Descubra o commit promovido (segundo pai do merge, ou o SHA do pipeline de origem).
2. Consulte a API da plataforma: existe execução do pipeline de homologação **concluída com
   sucesso** para esse SHA, na branch de homologação?
3. Confira que o que vai ser publicado é idêntico ao homologado (no git,
   `git diff --quiet <commit-homologado> HEAD`). Diferença significa mudança que entrou na
   branch de produção por fora da homologação e iria junto.
4. Falha de consulta → erro próprio ("não consegui verificar"). Nenhuma execução, nenhuma
   com sucesso ou árvore diferente → aborta antes de versão, migração e deploy.

## GitLab: esqueleto equivalente

```yaml
stages: [validar, build, homologacao, producao]

validar:
  stage: validar
  script:
    - __COMANDO_INSTALAR__
    - __COMANDO_LINT__
    - __COMANDO_TESTES__

homologacao:
  stage: homologacao
  environment: staging
  rules:
    - if: $CI_COMMIT_BRANCH == "staging"
  script:
    - test -n "$DATABASE_URL" || { echo "DATABASE_URL ausente no environment staging"; exit 1; }
    - __COMANDO_MIGRAR__
    - __COMANDO_DEPLOY_HOMOLOGACAO__

producao:
  stage: producao
  environment: production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - __TRAVA_DE_PROMOCAO__   # API de pipelines pelo SHA promovido + mesma árvore
    - __COMANDO_MIGRAR__
    - __COMANDO_DEPLOY_PRODUCAO__
```

Marque as variáveis de produção como *Protected* (só disponíveis em branches protegidas) e
*Masked* (ocultas no log).
