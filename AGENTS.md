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
| Conferir se as skills alteradas subiram de versão | `npm run conferir:versoes` |
| Testes com cobertura mínima (catraca) | `npm run test:cobertura` |
| Medir a ativação das skills num agente de verdade | `npm run avaliar:gatilhos -- --simular` (depois sem `--simular`) |
| Rodar o servidor MCP | `npm run mcp` |

Antes de abrir PR, rode `validar`, `test`, `verificar:segredos` e `conferir:versoes`. A
esteira (`.github/workflows/ci.yml`) roda os mesmos no Ubuntu (Node 20, 22 e 24) e no
Windows (Node 24), a cobertura com piso, a conferência de versões nos PRs e a auditoria dos
workflows com o zizmor. O `avaliar:gatilhos` **não** roda na esteira: cada consulta é uma
chamada ao agente e consome a cota de quem roda; use antes de release e ao mexer em
descrições. O piso de cobertura fica no script `test:cobertura`: suba-o à mão
quando a cobertura subir de verdade, nunca para o valor exato medido.

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
3. **Agnóstico** de modelo, fornecedor, linguagem e tipo de aplicação. Comando específico
   de uma stack vem acompanhado dos equivalentes ou fica numa referência por stack. Exemplo
   não presume um domínio (loja, por exemplo): use nomes genéricos (registro, saldo,
   cadastro) ou varie os domínios entre os exemplos, para o kit servir a qualquer aplicação.
4. **Só o que o agente não sabe sozinho**: armadilhas reais, padrões escolhidos,
   procedimentos. Não explique o óbvio. Dê um padrão, não um menu.
5. **`SKILL.md` com menos de 500 linhas**; detalhes em `references/`, dizendo **quando** ler
   cada arquivo.
6. **Skill autossuficiente**: links só para arquivos da própria skill. Outra skill é citada
   pelo nome, entre crases.
7. **Frontmatter**: `name` igual à pasta; `description` no imperativo ("Use quando…/Use
   ao…"), com os casos de uso principais primeiro e as palavras que o usuário usa (inclusive
   quem não programa), em **até 360 caracteres — alvo de 300** (ADR 0005: o agente carrega a
   descrição de toda skill em toda sessão, e a soma do kit tem teto testado); `license: MIT`;
   `metadata.categoria` (uma das seções do catálogo) e `metadata.versao` (`X.Y.Z`) como
   strings entre aspas. O validador lê o frontmatter num subconjunto **estrito** de YAML e
   recusa o que o YAML real leria diferente: valor com `: ` ou ` #` precisa de aspas ou de
   bloco `>-`.
8. **Avaliações obrigatórias**: `evals/evals.json` (casos com asserções verificáveis) e
   `evals/gatilhos.json` (ao menos 3 consultas que devem ativar e 2 quase-acertos que não
   devem).
9. **Modelos em `assets/`** usam marcadores `<descrição>` ou `__NOME_EM_MAIUSCULAS__`, que o
   agente substitui ao copiar.
10. Mudança relevante numa skill sobe `metadata.versao` dela: correção → patch; conteúdo
    novo → minor. Mudança só em `evals/` não conta. A esteira confere
    (`npm run conferir:versoes`).
11. Nenhum dado real: sem credenciais, identificadores de projetos, e-mails ou caminhos de
    máquina local.
12. **Nenhum caractere Unicode invisível** (largura zero, controle de direção do texto,
    caracteres de tag): são usados para esconder instruções em arquivos que agentes leem. O
    validador recusa em qualquer arquivo da skill.

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
