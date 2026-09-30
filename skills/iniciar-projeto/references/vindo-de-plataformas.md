# Vindo de plataformas de vibe coding

Projetos criados em plataformas que geram o app a partir de conversa — Lovable, Bolt, Replit,
v0 e similares — chegam com armadilhas previsíveis. As plataformas mudam rápido: confira na
documentação de cada uma antes de afirmar como algo funciona.

Comece pelo diagnóstico automático ([../scripts/diagnosticar-projeto.mjs](../scripts/diagnosticar-projeto.mjs)):
ele acusa, pelo código, várias das armadilhas abaixo (segredo versionado, chave secreta com
prefixo público, tabela sem RLS nas migrações).

## 1. Regras e skills dentro da plataforma

Regra que precisa valer sempre vai onde a plataforma guarda instruções fixas do projeto, lidas
em toda mensagem. Comece pelas [regras essenciais](../assets/regras-essenciais.modelo.md), que
cabem em qualquer um destes campos, e acrescente as regras do projeto.

| Plataforma | Instruções fixas | Skills do kit |
|---|---|---|
| Lovable | lê o `AGENTS.md` da raiz do repositório; ou **Project settings → Knowledge** (até 10 mil caracteres) | importa skills neste formato, pelo GitHub ou por `.zip`, valendo para o workspace inteiro |
| Bolt | **Project settings → Knowledge** | importa skills de repositório público do GitHub (lista até 100) ou de `.zip` com uma skill e arquivos Markdown |
| Replit | arquivo `replit.md` na raiz do projeto | a documentação não fala de skills |
| v0 | **Project → Knowledge** (e instruções da conta nas configurações) | a documentação não fala de skills |

Conferido na documentação de cada plataforma em 2026-09-30; as telas mudam, confira antes de
guiar o usuário. Skill é instrução para o agente: importe só de fonte que você leu (skill
`uso-seguro-de-agentes`). Os scripts das skills precisam de Node.js: rode-os no computador ou
na esteira, não dentro da plataforma.

## 2. Traga o código para um repositório seu

- Conecte a plataforma ao GitHub (ou exporte o código) e confirme que o repositório é
  **privado** e está na **sua** conta ou organização.
- Algumas plataformas sincronizam nos dois sentidos com uma branch ativa — no Lovable, por
  padrão, a branch principal (conferido na documentação dele em 2026-09-30). O que a
  plataforma gera entra direto na `main`, sem PR e sem esteira. Prefira apontar a plataforma
  para uma branch de trabalho e levar à `main` por PR com CI (`fluxo-de-git`,
  `esteira-ci-cd`).
- Não edite a mesma branch na plataforma e fora dela ao mesmo tempo.

## 3. Segredos

- Procure chaves escritas no código gerado: rode a varredura de segredos
  (`segredos-e-credenciais`).
- Chave paga ou de serviço com prefixo público (`VITE_`, `NEXT_PUBLIC_`…) está exposta a
  qualquer visitante: mova a chamada para o servidor e rotacione a chave
  (`controle-de-custos`).
- Segredo fica no cofre da plataforma ou do provedor de deploy, nunca no código.

## 4. Banco de dados e acesso

- Muitos apps gerados usam o navegador falando direto com o banco (Supabase e afins). Aí a
  segurança inteira está nas políticas de acesso (RLS): confira que toda tabela exposta tem
  RLS ligado e políticas que conferem o usuário (`mudancas-de-banco`).
- Rode o verificador de segurança do painel do banco (no Supabase, o Security Advisor) e faça a
  triagem de cada alerta, sem corrigir em lote (`seguranca-de-aplicacao`).
- Já houve casos públicos de apps gerados expondo os dados de todos os usuários por falta de
  RLS. Teste com uma conta tentando ler o dado de outra.

## 5. Custos

Créditos da plataforma, banco e APIs de IA cobram por uso: configure limites e alertas antes
de divulgar o app (`controle-de-custos`).

## 6. Deploy

- Decida se o deploy continua na plataforma ou passa para a esteira, e registre num ADR. Se
  continuar, saiba que cada mudança publicada pela plataforma vai direto ao ar.
- Quando o projeto chegar ao nível de primeiros usuários
  ([niveis-de-maturidade.md](niveis-de-maturidade.md)), traga o deploy para a esteira.

## 7. Plataforma e esteira convivem

A plataforma acelera o começo; esteira, testes e revisão protegem o que já tem usuários. Os
dois convivem bem enquanto a plataforma escreve numa branch de trabalho e a `main` só recebe
PR com CI verde.
