# Provedores: assinatura, prazos e teste

Conferido na documentação oficial de cada provedor em 2026-09-30. Provedores mudam cabeçalhos e
prazos: confira a versão atual antes de escrever a verificação e prefira a função de
verificação do SDK oficial a uma implementação própria.

## Stripe

- **Assinatura:** cabeçalho `Stripe-Signature`, com `t=` (horário) e `v1=` (HMAC SHA-256 do
  texto `<t>.<corpo>`). As bibliotecas oficiais verificam com o corpo bruto, o cabeçalho e o
  segredo do endpoint (`constructEvent` e equivalentes). Ignore esquemas diferentes de `v1`.
- **Tolerância de horário:** padrão de 5 minutos nas bibliotecas. Nunca use 0, que desliga a
  proteção contra reenvio malicioso.
- **Segredo:** um por endpoint, começando com `whsec_`; diferente entre modo de teste e de
  produção.
- **Resposta e reenvio:** responda 2xx antes da lógica demorada. Em produção, a Stripe tenta
  entregar por até três dias, com intervalo crescente; em área restrita, três vezes em
  poucas horas.
- **Ordem e duplicatas:** a ordem não é garantida. Registre os ids de evento processados; não
  use o horário do evento para decidir a ordem.
- **Idempotência:** cabeçalho `Idempotency-Key` nas chamadas que criam cobrança.
- **Referência do pedido:** `client_reference_id` ou `metadata` na sessão de checkout.
- **Teste local:** Stripe CLI, `stripe listen --forward-to localhost:<porta>/<rota>` (mostra o
  segredo de teste) e `stripe trigger <evento>`.
- **Eventos comuns:** `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid`,
  `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`,
  `charge.dispute.created`.

## Mercado Pago

- **Assinatura:** cabeçalho `x-signature`, com `ts=` e `v1=`. O texto assinado junta o id do
  recurso (`data.id` do aviso), o cabeçalho `x-request-id` e o `ts`, no formato
  `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, com HMAC SHA-256 e o segredo da
  aplicação. Os SDKs oficiais trazem a validação.
- **Segredo:** em Suas integrações → aplicação → **Webhooks → Configurar notificações**.
- **Resposta e reenvio:** responda `200` ou `201` em até 22 segundos. Sem resposta, o aviso é
  reenviado a cada 15 minutos; depois da terceira tentativa o intervalo aumenta, mas o envio
  continua.
- **Consulta:** o aviso traz o id; depois de responder, consulte o recurso pela API para
  obter o estado completo.
- **Idempotência:** cabeçalho `X-Idempotency-Key` (de 1 a 64 caracteres), obrigatório na
  criação de pagamento.
- **Referência do pedido:** `external_reference`.
- **Teste:** credenciais de teste e o botão **Simular** na configuração de webhooks, que
  dispara uma notificação de teste para o endpoint.

## Outros provedores

Para qualquer outro gateway (nacional ou internacional), procure na documentação: como o aviso
é assinado (HMAC com segredo, token fixo no cabeçalho ou nada), o prazo de resposta, a política
de reenvio, o cabeçalho de idempotência e o campo de referência do pedido. Aviso sem
assinatura HMAC serve só de gatilho: confirme sempre consultando a API pelo id.
