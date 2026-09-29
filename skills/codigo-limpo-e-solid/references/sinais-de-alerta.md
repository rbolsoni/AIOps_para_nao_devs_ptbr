# Sinais de alerta para revisão de código

Use como lista de verificação ao revisar um trecho. Cada sinal indica onde olhar, não uma
regra automática: confirme que o problema existe antes de propor mudança.

## Legibilidade

- [ ] Nomes genéricos (`dados`, `info`, `tmp`, `manager`, `helper`, `utils`) escondendo o
      conceito real.
- [ ] Função que não cabe na tela ou com mais de três níveis de indentação.
- [ ] Parâmetro booleano que muda o comportamento da função (`gerar(relatorio, true)`):
      normalmente são duas funções.
- [ ] Números e textos mágicos sem nome (`if (status == 7)`).
- [ ] Comentário explicando *o que* o código faz, em vez de *por que*.

## Correção e robustez

- [ ] Exceção capturada e ignorada.
- [ ] Entrada externa usada sem validação (requisição, arquivo, variável de ambiente,
      resposta de outro serviço).
- [ ] Valor padrão silencioso para configuração obrigatória.
- [ ] Estado global mutável ou singleton compartilhado entre requisições.
- [ ] Operação que precisa ser atômica feita em passos separados sem transação ou trava.
- [ ] Data, hora ou fuso tratados sem padrão (misturar hora local e UTC).
- [ ] Dinheiro em ponto flutuante (use inteiro em centavos ou tipo decimal).

## Estrutura

- [ ] Mesma lógica copiada em três ou mais lugares.
- [ ] `switch`/`if` por tipo repetido em vários pontos.
- [ ] Regra de negócio dentro do controlador HTTP, da view ou da query SQL do ORM.
- [ ] Módulo de domínio importando framework web, ORM ou cliente de rede.
- [ ] Classe com muitas dependências no construtor (sinal de responsabilidades demais).
- [ ] Camada que só repassa a chamada sem acrescentar nada.

## Testabilidade

- [ ] Não dá para testar sem banco, rede ou relógio real.
- [ ] Teste que verifica detalhe de implementação (ordem de chamadas internas) em vez de
      comportamento observável.
- [ ] Teste que depende da ordem de execução ou de dado deixado por outro teste.

## Segurança (aprofunde com `seguranca-de-aplicacao`)

- [ ] SQL, comando de shell ou caminho de arquivo montado por concatenação com entrada do
      usuário.
- [ ] Verificação de permissão só no front-end.
- [ ] Segredo, token ou senha escrito no código ou em log.
