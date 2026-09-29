# Avaliação de skills

Uma skill precisa passar em duas provas: **ativar na hora certa** (e não ativar fora dela) e
**melhorar o resultado** em relação a trabalhar sem ela.

## Arquivos

Dentro da pasta de cada skill:

```
minha-skill/
└── evals/
    ├── evals.json      # qualidade do resultado
    └── gatilhos.json   # quando deve ou não ativar
```

`evals.json`:

```json
{
  "skill_name": "minha-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "pedido realista, como um usuário escreveria",
      "expected_output": "descrição em linguagem humana do que é sucesso",
      "assertions": ["afirmação verificável 1", "afirmação verificável 2"]
    }
  ]
}
```

`gatilhos.json`:

```json
[
  { "query": "pedido que deve ativar a skill", "should_trigger": true },
  { "query": "pedido parecido que NÃO deve ativar", "should_trigger": false }
]
```

## Gatilhos

- Varie a forma: formal, informal, com erro de digitação, com e sem o termo técnico.
- Os melhores positivos são os que precisam da skill mas não dizem o nome do assunto
  ("não sou programador, quero colocar o site no ar com segurança").
- Os melhores negativos são **quase-acertos**: compartilham palavras com a skill mas pedem
  outra coisa ("cria a tela de 'esqueci minha senha'" para a skill de segredos).
- Rode cada consulta 3 vezes no agente com a skill instalada; a taxa de ativação precisa
  ficar acima de 0,5 para positivos e abaixo de 0,5 para negativos.
- Ao ajustar a descrição, use parte das consultas para ajustar e parte só para conferir
  (evita decorar as consultas). A descrição tem limite de 1024 caracteres.

Como saber se ativou depende do cliente: registros de execução, lista de ferramentas/skills
usadas, ou modo verboso. Exemplo com o Claude Code:
`claude -p "<consulta>" --output-format json` e procure a chamada da skill na saída. Em
outros agentes, use o registro equivalente.

## Qualidade

1. Rode cada caso de `evals.json` com a skill e sem ela (ou com a versão anterior), cada um
   em sessão limpa.
2. Avalie as asserções com evidência; registre aprovação, tokens e tempo.
3. Compare: a skill precisa melhorar a taxa de aprovação o bastante para justificar o custo
   extra de contexto.
4. Leia os rastros: instrução ignorada costuma ser ambígua; esforço desperdiçado costuma ser
   instrução que não se aplica à tarefa.
5. Ajuste de forma geral (não para passar num caso), com poucas instruções bem explicadas.

## Critérios de uma skill boa

- Acrescenta o que o agente **não sabe** sozinho: armadilhas reais, convenções, procedimentos,
  padrões escolhidos. Não explica o óbvio.
- Dá um padrão claro em vez de um menu de opções.
- Diz **quando** ler cada arquivo de referência.
- `SKILL.md` curto (menos de 500 linhas); detalhe em `references/`.
- Scripts não interativos, com `--help`, saída estruturada e códigos de saída documentados.
