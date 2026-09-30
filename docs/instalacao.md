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
npx skills add rbolsoni/AIOps_para_nao_devs_ptbr

# para o seu usuário, valendo em todos os projetos
npx skills add rbolsoni/AIOps_para_nao_devs_ptbr -g

# só para um agente
npx skills add rbolsoni/AIOps_para_nao_devs_ptbr -a claude-code

# só algumas skills
npx skills add rbolsoni/AIOps_para_nao_devs_ptbr -s segredos-e-credenciais -s esteira-ci-cd

# ver o que existe, sem instalar
npx skills add rbolsoni/AIOps_para_nao_devs_ptbr -l
```

Para atualizar depois: `npx skills update`.

**Instalar no projeto ou no usuário?** No projeto (padrão), as skills ficam versionadas junto
com o código e toda a equipe as recebe. No usuário (`-g`), valem para todos os seus projetos,
mas só na sua máquina.

**Versão.** O `npx skills` instala o conteúdo atual da branch principal; a documentação dele
não mostra como fixar uma versão. Por padrão ele cria links para uma cópia central; com
`--copy`, copia as pastas. Se você precisa de uma versão fixa e auditável (empresa, projeto com
revisão de dependências), use o caminho 2 com o arquivo de uma release.

## 2. Copiar as pastas

Baixe o código de uma release (página
[Releases](https://github.com/rbolsoni/AIOps_para_nao_devs_ptbr/releases) → "Source code") ou
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

**Fixe a versão.** Os exemplos abaixo apontam para uma tag (`#v1.0.0`). Sem ela, o cliente
baixa e executa o topo da branch principal a cada início — uma mudança com defeito (ou um
comprometimento do repositório) chegaria a você sem revisão. Para atualizar, troque a tag pela
mais recente em
[Releases](https://github.com/rbolsoni/AIOps_para_nao_devs_ptbr/releases), depois de ler as
notas. É a mesma regra que o kit ensina para qualquer dependência.

### Claude Code

```bash
claude mcp add aiops-para-nao-devs-ptbr -- npx -y github:rbolsoni/AIOps_para_nao_devs_ptbr#v1.0.0
```

### Clientes com configuração JSON (Claude Desktop, Cursor, Gemini CLI e outros)

```json
{
  "mcpServers": {
    "aiops-para-nao-devs-ptbr": {
      "command": "npx",
      "args": ["-y", "github:rbolsoni/AIOps_para_nao_devs_ptbr#v1.0.0"]
    }
  }
}
```

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "aiops-para-nao-devs-ptbr": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:rbolsoni/AIOps_para_nao_devs_ptbr#v1.0.0"]
    }
  }
}
```

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.aiops-para-nao-devs-ptbr]
command = "npx"
args = ["-y", "github:rbolsoni/AIOps_para_nao_devs_ptbr#v1.0.0"]
```

### Windows

Alguns clientes no Windows não encontram o `npx` diretamente. Nesse caso, use o `cmd`:

```json
{ "command": "cmd", "args": ["/c", "npx", "-y", "github:rbolsoni/AIOps_para_nao_devs_ptbr#v1.0.0"] }
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

## Depois de instalar

Peça ao agente: **"Configure este projeto seguindo as boas práticas."** A skill
`iniciar-projeto` cria um `AGENTS.md` no seu projeto que lista as skills e quando usar cada
uma — assim as regras valem em toda sessão, não só quando uma skill ativa.

## Conferindo que funcionou

- Pergunte ao agente quais skills ele tem disponíveis.
- Faça um pedido que deveria ativar uma skill (ex.: "onde coloco a chave da API?") e veja se
  ele segue as instruções de `segredos-e-credenciais`.
- No MCP, o cliente deve listar as três ferramentas do servidor `aiops-para-nao-devs-ptbr`.
