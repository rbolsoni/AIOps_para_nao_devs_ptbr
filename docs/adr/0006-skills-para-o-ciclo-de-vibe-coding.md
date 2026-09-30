# 0006 — Skills para o ciclo completo de vibe coding

## Status

Aceito — 2026-09-30

## Contexto

Uma análise do repositório em 2026-09-29, somada a um relatório interno de sugestões (não
versionado), apontou lacunas entre o que o kit cobre e o dia a dia de quem programa com agentes
— em especial quem não programa:

- o kit ensinava a **construir** agentes com segurança (`arquitetura-de-agentes`), mas não a
  **usar** um agente de código com segurança: buscas no repositório inteiro não encontraram
  nada sobre impedir o agente de ler `.env`, modos de aprovação automática, envenenamento de
  memória e regras, ou agente que afrouxa teste para passar;
- o laço de tentativas às cegas, que piora o código a cada "arruma", é uma dor comum sem
  procedimento no kit;
- limites de gasto e alertas de faturamento para o usuário não apareciam em nenhum arquivo;
- desempenho e escalabilidade não tinham skill;
- "rollback" só aparecia como transação de banco: faltava voltar a versão do site e ensaiar a
  restauração de backup.

## Decisão

Criar cinco skills, cada uma com descrição dentro do orçamento de contexto (ADR 0005):

| Skill | Categoria | Origem |
|---|---|---|
| `uso-seguro-de-agentes` | agentes-de-ia | análise do repositório |
| `depuracao-guiada` | fundamentos | relatório (resolução de problemas guiada) + análise (ponto de retorno) |
| `controle-de-custos` | operacao | relatório (FinOps) + análise (limites de gasto, chave paga no navegador) |
| `desempenho-e-escalabilidade` | projeto-e-entrega | relatório (arquitetura escalável e performance, fundidas numa só) |
| `backup-e-recuperacao` | operacao | relatório (backups) + análise (voltar a versão, ensaio de restauração) |

Adoções parciais: os estados de interface (carregando, vazio, erro, sucesso) entram em
`acessibilidade-web`; as tentativas que não funcionaram, em `memoria-de-projeto`; os perfis de
instalação, na documentação.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Ferramentas no servidor MCP que executam as validações | contraria o ADR 0003: o servidor passaria a executar código a pedido de um modelo que pode estar sob injeção de prompt; o agente já roda os scripts com as aprovações que o cliente dele aplica |
| Instalador interativo próprio no `npx skills` | a ferramenta é de terceiros; a skill `iniciar-projeto` já é o assistente interativo, e os perfis de instalação cobrem a escolha de skills |
| Skill de design visual moderno | subjetiva e sem trava verificável; conflita com o sistema de design de cada projeto — o que é verificável (estados acessíveis) foi para `acessibilidade-web` |
| Duas skills separadas para arquitetura escalável e desempenho | gatilhos sobrepostos e mais uma descrição no orçamento de contexto |
| Reforçar só as skills existentes | uso seguro do agente e depuração são procedimentos próprios, com gatilhos próprios; espalhados, não ativariam na hora certa |

## Consequências

- Positivas: o kit cobre o ciclo inteiro — configurar o agente com segurança, construir,
  depurar sem laço, pôr no ar sem conta surpresa, aguentar carga e voltar atrás quando algo dá
  errado.
- Negativas: cinco skills a mais para manter; cerca de 1.300 caracteres a mais de descrição,
  dentro do teto de 8.000.
- Invalida se: os agentes passarem a oferecer essas proteções por padrão, ou o orçamento de
  contexto exigir juntar skills.

## Como verificar

`npm run validar` e `npm test` (catálogo, orçamento de contexto, evals obrigatórios).
