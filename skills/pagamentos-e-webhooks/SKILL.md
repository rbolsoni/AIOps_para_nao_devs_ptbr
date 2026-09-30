---
name: pagamentos-e-webhooks
description: >-
  Use ao integrar pagamento ou cobrança (cartão, Pix, boleto, assinatura), checkout, gateway
  (Stripe, Mercado Pago…), webhook de pagamento, reembolso ou liberar acesso após o pagamento.
  Garante valor definido no servidor e confirmação só por aviso verificado, sem cobrança nem
  entrega em dobro.
license: MIT
metadata:
  categoria: seguranca-e-conformidade
  versao: "1.0.0"
---

# Pagamentos e webhooks

Erro de pagamento não se desfaz com um deploy: cobrança em dobro, acesso liberado sem
pagamento, pedido marcado como pago por quem abriu a página de sucesso. Quase todo erro está
em quatro perguntas: quem define o valor, quem confirma o pagamento, o que acontece quando o
aviso chega duas vezes ou fora de ordem, e como testar sem dinheiro de verdade.

## Regras

1. **O valor sai do servidor.** O cliente manda só o que quer comprar (id do plano ou do
   item, quantidade). Preço, desconto, taxa, total e moeda são calculados no servidor a partir
   do catálogo, e o cupom é validado lá. Valor em centavos (inteiro) ou tipo decimal, nunca
   ponto flutuante.
2. **Checkout do provedor.** Use a página ou o componente de pagamento do provedor. Número de
   cartão nunca passa pelo seu servidor: isso traria toda a exigência do PCI DSS para o
   projeto.
3. **Quem confirma é o aviso do provedor, não a tela de sucesso.** A página de retorno é só
   navegação: qualquer pessoa abre a URL. Marque como pago, libere acesso ou entregue apenas
   ao processar o webhook verificado, ou depois de consultar a API do provedor pelo id.
4. **Confira a origem do aviso.** Verifique a assinatura do webhook com o segredo do endpoint,
   sobre o corpo bruto da requisição, com comparação de tempo constante e tolerância de
   horário. Assinatura que não confere: responda 400 e não processe. Provedor sem assinatura:
   use o aviso só como gatilho e confirme consultando a API pelo id.
5. **Responda rápido, processe depois.** Responda 2xx em poucos segundos e processe numa fila
   ou tarefa separada. Resposta lenta vira reenvio, e reenvio sem idempotência vira entrega
   em dobro.
6. **Aviso repetido e fora de ordem é normal.** Grave o id de cada evento numa tabela com
   restrição de unicidade e ignore o repetido. Não dependa da ordem de chegada: antes de
   mudar o pedido, consulte o estado atual no provedor e aplique só transições permitidas
   (um aviso atrasado de "pendente" não volta um pedido pago).
7. **Chamada que cria cobrança leva chave de idempotência.** Repetir a chamada depois de um
   timeout não pode cobrar duas vezes: envie a chave que o provedor aceita, derivada do
   pedido, e não uma nova a cada tentativa.
8. **Teste e produção separados.** Chave de teste só no ambiente de teste, chave de produção só
   em produção, cada uma no cofre do seu ambiente. Cada modo tem o seu segredo de webhook.
   Homologação nunca recebe o webhook de produção (skill `isolamento-de-ambientes`).
9. **Todo estado tem tratamento.** Recusado, pendente (Pix ou boleto aguardando), expirado,
   reembolsado, contestado e, em assinatura, inadimplente e cancelado. Acesso a plano pago
   segue o status da assinatura no provedor, atualizado pelos avisos.
10. **Conciliação periódica.** Uma rotina compara os pagamentos do provedor com os pedidos do
    banco e alerta a divergência: pago no provedor e pendente no banco é aviso perdido
    (skill `observabilidade`).
11. **Guarde o mínimo.** Ids do provedor e o que precisa mostrar (ex.: bandeira e últimos 4
    dígitos). Log sem número de cartão, token ou corpo inteiro do aviso (skill
    `privacidade-e-lgpd`).

Detalhes do fluxo, tabela de eventos e pseudocódigo em
[references/fluxo-seguro.md](references/fluxo-seguro.md). Cabeçalhos, prazos e ferramentas de
teste de cada provedor em [references/provedores.md](references/provedores.md): leia antes de
escrever a verificação de assinatura.

## Pix e boleto

- A cobrança tem validade. Vencida, crie outra: não reaproveite QR code nem código de barras.
- Pago só quando o aviso ou a consulta confirmar; "gerado" não é "pago".
- Devolução é uma operação própria no provedor. Pix também pode ser devolvido depois, a pedido
  do banco de quem pagou, em caso de fraude (Mecanismo Especial de Devolução): o pedido
  precisa de um estado para isso.

## Teste antes de ir ao ar

Simule os avisos com a ferramenta do provedor e exija estes resultados:

- [ ] Aviso repetido não entrega nem libera duas vezes.
- [ ] Aviso com assinatura errada ou sem assinatura é recusado.
- [ ] Aviso fora de ordem não faz o pedido voltar de estado.
- [ ] Pagamento recusado ou expirado não libera nada.
- [ ] Abrir a página de sucesso sem pagar não libera nada.
- [ ] O valor cobrado é o do servidor, mesmo com o formulário adulterado.

## Armadilhas

- **Corpo convertido antes da verificação.** Middleware que transforma o corpo em JSON para a
  rota inteira quebra a assinatura. Leia o corpo bruto só na rota do webhook.
- **Rota do webhook atrás de login, CSRF ou firewall.** O provedor recebe 401 ou 403 e desiste.
  Isente essa rota dessas proteções, sem desligar a verificação de assinatura.
- **Redirecionamento no endpoint.** HTTP para HTTPS ou barra no fim da URL: provedores tratam
  3xx como falha. Cadastre a URL final.
- **Segredo de teste em produção.** A assinatura nunca confere e todo aviso é recusado em
  silêncio. Monitore a taxa de recusa da rota.
- **Aviso que dispara o próprio aviso.** Atualizar o recurso no provedor dentro do handler
  gera um novo evento para o mesmo handler: laço e custo (skill `controle-de-custos`).
