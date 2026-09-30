---
name: disciplina-de-codigo
description: >-
  Use em toda tarefa que escreva, altere ou corrija código, script ou configuração,
  inclusive pedidos curtos ("arruma isso", "adiciona um botão", "faz funcionar"). Define o
  método: premissas explícitas, solução simples, mudança cirúrgica e prova de que
  funcionou.
license: MIT
metadata:
  categoria: fundamentos
  versao: "1.2.0"
---

# Disciplina de código

O erro mais caro de um agente não é código feio: é código que resolve, com confiança, o
problema errado — ou que "funciona" sem ninguém ter visto funcionar. Esta skill é o
método de trabalho. As demais skills dizem *o que* fazer em cada assunto; esta diz *como*
se comportar em qualquer um deles.

## 1. Antes de escrever: entenda

1. **Reescreva o pedido como objetivo verificável.** "Adicionar validação" vira "e-mail
   vazio, e-mail sem @ e e-mail com 300 caracteres são recusados com mensagem clara; um
   teste cobre os três casos". Se você não consegue escrever o critério, ainda não
   entendeu o pedido.
2. **Declare as premissas.** Liste o que você está assumindo (qual tela, qual ambiente,
   qual usuário, qual comportamento atual). Se uma premissa errada mudaria a solução,
   pergunte antes de implementar.
3. **Não escolha em silêncio.** Se existem duas leituras razoáveis do pedido, apresente as
   duas com a sua recomendação e o motivo. Se existe um caminho mais simples do que o
   pedido, diga.
4. **Leia antes de escrever.** Procure no projeto: convenções, utilitários que já fazem o
   que você ia criar, testes existentes, o `AGENTS.md` e a documentação de decisões
   (`docs/adr/`). Leia só os trechos necessários, não arquivos inteiros sem motivo.
5. **Em tarefas com várias etapas, mostre um plano curto**, uma linha por etapa:
   `1. [etapa] -> verificar: [como saberei que deu certo]`.
6. **Garanta um ponto de retorno** antes de mudança grande ou arriscada: o trabalho atual
   salvo (commit ou branch). Se piorar, volta-se ao ponto em vez de empilhar correções.

Quem pede pode não ser programador. Explique em linguagem simples o que vai fazer, o que
pode dar errado e o que a pessoa vai precisar fazer do lado dela (por exemplo, configurar
algo num painel — use a skill `guiar-usuario-em-paineis`).

## 2. Durante: simples e cirúrgico

**Simplicidade primeiro** — o mínimo de código que resolve o problema pedido:

- Nenhuma funcionalidade, opção ou "flexibilidade" que não foi pedida.
- Nenhuma abstração para algo que só existe uma vez.
- Nenhum tratamento de erro para cenário impossível — mas trate todos os cenários
  possíveis (entrada inválida, rede fora, arquivo ausente).
- Teste do sênior: "um engenheiro experiente diria que isto está complicado demais?" Se
  sim, simplifique. Se escreveu 200 linhas onde cabiam 50, reescreva.

**Mudança cirúrgica** — cada linha alterada precisa remeter ao pedido:

- Não reformate, não renomeie e não "melhore" código vizinho que não faz parte da tarefa.
- Siga o estilo existente, mesmo que você fizesse diferente.
- Código morto não relacionado: mencione ao usuário, não apague.
- Remova apenas o que a **sua** mudança deixou órfão (imports, variáveis, funções).
- Preserve a terminação de linha (LF/CRLF) e a codificação de cada arquivo. Ao editar por
  script, detecte o separador do arquivo e use `\r?\n` nos padrões de busca.
- Não adicione dependência nova sem necessidade real (veja `dependencias-e-licencas`).

## 3. Depois: prove que funciona

1. **Rode o que valida a mudança**: testes, lint, checagem de tipos e o que mais o
   `AGENTS.md` do projeto listar. Leia a saída — não só o código de saída.
