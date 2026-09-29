# Auto-evolução segura

Agentes que ajustam o próprio prompt, criam ferramentas, escrevem skills ou alteram o
próprio código podem melhorar a cada ciclo — ou acumular erros com confiança. A diferença
está nas travas.

## As travas

1. **Tudo versionado.** Prompt, ferramentas, skills e configuração do agente vivem no git.
   Cada mudança é um commit revisável e reversível.
2. **Verificação mecânica antes de aceitar.** A mudança só entra se passar em: testes,
   validação de schema/formato, avaliações de regressão (skill `guardrails-e-avaliacao`) e
   checagens de segurança. Código decide, não o próprio agente.
3. **Revisão independente.** Outra instância, com contexto limpo e papel de desafiante,
   tenta derrubar a mudança (skill `orquestracao-multiagente`). Quem propõe não aprova.
4. **Zona proibida.** O agente não pode alterar as próprias travas: a esteira, os testes de
   segurança, a política de permissões, os limites de orçamento, as avaliações que o julgam.
   Essas pastas ficam fora do escopo de escrita dele.
5. **Mudanças pequenas.** Uma alteração por ciclo, para saber o que causou a melhora ou a
   piora.
6. **Reversão automática.** Se as métricas pioram depois de aplicada, volta à versão
   anterior.
7. **Humano no ciclo para o que é estrutural**: mudança de permissões, ferramentas novas de
   risco alto, alteração de objetivos.

## Sistema imune: catálogo de antipadrões

Cada falha observada vira uma entrada num catálogo que o agente lê antes de agir:

```markdown
### <nome curto do antipadrão>
- Sintoma: <como se manifesta>
- Causa: <por que acontece>
- Em vez disso: <o que fazer>
- Checagem: <teste ou script que detecta, se houver>
```

O catálogo é curto e específico — só o que já aconteceu de verdade. Quando uma entrada pode
ser verificada por código, ela vira checagem automática (skill `incidente-vira-checagem`) e
deixa de depender de o agente lembrar.

## Ciclo de melhoria

1. Coletar sinais: avaliações que falharam, correções do usuário, rastros de execução.
2. Propor **uma** mudança (no prompt, numa ferramenta, numa skill) com a hipótese do porquê.
3. Rodar as avaliações com e sem a mudança (linha de base).
4. Revisão independente.
5. Aceitar se melhorou sem regressão; registrar o motivo. Senão, descartar e registrar o que
   não funcionou.

## Sinais de que a auto-evolução está saindo do controle

- O prompt cresce a cada ciclo com regras cada vez mais específicas.
- As avaliações passam, mas usuários reclamam (as avaliações pararam de medir o que importa).
- O agente propõe mudar os próprios limites ou avaliações.
- Mudanças são aceitas sem que alguém consiga explicar por que melhoraram.
