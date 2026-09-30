# Níveis de maturidade

O que fazer depende do estágio do projeto. Montar a esteira completa num protótipo que só você
usa desperdiça tempo e afasta quem está começando; levar um produto com pagamentos sem ela
arrisca o dinheiro e os dados de outras pessoas. Pergunte o estágio no começo, faça o nível
atual por inteiro e diga, em linguagem simples, o que fica para quando o projeto mudar de nível.

## Nível 1 — Protótipo

Só você usa; nenhum dado real de outras pessoas; nada cobrado.

- Repositório privado, `.gitignore` de segredos e `AGENTS.md` com os comandos reais.
- Varredura de segredos antes de cada commit (`segredos-e-credenciais`).
- Agente configurado com segurança: sem acesso a `.env`, aprovações ligadas
  (`uso-seguro-de-agentes`).
- Limite de gasto e alertas nos provedores pagos (`controle-de-custos`).
- Verificação em duas etapas nas contas (repositório, hospedagem, provedores de IA, e-mail).
- Commit antes de mudança grande — é o "desfazer" (`depuracao-guiada`).

**Sobe de nível quando** outra pessoa vai usar, ou entra dado real.

## Nível 2 — Primeiros usuários

Pessoas reais usam; há dados pessoais; ainda sem pagamento.

Tudo do nível 1, mais:

- CI no PR com testes, lint e varredura de segredos (`esteira-ci-cd`, modelo de tronco).
- Login por provedor ou biblioteca consolidada; autorização no servidor e, se o navegador fala
  direto com o banco, políticas de acesso (RLS) (`seguranca-de-aplicacao`,
  `mudancas-de-banco`).
- Headers de segurança conferidos na URL publicada (`headers-de-seguranca`).
- Banco de desenvolvimento separado do de produção (`isolamento-de-ambientes`).
- Backup automático do banco e um ensaio de restauração (`backup-e-recuperacao`).
- Erros monitorados, sem dados pessoais nos eventos (`observabilidade`).
- Política de privacidade e exclusão de conta que apaga de verdade (`privacidade-e-lgpd`).

**Sobe de nível quando** entra pagamento, dado sensível, volume ou equipe.

## Nível 3 — Produto

Pagamentos, dados pessoais em escala, equipe, ou clientes que dependem do sistema.

Tudo do nível 2, mais:

- Homologação e trava de promoção; migrações aplicadas só pela esteira (modelo de promoção da
  `esteira-ci-cd`).
- Catraca de cobertura e checagens empíricas de acesso na homologação (`testes-e-qualidade`,
  `mudancas-de-banco`).
- Inventário de dados pessoais e resposta a incidente (`privacidade-e-lgpd`,
  `incidente-vira-checagem`).
- Runbooks; restauração e volta de versão ensaiadas, com tempo medido
  (`backup-e-recuperacao`).
- Alertas que chegam a alguém; desempenho medido nas rotas e páginas principais
  (`observabilidade`, `desempenho-e-escalabilidade`).
- Dependências com idade mínima de versão e revisão de licenças (`dependencias-e-licencas`).

## Como apresentar ao usuário

- Diga em que nível o projeto está e o que esse nível exige, em poucas linhas.
- Liste o que fica para o próximo nível e o gatilho para subir ("quando entrar pagamento…").
- Nunca rebaixe o básico de segurança (segredos, verificação em duas etapas, limite de gasto)
  por ser protótipo.
