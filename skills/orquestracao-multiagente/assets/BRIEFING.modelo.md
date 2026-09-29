# BRIEFING — <papel>_<tarefa>_<n> — <AAAA-MM-DDTHH:MM:SSZ>

## Missão

<Uma ou duas frases: o que este agente deve entregar e por quê.>

## Identidade

- Papel: <explorador | executor | revisor | desafiante | auditor>
- Pasta de trabalho: `.agentes/<papel>_<tarefa>_<n>/`
- Tarefa-mãe: <identificador da tarefa/orquestrador>
- Instância: <n> de <total>

## Restrições imutáveis

- <o que não pode mudar de jeito nenhum>
- <ambientes que não podem ser tocados — ex.: nunca produção>
- <revisores e desafiantes: somente leitura sobre o código>

## Escopo

- Pode alterar: <arquivos/pastas>
- Deve ler: <arquivos, com caminho>
- Fora do escopo: <o que não fazer>

## Contratos

- Pedido original: `.agentes/PEDIDO_ORIGINAL.md`
- Plano: <caminho>
- Entregas anteriores relevantes: <caminhos das ENTREGA.md>

## Critérios de aceite

- [ ] <critério verificável 1 — com o comando que prova>
- [ ] <critério verificável 2>

## Formato da entrega

`ENTREGA.md` nesta pasta, no modelo padrão, com evidência (comando + saída) para cada
observação e veredito explícito.

## Orçamento

<tempo máximo, número de tentativas, quando parar e escalar ao orquestrador>
