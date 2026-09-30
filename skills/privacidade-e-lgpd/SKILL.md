---
name: privacidade-e-lgpd
description: >-
  Use ao coletar, guardar, exibir, exportar, compartilhar, registrar em log ou apagar
  dados pessoais (CPF, e-mail, telefone, endereço, saúde, dados de crianças), inclusive ao
  enviá-los a terceiros ou a uma IA, e quando falarem em LGPD, privacidade, consentimento
  ou vazamento.
license: MIT
metadata:
  categoria: seguranca-e-conformidade
  versao: "1.1.1"
---

# Privacidade e LGPD

A Lei Geral de Proteção de Dados (Lei 13.709/2018) vale para qualquer tratamento de dado
pessoal de pessoas no Brasil — de uma startup de duas pessoas a um banco. A forma mais
barata de cumpri-la é decidir no desenho: dado que não é coletado não vaza, não precisa de
base legal e não precisa ser apagado. (A GDPR, na União Europeia, segue a mesma lógica.)

Esta skill orienta o desenho técnico. Não substitui a análise de quem responde
juridicamente pelo projeto; quando a decisão for jurídica, diga isso ao usuário.

## Ao desenhar qualquer funcionalidade com dado pessoal

Responda antes de codar (e registre no inventário de dados —
[assets/inventario-de-dados.modelo.md](assets/inventario-de-dados.modelo.md)):

1. **Qual dado e para qual finalidade?** Cada campo tem um motivo. "Pode ser útil um dia"
   não é finalidade.
2. **Qual a base legal?** Consentimento, execução de contrato, obrigação legal, legítimo
   interesse, etc. Consentimento não é a única — nem sempre é a melhor.
3. **Quem pode ver?** O próprio titular, operadores com necessidade, terceiros por quais
   campos.
4. **Por quanto tempo?** Prazo ou evento que encerra a guarda, e o que precisa ser mantido
   por obrigação legal depois disso.
5. **Com quem é compartilhado?** Provedores (e-mail, pagamento, analytics, monitoramento de
   erros, IA) e se há transferência internacional.

Referência rápida dos artigos e das resoluções da ANPD:
[references/lgpd-referencia-rapida.md](references/lgpd-referencia-rapida.md).

## Regras técnicas

1. **Minimização**: colete o mínimo; prefira dado menos identificável (idade em vez de data
   de nascimento, cidade em vez de endereço, quando bastar).
2. **Acesso restrito por padrão**: tabela com dado pessoal é lida pelo titular e por
   operadores autorizados. Telas de terceiros (perfil público, contraparte de negócio) leem uma
   view só com as colunas necessárias (skill `mudancas-de-banco`).
3. **Dado sensível** (saúde, biometria, origem racial, religião, opinião política, vida
   sexual, dado genético, filiação sindical) e **dado de criança e adolescente** exigem base
   legal específica e proteção reforçada. Confirme com o usuário antes de coletar.
4. **Documentos e arquivos pessoais** em armazenamento privado, com download por URL
   assinada curta.
5. **Logs, analytics e monitoramento de erros sem dado pessoal desnecessário**: mascare
   CPF, e-mail e telefone; desligue a captura automática de corpo de requisição e de campos
   de formulário; revise o que a gravação de sessão captura.
6. **Produção não desce para teste**: dados reais só em produção; homologação usa dados
   fictícios ou anonimizados de forma irreversível (skill `isolamento-de-ambientes`).
7. **Criptografia em trânsito (HTTPS) sempre** e em repouso conforme o provedor; backups
   também contêm dados pessoais.
8. **Rastro de auditoria** para acesso e alteração de dados pessoais por operadores.
9. **Backups entram na retenção**: o que o titular pediu para apagar sai também dos backups,
   no prazo definido (`backup-e-recuperacao`).

## Dados pessoais e agentes de IA

- O que o agente lê — por conector de banco (MCP), exportação, captura de tela ou log — vai
  para o provedor do modelo: é compartilhamento com terceiro e, em geral, transferência
  internacional.
- Não conecte o agente a dados reais de produção; trabalhe com homologação e dados fictícios
  (`isolamento-de-ambientes`, `uso-seguro-de-agentes`).
- Se for inevitável: base legal, termos do provedor (retenção e uso para treinamento),
  contrato, só os campos necessários e mascarados, e registro no inventário de dados.

## Direitos do titular — implemente os fluxos

| Direito | O que o sistema precisa ter |
|---|---|
| Confirmação e acesso | tela ou exportação dos dados que o sistema guarda sobre a pessoa |
| Correção | edição dos dados cadastrais |
| Portabilidade | exportação em formato estruturado (JSON/CSV) |
| Eliminação | exclusão de conta que apaga ou anonimiza o que não precisa ser mantido |
| Informação sobre compartilhamento | lista de terceiros na política de privacidade |
| Revogação do consentimento | tão fácil quanto consentir, com efeito real |
| Revisão de decisão automatizada | canal para pedir revisão quando uma decisão automática afeta a pessoa |

**Exclusão de conta** é o fluxo que mais falha. Faça por um caminho dedicado no servidor
que: confirma a identidade; apaga ou anonimiza os dados pessoais; **retém só o que a lei
obriga** (ex.: dados fiscais), registrando o motivo e o prazo; encerra as sessões; remove
arquivos do storage; e avisa os terceiros que receberam os dados, quando aplicável.

## Transparência

- Política de privacidade em linguagem clara, com finalidades, bases legais, compartilhamentos,
  retenção, direitos e contato do encarregado (DPO).
- Consentimento, quando for a base: específico, destacado, registrado (quem, quando, qual
  versão do texto) e revogável.
- Cookies e rastreadores não essenciais só depois do consentimento.

## Incidente com dados pessoais

Vazamento, acesso indevido ou perda de dados pessoais: contenha, avalie o risco aos
titulares e, se houver risco ou dano relevante, a comunicação à ANPD e aos titulares tem
prazo curto (dias úteis — confira a regra vigente na referência). Registre todo incidente,
mesmo os não comunicados. Veja também `incidente-vira-checagem`.

## Armadilhas

- **Dado pessoal em ferramenta de terceiro sem avaliação**: monitoramento de erros
  capturando corpo de requisição, analytics recebendo e-mail na URL, prompt de IA com dados
  de clientes.
- **Exclusão que só marca `deleted = true`** e deixa tudo legível para sempre.
- **Seed de homologação com dados reais** "só para testar".
- **Página logada indexada por buscador** ou arquivo com dados em pasta pública.
- **Excesso de coleta "para o futuro"**: todo campo novo com dado pessoal precisa de
  finalidade escrita no inventário.
