---
name: guiar-usuario-em-paineis
description: >-
  Use sempre que uma etapa depender de uma pessoa num painel externo (GitHub, Vercel,
  Supabase, nuvem, DNS, loja de apps, pagamento): criar secret ou chave, apontar domínio,
  dar permissão, ativar proteção ou faturamento, ou quando você não tiver acesso. Gera
  passo a passo à prova de leigo.
license: MIT
metadata:
  categoria: operacao
  versao: "1.0.1"
---

# Guiar o usuário em painéis externos

Muitas etapas de um projeto não estão no código: cadastrar um segredo, apontar um domínio,
desligar uma integração, ativar uma proteção. Quem executa é uma pessoa — muitas vezes sem
formação técnica — seguindo o que você escreveu. Uma instrução ambígua vira uma
configuração errada que ninguém percebe.

## Quando a tarefa é da pessoa, não sua

- Você não tem acesso ao painel (ou não deveria ter).
- A ação mexe com dinheiro, permissões, identidade ou segredos.
- A ação é irreversível ou afeta produção, e a pessoa precisa decidir.

Mesmo com acesso por CLI ou API, prefira que a pessoa faça ações de faturamento, exclusão e
permissão — ou peça confirmação explícita antes.

## Regras

1. **Nunca peça o segredo na conversa.** Diga de onde copiar e onde colar. Se a pessoa colar
   um segredo na conversa, avise que ele deve ser rotacionado.
2. **Um cartão por tarefa**, no formato do modelo abaixo, em ordem de dependência.
3. **Nomes exatos**: botões, menus e campos entre aspas, como aparecem na tela; nomes de
   variáveis em bloco de código, para copiar sem erro de digitação.
4. **Diga o porquê** em uma frase — a pessoa decide melhor quando entende o que protege.
5. **Interfaces mudam.** Se não tiver certeza do caminho atual, diga, e dê um plano B
   (termo para buscar no painel, link da documentação oficial). Nunca invente um menu.
6. **Toda tarefa termina com "como confirmar que deu certo"** — e, quando possível, você
   confirma pelo seu lado (esteira passa, `gh secret list` mostra o nome, o verificador de
   headers passa, o domínio responde).
7. **Registre o que foi configurado** num runbook do projeto (`docs/runbooks/`): o quê,
   onde, por quem, quando — **nomes**, nunca valores.
8. **Marque o que é bloqueante** (sem isso o deploy não funciona) e o que é recomendado.

## Modelo de cartão

```markdown
### <Nº>. <O que fazer, em uma linha> — <bloqueante | recomendado>

**Por quê:** <uma frase sobre o que isto protege ou habilita>

**Onde:** <nome do serviço> → <URL direta, se estável> → "<Menu>" → "<Submenu>"

**Passos:**
1. Clique em "<botão>".
2. No campo "<nome do campo>", escreva: `NOME_EXATO`
3. No campo "<valor>", cole o valor que você copiou em <origem>. (Não cole em nenhum outro lugar.)
4. Clique em "<Salvar>".

**Como confirmar:** <o que deve aparecer na tela, ou o que eu vou verificar do meu lado>

**Não faça:** <o erro mais provável nesta tarefa>

**Se a tela estiver diferente:** procure por "<termo>" no painel ou veja <link da doc oficial>.
```

Exemplos prontos para situações frequentes (secrets de environment no GitHub, ruleset,
varredura de segredos, deploy automático da Vercel, integração de banco que pula a
esteira, DNS): [references/exemplos-de-tarefas.md](references/exemplos-de-tarefas.md).
Adapte ao caso e confira se o caminho ainda é o mesmo.

## Ao entregar a lista

- Comece com um resumo: quantas tarefas, quais bloqueiam, tempo aproximado.
- Agrupe por painel, em ordem de dependência (criar a chave antes de cadastrá-la).
- Termine dizendo o que você vai verificar quando a pessoa avisar que terminou.

## Armadilhas

- **Secret no nível errado**: segredo de produção cadastrado no repositório inteiro (todo
  workflow enxerga) em vez de no environment `production`.
- **Variável pública tratada como secreta** (ou o contrário): quem segue o passo não sabe
  a diferença; diga explicitamente.
- **Integração "útil" religada** para agilizar: explique que a lentidão é o portão.
- **Caminho de menu de memória**: painéis mudam; um passo inexistente trava a pessoa e ela
  improvisa.
