# SOLID na prática

Para cada princípio: o sintoma, a correção mínima e quando não vale a pena. Os exemplos
usam pseudocódigo para valer em qualquer linguagem.

## S — Responsabilidade única

**Sintoma:** um arquivo que muda em quase todo PR, por motivos sem relação entre si.
`ServicoDeInscricao` calcula o valor, formata o e-mail de confirmação e grava log de auditoria.

**Correção mínima:** extraia cada motivo de mudança para uma unidade com nome próprio e
deixe a original orquestrar:

```
funcao confirmarInscricao(inscricao):
    valor = calculadoraDeValor.aplicar(inscricao)
    repositorio.salvar(inscricao, valor)
    notificador.enviarConfirmacao(inscricao)
```

**Quando não aplicar:** script curto, de uso único, que ninguém vai manter. Dividir um
arquivo de 60 linhas em cinco arquivos piora a leitura.

## O — Aberto/fechado

**Sintoma:** o mesmo `switch (tipo)` aparece em vários lugares; cada tipo novo exige
editar todos eles, e sempre um fica para trás.

**Correção mínima:** um mapa de estratégias (ou polimorfismo) consultado num só lugar:

```
canaisDeNotificacao = {
    "email": enviarPorEmail,
    "sms": enviarPorSms,
}
funcao notificar(mensagem):
    enviar = canaisDeNotificacao[mensagem.canal]
    se enviar é nulo: erro("canal de notificação desconhecido: " + mensagem.canal)
    retornar enviar(mensagem)
```

**Quando não aplicar:** um único `switch` com dois ou três casos estáveis. O mapa só se
paga quando o conjunto cresce ou o `switch` se repete.

## L — Substituição de Liskov

**Sintoma:** código que pergunta "de que tipo é isto?" antes de usar; subclasse que lança
"operação não suportada"; `Quadrado` herdando de `Retangulo` e quebrando `definirLargura`.

**Correção mínima:** se o subtipo não cumpre o contrato do tipo base, ele não é um subtipo.
Separe as hierarquias ou troque herança por composição.

**Quando não aplicar:** não há o que relaxar aqui — violar Liskov sempre gera bug. O que se
evita é a herança em si, quando ela não é necessária.

## I — Segregação de interfaces

**Sintoma:** a interface `Repositorio` tem 20 métodos e cada implementação preenche metade
com "não implementado"; um teste precisa simular métodos que o código testado nem chama.

**Correção mínima:** interfaces pequenas, definidas pelo que o **consumidor** precisa
(`LeitorDePedidos`, `GravadorDePedidos`).

**Quando não aplicar:** linguagens com tipagem estrutural (Go, TypeScript) já permitem
declarar só o necessário no ponto de uso; não crie uma interface formal por hábito.

## D — Inversão de dependência

**Sintoma:** a regra de negócio cria a conexão com o banco ou o cliente HTTP dentro de si.
Para testar, é preciso subir banco e rede.

**Correção mínima:** a regra recebe o colaborador pronto (parâmetro ou construtor); quem
monta a aplicação (a borda) decide a implementação real, e o teste passa uma falsa:

```
funcao criarServicoDeCobranca(gatewayDePagamento, relogio):
    retornar {
        cobrar(fatura): ...usa gatewayDePagamento e relogio...
    }
```

**Quando não aplicar:** não é preciso um contêiner de injeção de dependência para isso;
parâmetros resolvem na maior parte dos projetos. Também não invertam dependências estáveis
e sem efeito colateral (biblioteca de datas, funções puras utilitárias).

## Princípios vizinhos que resolvem o mesmo problema

- **Lei de Deméter:** fale com seus colaboradores diretos, não com os colaboradores deles
  (`fatura.cliente.endereco.cidade.nome` acopla quatro modelos de uma vez).
- **Diga, não pergunte:** em vez de ler o estado de um objeto para decidir por ele, peça
  que ele faça (`conta.debitar(valor)` em vez de checar saldo e alterar de fora).
- **YAGNI:** você não vai precisar — até precisar. Aí o código simples é o mais fácil de
  mudar.
