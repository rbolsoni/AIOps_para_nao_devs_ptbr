---
name: apps-mobile
description: >-
  Use ao criar ou publicar app mobile (React Native, Expo, Flutter, Swift, Kotlin): chave
  dentro do app, login, onde guardar token, deep link, permissões, atualização pelo ar e
  exigências e formulários da App Store e do Google Play (Data safety, privacidade). Evita
  segredo no pacote e reprovação.
license: MIT
metadata:
  categoria: projeto-e-entrega
  versao: "1.0.1"
---

# Apps mobile

Tudo o que vai para o aparelho está nas mãos de quem instalou: o pacote do app se abre em
minutos, o tráfego pode ser inspecionado e o armazenamento, lido num aparelho desbloqueado.
E as lojas reprovam coisas que um site publicaria sem problema. As regras abaixo valem para
qualquer stack; os nomes de biblioteca são exemplos.

## Regras

1. **Nenhum segredo no app.** Chave de API paga, chave de serviço, senha de banco e segredo de
   assinatura ficam no servidor: o app chama o seu backend, que chama o serviço pago.
   Variável com prefixo público (`EXPO_PUBLIC_` e similares) e arquivos de configuração do app
   (`app.json`, `Info.plist`, `strings.xml`) vão dentro do pacote. Chave pública por design
   (a `anon` do Supabase protegida por RLS, a `publishable` do Stripe) pode ir, desde que a
   proteção esteja no servidor e a chave restrita ao app quando o provedor permitir.
2. **Token no cofre do aparelho.** Keychain no iOS e Keystore no Android, pela biblioteca da
   stack (`expo-secure-store`, `flutter_secure_storage` ou as APIs nativas). Nunca em
   AsyncStorage, SharedPreferences, UserDefaults ou arquivo comum. No Android, tire do backup
   automático os arquivos com dado sensível.
3. **Login pelo navegador do sistema.** OAuth com PKCE aberto no navegador do sistema
   (ASWebAuthenticationSession no iOS, Custom Tabs no Android), nunca numa WebView embutida,
   onde o app enxerga a senha digitada. Token de acesso curto e renovação com troca do token
   de renovação.
4. **Retorno por link verificado.** Retorno de login e de pagamento por Universal Links (iOS)
   e App Links (Android), verificados pelo domínio (`/.well-known/apple-app-site-association`
   e `/.well-known/assetlinks.json`). Esquema próprio (`meuapp://`) pode ser registrado por
   outro app instalado. Valide todo parâmetro que chega por link.
5. **Permissão mínima, pedida na hora do uso**, com um texto que explica o motivo. No iOS, o
   texto de cada permissão é obrigatório no `Info.plist`: sem ele, o app fecha ao pedir.
6. **O servidor não confia no app.** Preço, permissão e validação ficam no servidor, como na
   web (skill `seguranca-de-aplicacao`); checagem no app serve à experiência, não à segurança.
7. **Versões antigas continuam instaladas.** A API aceita as versões ainda em uso, e o app
   consulta uma versão mínima para exigir atualização quando uma correção não pode esperar.
8. **Atualização pelo ar só para o que ela pode mudar.** Serviços como o EAS Update trocam
   JavaScript e arquivos; mudança nativa exige nova versão na loja. Canal de produção
   separado do de teste, com volta de versão, e nada de mudar o que o app faz sem passar pela
   revisão da loja.
9. **Chaves de assinatura fora do repositório.** Keystore, chave de upload e certificados
   ficam no cofre ou no serviço de build, com cópia segura. No Google Play, com o Play App
   Signing, a chave de upload perdida pode ser trocada; sem ele, perder a chave de assinatura
   impede atualizar o app.
10. **Contas das lojas com verificação em duas etapas** e acesso por papel, sem senha
    compartilhada (skill `guiar-usuario-em-paineis`).

As exigências das lojas que mais reprovam apps, com datas e o que conferir, estão em
[references/exigencias-das-lojas.md](references/exigencias-das-lojas.md). Leia antes da
primeira publicação e a cada nova permissão, SDK ou forma de login.

## Antes de publicar

- [ ] Nenhuma chave secreta no pacote: varredura de segredos no código e no que vai para o
      build (skill `segredos-e-credenciais`).
- [ ] Token no Keychain ou Keystore; backup automático sem dado sensível.
- [ ] Login com PKCE pelo navegador do sistema; retorno por link verificado.
- [ ] Exclusão de conta dentro do app, se o app cria conta.
- [ ] Formulários de privacidade das lojas e manifesto de privacidade conferidos com o que o
      app e os SDKs coletam (skill `privacidade-e-lgpd`).
- [ ] Build de produção sem menu de desenvolvimento e sem log com token ou dado pessoal.
- [ ] Chaves de assinatura no cofre, com cópia.
- [ ] Testado em aparelho real, nas duas plataformas, inclusive numa versão antiga do app
      falando com a API nova.

## Armadilhas

- **"Ninguém vai abrir o pacote."** Há ferramentas que extraem as strings de um APK ou IPA em
  minutos; chave encontrada lá vira conta de outra pessoa (skill `controle-de-custos`).
- **Fixar o certificado do servidor sem plano de troca.** Quando o certificado muda, o app para
  de conectar até sair uma versão nova na loja. Só com plano de rotação e, de preferência,
  fixando a chave pública.
- **WebView com ponte para o código nativo aberta a qualquer página.** Página de terceiro
  carregada ali chama funções do app. Limite os domínios e as funções expostas.
- **Chave de mapa ou de Firebase sem restrição.** Mesmo chave pública por design precisa de
  restrição por app (identificador do pacote e assinatura) no painel do provedor.
- **Log de depuração em produção.** O que vai para o console do aparelho e para a ferramenta de
  erros não pode ter token nem dado pessoal (skill `observabilidade`).