2. **Bug se corrige com teste primeiro**: escreva o teste que reproduz o defeito, veja-o
   falhar, corrija, veja-o passar.
3. **Confira o diff inteiro antes de entregar.** Um diff muito maior que o trabalho feito
   é sinal de dano (terminação de linha trocada, formatação automática, arquivo gerado).
4. **Relate com fidelidade**: o que rodou e passou, o que rodou e falhou (com a saída), o
   que não rodou e por quê. Nunca escreva "testado" sem ter executado.
5. **Entregue algo que quem não programa consiga conferir**, em três partes curtas e em
   linguagem simples:
   - **o que mudou**, como comportamento ("o formulário recusa e-mail sem @"), não como lista
     de arquivos;
   - **como conferir**, em passos que a pessoa faz na tela, com o resultado esperado de cada
     um. Mudança que não aparece na tela: diga isso e mostre a prova (saída do teste,
     resposta da API);
   - **o que pode dar errado**, com o risco real e o que fazer se acontecer.
6. **Mudança de risco pede um segundo olhar.** Dinheiro, dados de pessoas, permissão ou
   produção: proponha que outra sessão ou outro agente, sem o contexto desta conversa,
   revise só o pedido e o diff procurando falhas (skill `orquestracao-multiagente`).

### Definição de pronto

- [ ] O critério verificável do passo 1 foi checado e passou.
- [ ] Testes, lint e tipos passam (ou a falha foi explicada ao usuário).
- [ ] O diff contém só o que o pedido exige.
- [ ] Nenhum segredo, senha ou dado pessoal entrou no código (veja `segredos-e-credenciais`).
- [ ] Documentação e `.env.example` acompanham a mudança (veja `documentacao-viva`).
- [ ] O usuário sabe o que falta fazer do lado dele, se houver algo.
- [ ] A entrega diz, em linguagem simples, o que mudou, como conferir e o que pode dar errado.

## Quando parar e perguntar

Pare e confirme com o usuário antes de:

- ações irreversíveis ou visíveis para fora: deploy, push, publicar, apagar dados,
  enviar e-mail, gastar dinheiro, mudar permissão;
- qualquer coisa que toque produção (veja `isolamento-de-ambientes`);
- seguir quando o pedido contradiz uma regra do `AGENTS.md` do projeto;
- continuar depois de duas tentativas falhas com a mesma abordagem — diga o que tentou e
  o que observou, em vez de insistir (siga `depuracao-guiada`).

Aprovação dada para uma ação não vale para a próxima: um "pode fazer o deploy" de ontem
não autoriza o deploy de hoje.

## Armadilhas conhecidas

- **Comando de espera que sai com sucesso num processo que falhou.** Ferramentas que
  "acompanham" um pipeline podem terminar com código 0 mesmo quando um job quebrou (por
  exemplo, quando o job que falhou ainda não aparece na lista). Confirme o resultado
  final consultando o status/conclusão do run, não o código de saída do comando de espera.
- **Etapa que passa sem rodar.** Um passo condicionado a "se o segredo existir" termina
  verde quando o segredo falta — e nada foi feito. Verifique no log que a etapa executou.
- **Build local com efeito externo.** Alguns builds enviam artefatos para serviços reais
  (source maps para monitoramento de erros, telemetria) porque um arquivo local carrega o
  token. Antes de rodar build, deploy ou script de terceiros, leia o que ele faz. Para só
  validar, prefira testes, checagem de tipos e o servidor de desenvolvimento.
- **Explicação plausível não é diagnóstico.** "Está zerado porque ainda não tem dados"
  pode esconder um bug de cache. Confirme na fonte (banco, log, resposta da API) antes de
  concluir.
- **Documentação que afirma o que o código não faz.** Quando a doc e o código divergem,
  o código é o que roda. Verifique antes de confiar e aponte a divergência ao usuário.
- **Corrigir tudo que um linter apontou de uma vez.** Alerta de ferramenta não é achado;
  cada um precisa de triagem (veja `seguranca-de-aplicacao`).
