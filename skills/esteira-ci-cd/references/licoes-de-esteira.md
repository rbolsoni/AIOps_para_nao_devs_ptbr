# Lições de esteira

Incidentes reais de uma esteira GitHub Actions + banco gerenciado + plataforma de deploy,
generalizados. Cada item: o sintoma, a causa e o que fazer.

## Passa sem ter feito nada

**Etapa condicionada à existência do segredo.**
Sintoma: release verde, migração aplicada, mas o front nunca foi ao ar.
Causa: `if: env.TOKEN != ''` pulou o deploy em silêncio porque o segredo não existia.
Faça: passe o segredo por `env:` e teste a presença dentro do `run:`, falhando com mensagem
que diz onde cadastrar. (No GitHub Actions, o contexto `secrets` não pode ser referenciado
diretamente em `if:`; o atalho comum de testar uma variável de ambiente ali é justamente o
que pula o passo em silêncio.)

**Checagem agendada que nunca rodou.**
Sintoma: uma verificação diária de divergência entre homologação e produção "existia", mas
a produção passou dias com schema desatualizado.
Causa: um único job tentava ler os segredos de dois environments; job sem `environment:`
não enxerga segredo de environment, e o job falhava todo dia na primeira etapa — sem ninguém
olhar.
Faça: um job por environment; alerte quando a checagem agendada falhar ou não rodar.

**Comando de espera que sai com sucesso.**
Sintoma: o agente/pessoa acompanhou os checks, o comando saiu com 0, e o run estava vermelho.
Causa: o job que falhou ainda não aparecia na lista de checks do PR.
Faça: confira a conclusão do run e dos jobs (`gh run view <id> --json conclusion,jobs`).

## Caminho paralelo para a produção

**Integração da plataforma de banco aplicando migração no merge.**
Sintoma: o passo de migração da release dizia "banco já atualizado" logo depois de um merge
com migração nova.
Causa: uma integração do provedor de banco com o GitHub aplicava migrações em produção ao
ver o push em `main`, segundos antes da esteira — sem passar pela trava.
Faça: desligue integrações desse tipo; a esteira é o único caminho. Se o passo de migração
voltar a dizer "já atualizado" com migração nova, confira se alguém religou.

**Deploy automático por git da plataforma de hospedagem.**
Faça: desligue por configuração versionada (ex.: `"git": {"deploymentEnabled": false}` no
`vercel.json`) e publique pela CLI oficial dentro da esteira.

## A trava que não trava

**Guarda de origem de PR tratada como bloqueio.**
Um workflow que falha quando o PR para `main` não vem de `staging` só **sinaliza**. Sem
regra que exija o check (indisponível em alguns planos), o merge acontece com ele vermelho.
Push direto em `main` nem dispara `pull_request`. A trava real é a release verificar o
commit promovido.

**Consulta à API sem permissão.**
Sintoma: a trava barrou uma release homologada com "não encontrado".
Causa: faltava `actions: read` no bloco `permissions`; a API devolveu 403 e o `set -e`
encerrou antes de qualquer diagnóstico.
Faça: trate a falha de consulta separadamente, com mensagem própria.

**Squash no PR de promoção.**
O commit que chega à `main` é novo e nunca rodou na homologação; a trava barra. Use merge
commit na promoção (squash pode continuar nos PRs de funcionalidade para a `staging`).

## Versão e release

**Todo merge virando release.**
Sintoma: um PR só de documentação gerou versão patch, imagem e deploy de produção.
Causa: o cálculo começava com `patch` como padrão e nenhum job tinha condição.
Faça: sem `feat`/`fix`/breaking, nenhuma versão; e documente a regra no mesmo lugar em que
ela é implementada.

**Tag antes do deploy.**
Se o deploy falha depois da tag, a versão publicada não corresponde ao que está no ar.
Crie a tag depois do deploy bem-sucedido.

## Conexão e ambiente de execução

**Banco inacessível só na esteira.**
Sintoma: `ECONNREFUSED` num endereço IPv6 e mensagem genérica sobre "restrições de rede".
Causa: a string de conexão direta do banco era só IPv6, e os runners hospedados não tinham
saída IPv6 funcional. Nada a ver com lista de IPs liberados.
Faça: use a string do pooler de conexões (IPv4) na esteira.

**Wrapper de terceiro com CLI antiga embutida.**
Sintoma: deploy falhando com "não foi possível obter as configurações do projeto".
Causa: a action de terceiros fixava uma versão antiga da CLI da plataforma.
Faça: use a CLI oficial diretamente, com versão fixada.

**Ferramenta ausente no runner próprio.**
Runner self-hosted não vem com o que a imagem hospedada traz (ex.: `gh`). O passo falha com
"command not found" e parece falha de homologação. Instale explicitamente, sem depender de
`sudo`.

## Runner próprio (self-hosted)

- **Cache remoto pode deixar mais lento.** O disco do runner próprio persiste; restaurar um
  cache de centenas de MB pela rede custava mais que o trabalho que ele acelerava (metade
  do tempo do pipeline). Meça antes de ativar cache.
- **Máquina desligada = fila parada.** Push fica esperando e agendamentos simplesmente não
  rodam, sem alerta. Monitore a disponibilidade do runner.
- **Segredos de produção passam a rodar na máquina do dono.** Registre esse risco em ADR.
- **Rótulo errado prende o job para sempre em "Waiting for a runner"**, sem falhar.

## Sinais de alerta ao revisar um workflow

- [ ] `if:` que depende de segredo existir.
- [ ] Workflow sem `permissions:` explícito.
- [ ] Action referenciada por tag (`@v4`) em vez de SHA.
- [ ] `npm install` (ou equivalente que altera lockfile) na esteira.
- [ ] Job de produção sem `environment:`; segredo de produção no nível do repositório.
- [ ] `cancel-in-progress: true` em workflow de deploy de produção.
- [ ] Release/tag criada antes do deploy.
- [ ] Nenhuma etapa que prove que o deploy está de pé (teste de fumaça).
