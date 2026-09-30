# Runbook de recuperação — <Nome do projeto>

> Guarda nomes, lugares e tempos — nunca valores de segredo. Atualize depois de cada ensaio.

## Metas

- Quanto dado podemos perder (RPO): <ex.: até 1 hora de pedidos>
- Em quanto tempo voltamos ao ar (RTO): <ex.: até 2 horas>
- Quem decide restaurar ou voltar a versão: <nome ou papel> (substituto: <nome ou papel>)

## Onde está cada coisa

| O quê | Onde | Retenção | Quem acessa |
|---|---|---|---|
| Backup do banco | <provedor e projeto; diário ou PITR> | <dias> | <papéis> |
| Cópia independente | <local fora da conta principal> | <dias> | <papéis> |
| Arquivos enviados | <bucket; versionamento ligado?> | <dias> | <papéis> |
| Variáveis e ajustes de painel | <onde está o inventário> | — | <papéis> |
| Registros de DNS | <provedor de DNS> | — | <papéis> |

## Restaurar o banco

1. Pare o que está causando o dano: <como>.
2. Anote os horários — início do problema: <…>; detecção: <…>.
3. Restaure num **projeto novo**, para o instante <…>: <passos no painel ou comando>.
4. Confira: <contagens e fluxo real a testar>.
5. Traga os dados que faltam ou troque a conexão: <como>.
6. Avise <quem> e registre o incidente.

## Voltar a versão do site

1. Actions → "Voltar versão" → "Run workflow" → tag <vX.Y.Z>. (Ou: <reversão da plataforma>.)
2. Confira o teste de fumaça e a página <…>.
3. A versão anterior funciona com o banco atual? <sim, as migrações seguem expandir → contrair |
   não: <o que fazer>>

## Último ensaio

| Data | O que foi restaurado | Tempo medido | Problemas encontrados |
|---|---|---|---|
| <AAAA-MM-DD> | <…> | <…> | <…> |
