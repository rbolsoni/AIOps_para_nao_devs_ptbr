---
name: iniciar-projeto
description: >-
  Use quando o usuário quiser começar um projeto, criar ou organizar um repositório,
  "deixar pronto para produção", "configurar do jeito certo", adotar boas práticas num
  projeto existente, ou quando o repositório não tiver AGENTS.md, README, .gitignore,
  licença, testes ou CI. Detecta a linguagem e a stack, cria a base de governança
  (AGENTS.md, README, SECURITY.md, .gitignore, .gitattributes, .env.example, ADRs,
  modelo de PR, comandos de qualidade e esteira) e entrega ao usuário, em linguagem
  simples, a lista do que ele ainda precisa configurar em painéis externos.
license: MIT
metadata:
  categoria: projeto-e-entrega
  versao: "1.0.0"
---

# Iniciar projeto

Esta skill monta a base que faz todas as outras funcionarem: um `AGENTS.md` com as regras
do projeto (lido por qualquer agente em toda sessão), comandos de qualidade que rodam igual
na máquina e na esteira, e a proteção contra os erros mais caros — segredo no código,
deploy sem teste e dado real em ambiente de teste.

Funciona em projeto novo ou existente. Em projeto existente, **acrescente o que falta e
proponha mudanças no que existe**; nunca sobrescreva arquivo do usuário sem mostrar o diff
e receber OK.

## Progresso

- [ ] 1. Diagnóstico (sem alterar nada)
- [ ] 2. Perguntas que mudam o plano
- [ ] 3. Plano aprovado pelo usuário
- [ ] 4. Arquivos de base
- [ ] 5. Comandos de qualidade
- [ ] 6. Esteira e checagens
- [ ] 7. Tarefas de painel para o usuário
- [ ] 8. Verificação final e relatório

## 1. Diagnóstico

Levante, sem modificar nada:

- **Stack**: detecte pelos arquivos de manifesto usando
  [references/deteccao-e-comandos-por-stack.md](references/deteccao-e-comandos-por-stack.md).
  Pode haver mais de uma (ex.: front em TypeScript e API em Python).
- **O que já existe**: README, AGENTS.md (e CLAUDE.md, GEMINI.md, regras de outras
  ferramentas), LICENSE, .gitignore, .gitattributes, .env.example, testes, CI, ADRs.
- **Git**: é repositório? Tem remoto? Qual hospedagem (GitHub, GitLab…)? Público ou
  privado? Qual o plano (isso decide se existe proteção de branch — veja `esteira-ci-cd`)?
- **Riscos imediatos**: `.env` ou chave versionada, `node_modules`/`dist` commitados,
  terminações de linha mistas. Segredo já versionado é prioridade: siga
  `segredos-e-credenciais` antes de qualquer outra coisa.
- **Contexto de produto**: tem banco de dados? Deploy em qual plataforma? Lida com dados
  pessoais? Tem usuários reais?

## 2. Perguntas que mudam o plano

Pergunte apenas o que você não consegue descobrir e que muda o resultado:

- Nome e descrição do projeto (uma frase).
- Licença: projeto aberto → recomende MIT (ou Apache-2.0, se proteção de patente importar);
  projeto fechado → sem licença aberta, com aviso de "todos os direitos reservados".
- Onde vai rodar (plataforma de deploy) e se terá ambiente de homologação.
- Quem vai manter: a pessoa programa ou não? Isso muda o tom das instruções e o nível de
  detalhe das tarefas de painel.

Para o resto, use padrões sensatos e diga quais usou.

## 3. Plano

Mostre a lista de arquivos a criar e a alterar, uma linha cada, com o motivo. Espere o OK.

## 4. Arquivos de base

Use os modelos em `assets/`, preenchendo os marcadores `<...>` e `__COMANDO_...__`:

