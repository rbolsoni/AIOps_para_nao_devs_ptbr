# Instalação

Três caminhos, do mais simples ao mais flexível. Todos entregam as mesmas skills.

Os três precisam do [Node.js](https://nodejs.org) instalado. Use uma versão com suporte ativo
(22 ou 24, as LTS): os scripts do kit ainda rodam no Node 20, mas ele parou de receber
correções de segurança em 30/04/2026.

## 1. `npx skills` (recomendado)

A ferramenta [`skills`](https://github.com/vercel-labs/skills) descobre as skills deste
repositório e as instala na pasta certa de cada agente.

```bash
# interativo: pergunta em quais agentes instalar
npx skills add rbolsoni/IA-skills-para-nao-devs

# para o seu usuário, valendo em todos os projetos
npx skills add rbolsoni/IA-skills-para-nao-devs -g

# só para um agente
npx skills add rbolsoni/IA-skills-para-nao-devs -a claude-code

# só algumas skills
npx skills add rbolsoni/IA-skills-para-nao-devs -s segredos-e-credenciais -s esteira-ci-cd

# ver o que existe, sem instalar
npx skills add rbolsoni/IA-skills-para-nao-devs -l
```

Para atualizar depois: `npx skills update`.

**Instalar no projeto ou no usuário?** No projeto (padrão), as skills ficam versionadas junto
com o código e toda a equipe as recebe. No usuário (`-g`), valem para todos os seus projetos,
mas só na sua máquina.

**Versão.** O `npx skills` instala o conteúdo atual da branch principal; a documentação dele
não mostra como fixar uma versão. Por padrão ele cria links para uma cópia central; com
`--copy`, copia as pastas. Se você precisa de uma versão fixa e auditável (empresa, projeto com
revisão de dependências), use o caminho 2 com o arquivo de uma release.

### Perfis: instalar só o que faz sentido

Instalar tudo funciona — as descrições das skills cabem no orçamento de contexto dos agentes
([ADR 0005](adr/0005-orcamento-de-contexto-das-skills.md)). Para começar enxuto, use um perfil
(os perfis se somam: um app web com banco usa o essencial **e** o de app web).

**Essencial** (qualquer projeto):

```bash
npx skills add rbolsoni/IA-skills-para-nao-devs \
  -s disciplina-de-codigo \
  -s uso-seguro-de-agentes \
  -s depuracao-guiada \
  -s segredos-e-credenciais \
  -s fluxo-de-git \
  -s iniciar-projeto \
  -s guiar-usuario-em-paineis \
  -s controle-de-custos \
  -s memoria-de-projeto
```

**App web com banco** (junto do essencial):

```bash
npx skills add rbolsoni/IA-skills-para-nao-devs \
  -s seguranca-de-aplicacao \
  -s pagamentos-e-webhooks \
  -s headers-de-seguranca \
  -s mudancas-de-banco \
  -s isolamento-de-ambientes \
  -s privacidade-e-lgpd \
  -s acessibilidade-web \
  -s testes-e-qualidade \
  -s esteira-ci-cd \
  -s backup-e-recuperacao \
  -s desempenho-e-escalabilidade \
  -s observabilidade \
  -s incidente-vira-checagem \
  -s dependencias-e-licencas \
  -s documentacao-viva \
  -s codigo-limpo-e-solid
```

**Quem constrói agentes ou apps com LLM** (junto do essencial):

```bash
npx skills add rbolsoni/IA-skills-para-nao-devs \
  -s arquitetura-de-agentes \
  -s guardrails-e-avaliacao \
  -s orquestracao-multiagente
```

## 2. Copiar as pastas

Baixe o código de uma release (página
[Releases](https://github.com/rbolsoni/IA-skills-para-nao-devs/releases) → "Source code") ou
clone o repositório, e copie as pastas de `skills/` que quiser para a pasta de skills do seu
agente. Exemplos:

| Agente | No projeto | No usuário |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `.agents/skills/` | `~/.agents/skills/` |
| Cursor, OpenCode, Cline e outros | `.agents/skills/` | conforme a documentação do agente |

A lista de agentes compatíveis e a pasta de cada um estão em
[agentskills.io](https://agentskills.io/clients). Cada skill é independente: você pode copiar
só as que quiser.

## 3. Servidor MCP

Para agentes que falam [MCP](https://modelcontextprotocol.io) mas ainda não leem skills. O
servidor é **somente leitura**: lista as skills, entrega o `SKILL.md` e os arquivos de apoio,
e oferece cada skill como *prompt*. Não executa nada nem grava arquivos.

Ferramentas expostas: `listar_skills`, `ler_skill`, `ler_arquivo_da_skill`.

**Fixe a versão.** Os exemplos abaixo apontam para uma tag (`#v1.7.3`). Sem ela, o cliente
baixa e executa o topo da branch principal a cada início — uma mudança com defeito (ou um
comprometimento do repositório) chegaria a você sem revisão. Para atualizar, troque a tag pela
mais recente em
[Releases](https://github.com/rbolsoni/IA-skills-para-nao-devs/releases), depois de ler as
notas. É a mesma regra que o kit ensina para qualquer dependência.

### Claude Code

```bash
claude mcp add ia-skills-para-nao-devs -- npx -y github:rbolsoni/IA-skills-para-nao-devs#v1.7.3
```

### Clientes com configuração JSON (Claude Desktop, Cursor, Gemini CLI e outros)

```json
{
  "mcpServers": {
    "ia-skills-para-nao-devs": {
      "command": "npx",
      "args": ["-y", "github:rbolsoni/IA-skills-para-nao-devs#v1.7.3"]
    }
  }
}
```

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "ia-skills-para-nao-devs": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:rbolsoni/IA-skills-para-nao-devs#v1.7.3"]
    }
  }
}
```

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.ia-skills-para-nao-devs]
command = "npx"
args = ["-y", "github:rbolsoni/IA-skills-para-nao-devs#v1.7.3"]
```

### Windows

Alguns clientes no Windows não encontram o `npx` diretamente. Nesse caso, use o `cmd`:

```json
{ "command": "cmd", "args": ["/c", "npx", "-y", "github:rbolsoni/IA-skills-para-nao-devs#v1.7.3"] }
```

### A partir de um clone local

```json
{ "command": "node", "args": ["<caminho-do-clone>/mcp/servidor.mjs"] }
```

Com `--skills <pasta>` o servidor entrega outra pasta de skills (por exemplo, as do seu
projeto, inclusive instaladas por link pelo `npx skills`).

**Qual versão está rodando?** O cliente mostra a versão do servidor no formato
`<pacote>+<impressão do conteúdo>` (ex.: `1.0.0+8a1dfba26d76`), e `listar_skills` mostra a
versão de cada skill.

## 4. Plataformas que geram o app (Lovable, Bolt, Replit, v0)

Duas camadas: **regras sempre ativas**, que a plataforma manda ao agente em toda mensagem, e
**skills**, onde a plataforma aceita.

1. **Regras essenciais.** Copie o texto de
   [regras-essenciais.modelo.md](../skills/iniciar-projeto/assets/regras-essenciais.modelo.md)
   e cole onde a plataforma guarda instruções fixas do projeto:
   - **Lovable:** o agente lê o `AGENTS.md` da raiz do repositório. Sem repositório, use
     **Project settings → Knowledge** (até 10 mil caracteres).
   - **Bolt:** **Project settings → Knowledge**.
   - **Replit:** arquivo `replit.md` na raiz do projeto.
   - **v0:** **Project → Knowledge**.
2. **Skills (Lovable e Bolt).** As duas importam skills neste formato a partir do GitHub:
   informe `https://github.com/rbolsoni/IA-skills-para-nao-devs` na tela de skills da
   plataforma e escolha as do perfil que faz sentido (veja os perfis acima). No Lovable, as
   skills valem para o workspace inteiro; no Bolt, a importação lista até 100 skills por
   repositório.

Conferido na documentação de cada plataforma em 2026-09-30. As telas mudam: se o caminho
estiver diferente, procure "Knowledge" ou "Skills" nas configurações do projeto.

## Depois de instalar

Peça ao agente: **"Configure este projeto seguindo as boas práticas."** A skill
`iniciar-projeto` cria um `AGENTS.md` no seu projeto que lista as skills e quando usar cada
uma — assim as regras valem em toda sessão, não só quando uma skill ativa.

## Conferindo que funcionou

- Pergunte ao agente quais skills ele tem disponíveis.
- Faça um pedido que deveria ativar uma skill (ex.: "onde coloco a chave da API?") e veja se
  ele segue as instruções de `segredos-e-credenciais`.
- No MCP, o cliente deve listar as três ferramentas do servidor `ia-skills-para-nao-devs`.
