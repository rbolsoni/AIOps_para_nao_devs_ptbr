---
name: memoria-de-projeto
description: >-
  Use quando o usuário corrigir sua forma de trabalhar, pedir para "lembrar", "anotar",
  "não esquecer" ou "da próxima vez", quando você descobrir um fato não óbvio do projeto
  que valerá em sessões futuras (decisão, restrição, armadilha, onde algo fica, quem
  decide o quê), e no início de tarefas para consultar o que já foi aprendido. Define uma
  memória persistente em arquivos Markdown, independente de ferramenta ou modelo de IA.
license: MIT
metadata:
  categoria: fundamentos
  versao: "1.0.0"
---

# Memória de projeto

Cada sessão de um agente começa do zero. Sem memória, o mesmo erro é corrigido pelo
usuário toda semana. Esta skill define um formato simples, em arquivos, que qualquer agente
lê e escreve — e que um humano revisa num PR.

## Onde fica

- **Memória do projeto** (vale para qualquer pessoa ou agente no repositório):
  `.memoria/` na raiz, versionada. Mudanças passam por revisão como qualquer arquivo.
- **Preferências pessoais** (como *você* gosta de trabalhar, não o projeto): fora do
  repositório, no local de memória da sua ferramenta de IA.

Se o projeto já tem um local de memória definido no `AGENTS.md`, use aquele.

## Formato

Um índice e um arquivo por fato:

```
.memoria/
├── INDICE.md                         # uma linha por memória, nada mais
├── deploy-so-pela-esteira.md
└── relatorio-zerado-era-cache.md
```

`INDICE.md` — carregado no início de cada tarefa; por isso é curto:

```markdown
- [Deploy só pela esteira](deploy-so-pela-esteira.md) — integração da plataforma que aplicava migração em produção fica desligada.
- [Relatório zerado era cache](relatorio-zerado-era-cache.md) — conferir o banco antes de culpar "falta de dados".
```

Cada memória usa o modelo [assets/memoria.modelo.md](assets/memoria.modelo.md):
frontmatter com `nome`, `descricao`, `tipo` e `atualizado`, e o fato no corpo.

| Tipo | O que guarda | Exemplo |
|---|---|---|
| `usuario` | quem é o usuário, nível técnico, como prefere receber informação | "não é programador; quer passos de painel com captura do caminho de menus" |
| `feedback` | correção ou aprovação sobre o seu modo de trabalhar | "mostrar mudança de texto visível ao cliente e esperar OK antes de aplicar" |
| `projeto` | fato, restrição ou decisão em andamento que não está no código | "catálogo fica atrás do login por decisão de produto; não propor páginas públicas" |
| `referencia` | onde encontrar algo fora do repositório | "painel de erros: projeto X na ferramenta Y; alertas vão para o canal Z" |

Para `feedback` e `projeto`, o corpo termina com duas linhas:

```markdown
**Por quê:** <o que aconteceu que tornou isto importante>
**Como aplicar:** <o que fazer de diferente, em que situação>
```

O **porquê** é o que permite aplicar a memória com julgamento em vez de obedecê-la às cegas.

## Regras

1. **Um fato por arquivo.** Fica fácil atualizar, apagar e ligar a outros com `[[nome]]`.
2. **Atualize em vez de duplicar.** Antes de criar, procure memória que já cubra o assunto.
3. **Corrija o que estava errado — explicitamente.** Se uma memória se provou falsa, apague
   ou reescreva deixando claro que houve correção. Memória errada é pior que nenhuma.
4. **Datas absolutas.** "Ontem" e "semana passada" perdem o sentido; escreva `2026-09-10`.
5. **Não guarde o que o repositório já guarda**: estrutura de código, histórico do git,
   conteúdo de ADR ou do README. Guarde o que *não é óbvio* a partir deles.
6. **Nunca guarde segredos, tokens, senhas ou dados pessoais de terceiros.**
7. **Memória é pista, não verdade.** Ela reflete o momento em que foi escrita. Antes de
   agir com base nela, confirme que o arquivo, a flag ou a configuração citada ainda
   existe.
8. **Pergunte o que foi não óbvio.** Se o usuário pedir para lembrar algo que já está no
   código ou no git, pergunte o que foi surpreendente e guarde isso.

## Fluxo

- **Início de tarefa:** leia o `INDICE.md`; abra as memórias relevantes para o assunto.
- **Durante:** quando o usuário corrigir você, ou quando você descobrir uma armadilha que
  custou tempo, anote a pista.
- **Fim de tarefa:** crie ou atualize as memórias, atualize o índice e informe o usuário
  do que foi registrado.

## Armadilhas

- **Registrar uma hipótese como fato.** "Os números estão zerados porque ainda não há
  dados" virou memória — e era um bug de cache. Só registre o que foi verificado; se for
  hipótese, diga que é.
- **Memória de projeto que é, na verdade, regra permanente.** Se todo agente precisa
  seguir aquilo sempre, o lugar é o `AGENTS.md`, não a memória.
- **Índice longo demais.** Se passa de algumas dezenas de linhas, consolide memórias
  relacionadas ou mova conhecimento estável para a documentação.