| Arquivo no projeto | Modelo | Observação |
|---|---|---|
| `AGENTS.md` | [assets/AGENTS.modelo.md](assets/AGENTS.modelo.md) | fonte única de regras para agentes |
| `CLAUDE.md`, `GEMINI.md` | [assets/apontador-agentes.modelo.md](assets/apontador-agentes.modelo.md) | só apontam para o AGENTS.md; crie os que o usuário usa |
| `README.md` | [assets/README.modelo.md](assets/README.modelo.md) | o que é, como rodar, como contribuir |
| `CONTRIBUTING.md` | [assets/CONTRIBUTING.modelo.md](assets/CONTRIBUTING.modelo.md) | fluxo de branch, commit e PR |
| `SECURITY.md` | [assets/SECURITY.modelo.md](assets/SECURITY.modelo.md) | como reportar vulnerabilidade |
| `.gitignore` | [assets/gitignore-segredos.modelo](assets/gitignore-segredos.modelo) + o `.gitignore` padrão da linguagem | nunca versionar `.env`, chaves, builds |
| `.gitattributes` | [assets/gitattributes.modelo](assets/gitattributes.modelo) | terminação de linha única |
| `.editorconfig` | [assets/editorconfig.modelo](assets/editorconfig.modelo) | mesma formatação básica em todo editor |
| `.env.example` | [assets/env.example.modelo](assets/env.example.modelo) | toda variável, só com marcadores |
| `.github/pull_request_template.md` | [assets/pull_request_template.modelo.md](assets/pull_request_template.modelo.md) | ou o equivalente da hospedagem |
| `docs/adr/0001-registro-de-decisoes.md` | modelo de ADR da skill `documentacao-viva` | primeira decisão: adotar ADRs e estas práticas |
| `LICENSE` | texto oficial da licença escolhida | nunca "traduza" o texto jurídico |

**Atenção com `.gitattributes` em projeto existente:** normalizar as terminações de linha
reescreve muitos arquivos num commit só. Explique isso ao usuário e faça num commit
separado (`chore: normaliza terminações de linha`), nunca misturado com outra mudança.

## 5. Comandos de qualidade

Garanta que o projeto tenha, e que o `AGENTS.md` liste, os comandos canônicos:
instalar dependências, formatar, lint, checar tipos, testar com cobertura, auditar
vulnerabilidades, checar licenças e varrer segredos. Use os padrões da tabela de
[references/deteccao-e-comandos-por-stack.md](references/deteccao-e-comandos-por-stack.md)
quando o projeto ainda não tiver um. Prefira expor tudo pelo gerenciador do projeto
(`npm run …`, `make …`, `just …`, tarefas do Gradle) para que máquina e esteira rodem o
mesmo comando.

Rode cada comando uma vez. Se um falhar no código existente, **não conserte tudo agora**:
registre o estado inicial e combine com o usuário (ex.: piso de cobertura no valor atual,
veja `testes-e-qualidade`).

## 6. Esteira e checagens

- Monte a esteira com a skill `esteira-ci-cd` (modelos prontos lá).
- Varredura de segredos: skill `segredos-e-credenciais`.
- Licenças e vulnerabilidades: skill `dependencias-e-licencas`.
- Se for aplicação web: `headers-de-seguranca` e `acessibilidade-web`.
- Se tiver banco: `mudancas-de-banco` e `isolamento-de-ambientes`.
- Se tratar dados pessoais: `privacidade-e-lgpd`.

## 7. Tarefas de painel

Tudo que depende de um painel externo (proteção de branch, secrets, varredura de segredos
da hospedagem, variáveis na plataforma de deploy, domínio) vira uma lista para o usuário,
no formato da skill `guiar-usuario-em-paineis`. Não peça que ele cole segredos na conversa.

## 8. Verificação final e relatório

- Rode todos os comandos canônicos e a validação da esteira (quando possível localmente).
- Passe pela [references/checklist-de-prontidao.md](references/checklist-de-prontidao.md)
  e marque o que está coberto, o que ficou pendente e por quê.
- Relate ao usuário, em linguagem simples: o que foi criado, o que cada coisa protege, o
  que ele precisa fazer nos painéis e o que ficou para depois.
- Não faça commit, push ou abertura de PR sem pedido explícito (veja `fluxo-de-git`).

## Armadilhas

- **Modelo copiado sem adaptar**: um `AGENTS.md` citando `npm test` num projeto Python
  ensina o agente a errar em toda sessão. Todo marcador precisa ser preenchido ou removido.
- **`.env` já versionado**: adicionar ao `.gitignore` não remove do histórico nem invalida
  a chave. Rotacione primeiro (skill `segredos-e-credenciais`).
- **`.dockerignore` esquecido**: um `COPY . .` leva o `.env` para dentro da imagem. Se há
  Dockerfile, o `.dockerignore` exclui `.env*`, `.git` e artefatos locais.
- **Esteira que o plano não sustenta**: proteção de branch e rulesets podem não existir
  no plano gratuito para repositório privado. Não prometa ao usuário uma proteção que o
  painel não oferece; a trava precisa estar na própria esteira.
