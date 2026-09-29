# Inspirações e créditos

Este repositório **não copia texto nem código** de nenhuma das fontes abaixo. Elas foram
estudadas para entender fundamentos e padrões; o conteúdo das skills foi escrito do zero, em
português, com a nossa estrutura — e combinado com lições práticas de uma esteira real em
produção. A decisão está registrada em [adr/0004-conteudo-escrito-do-zero.md](adr/0004-conteudo-escrito-do-zero.md).

| Fonte | O que estudamos | Onde aparece aqui | Licença da fonte |
|---|---|---|---|
| [Agent Skills](https://agentskills.io) — especificação e guias de autoria | formato `SKILL.md`, divulgação progressiva, boas práticas de descrição, avaliação de ativação e de qualidade, scripts para agentes | todo o formato; `ferramentas/validar-skills.mjs`; `evals/` de cada skill; `guardrails-e-avaliacao` | — |
| [DenisSergeevitch/agents-best-practices](https://github.com/DenisSergeevitch/agents-best-practices) | disciplina de *harness*: o modelo propõe e o programa valida, autoriza, executa e registra; laço, permissões, contexto, cache, avaliação | `arquitetura-de-agentes` | MIT |
| [NirDiamant/agents-towards-production](https://github.com/NirDiamant/agents-towards-production) | panorama do caminho de protótipo a produção: memória, observabilidade, guardrails, segurança, implantação | escopo de `arquitetura-de-agentes`, `guardrails-e-avaliacao`, `observabilidade` | licença própria, não comercial — **só consultada; nada reproduzido** |
| [AFunLS/self-evolving-agent-patterns](https://github.com/AFunLS/self-evolving-agent-patterns) | engenharia de contexto, "sistema imune" de antipadrões, divisão entre código e modelo, segurança na automodificação | `arquitetura-de-agentes` (auto-evolução), `incidente-vira-checagem` | MIT |
| [NVIDIA NeMo Guardrails](https://github.com/NVIDIA-NeMo/Guardrails) | guardrails organizados por camada (entrada, diálogo, recuperação, execução, saída) | `guardrails-e-avaliacao` | Apache-2.0 |
| [NVIDIA NeMo Agent Toolkit](https://github.com/NVIDIA/NeMo-Agent-Toolkit) | perfilamento, avaliação e observabilidade de agentes de vários frameworks; MCP | `guardrails-e-avaliacao`, `arquitetura-de-agentes` | Apache-2.0 |
| [NVIDIA — skills verificadas](https://developer.nvidia.com/blog/nvidia-verified-agent-skills-provide-capability-governance-for-ai-agents/) | governança de skills: procedência, varredura, assinatura, ficha da skill | princípios de revisão de skills e de servidores MCP | — |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | quatro princípios de comportamento para agentes que programam | `disciplina-de-codigo` (reescrito e ampliado) | ver o repositório |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | distribuição por `npx skills` | instalação | — |

## Lições práticas

As seções "Armadilhas" e boa parte das regras de `esteira-ci-cd`, `isolamento-de-ambientes`,
`mudancas-de-banco`, `segredos-e-credenciais`, `headers-de-seguranca`, `dependencias-e-licencas`
e `testes-e-qualidade` vêm da construção e operação da esteira do **AliMatch 2.0** (Next.js,
Supabase, Vercel e GitHub Actions): a trava de homologação dentro da release, integrações que
pulavam a esteira, segredos que faltavam e faziam etapas "passarem" sem rodar, a catraca de
cobertura, a política de licenças com exceções nomeadas, a CSP e seus limites reais, e
outras. Foram generalizadas: nenhum dado, credencial ou identificador do projeto está aqui.
