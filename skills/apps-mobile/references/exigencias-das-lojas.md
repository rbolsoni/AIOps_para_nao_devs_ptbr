# Exigências das lojas que mais reprovam apps

Conferido na documentação e nos comunicados da Apple e do Google em 2026-09-30. As regras mudam
todo ano: confira a versão atual antes de publicar e registre num ADR o que foi decidido.

## Exclusão de conta

- **App Store:** app que permite criar conta precisa permitir iniciar a exclusão da conta de
  dentro do app (diretriz 5.1.1(v), exigida desde 30/06/2022). Desativar ou suspender não
  conta: a conta e os dados pessoais saem. Com Sign in with Apple, revogue os tokens do
  usuário pela API da Apple ao excluir.
- **Google Play:** o caminho dentro do app e também um link na web, informado no Play
  Console, para pedir a exclusão da conta e dos dados ligados a ela (fiscalização desde
  31/05/2024). Congelar ou desativar a conta também não conta.
- A exclusão apaga de verdade, inclusive em backups dentro do prazo de retenção, e o que a
  lei obriga a guardar fica registrado com o motivo (skill `privacidade-e-lgpd`).

## Privacidade declarada

- **App Store:** App Privacy, no App Store Connect, descreve os dados coletados pelo app e
  pelos SDKs.
- **iOS:** manifesto de privacidade (`PrivacyInfo.xcprivacy`) no app e nos SDKs de terceiros,
  com o motivo de uso de cada API sensível listada pela Apple. Desde 01/05/2024, o envio sem
  essas declarações é recusado. Ao incluir um SDK, confira se ele traz o próprio manifesto.
- **Google Play:** a seção Data safety precisa bater com o que o app e os SDKs coletam e
  compartilham.
- **Rastreamento entre apps** (identificador de publicidade no iOS) só depois do pedido de
  permissão do App Tracking Transparency.

## Login

- **App Store:** app que oferece login por serviço de terceiro ou rede social para a conta
  principal precisa oferecer também uma opção que limite os dados a nome e e-mail, deixe a
  pessoa esconder o e-mail e não rastreie o uso para publicidade sem consentimento. O Sign in
  with Apple atende; um serviço equivalente também (diretriz 4.8, atualizada em janeiro de
  2024).

## Plataforma

- **Google Play:** exige, todo ano, que o app mire uma versão recente do Android (SDK alvo).
  App que fica para trás deixa de poder publicar atualizações.
- **Texto das permissões no iOS:** cada permissão usada tem a frase de justificativa no
  `Info.plist`, escrita para quem usa o app.

## Onde procurar quando algo mudar

- Apple: App Store Review Guidelines e a página de novidades do Apple Developer.
- Google: políticas do Google Play (Central de Políticas) e a Central de Ajuda do Play Console.
