# Vindo de plataformas de vibe coding

Projetos criados em plataformas que geram o app a partir de conversa — Lovable, Bolt, Replit,
v0 e similares — chegam com armadilhas previsíveis. As plataformas mudam rápido: confira na
documentação de cada uma antes de afirmar como algo funciona.

Comece pelo diagnóstico automático ([../scripts/diagnosticar-projeto.mjs](../scripts/diagnosticar-projeto.mjs)):
ele acusa, pelo código, várias das armadilhas abaixo (segredo versionado, chave secreta com
prefixo público, tabela sem RLS nas migrações).

## 1. Traga o código para um repositório seu

- Conecte a plataforma ao GitHub (ou exporte o código) e confirme que o repositório é
  **privado** e está na **sua** conta ou organização.
- Algumas plataformas sincronizam nos dois sentidos com uma branch ativa — no Lovable, por
  padrão, a branch principal (conferido na documentação dele em 2026-09-30). O que a
  plataforma gera entra direto na `main`, sem PR e sem esteira. Prefira apontar a plataforma
  para uma branch de trabalho e levar à `main` por PR com CI (`fluxo-de-git`,
  `esteira-ci-cd`).
- Não edite a mesma branch na plataforma e fora dela ao mesmo tempo.

## 2. Segredos

- Procure chaves escritas no código gerado: rode a varredura de segredos
  (`segredos-e-credenciais`).
- Chave paga ou de serviço com prefixo público (`VITE_`, `NEXT_PUBLIC_`…) está exposta a
  qualquer visitante: mova a chamada para o servidor e rotacione a chave
  (`controle-de-custos`).
- Segredo fica no cofre da plataforma ou do provedor de deploy, nunca no código.

## 3. Banco de dados e acesso

- Muitos apps gerados usam o navegador falando direto com o banco (Supabase e afins). Aí a
  segurança inteira está nas políticas de acesso (RLS): confira que toda tabela exposta tem
  RLS ligado e políticas que conferem o usuário (`mudancas-de-banco`).
- Rode o verificador de segurança do painel do banco (no Supabase, o Security Advisor) e faça a
  triagem de cada alerta, sem corrigir em lote (`seguranca-de-aplicacao`).
- Já houve casos públicos de apps gerados expondo os dados de todos os usuários por falta de
  RLS. Teste com uma conta tentando ler o dado de outra.

## 4. Custos

Créditos da plataforma, banco e APIs de IA cobram por uso: configure limites e alertas antes
de divulgar o app (`controle-de-custos`).

## 5. Deploy

- Decida se o deploy continua na plataforma ou passa para a esteira, e registre num ADR. Se
  continuar, saiba que cada mudança publicada pela plataforma vai direto ao ar.
- Quando o projeto chegar ao nível de primeiros usuários
  ([niveis-de-maturidade.md](niveis-de-maturidade.md)), traga o deploy para a esteira.

## 6. Plataforma e esteira convivem

A plataforma acelera o começo; esteira, testes e revisão protegem o que já tem usuários. Os
dois convivem bem enquanto a plataforma escreve numa branch de trabalho e a `main` só recebe
PR com CI verde.
