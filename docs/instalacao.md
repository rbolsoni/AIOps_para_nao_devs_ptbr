# Instalação

Três caminhos, do mais simples ao mais flexível. Todos entregam as mesmas skills.

## 1. `npx skills` (recomendado)

Requer [Node.js](https://nodejs.org) instalado. A ferramenta
[`skills`](https://github.com/vercel-labs/skills) descobre as skills deste repositório e as
instala na pasta certa de cada agente.

```bash
# interativo: pergunta em quais agentes instalar
npx skills add rbolsoni/Padroes_skill_para_AIOps_ptbr

# para o seu usuário, valendo em todos os projetos
npx skills add rbolsoni/Padroes_skill_para_AIOps_ptbr -g

# só para um agente
npx skills add rbolsoni/Padroes_skill_para_AIOps_ptbr -a claude-code

# só algumas skills
npx skills add rbolsoni/Padroes_skill_para_AIOps_ptbr -s segredos-e-credenciais -s esteira-ci-cd

# ver o que existe, sem instalar
npx skills add rbolsoni/Padroes_skill_para_AIOps_ptbr -l
```

Para atualizar depois: `npx skills update`.

**Instalar no projeto ou no usuário?** No projeto (padrão), as skills ficam versionadas junto
com o código e toda a equipe as recebe. No usuário (`-g`), valem para todos os seus projetos,
mas só na sua máquina.

## 2. Copiar as pastas

Baixe ou clone o repositório e copie as pastas de `skills/` que quiser para a pasta de skills
do seu agente. Exemplos:

| Agente | No projeto | No usuário |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex | — | `~/.codex/skills/` |
| Cursor, OpenCode, Cline e outros | `.agents/skills/` | conforme a documentação do agente |

A lista de agentes compatíveis e a pasta de cada um estão em
[agentskills.io](https://agentskills.io/clients). Cada skill é independente: você pode copiar
só as que quiser.

## 3. Servidor MCP

Para agentes que falam [MCP](https://modelcontextprotocol.io) mas ainda não leem skills. O
servidor é **somente leitura**: lista as skills, entrega o `SKILL.md` e os arquivos de apoio,
e oferece cada skill como *prompt*. Não executa nada nem grava arquivos.

Ferramentas expostas: `listar_skills`, `ler_skill`, `ler_arquivo_da_skill`.

### Claude Code

```bash
claude mcp add padroes-skill -- npx -y github:rbolsoni/Padroes_skill_para_AIOps_ptbr
```

### Clientes com configuração JSON (Claude Desktop, Cursor, Gemini CLI e outros)

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

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "padroes-skill": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:rbolsoni/Padroes_skill_para_AIOps_ptbr"]
    }
  }
}
```

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.padroes-skill]
command = "npx"
args = ["-y", "github:rbolsoni/Padroes_skill_para_AIOps_ptbr"]
```

### Windows

Alguns clientes no Windows não encontram o `npx` diretamente. Nesse caso, use o `cmd`:

```json
{ "command": "cmd", "args": ["/c", "npx", "-y", "github:rbolsoni/Padroes_skill_para_AIOps_ptbr"] }
```

### A partir de um clone local

```json
{ "command": "node", "args": ["<caminho-do-clone>/mcp/servidor.mjs"] }
```

Com `--skills <pasta>` o servidor entrega outra pasta de skills (por exemplo, as do seu
projeto).

## Depois de instalar

Peça ao agente: **"Configure este projeto seguindo as boas práticas."** A skill
`iniciar-projeto` cria um `AGENTS.md` no seu projeto que lista as skills e quando usar cada
uma — assim as regras valem em toda sessão, não só quando uma skill ativa.

## Conferindo que funcionou

- Pergunte ao agente quais skills ele tem disponíveis.
- Faça um pedido que deveria ativar uma skill (ex.: "onde coloco a chave da API?") e veja se
  ele segue as instruções de `segredos-e-credenciais`.
- No MCP, o cliente deve listar as três ferramentas do servidor `padroes-skill`.
