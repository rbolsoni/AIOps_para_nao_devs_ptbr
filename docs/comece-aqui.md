# Comece aqui — para quem não programa

Este kit faz o seu agente de IA trabalhar com os cuidados que um time experiente teria:
proteger senhas e chaves, testar antes de publicar, não mexer em produção sem querer e não
gastar mais do que você definiu. Você não precisa saber programar para usar. Precisa saber
pedir e fazer algumas configurações em painéis — que o próprio agente explica passo a passo.

## Em uma frase

- **Agente de IA que programa**: um assistente (Claude Code, Codex, Cursor, GitHub Copilot,
  Gemini CLI…) que lê e escreve o código do seu projeto a partir do que você pede.
- **Skill**: um manual de boas práticas que o agente consulta sozinho quando o assunto
  aparece — por exemplo, o de segredos quando você fala de uma chave de API.

## Do que você precisa

1. Um agente de IA que programa, já instalado.
2. O Node.js na versão LTS (22 ou 24): baixe em https://nodejs.org e instale como qualquer
   programa, no Windows ou no macOS. Ele serve para instalar as skills e rodar os
   verificadores.
3. O seu projeto numa pasta. Se ainda não é um repositório git, o agente cria com você.

## Instalar em 3 passos

1. Abra um terminal na pasta do projeto (no VS Code: menu **Terminal** → **Novo terminal**).
2. Rode:

   ```bash
   npx skills add rbolsoni/IA-skills-para-nao-devs
   ```

3. Responda às perguntas: escolha o seu agente e confirme. Pronto — as skills ficam na pasta
   do projeto.

Usa Lovable, Bolt, Replit ou v0? Siga o passo a passo das
[plataformas](instalacao.md#4-plataformas-que-geram-o-app-lovable-bolt-replit-v0): as regras
essenciais valem em toda mensagem, e Lovable e Bolt também importam as skills.

Prefere não usar o terminal? Baixe o arquivo da versão mais recente na página
[Releases](https://github.com/rbolsoni/IA-skills-para-nao-devs/releases) ("Source code"),
descompacte e copie as pastas de `skills/` para a pasta de skills do seu agente (a tabela está
em [instalacao.md](instalacao.md)).

## Os primeiros pedidos

| Peça | O que acontece |
|---|---|
| "Faça um diagnóstico do meu projeto." | a lista do que falta, sem mudar nada: segredo exposto, banco sem proteção, esteira e testes, com a skill que resolve cada item |
| "Configure este projeto seguindo as boas práticas." | diagnóstico, plano do tamanho do seu projeto, arquivos de base e a lista do que você faz nos painéis |
| "Deixe o agente mais seguro neste projeto." | o agente deixa de ler suas senhas e passa a pedir confirmação antes de ações perigosas |
| "Coloque limite de gasto nas contas do projeto." | teto e alertas em cada serviço pago — e o aviso de qual deles só avisa, sem cortar |
| "Onde coloco a chave da API?" | o jeito certo, sem a chave passar pela conversa |
| "Não funciona" ou "deu erro" | o agente para de mexer, volta ao último estado bom e investiga com método |

## O mínimo de segurança antes de tudo

- **Verificação em duas etapas** no e-mail, no GitHub, na hospedagem e nos provedores de IA.
  O e-mail primeiro: é ele que recupera todas as outras contas.
- **Limite de gasto** em todo serviço pago.
- **Nunca cole senha ou chave na conversa** com o agente. Se colou, troque a chave — o agente
  explica como.
- **Salve antes de mudança grande**: peça "faça um commit antes de começar". É o seu "desfazer".

## O que o agente vai pedir para você fazer

Algumas etapas acontecem em painéis de sites (GitHub, Vercel, Supabase…) e dependem de você:
criar uma chave, ligar uma proteção, cadastrar um segredo. O agente entrega cada etapa como um
cartão: onde clicar, o que escrever e como conferir. Leia o "Não faça" de cada cartão.

## Glossário

| Termo | O que é |
|---|---|
| Repositório | a pasta do projeto com todo o histórico de mudanças, guardado pelo git |
| Commit | um ponto salvo do projeto, com uma mensagem dizendo o que mudou |
| Branch | uma linha de trabalho separada, para mudar sem mexer na principal (`main`) |
| PR (pull request) | o pedido para levar uma branch para a principal, com revisão |
| Esteira (CI/CD) | a automação que testa cada mudança e só publica o que passou |
| Deploy | publicar o site ou o app para os usuários |
| Homologação | uma cópia do sistema para testar antes de ir ao ar |
| Variável de ambiente | configuração guardada fora do código (ex.: o endereço do banco) |
| Segredo | senha, chave ou token — nunca vai para o código nem para a conversa |
| RLS | regras no banco de dados que decidem quem lê e quem altera cada linha |
| MCP | um jeito de ligar o agente a outras ferramentas (banco, GitHub…) |

## Ajuda

- Dúvida ou sugestão: abra uma issue no
  [GitHub do projeto](https://github.com/rbolsoni/IA-skills-para-nao-devs/issues).
- Encontrou uma falha de segurança: use o relato privado descrito no
  [SECURITY.md](../SECURITY.md) — não abra issue pública.
