# Fluxo seguro de pagamento

Leia ao montar a integração ou ao revisar uma existente. Vale para qualquer provedor; os
detalhes de cada um estão em [provedores.md](provedores.md).

## 1. Criar a cobrança

```
rota POST /pagamentos (usuário logado):
    item = catálogo[pedido.id_do_item]              # preço e moeda vêm daqui, nunca do cliente
    total = calcular(item, quantidade, cupom_validado_no_servidor)   # em centavos, inteiro
    pedido = gravar pedido com status "pendente" e total
    cobranca = provedor.criar_cobranca(
        valor = total,
        referencia = pedido.id,                      # para achar o pedido quando o aviso chegar
        chave_de_idempotencia = "pedido-" + pedido.id,   # a mesma em toda nova tentativa
    )
    devolver ao cliente só o que ele precisa (URL do checkout, QR code do Pix)
```

## 2. Receber o aviso

```
rota POST /webhooks/<provedor>   (sem login, sem CSRF, com verificação de assinatura):
    corpo = corpo bruto da requisição (bytes), antes de qualquer conversão
    se assinatura não confere (corpo, cabeçalhos, SEGREDO_DO_WEBHOOK_DESTE_AMBIENTE):
        responder 400 e parar
    evento = interpretar(corpo)
    novo = inserir (provedor, evento.id) em eventos_de_pagamento, ignorando se já existir
    se novo: enfileirar processar(evento)
    responder 200                                   # em poucos segundos
```

```sql
create table eventos_de_pagamento (
  provedor      text        not null,
  evento_id     text        not null,
  tipo          text        not null,
  recebido_em   timestamptz not null default now(),
  processado_em timestamptz,
  primary key (provedor, evento_id)                 -- o repetido esbarra aqui
);
```

## 3. Processar

```
tarefa processar(evento):
    recurso = provedor.consultar(evento.id_do_recurso)   # estado atual, não o do aviso
    pedido = buscar pedido por recurso.referencia, travando a linha
    novo_status = traduzir(recurso.status)
    se transição (pedido.status → novo_status) está na tabela abaixo:
        atualizar pedido
        executar o efeito uma vez (liberar acesso, enviar e-mail, emitir nota)
    marcar evento como processado
```

Transições permitidas (o resto é ignorado e registrado):

| De | Para |
|---|---|
| pendente | pago, recusado, expirado |
| pago | reembolsado, contestado |
| contestado | pago (disputa ganha), reembolsado (disputa perdida) |

Assinatura: `ativa → inadimplente → ativa` (pagou) ou `→ cancelada`. O acesso segue o status,
e cada mudança vem de um aviso ou de uma consulta ao provedor.

## 4. Conciliar

Uma rotina diária lista os pagamentos do dia no provedor e compara com os pedidos:

- pago no provedor e pendente no banco: aviso perdido; processe e investigue por que não
  chegou;
- pago no banco e sem pagamento no provedor: erro grave; alerta imediato.

Registre a execução e o resultado (skill `observabilidade`): conciliação que para de rodar
sem ninguém notar é o mesmo que não ter conciliação.

## 5. Testar

Automatize os casos do checklist do `SKILL.md` com avisos simulados: o mesmo aviso duas vezes,
assinatura trocada, aviso de "pendente" depois de "pago", pagamento recusado e o formulário
com o valor adulterado. Em homologação, use as credenciais e o segredo de teste do provedor.
