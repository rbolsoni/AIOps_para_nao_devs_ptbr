---
name: mudancas-de-banco
description: >-
  Use ao criar ou alterar tabelas, colunas, índices, políticas de acesso (RLS), funções,
  views, operações atômicas ou dados por migração, em SQL ou ORM, e quando pedirem para
  "mexer no banco" ou corrigir alertas do linter do banco. Garante migração versionada e
  provada em homologação.
license: MIT
metadata:
  categoria: projeto-e-entrega
  versao: "1.0.2"
---

# Mudanças de banco

O banco é o componente mais difícil de desfazer: código ruim se reverte com um deploy;
dado apagado ou coluna removida, não. Por isso toda mudança de banco é código versionado,
revisado, provado em homologação e aplicada por um único caminho.

## Regras

1. **Toda mudança é uma migração versionada** na pasta de migrações do projeto, com
   prefixo de data/hora ordenável. Nada de SQL manual no painel, nem "só para testar" em
   produção.
2. **Quem aplica é a esteira**: homologação no merge da branch de homologação; produção na
   release, depois da trava (skill `esteira-ci-cd`). Não rode o comando de aplicar
   migrações da sua máquina contra um banco remoto.
3. **Migração publicada não se edita.** Se saiu errada, escreva outra que corrige.
4. **Compatível com o código que está rodando.** Durante o deploy, a versão antiga do código
   convive com o banco novo. Mudanças que quebram contrato seguem *expandir → migrar →
   contrair* ([references/migracoes-sem-interrupcao.md](references/migracoes-sem-interrupcao.md)).
5. **Autorização no banco** quando clientes acessam o banco diretamente (ex.: APIs geradas
   a partir do schema, SDKs no navegador): políticas por linha que conferem o usuário, nunca
   "libera tudo". Detalhes e modelos em
   [references/autorizacao-no-banco.md](references/autorizacao-no-banco.md).
6. **Operação crítica é atômica e acontece no servidor.** Consumir algo limitado (vagas,
   créditos, ingressos, estoque), transferir saldo, confirmar uma reserva ou uma compra:
   função/transação no banco (ou serviço) com trava de linha (`SELECT … FOR UPDATE`) —
   nunca vários `insert`/`update` separados vindos do cliente. A função valida os próprios
   argumentos (quantidade, valores, identificadores, dono do saldo) antes de tocar em
   qualquer linha e nunca confia no cliente: uma quantidade negativa que passa vira saldo
   somado.
7. **Minimize o que é exposto.** Tabela com dados pessoais é lida só pelo titular ou por
   operador autorizado; perfis públicos e telas de terceiros leem views com apenas as colunas
   necessárias, somente leitura, com a permissão de cada papel declarada na migração — não
   herdada do padrão da plataforma, que pode liberar leitura para anônimos.
8. **Prove com checagem empírica.** Depois de aplicar em homologação, uma checagem na
   esteira *tenta* a operação proibida (ler dado de outro usuário, escrever com conta
   bloqueada, gravar direto sem passar pela função) e exige a recusa. Ler o SQL não prova
   que a política funciona; executar, sim.
9. **Paridade e drift.** Depois de aplicar, confira que as migrações registradas no banco
   batem com as do repositório. Uma checagem agendada compara homologação e produção para
   pegar mudança manual.

## Procedimento

- [ ] Ler o schema atual e as migrações recentes relacionadas antes de escrever.
- [ ] Escrever a migração (e o rollback lógico, se a ferramenta suportar) no padrão do
      projeto.
- [ ] Mudança destrutiva ou que quebra contrato? Dividir em etapas compatíveis.
- [ ] Tabela nova exposta a clientes? Habilitar políticas de acesso na mesma migração.
- [ ] Atualizar tipos gerados, seed de homologação e documentação.
- [ ] Aplicar em banco local/descartável, se o projeto tiver; rodar os testes.
- [ ] Criar ou atualizar a checagem empírica correspondente (skill `incidente-vira-checagem`).
- [ ] No PR, marcar a seção de banco e lembrar que o CI do PR pode não aplicar migrações —
      a prova vem na homologação.

## Operações que exigem cuidado redobrado

| Operação | Risco | Como fazer |
|---|---|---|
| Remover coluna/tabela | código antigo quebra; dado perdido | parar de usar no código → release → remover numa migração posterior; backup antes |
| Renomear coluna | código antigo quebra | criar nova, escrever nas duas, migrar leituras, remover a antiga depois |
| `NOT NULL` em coluna existente | falha com dados nulos; trava a tabela | preencher dados em lotes → adicionar a restrição |
| Índice em tabela grande | trava escrita | criação concorrente (`CREATE INDEX CONCURRENTLY` no PostgreSQL), fora de transação |
| Atualização em massa | trava longa, log enorme | lotes pequenos, idempotentes, com progresso |
| Função com privilégio elevado (`SECURITY DEFINER`) | executa como dono, ignora políticas | `search_path` fixo, `REVOKE` do público, conceder só a quem precisa, validar o chamador e os argumentos dentro |

## Alertas de linter de banco não são achados

Linters de segurança e desempenho do banco apontam padrões, não defeitos confirmados.
Alguns alertas descrevem uma decisão deliberada que a ferramenta não conhece.

- **Faça triagem de cada alerta**: é defeito real ou decisão consciente? Registre a
  resposta num ADR, com a evidência.
- **Nunca corrija todos de uma vez "para limpar".** Converter em lote funções de privilégio
  elevado para privilégio do chamador, só para zerar alertas, já derrubou de uma vez o
  controle de acesso de operador, os pagamentos, notificações e métricas públicas de um
  sistema em produção.

## Armadilhas

- **"Banco já atualizado" logo depois de um merge com migração nova**: outra coisa aplicou
  antes da esteira (integração da plataforma, alguém no painel). Descubra antes de seguir.
- **Seed mascarando o fluxo real**: coluna preenchida pelo seed em homologação, nunca pelo
  código. Teste o fluxo que grava o dado, não só a tela que o lê.
- **Cache derivado do banco com regra de validade errada**: métrica "zerada" que era cache
  velho. Ao investigar número estranho, consulte tabela de origem, cache e função
  separadamente, nesta ordem.
- **Política de acesso criada, mas não habilitada** na tabela (ex.: RLS desligado): tudo
  fica exposto. Confirme o estado final, não só o comando.
