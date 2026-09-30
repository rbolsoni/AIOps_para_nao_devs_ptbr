# Padrões de Skills para AIOps (PT-BR)

Skills em português que fazem **qualquer agente de IA que programa** — Claude Code, Codex,
Cursor, GitHub Copilot, Gemini CLI, OpenCode e outros — trabalhar com as boas práticas de
mercado: segurança, governança, CI/CD, documentação, testes, privacidade (LGPD) e
arquitetura de agentes.

A ideia: você instala as skills uma vez e o agente passa a proteger segredos, configurar
headers de segurança, conferir licenças, montar uma esteira que impede código quebrado de
chegar à produção e explicar em linguagem simples o que **você** precisa fazer em cada
painel. Serve para quem programa e para quem não programa.

> Escrito do zero a partir de estudo de referências abertas e de lições de uma esteira real
> em produção. Veja [docs/inspiracoes.md](docs/inspiracoes.md).

## Comece aqui

- **Não programa?** Leia o [guia para começar](docs/comece-aqui.md): o que é, como instalar em
  3 passos, os primeiros pedidos e o mínimo de segurança.
- **Programa?** Vá direto para a [instalação](#instalação) e o [catálogo](#catálogo).

## Como funciona

Cada skill é uma pasta com um `SKILL.md` no [padrão aberto Agent Skills](https://agentskills.io).
O agente carrega só o nome e a descrição de cada skill; quando o seu pedido combina com uma
delas, ele lê as instruções completas e segue. Arquivos de apoio (referências, modelos,
scripts) só são lidos quando a skill manda. As descrições de todas as skills somam menos de
8 mil caracteres — um teto testado ([ADR 0005](docs/adr/0005-orcamento-de-contexto-das-skills.md)) —,
para caberem no contexto do agente junto com as suas outras skills.

```
você: "coloca a chave do gateway de pagamento no projeto"
agente: ativa segredos-e-credenciais → lê a chave de variável obrigatória, atualiza o
        .env.example, não pede a chave na conversa e diz onde você deve cadastrá-la
```

## Instalação

**Opção 1 — `npx skills` (recomendado).** Requer Node.js (use 22 ou 24, com suporte ativo).
Instala nos agentes que você escolher:

```bash
npx skills add rbolsoni/AIOps_para_nao_devs_ptbr
```

Variações úteis: `-g` instala para o seu usuário (todos os projetos); `-a claude-code` escolhe
o agente; `-s segredos-e-credenciais` instala uma skill só; `-l` apenas lista.

**Opção 2 — copiar as pastas.** Copie as pastas de `skills/` para a pasta de skills do seu
agente (ex.: `.claude/skills/` no Claude Code, `.agents/skills/` em vários outros).

**Opção 3 — servidor MCP** (para agentes que ainda não leem skills). Configure no cliente MCP,
com a versão fixada numa tag (troque pela mais recente em Releases; sem tag, o cliente
executaria a cada início o que estiver na branch principal):

```json
{
  "mcpServers": {
    "aiops-para-nao-devs-ptbr": {
      "command": "npx",
      "args": ["-y", "github:rbolsoni/AIOps_para_nao_devs_ptbr#v1.1.1"]
    }
  }
}
```

Passo a passo para cada agente, inclusive Windows: [docs/instalacao.md](docs/instalacao.md).

## Primeiro uso

Com as skills instaladas, abra o projeto no seu agente e peça:

> Configure este projeto seguindo as boas práticas.

A skill `iniciar-projeto` faz um diagnóstico sem alterar nada, pergunta só o que muda o
plano, mostra o que vai criar e, depois do seu OK, monta a base: `AGENTS.md` com as regras do
projeto, README, `.gitignore` que protege segredos, esteira de CI, checagens de segurança e
a lista de tarefas que você precisa fazer nos painéis (GitHub, hospedagem, banco).

## Conforme o estágio do projeto

A skill `iniciar-projeto` pergunta o estágio e dimensiona o plano a ele
([níveis de maturidade](skills/iniciar-projeto/references/niveis-de-maturidade.md)):

| Estágio | Foco | Skills que mais pesam |
|---|---|---|
| Protótipo (só você usa) | segredos, agente seguro, limite de gasto, 2FA, "desfazer" | `uso-seguro-de-agentes`, `segredos-e-credenciais`, `controle-de-custos`, `depuracao-guiada` |
| Primeiros usuários (dados reais) | CI no PR, login e RLS, headers, backup, erros monitorados | `esteira-ci-cd`, `seguranca-de-aplicacao`, `mudancas-de-banco`, `backup-e-recuperacao`, `observabilidade` |
| Produto (pagamentos, equipe) | homologação e trava, catraca de cobertura, LGPD, runbooks, desempenho | `esteira-ci-cd`, `testes-e-qualidade`, `privacidade-e-lgpd`, `incidente-vira-checagem`, `desempenho-e-escalabilidade` |

## Catálogo

### Fundamentos

| Skill | Ativa quando |
|---|---|
| [`disciplina-de-codigo`](skills/disciplina-de-codigo/SKILL.md) | qualquer mudança de código: premissas explícitas, simplicidade, mudança cirúrgica, prova de que funciona |
| [`codigo-limpo-e-solid`](skills/codigo-limpo-e-solid/SKILL.md) | projetar, revisar ou refatorar código; Clean Code e SOLID sem superengenharia |
| [`documentacao-viva`](skills/documentacao-viva/SKILL.md) | README, AGENTS.md, ADR, descrição de PR; documentação que acompanha o código |
| [`memoria-de-projeto`](skills/memoria-de-projeto/SKILL.md) | "lembra disso", correções do usuário, fatos não óbvios para as próximas sessões |
| [`depuracao-guiada`](skills/depuracao-guiada/SKILL.md) | algo não funciona, deu erro ou piorou depois de várias tentativas: reproduzir, colher evidência, uma hipótese por vez e voltar ao último estado bom |

### Projeto e entrega

| Skill | Ativa quando |
|---|---|
| [`iniciar-projeto`](skills/iniciar-projeto/SKILL.md) | começar ou organizar um repositório; "deixar pronto para produção" |
| [`fluxo-de-git`](skills/fluxo-de-git/SKILL.md) | branch, commit, PR, merge, revert; Commits Convencionais |
| [`esteira-ci-cd`](skills/esteira-ci-cd/SKILL.md) | pipelines, deploy, release e versão semântica; a trava que impede código sem teste em produção |
| [`isolamento-de-ambientes`](skills/isolamento-de-ambientes/SKILL.md) | desenvolvimento, homologação e produção; nada de teste apontando para produção |
| [`mudancas-de-banco`](skills/mudancas-de-banco/SKILL.md) | migrações, políticas de acesso (RLS), mudanças sem interrupção |
| [`testes-e-qualidade`](skills/testes-e-qualidade/SKILL.md) | testes, cobertura, testes instáveis; todo bug ganha um teste |
| [`desempenho-e-escalabilidade`](skills/desempenho-e-escalabilidade/SKILL.md) | sistema lento ou que precisa crescer: medir antes, banco (N+1, índices, paginação), cache, filas, Core Web Vitals e onde rodar |

### Segurança e conformidade

| Skill | Ativa quando |
|---|---|
| [`seguranca-de-aplicacao`](skills/seguranca-de-aplicacao/SKILL.md) | login, permissões, APIs, uploads, revisão de segurança (OWASP) |
| [`headers-de-seguranca`](skills/headers-de-seguranca/SKILL.md) | CSP, HSTS e demais headers; inclui verificador de URL |
| [`segredos-e-credenciais`](skills/segredos-e-credenciais/SKILL.md) | senhas, chaves, `.env`, vazamentos; inclui varredor de segredos |
| [`dependencias-e-licencas`](skills/dependencias-e-licencas/SKILL.md) | adicionar pacote, checar licenças e vulnerabilidades, copiar código de terceiros |
| [`privacidade-e-lgpd`](skills/privacidade-e-lgpd/SKILL.md) | dados pessoais, consentimento, exclusão de conta, incidentes |
| [`acessibilidade-web`](skills/acessibilidade-web/SKILL.md) | interfaces: teclado, leitor de tela, contraste (WCAG 2.2 AA) |

### Operação

| Skill | Ativa quando |
|---|---|
| [`observabilidade`](skills/observabilidade/SKILL.md) | logs, monitoramento de erros, métricas, alertas |
| [`incidente-vira-checagem`](skills/incidente-vira-checagem/SKILL.md) | algo deu errado: registro sem culpados e checagem automática que impede a volta |
| [`guiar-usuario-em-paineis`](skills/guiar-usuario-em-paineis/SKILL.md) | tarefas em GitHub, Vercel, Supabase, DNS…: passo a passo à prova de leigo |
| [`controle-de-custos`](skills/controle-de-custos/SKILL.md) | nuvem, hospedagem ou IA paga: teto de gasto e alertas (e qual deles só avisa), chave paga só no servidor, limite por usuário |
| [`backup-e-recuperacao`](skills/backup-e-recuperacao/SKILL.md) | backup testado, restauração ensaiada, recuperar dado apagado e voltar o site para a versão anterior |

### Agentes de IA

| Skill | Ativa quando |
|---|---|
| [`orquestracao-multiagente`](skills/orquestracao-multiagente/SKILL.md) | dividir trabalho entre agentes; revisão adversarial com verificação real |
| [`arquitetura-de-agentes`](skills/arquitetura-de-agentes/SKILL.md) | construir agentes com LLM: ferramentas, permissões, contexto, custo, independência de provedor |
| [`guardrails-e-avaliacao`](skills/guardrails-e-avaliacao/SKILL.md) | guardrails, prompt injection, evals, red teaming, avaliação de skills |
| [`uso-seguro-de-agentes`](skills/uso-seguro-de-agentes/SKILL.md) | configurar ou usar o agente que programa: segredos fora do alcance, aprovações, MCP e skills de terceiros, conteúdo não confiável |

## Princípios

- **Agnóstico**: nenhuma skill depende de um modelo de IA, fornecedor, linguagem de
  programação ou tipo de aplicação. Onde há comando, há o equivalente por stack; os
  exemplos usam nomes genéricos ou domínios variados, para servir de base a qualquer app.
- **Lições reais antes de teoria**: as seções "Armadilhas" vêm de incidentes que aconteceram.
- **A trava é código, não promessa**: o que pode ser verificado por script vira checagem na
  esteira.
- **O usuário no controle**: nada é publicado, implantado ou apagado sem pedido; tarefas de
  painel são explicadas, e segredos nunca passam pela conversa.
- **Sem dependências**: validador, scripts das skills e servidor MCP usam só Node.js (20 ou mais novo; recomendado 22 ou 24).

## Estrutura

```
skills/<nome>/          uma pasta por skill
  SKILL.md              instruções (padrão Agent Skills)
  references/           detalhes lidos sob demanda
  assets/               modelos para copiar para o seu projeto
  scripts/              verificadores executáveis
  evals/                casos de avaliação e de ativação
mcp/servidor.mjs        servidor MCP somente leitura
ferramentas/            validador das skills
testes/                 testes automatizados (node --test)
docs/                   instalação, decisões (ADR) e inspirações
```

## Desenvolvimento

```bash
npm run validar              # valida todas as skills contra o padrão
npm test                     # testes do validador, do MCP e dos scripts
npm run verificar:segredos   # varre o repositório atrás de segredos
```

Quer propor uma skill ou melhorar uma existente? Leia o [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE).
