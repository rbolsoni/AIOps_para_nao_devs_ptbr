---
name: orquestracao-multiagente
description: >-
  Use ao dividir uma tarefa grande entre vários agentes ou sessões (subagentes, agentes
  em paralelo, equipes de agentes, worktrees), ao delegar trabalho a outro agente, ao
  revisar ou auditar o trabalho de outro agente, ou quando o usuário pedir "revisão
  adversarial", "segunda opinião" ou "valide o que foi feito". Define papéis (explorador,
  executor, revisor, desafiante, auditor), um protocolo em arquivos (briefing, pedido,
  progresso, entrega) e revisão com verificação empírica — nunca confiando em relato.
license: MIT
metadata:
  categoria: agentes-de-ia
  versao: "1.0.0"
---

# Orquestração multiagente

Vários agentes rendem mais que um quando o trabalho se divide em partes independentes, quando
é preciso contexto limpo para olhar de novo, ou quando alguém precisa tentar derrubar o que
outro fez. Rendem menos quando a tarefa é pequena: cada agente começa do zero, e o contexto
perdido na passagem custa caro.

## Quando usar

| Use | Não use |
|---|---|
| partes independentes que podem andar em paralelo | tarefa de poucos passos |
| busca ampla em muitos arquivos, onde só a conclusão importa | quando o próximo passo depende do resultado anterior imediatamente |
| revisão independente do que foi produzido | quando o orçamento de tempo/custo é apertado |
| mudança grande com risco alto (banco, segurança, documentação crítica) | só para "parecer mais rigoroso" |

## Papéis

| Papel | Faz | Não faz |
|---|---|---|
| **Orquestrador** | divide, delega, integra, resolve conflito, reporta ao usuário | executar tudo sozinho em paralelo aos executores |
| **Explorador** | levanta fatos e localiza código; devolve conclusões com evidência | alterar arquivos |
| **Executor** | implementa uma parte bem delimitada | mexer fora do escopo recebido |
| **Revisor** | lê o resultado contra os critérios; aponta problemas | corrigir a implementação |
| **Desafiante** | tenta provar que está errado: casos-limite, contraexemplos, execução real | aceitar relato sem rodar |
| **Auditor** | confere, no fim, que o pedido original foi cumprido por inteiro | reabrir decisões já aprovadas sem motivo novo |

Quem escreve não aprova o próprio trabalho.

## Protocolo em arquivos

Cada agente tem uma pasta: `.agentes/<papel>_<tarefa>_<n>/` (fora do git — veja abaixo).

| Arquivo | Quem escreve | Conteúdo | Modelo |
|---|---|---|---|
| `PEDIDO.md` | orquestrador | a instrução recebida, literal | [assets/PEDIDO.modelo.md](assets/PEDIDO.modelo.md) |
| `BRIEFING.md` | orquestrador | missão, identidade, restrições imutáveis, escopo, critérios de aceite, contratos | [assets/BRIEFING.modelo.md](assets/BRIEFING.modelo.md) |
| `PROGRESSO.md` | o agente | registro cronológico, só acrescentando | [assets/PROGRESSO.modelo.md](assets/PROGRESSO.modelo.md) |
| `ENTREGA.md` | o agente | observações com evidência, veredito, pendências | [assets/ENTREGA.modelo.md](assets/ENTREGA.modelo.md) |

O pedido original do usuário fica em `.agentes/PEDIDO_ORIGINAL.md` e é o **contrato**: todo
briefing aponta para ele, e o auditor confere contra ele.

## Regras de delegação

1. **Briefing autossuficiente.** O agente começa sem o seu contexto. Diga: objetivo, por quê,
   arquivos relevantes (caminhos), o que já se sabe, restrições, o que é "pronto" e o formato
   da entrega.
2. **Escopo fechado.** Liste o que pode ser alterado. Revisores e desafiantes são somente
   leitura sobre o código de produção.
3. **Restrições imutáveis no topo** do briefing: o que não pode mudar de jeito nenhum (ex.:
   blocos de texto que precisam ser preservados literalmente, ambientes que não podem ser
   tocados).
4. **Paralelismo com isolamento.** Executores que alteram código em paralelo trabalham em
   *worktrees* ou branches separadas; o orquestrador integra.
5. **Orçamento.** Defina número máximo de agentes, de rodadas de revisão e tempo. Duas
   rodadas sem convergir → o orquestrador decide ou pergunta ao usuário.

## Revisão adversarial

- **Rode, não leia.** O desafiante executa testes, scripts de verificação e a aplicação.
  Relato ("os testes passaram") não é evidência; saída de comando é.
- **Verifique contra a fonte.** Documentação conferida contra o código e o banco reais;
  comparação literal feita por script quando o requisito for "preservar exatamente".
- **Evidência em cada achado**: arquivo:linha, comando e saída, ou captura.
- **Veredito explícito**: `APROVADO`, `APROVADO COM RESSALVAS` (lista) ou `REPROVADO` (lista
  do que bloqueia).

## Integração e entrega

- O orquestrador lê as entregas, resolve conflitos entre elas, reroda a verificação final e
  só então reporta ao usuário — com o que foi feito, o que foi verificado e o que ficou
  pendente.
- Transcreva para o PR o essencial das entregas (vereditos e evidências); a pasta
  `.agentes/` é transitória e fica fora do git (`.gitignore`), porque acumula dados de
  sessão, caminhos locais e às vezes trechos sensíveis.

## Armadilhas

- **Briefing que diz "continue de onde parei"**: o agente não sabe onde foi.
- **Revisor que conserta**: some a separação entre quem escreve e quem aprova.
- **Desafiante que confia no log do executor**: a revisão vira carimbo.
- **Muitos agentes para pouca tarefa**: mais custo, mais integração, menos qualidade.
- **Agentes em paralelo no mesmo diretório de trabalho**: um sobrescreve o outro.
