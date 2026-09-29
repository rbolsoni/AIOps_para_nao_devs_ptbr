---
name: observabilidade
description: >-
  Use ao adicionar ou revisar logs, monitoramento de erros (Sentry e similares),
  métricas, rastreamento (tracing, OpenTelemetry), health checks, alertas e tarefas
  agendadas, ao investigar erro ou comportamento estranho em produção, ou ao configurar
  ferramentas de telemetria no build e no deploy. Garante logs estruturados sem dados
  pessoais nem segredos, erros acionáveis, alertas que chegam a alguém e telemetria que
  nunca derruba a aplicação nem a release.
license: MIT
metadata:
  categoria: operacao
  versao: "1.0.0"
---

# Observabilidade

Observabilidade é conseguir responder "o que está acontecendo e por quê?" sem colocar um
`print` novo e fazer outro deploy. Ela precisa estar pronta **antes** do problema.

## Logs

- **Estruturados** (JSON), com nível (`debug`, `info`, `warn`, `error`), horário em UTC,
  nome do serviço, ambiente e um **identificador de correlação** por requisição/tarefa que
  atravessa todos os serviços.
- **Mensagem que responde o quê, onde e com qual entrada** (identificadores, não dados
  pessoais): `pedido 8f2c… recusado: estoque insuficiente (item 91, pedido 3, disponível 1)`.
- **Nunca registre**: senha, token, chave, cookie de sessão, cabeçalho `Authorization`, número
  de cartão, documento completo, corpo inteiro de requisição com dados pessoais. Mascare na
  origem; filtros depois do fato falham.
- `error` é para o que precisa de ação. Se ninguém vai agir, é `warn` ou `info`.

## Monitoramento de erros

- Capture exceções não tratadas no servidor e no cliente, com versão da release, ambiente e
  usuário **pseudonimizado** (ID, nunca e-mail).
- Desligue captura automática de corpo de requisição, campos de formulário e *breadcrumbs* de
  console que possam conter dados pessoais; revise a gravação de sessão (mascarar texto e
  campos).
- **Source maps sobem pela esteira**, associados à versão. Se um arquivo local carrega o
  token do serviço, um build na máquina de alguém publica artefatos no monitoramento real —
  deixe o token só na esteira, ou avise o usuário antes de rodar o build.
- **Telemetria é opcional para a release**: falha no envio de source maps ou de eventos gera
  aviso, nunca derruba o build nem o deploy.
- A CSP precisa liberar o endereço de ingestão (`connect-src`) e, se houver gravação de
  sessão com worker, `worker-src blob:` (skill `headers-de-seguranca`).

## Métricas e rastreamento

- Por serviço/rota: **taxa** de requisições, **erros** e **duração** (percentis, não média).
- Por recurso: uso, saturação e erros (CPU, memória, conexões de banco, fila).
- Rastreamento distribuído com OpenTelemetry quando houver mais de um serviço; propague o
  identificador de correlação.
- Métricas de negócio que denunciam falha silenciosa: pedidos por hora, cadastros,
  pagamentos aprovados. Um zero inesperado aqui é um incidente.

## Saúde e alertas

- **`/health`** (o processo está de pé) separado de **`/ready`** (dependências respondem:
  banco, fila). Balanceador usa `ready`.
- Alerta **acionável**: diz o que está errado, o impacto e onde começar; tem dono; chega a
  um canal que alguém lê. Alerta que dispara toda semana sem ação é desligado ou corrigido.
- **Tarefa agendada avisa quando NÃO roda** (sinal de vida / *dead man's switch*): o cron que
  falha em silêncio, ou que não roda porque a máquina estava desligada, é o mais perigoso.
- Checagens agendadas da própria esteira (drift de banco, varreduras) também alertam quando
  falham.

## Investigando em produção

1. Diga em qual ambiente está observando e em que período.
2. Parta do sintoma (métrica, erro, relato), encontre o identificador de correlação, siga os
   logs do caminho.
3. **Confirme na fonte antes de concluir**: número estranho num painel exige consultar a
   tabela de origem, o cache e a função que calcula, separadamente. "Não tem dado ainda"
   já escondeu um cache com regra de validade errada.
4. Transforme a descoberta em proteção (skill `incidente-vira-checagem`).

## Armadilhas

- **Log com o objeto inteiro do usuário** "para depurar" e esquecido em produção.
- **Amostragem que descarta justamente os erros raros**: erros não entram na amostragem de
  performance.
- **Alerta para o e-mail de quem saiu da equipe.**
- **Health check que só responde "ok"** enquanto o banco está fora.
