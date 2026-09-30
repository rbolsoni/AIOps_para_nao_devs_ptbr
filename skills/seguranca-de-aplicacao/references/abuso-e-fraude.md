# Abuso e fraude

Leia ao escrever ou revisar login, cadastro, recuperação de senha, formulário público, envio
de SMS ou e-mail, cupom, indicação, teste grátis ou qualquer rota que custa dinheiro. Abuso
não quebra a regra de acesso: usa o app do jeito que ele foi feito, em volume ou com contas
falsas. Por isso passa por revisões que só procuram falha de permissão.

## Por ataque

| Ataque | Sinal | Defesa |
|---|---|---|
| Teste de senhas vazadas em massa (credential stuffing) | muitos logins falhos, de muitos IPs, em muitas contas | limite por conta **e**, separado, por IP; MFA; checagem de senha vazada; alerta quando a taxa de falha subir |
| Descoberta de quais contas existem | resposta diferente para "conta não existe" e "senha errada" no login, no cadastro ou na recuperação | a mesma mensagem, no mesmo tempo, para todo resultado |
| Cadastro falso em massa | pico de cadastros, e-mails descartáveis, muitos do mesmo IP | captcha no cadastro; limite por IP; o que custa dinheiro só depois do e-mail confirmado |
| Disparo de SMS pago (SMS pumping) | muitos códigos para números de países que o app não atende | libere no provedor só os países atendidos; limite por número, por IP e por sessão; captcha antes de enviar; detecção de fraude do provedor, se houver; teto de gasto (`controle-de-custos`) |
| Bombardeio de e-mail pelo formulário | cadastro ou "esqueci a senha" repetidos com o e-mail de uma vítima | limite por destinatário; nada de reenviar em série para endereço não confirmado; captcha |
| Abuso de cupom, indicação ou teste grátis | várias contas atrás do mesmo benefício | regra no servidor, uma vez por conta e por meio de pagamento; benefício só depois do e-mail confirmado ou do primeiro pagamento |
| Robô que copia os dados do app | listagens percorridas em sequência, sem uso humano | login para dado que não é público; limite e paginação; id não sequencial em URL pública |
| Robô consumindo rota paga (IA, busca, geração) | gasto sobe sem aumento de usuários | login, limite por usuário, teto diário e alerta de gasto (`controle-de-custos`) |

## Captcha

Use o captcha de um provedor (Cloudflare Turnstile, hCaptcha, reCAPTCHA e similares) nas ações
que um robô repete: cadastro, recuperação de senha, envio de SMS, formulário de contato.
Confira o token **no servidor**, a cada ação: captcha verificado só no navegador não impede
nada. Captcha não substitui limite de taxa; use os dois.

## Limite de taxa que funciona

- **Chave do limite:** conta, IP e, quando fizer sentido, destinatário (telefone, e-mail). IP
  sozinho não identifica ninguém: redes móveis e empresas compartilham o mesmo.
- **Contador compartilhado:** guarde fora da memória do processo (Redis, banco ou o recurso do
  provedor de hospedagem). Em serverless e com várias instâncias, cada cópia teria o seu
  contador e o limite não valeria.
- **Resposta:** 429 com mensagem clara e espera crescente, em vez de bloqueio permanente, para
  o limite não virar arma contra o próprio usuário.

## Detectar

- Métrica por hora de cadastros, logins falhos, SMS e e-mails enviados, com alerta de pico
  (`observabilidade`).
- Alerta de gasto em SMS, e-mail e IA (`controle-de-custos`).
