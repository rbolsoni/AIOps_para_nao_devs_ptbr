---
name: incidente-vira-checagem
description: >-
  Use quando algo der errado — bug em produção, deploy quebrado, segredo vazado,
  regressão, erro repetido do agente — para escrever o registro (postmortem) sem culpados
  e criar a checagem automática que impede a volta, e quando pedirem "isso não pode
  acontecer de novo".
license: MIT
metadata:
  categoria: operacao
  versao: "1.0.1"
---

# Incidente vira checagem

Um sistema aprende como um organismo: cada infecção deixa um anticorpo. Corrigir o bug
resolve o incidente de hoje; a checagem automática é o anticorpo que impede o próximo. Sem
ela, a mesma falha volta — trazida por outra pessoa, outro agente ou você mesmo daqui a seis
meses.

## O ciclo

1. **Contenha.** Pare o dano: reverta, desligue a funcionalidade, rotacione a credencial.
   Conter vem antes de entender.
2. **Corrija com teste.** O defeito ganha um teste que falha sem a correção (skill
   `testes-e-qualidade`).
3. **Registre** num documento curto e sem culpados — modelo em
   [assets/registro-de-incidente.modelo.md](assets/registro-de-incidente.modelo.md): o que
   aconteceu, impacto, causa raiz, **por que nada pegou antes**, o que muda.
4. **Crie a checagem mecânica** que pega a *classe* do problema, não só a instância.
5. **Prove que a checagem pega**: rode contra um caso que viola a regra e veja falhar.
6. **Ligue na esteira** (e no gancho de pré-commit, se for barata).
7. **Anote na memória** do projeto a pista para quem vier depois (skill `memoria-de-projeto`).

## Como é uma boa checagem

- **Determinística e barata**: roda em segundos, sem depender de rede quando possível.
- **Precisa**: falso positivo ensina a equipe a ignorar a checagem — que é como ela morre.
  Diferencie o que é realmente perigoso do que só parece (ex.: chave pública × chave
  secreta).
- **Exercita o comportamento real** quando dá: tentar a escrita proibida no banco de
  homologação e exigir a recusa prova mais do que procurar texto no SQL.
- **Falha alto e explica**: código de saída diferente de zero, `arquivo:linha`, o que está
  errado e o que fazer. `--json` para automação.
- **Conta a própria origem** no cabeçalho: qual incidente motivou, o que verifica, o que
  *não* verifica, como rodar. É isso que impede alguém de apagá-la "porque parece inútil".
- **Separa "não consegui verificar" de "verifiquei e falhou"**, com mensagens diferentes.

Esqueleto com cabeçalho e estrutura, em JavaScript e Python:
[assets/modelo-de-checagem.md](assets/modelo-de-checagem.md).

## Código ou IA? Escolha a ferramenta certa

- **Regra determinística** (padrão proibido, configuração obrigatória, permissão que deve
  ser recusada, versão fixada): código. Um modelo de linguagem não deve ser o guardião do
  que um script garante sempre.
- **Julgamento** (esta mudança é arriscada? este texto está claro?): revisão humana ou
  revisão por agente — com a checagem mecânica rodando antes.
- **Instrução para agentes** (o agente repetiu um erro): regra no `AGENTS.md` ou armadilha
  na skill correspondente, *além* da checagem, se o erro for verificável.

## Exemplos de incidente → checagem

| Incidente | Checagem que ficou |
|---|---|
| Chave de serviço commitada via `process.env.X \|\| '<literal>'` | varredor de segredos com regra para valor padrão literal, na esteira |
| Migração aplicada em produção por integração paralela | alerta quando o passo de migração da release diz "já atualizado" com migração nova; integração desligada e documentada |
| Conversão em lote de funções de banco derrubou o controle de acesso | checagem empírica que tenta cada operação proibida na homologação |
| Release terminou verde sem publicar (segredo ausente) | etapa que falha quando o segredo obrigatório falta |
| Manual interno servido na pasta pública | checagem que lista arquivos da pasta pública e falha para extensões/nomes proibidos |
| Terminações de linha corrompidas por script | `.gitattributes` com LF e checagem de CRLF em arquivos de texto |

## Armadilhas

- **Registro com culpado**: pessoas escondem incidentes quando o registro aponta nomes.
  Aponte processos e lacunas de proteção.
- **Checagem que ninguém roda**: fora da esteira, ela não existe.
- **Checagem só da instância**: bloquear aquele arquivo específico em vez do padrão que o
  gerou.
- **Checagem nunca vista falhando**: sem o passo 5, você não sabe se ela funciona.
