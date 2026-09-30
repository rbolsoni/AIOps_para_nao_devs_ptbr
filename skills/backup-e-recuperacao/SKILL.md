---
name: backup-e-recuperacao
description: >-
  Use ao configurar ou revisar backup e restauração de banco e arquivos, antes de migração
  arriscada ou operação destrutiva, e quando for preciso voltar o site para a versão anterior
  ou recuperar dado apagado. Garante backup testado e caminho de volta ensaiado.
license: MIT
metadata:
  categoria: operacao
  versao: "1.0.1"
---

# Backup e recuperação

Backup que nunca foi restaurado é uma hipótese. O que importa são duas respostas, combinadas com
quem responde pelo projeto, em linguagem simples:

- **Quanto dado posso perder?** (RPO) — ex.: "no máximo 1 hora de cadastros e alterações".
- **Em quanto tempo volto ao ar?** (RTO) — ex.: "em até 2 horas".

## O que proteger

| O quê | Como | Observação |
|---|---|---|
| Banco de dados | backup automático com retenção; PITR (volta a qualquer instante) quando o plano oferece | o plano gratuito pode não ter backup — confira |
| Arquivos enviados (storage) | versionamento ou cópia periódica para outro local | apagar do bucket costuma ser definitivo |
| Configuração | inventário das variáveis e dos ajustes de painel (nomes, nunca valores) no runbook | restaurar o banco não basta se ninguém sabe as variáveis |
| Domínio e DNS | lista dos registros | um registro apagado derruba site e e-mail |
| Código | o git já guarda o histórico | se o repositório remoto é o único lugar, tenha uma cópia |

## Regras

1. **RPO e RTO decididos e escritos**, em frases, com o usuário. Eles definem a frequência dos
   backups e o tipo de recuperação.
2. **Backup automático com retenção**, e PITR quando o dado importa e o plano oferece. Saiba o
   que o plano **não** faz e registre.
3. **Cópia independente do que é crítico**: fora da conta ou do projeto principal (exportação
   agendada), criptografada e com acesso restrito. Backup na mesma conta some junto quando a
   conta é apagada ou invadida.
4. **Ensaie a restauração** periodicamente e antes de mudança grande: restaure num **projeto
   separado**, confira contagens e um fluxo real, meça o tempo e anote no runbook. O tempo
   medido é o seu RTO de verdade.
5. **Ponto de restauração antes de operação destrutiva** ou de migração que remove coluna ou
   tabela (`mudancas-de-banco`, `isolamento-de-ambientes`).
6. **Voltar a versão do site** tem caminho ensaiado: republicar a versão anterior pela esteira
   — modelo em [assets/rollback.modelo.yml](assets/rollback.modelo.yml) — ou a reversão da
   própria plataforma, se houver (registre qual). O código volta; o banco se corrige **para a
   frente**, com migração de correção. Migrações em "expandir → migrar → contrair" deixam voltar
   o código sem voltar o banco.
7. **Lixeira (exclusão reversível) só como janela** de recuperação, com prazo e expurgo
   automático. A LGPD exige apagar de verdade o que o titular pediu — inclusive nos backups,
   conforme a retenção definida (`privacidade-e-lgpd`).
8. **Backup tem dado pessoal**: mesma proteção da produção, e nunca desce para teste sem
   anonimização.
9. **Runbook de recuperação** com quem decide, os passos, onde fica cada coisa e os tempos do
   último ensaio — modelo em
   [assets/runbook-de-recuperacao.modelo.md](assets/runbook-de-recuperacao.modelo.md).

## Durante um incidente

1. **Pare de piorar**: interrompa o processo que está apagando ou corrompendo dados.
2. **Não restaure por cima da produção às cegas**: restaure num projeto novo, compare e só então
   traga o que falta (ou troque a conexão).
3. **Anote os horários** — quando começou, quando foi detectado: eles definem até onde voltar.
4. Depois, transforme em proteção (`incidente-vira-checagem`).

## Verificação

- [ ] RPO e RTO escritos e combinados.
- [ ] Backup automático ligado; sei o que o plano cobre e o que não cobre.
- [ ] Cópia independente do que é crítico.
- [ ] Restauração ensaiada nos últimos 3 meses, com o tempo medido no runbook.
- [ ] Caminho para voltar a versão do site ensaiado.
- [ ] Lixeira com prazo e expurgo; retenção de backup compatível com a LGPD.

## Armadilhas

- **Backup na mesma conta** que pode ser apagada ou invadida junto.
- **Plano sem backup "achando que tem"**.
- **Restauração por cima da produção**, apagando o que entrou depois do backup.
- **Voltar o código com o banco já contraído** (coluna removida): o código antigo quebra.
- **Lixeira eterna**: dado "apagado" que continua legível para sempre.
- **Configuração sem inventário**: o banco volta, mas ninguém sabe as variáveis nem os ajustes
  de painel.
