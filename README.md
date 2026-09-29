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

## Como funciona

Cada skill é uma pasta com um `SKILL.md` no [padrão aberto Agent Skills](https://agentskills.io).
O agente carrega só o nome e a descrição de cada skill; quando o seu pedido combina com uma
delas, ele lê as instruções completas e segue. Arquivos de apoio (referências, modelos,
scripts) só são lidos quando a skill manda. Assim, 22 skills cabem no contexto sem pesar.

```
você: "coloca a chave do gateway de pagamento no projeto"
agente: ativa segredos-e-credenciais → lê a chave de variável obrigatória, atualiza o
        .env.example, não pede a chave na conversa e diz onde você deve cadastrá-la
```

## Instalação

**Opção 1 — `npx skills` (recomendado).** Requer Node.js. Instala nos agentes que você
escolher:

```bash
npx skills add rbolsoni/Padroes_skill_para_AIOps_ptbr
```

Variações úteis: `-g` instala para o seu usuário (todos os projetos); `-a claude-code` escolhe
o agente; `-s segredos-e-credenciais` instala uma skill só; `-l` apenas lista.

**Opção 2 — copiar as pastas.** Copie as pastas de `skills/` para a pasta de skills do seu
agente (ex.: `.claude/skills/` no Claude Code, `.agents/skills/` em vários outros).

**Opção 3 — servidor MCP** (para agentes que ainda não leem skills). Configure no cliente MCP:

```json
{
  "mcpServers": {
    "padroes-skill": {
      "command": "npx",
      "args": ["-y", "github:rbolsoni/Padroes_skill_para_AIOps_ptbr"]
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

## Catálogo

### Fundamentos

| Skill | Ativa quando |
|---|---|
| [`disciplina-de-codigo`](skills/disciplina-de-codigo/SKILL.md) | qualquer mudança de código: premissas explícitas, simplicidade, mudança cirúrgica, prova de que funciona |
| [`codigo-limpo-e-solid`](skills/codigo-limpo-e-solid/SKILL.md) | projetar, revisar ou refatorar código; Clean Code e SOLID sem superengenharia |
| [`documentacao-viva`](skills/documentacao-viva/SKILL.md) | README, AGENTS.md, ADR, descrição de PR; documentação que acompanha o código |
| [`memoria-de-projeto`](skills/memoria-de-projeto/SKILL.md) | "lembra disso", correções do usuário, fatos não óbvios para as próximas sessões |

### Projeto e entrega

| Skill | Ativa quando |
|---|---|
| [`iniciar-projeto`](skills/iniciar-projeto/SKILL.md) | começar ou organizar um repositório; "deixar pronto para produção" |
| [`fluxo-de-git`](skills/fluxo-de-git/SKILL.md) | branch, commit, PR, merge, revert; Commits Convencionais |
| [`esteira-ci-cd`](skills/esteira-ci-cd/SKILL.md) | pipelines, deploy, release e versão semântica; a trava que impede código sem teste em produção |
| [`isolamento-de-ambientes`](skills/isolamento-de-ambientes/SKILL.md) | desenvolvimento, homologação e produção; nada de teste apontando para produção |
| [`mudancas-de-banco`](skills/mudancas-de-banco/SKILL.md) | migrações, políticas de acesso (RLS), mudanças sem interrupção |
| [`testes-e-qualidade`](skills/testes-e-qualidade/SKILL.md) | testes, cobertura, testes instáveis; todo bug ganha um teste |

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

### Agentes de IA

| Skill | Ativa quando |
|---|---|
| [`orquestracao-multiagente`](skills/orquestracao-multiagente/SKILL.md) | dividir trabalho entre agentes; revisão adversarial com verificação real |
| [`arquitetura-de-agentes`](skills/arquitetura-de-agentes/SKILL.md) | construir agentes com LLM: ferramentas, permissões, contexto, custo, independência de provedor |
| [`guardrails-e-avaliacao`](skills/guardrails-e-avaliacao/SKILL.md) | guardrails, prompt injection, evals, red teaming, avaliação de skills |

## Princípios

- **Agnóstico**: nenhuma skill depende de um modelo de IA, fornecedor ou linguagem de
  programação. Onde há comando, há o equivalente por stack.
- **Lições reais antes de teoria**: as seções "Armadilhas" vêm de incidentes que aconteceram.
- **A trava é código, não promessa**: o que pode ser verificado por script vira checagem na
  esteira.
- **O usuário no controle**: nada é publicado, implantado ou apagado sem pedido; tarefas de
  painel são explicadas, e segredos nunca passam pela conversa.
- **Sem dependências**: validador, scripts das skills e servidor MCP usam só Node.js 20+.

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
