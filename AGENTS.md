# Padrões de Skills para AIOps (PT-BR) — instruções para agentes

> Fonte única de regras para qualquer agente (e pessoa) que trabalhe neste repositório.
> `CLAUDE.md` e `GEMINI.md` apenas apontam para cá.

## O que é

Um conjunto de skills no padrão Agent Skills (agentskills.io), em português do Brasil, que
ensina agentes de IA a programar com boas práticas de mercado. Distribuído por `npx skills`,
por cópia de pastas e por um servidor MCP somente leitura. Sem dependências de terceiros.

## Comandos canônicos

| Finalidade | Comando |
|---|---|
| Validar as skills | `npm run validar` |
| Testes | `npm test` |
| Varredura de segredos | `npm run verificar:segredos` |
| Rodar o servidor MCP | `npm run mcp` |

Rode os três primeiros antes de abrir PR. A esteira (`.github/workflows/ci.yml`) roda os
mesmos, em Node 20, 22 e 24.

## Estrutura

- `skills/<nome>/` — uma skill por pasta: `SKILL.md`, `references/`, `assets/`, `scripts/`,
  `evals/`. Plana, sem subpastas de categoria (ADR 0001).
- `ferramentas/` — validador e o leitor de skills compartilhado com o MCP.
- `mcp/servidor.mjs` — servidor MCP somente leitura (ADR 0003).
- `testes/` — `node --test`; fixtures geradas em pasta temporária.
- `docs/` — instalação, inspirações e ADRs.

## Regras de conteúdo das skills

1. **Português do Brasil**, direto, no imperativo, explicando o porquê das regras.
2. **Escrito do zero.** Nada copiado de outros repositórios ou documentos, nem trechos
   (ADR 0004). Inspiração vai para `docs/inspiracoes.md`.
3. **Agnóstico** de modelo, fornecedor e linguagem. Comando específico de uma stack vem
   acompanhado dos equivalentes ou fica numa referência por stack.
4. **Só o que o agente não sabe sozinho**: armadilhas reais, padrões escolhidos,
   procedimentos. Não explique o óbvio. Dê um padrão, não um menu.
5. **`SKILL.md` com menos de 500 linhas**; detalhes em `references/`, dizendo **quando** ler
   cada arquivo.
6. **Skill autossuficiente**: links só para arquivos da própria skill. Outra skill é citada
   pelo nome, entre crases.
7. **Frontmatter**: `name` igual à pasta; `description` no imperativo ("Use quando…/Use
   ao…"), até 1024 caracteres, cobrindo pedidos que não usam o termo técnico; `license: MIT`;
   `metadata.categoria` e `metadata.versao` como strings entre aspas.
8. **Avaliações obrigatórias**: `evals/evals.json` (casos com asserções verificáveis) e
   `evals/gatilhos.json` (ao menos 3 consultas que devem ativar e 2 quase-acertos que não
   devem).
9. **Modelos em `assets/`** usam marcadores `<descrição>` ou `__NOME_EM_MAIUSCULAS__`, que o
   agente substitui ao copiar.
10. Mudança relevante numa skill sobe `metadata.versao` dela.
11. Nenhum dado real: sem credenciais, identificadores de projetos, e-mails ou caminhos de
    máquina local.

## Regras para scripts

- Node.js 20+, **sem dependências**, não interativos.
- `--help`, `--json`, códigos de saída documentados (0 ok, 1 achado/violação, 2 erro de uso
  ou de execução — "não consegui verificar" nunca se confunde com "verifiquei e falhou").
- Nunca imprimir segredos: só início e tamanho.
- **Funciona chamado por caminho com link simbólico**, o modo padrão do `npx skills` (junction
  no Windows). Para decidir se foi executado diretamente, compare o caminho real dos dois
  lados (`realpathSync` em `process.argv[1]` e em `import.meta.url`): o Node resolve o link
  só no segundo, e a comparação direta faz o script sair com 0 sem verificar nada. O teste
  de cada script também o roda por um link.
- Todo script tem teste em `testes/`. Segredos de teste são gerados em tempo de execução —
  nunca grave um token com formato real no repositório (dispara os scanners e o bloqueio de
  push).

## Fluxo de trabalho

1. Branch a partir de `main`: `tipo/descricao-curta`.
2. Commits Convencionais. `feat:` e `fix:` geram release (minor/patch); `docs:`, `chore:`,
   `test:`, `ci:`, `refactor:` não geram (`.github/scripts/proxima-versao.sh`).
3. PR para `main` com o modelo preenchido; CI verde (confira a conclusão do run).
4. Merge → a release (`release.yml`) roda depois do CI verde e publica tag e notas, se houver
   `feat`/`fix`.

A versão publicada é a tag do GitHub. `package.json.version` só muda quando o pacote for
publicado no npm.

`.github/scripts/proxima-versao.sh` é cópia exata de
`skills/esteira-ci-cd/scripts/proxima-versao.sh` (um teste garante). Mude os dois juntos.

## Nunca sem pedido explícito

Push, merge, criar release ou tag manual, publicar no npm, mudar configurações do repositório.
