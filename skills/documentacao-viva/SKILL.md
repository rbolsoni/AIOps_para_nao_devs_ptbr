---
name: documentacao-viva
description: >-
  Use ao criar ou atualizar README, AGENTS.md, ADR, CONTRIBUTING, runbook, comentário de
  código ou descrição de PR, e quando uma mudança alterar comando, configuração, variável
  de ambiente ou fluxo de deploy. Mantém uma fonte única da verdade e registra o porquê.
license: MIT
metadata:
  categoria: fundamentos
  versao: "1.0.1"
---

# Documentação viva

Documentação desatualizada é pior que ausente: ela convence alguém a fazer a coisa errada
com confiança. Por isso a documentação muda **no mesmo PR** que o código que ela descreve,
e faz parte da definição de pronto.

## Onde cada coisa mora

| Documento | Para quem | Muda quando |
|---|---|---|
| `README.md` | quem chega ao projeto | muda o que o projeto é, como instalar, rodar ou testar |
| `AGENTS.md` | agentes de IA (e humanos) trabalhando no repo | muda comando canônico, fluxo, regra ou proibição |
| `CONTRIBUTING.md` | quem vai contribuir | muda o fluxo de branch, PR, revisão ou release |
| `docs/adr/NNNN-*.md` | quem vai questionar uma decisão no futuro | uma decisão técnica com alternativas e trade-offs é tomada |
| `CHANGELOG.md` / releases | usuários e operadores | toda versão publicada (gerado a partir dos commits) |
| `.env.example` | quem vai configurar o ambiente | uma variável de ambiente é criada, renomeada ou removida |
| `docs/runbooks/*.md` | quem opera e atende incidente | muda um procedimento operacional ou um painel externo |
| Comentário no código | quem vai mexer naquele trecho | o trecho tem um porquê não óbvio |
| Descrição do PR | o revisor | todo PR |

## Regras

1. **Uma fonte da verdade.** As regras para agentes vivem no `AGENTS.md`. Arquivos
   específicos de ferramenta (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules`,
   `.github/copilot-instructions.md`) apenas apontam para ele. Duas cópias da mesma regra
   divergem — sempre.
2. **Registre o porquê.** O código diz o quê; o histórico diz quando; só a documentação
   guarda o motivo. Um comentário de porquê cita o incidente, a issue ou a data:
   `// Sem .dockerignore, o COPY . . levava o .env para a imagem (incidente de 2026-03).`
3. **Escreva para o leitor real.** README começa pelo que o projeto faz e como rodar em
   poucos comandos. Guia para pessoa leiga não usa jargão sem explicar.
4. **Documente a verdade, não o desejo.** Antes de afirmar que algo protege, bloqueia ou
   valida, confira que de fato faz. Um comentário que diz "a proteção de branch garante
   isso" quando o plano contratado nem oferece proteção de branch é um risco ativo.
5. **Divergência entre doc e código é bug.** Ao encontrar uma, verifique qual lado está
   certo (o código é o que roda), corrija ou avise o usuário, e não confie na doc até lá.
6. **Exemplos não carregam segredos.** Use marcadores óbvios (`<sua-chave-aqui>`,
   `troque-me`), nunca um valor real, nem "só para ilustrar".
7. **Nada de documentação duplicada do código.** Não descreva cada função; documente
   contratos públicos, decisões e procedimentos.

## ADR — registro de decisão

Crie um ADR quando a decisão:

- tem alternativas reais que alguém poderia propor de novo no futuro;
- tem custo de reversão alto (banco, provedor, arquitetura, fluxo de deploy);
- aceita um risco conscientemente (ex.: manter `'unsafe-inline'` na CSP por um motivo
  técnico), ou
- explica por que um alerta de ferramenta foi aceito em vez de corrigido.

Use o modelo em [assets/adr.modelo.md](assets/adr.modelo.md). Numere em sequência
(`0007-titulo-curto.md`). ADR aceito não é editado para mudar a decisão: crie um novo que o
substitui e marque o antigo como "Substituído por 00NN".

## Descrição de pull request

```markdown
## O que muda e por quê
<o problema, não só a solução; link da issue>

## Como verificar
<passos para o revisor reproduzir: comando, tela, cenário>

## O que rodei
- [x] testes  - [x] lint  - [ ] e2e (não rodei: <motivo>)

## Riscos e o que fica de fora
<efeitos colaterais, migração, passos manuais em painel, o que ficou para depois>
```

Marque só o que rodou de fato. Deixar desmarcado é informação útil; marcar sem rodar é
informação falsa.

## Verificação

- [ ] Todo comando citado no README/AGENTS.md existe e funciona.
- [ ] Toda variável de ambiente lida pelo código está no `.env.example` (com marcador).
- [ ] Links internos da documentação apontam para arquivos que existem.
- [ ] Decisões novas com trade-off têm ADR.
- [ ] Nenhum segredo, dado pessoal real ou caminho da máquina local na documentação.

## Armadilhas

- **`CLAUDE.md` e `AGENTS.md` com o mesmo conteúdo copiado**: um é atualizado, o outro
  não, e cada agente segue uma versão diferente da regra.
- **Documentar a regra de versionamento sem conferir a esteira**: a doc diz que commits
  `docs:` não geram versão, mas o workflow gera release em todo merge. Confira no arquivo
  da esteira antes de escrever.
- **Relatório de auditoria que cita o padrão vulnerável** (como exemplo) dispara o
  scanner de segredos. Configure o scanner para diferenciar código de documentação, em vez
  de apagar a explicação.
