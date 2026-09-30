# Configuração por ferramenta

Nomes de opções, arquivos e comportamentos mudam entre versões. Os itens abaixo foram
conferidos na documentação oficial de cada ferramenta em 2026-09-30; antes de configurar, abra
o link e confira. O que não está aqui não foi confirmado: procure na documentação da ferramenta
pelos termos entre aspas.

Para cada ferramenta, três perguntas: **como impedir a leitura de segredos**, **como controlar
as aprovações** e **como passar token a um servidor MCP sem escrevê-lo no arquivo**.

## Claude Code

Documentação: https://code.claude.com/docs/en/permissions,
https://code.claude.com/docs/en/settings, https://code.claude.com/docs/en/sandboxing e
https://code.claude.com/docs/en/mcp.

- **Segredos**: regras `deny` nas configurações — no projeto, `.claude/settings.json`
  (versionado, vale para a equipe); para você, `~/.claude/settings.json`:

  ```json
  {
    "permissions": {
      "allow": ["Bash(npm run lint)", "Bash(npm run test *)"],
      "deny": ["Read(./.env)", "Read(./.env.*)"]
    }
  }
  ```

  As regras de permissão valem para todas as ferramentas do agente; o sandbox acrescenta um
  bloqueio no nível do sistema operacional para comandos de shell e seus processos. A
  documentação recomenda usar os dois: o sandbox continua valendo mesmo se uma injeção de
  prompt enganar o modelo.
- **Aprovações**: o modo `bypassPermissions` pula as confirmações; a própria documentação diz
  para usá-lo só em ambiente isolado (contêiner ou VM). `permissions.disableBypassPermissionsMode`
  com valor `"disable"` impede o uso. Libere comandos específicos em `allow` (exemplo acima), não
  a ferramenta inteira. `.claude/settings.local.json` guarda preferências pessoais e fica fora
  do git quando a ferramenta cria o arquivo.
- **MCP**: o `.mcp.json` do projeto aceita `${VAR}` e `${VAR:-padrão}` em `command`, `args`,
  `env`, `url` e `headers` — escreva `"Authorization": "Bearer ${API_KEY}"`, nunca o valor.
  A documentação avisa: confie em cada servidor antes de conectá-lo; servidores que buscam
  conteúdo externo expõem a injeção de prompt.

## OpenAI Codex

Documentação: https://learn.chatgpt.com/codex/sandboxing.

- **Aprovações e sandbox**: modos de sandbox `read-only`, `workspace-write` (padrão para
  trabalho local) e `danger-full-access`; políticas de aprovação `on-request` (padrão: pede
  quando precisa sair do sandbox) e `never`. "Acesso total" é `danger-full-access` com `never`
  — só em ambiente descartável.
- **Segredos**: mantenha `.env` e credenciais fora do alcance do sandbox de escrita e procure na
  documentação por lista de exclusão de arquivos para a sua versão.
- **MCP**: servidores em `~/.codex/config.toml`, seção `[mcp_servers.<nome>]`; passe tokens
  pelo mecanismo de variáveis de ambiente que a documentação indicar, nunca o valor literal.

## Cursor

Documentação: https://cursor.com/docs/context/ignore-files.

- **Segredos**: `.cursorignore` impede o acesso do Agent, do Tab, do Inline Edit e das
  referências com @ aos arquivos listados. A documentação avisa que a proteção não é garantida
  e que **o terminal e as ferramentas MCP usadas pelo Agent não respeitam a lista** — por isso
  segredo de produção não fica na máquina, com ou sem `.cursorignore`.
- **MCP**: configuração em `.cursor/mcp.json`; use a referência a variável de ambiente que a
  documentação indicar ("MCP" → variáveis de ambiente).

## GitHub Copilot no VS Code

Documentação: https://code.visualstudio.com/docs/agents/reference/mcp-configuration.

- **MCP**: em `.vscode/mcp.json`, segredo por variável de entrada, pedida na hora e guardada
  pelo editor, ou por arquivo de ambiente:

  ```json
  {
    "inputs": [
      { "type": "promptString", "id": "api-key", "description": "Chave da API", "password": true }
    ],
    "servers": {
      "exemplo": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "<pacote-do-servidor>@<versão>"],
        "env": { "API_KEY": "${input:api-key}" }
      }
    }
  }
  ```

  Alternativa: `"envFile": "${workspaceFolder}/.env"`. A documentação avisa que servidor MCP
  local pode executar qualquer código na máquina: só de fonte confiável, e revise a
  configuração de MCP de um repositório antes de confiar nele.
- **Segredos**: procure por "content exclusion" na documentação do Copilot para o seu plano.

## Gemini CLI

Documentação: https://geminicli.com/docs/cli/gemini-ignore/ e
https://geminicli.com/docs/reference/configuration.

- **Segredos**: `.geminiignore` (sintaxe do `.gitignore`) exclui arquivos das ferramentas que o
  respeitam; outros serviços continuam vendo os arquivos. Reinicie a sessão depois de mudar.
- **Aprovações**: modos `default` (pede aprovação), `auto_edit` (aprova edições) e `plan`
  (somente leitura). O modo YOLO (`--yolo` ou `--approval-mode=yolo`) aprova tudo e só é ligado
  pela linha de comando — use só em ambiente descartável. `--sandbox` (ou `tools.sandbox`) roda
  num ambiente isolado (ex.: docker, podman).
- **MCP**: valores do `settings.json` aceitam `$VAR`, `${VAR}` e `${VAR:-padrão}` — use para
  tokens de servidores MCP.
