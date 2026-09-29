# Resposta a vazamento de segredo

Vale para commit, log público, captura de tela, conversa com IA, arquivo compartilhado ou
imagem de contêiner publicada.

## Ordem de ação

1. **Rotacione ou revogue a credencial agora.** Gere uma nova no painel do provedor,
   atualize os cofres (esteira, plataforma de deploy, `.env` de quem precisa) e revogue a
   antiga. Até isso acontecer, o vazamento está ativo — nenhuma outra etapa o encerra.
   Lembre que a chave costuma ser **por ambiente**: rotacionar a de produção não mexe na de
   homologação, e vice-versa. Rotacione todas as que vazaram.
2. **Verifique o uso indevido.** Logs de acesso do provedor, faturamento, criação de
   recursos, leituras incomuns no banco, no período entre o vazamento e a rotação.
3. **Remova do código** e troque pelo padrão certo (variável de ambiente obrigatória).
4. **Decida sobre o histórico.** Reescrever o histórico (ex.: `git filter-repo`) reduz a
   exposição futura, mas exige coordenação: todo clone precisa ser refeito, PRs abertos
   quebram e o force push precisa de autorização explícita do dono do repositório. Em
   repositório público, considere que o valor já foi copiado — a rotação é o que protege.
   Se reescrever, substitua o valor por um marcador explícito (ex.: `REMOVIDO_DO_HISTORICO`)
   e configure o scanner para ignorar esse marcador.
5. **Impeça a reincidência com uma checagem automática** (skill
   `incidente-vira-checagem`): regra no scanner para o padrão que permitiu o vazamento,
   rodando antes do commit e na esteira.
6. **Registre**: ADR ou registro de incidente com o que vazou (tipo, nunca o valor), por
   onde, desde quando, o que foi rotacionado, o que foi verificado e o que mudou.
7. **Avalie obrigações legais.** Se a credencial dava acesso a dados pessoais e há indício
   de acesso indevido, siga o procedimento de incidente de dados (skill
   `privacidade-e-lgpd`).

## O que não fazer

- Não "resolva" só apagando o arquivo num commit novo.
- Não conclua que "ninguém viu" porque o repositório é privado.
- Não reescreva o histórico antes de rotacionar.
- Não cole a credencial nova na conversa, no ticket ou no PR para "confirmar" que mudou.

## Checklist

- [ ] Credencial nova gerada e cadastrada nos cofres de cada ambiente afetado.
- [ ] Credencial antiga revogada (tentativa de uso com ela falha).
- [ ] Logs do provedor revisados no período de exposição.
- [ ] Código corrigido; varredura limpa.
- [ ] Decisão sobre o histórico tomada e registrada.
- [ ] Checagem que impede a reincidência ativa na esteira.
- [ ] Registro do incidente sem o valor do segredo.
