# Como contribuir

Obrigado por querer melhorar o kit. As melhores contribuições nascem de casos reais: um erro
que um agente cometeu, uma armadilha que custou horas, uma correção que você precisou fazer.

## Antes de começar

- Leia o [AGENTS.md](AGENTS.md): ele tem as regras de conteúdo e de scripts.
- Skill nova ou mudança grande? Abra uma issue com o modelo "Proposta de skill" antes, para
  combinar o escopo.

## Criar ou alterar uma skill

1. **Parta de um caso real.** Anote o que o agente fez de errado e o que deveria ter feito.
2. **Escolha o escopo**: uma unidade coerente de trabalho. Estreita demais obriga várias
   skills a ativar juntas; ampla demais não ativa com precisão.
3. **Crie a pasta** `skills/<nome-em-kebab-case>/` com o `SKILL.md`:

   ```markdown
   ---
   name: <nome-em-kebab-case>
   description: >-
     Use quando <situações, inclusive as que não usam o termo técnico>. <O que a skill
     garante, em uma frase.>
   license: MIT
   metadata:
     categoria: <fundamentos | projeto-e-entrega | seguranca-e-conformidade | operacao | agentes-de-ia>
     versao: "1.0.0"
   ---

   # <Título>

   <Por que isto importa, em poucas linhas.>

   ## Regras / Procedimento
   ## Verificação
   ## Armadilhas
   ```

   A descrição é o que o agente vê de todas as skills em toda sessão: **até 300 caracteres**
   (360 no máximo; ADR 0005), casos de uso principais primeiro, com as palavras que o usuário
   usaria — inclusive quem não programa ("colocar no ar", "salvar no GitHub"). Confira cada
   consulta do `gatilhos.json` contra ela.

4. **Escreva do zero**, em português, explicando o porquê de cada regra. Nada copiado de
   outras fontes.
5. **Mantenha o `SKILL.md` enxuto** (menos de 500 linhas). Detalhe vai para `references/`,
   com uma frase no `SKILL.md` dizendo quando ler.
6. **Crie as avaliações**:
   - `evals/evals.json`: 2 ou 3 pedidos realistas, resultado esperado e asserções
     verificáveis.
   - `evals/gatilhos.json`: ao menos 3 pedidos que devem ativar (variando forma e
     vocabulário) e 2 quase-acertos que não devem.
7. **Suba a versão** da skill alterada em `metadata.versao` (correção → patch; conteúdo novo
   → minor; mudança só em `evals/` não precisa).
8. **Valide e teste**:
   `npm run validar && npm test && npm run verificar:segredos && npm run conferir:versoes -- --base main`.
   O validador cobra também as regras do kit (licença, categoria, versão, frontmatter estrito,
   caracteres invisíveis) e o teste do catálogo confere que a skill está no README, na seção
   da categoria dela.
9. **Teste de verdade num agente**: instale a skill a partir do seu clone
   (`npx skills add ./ -s <nome>`), rode as consultas de gatilho e alguns casos de
   `evals.json` com e sem a skill. Conte no PR o que observou.
10. **Atualize o catálogo** no README, se a skill for nova.

## Scripts

Siga as regras de scripts do `AGENTS.md`: Node 20+ sem dependências, não interativos,
`--help`, `--json`, códigos de saída 0/1/2, nunca imprimir segredos, e teste em `testes/`.

## Commits e PR

- Branch `tipo/descricao-curta`; Commits Convencionais.
- `feat:` para skill nova ou capacidade nova; `fix:` para orientação errada corrigida;
  `docs:` para texto que não muda o comportamento esperado do agente.
- PR com o modelo preenchido; CI verde.

## Código de conduta

Seja respeitoso, parta do princípio da boa-fé e critique ideias, não pessoas.
