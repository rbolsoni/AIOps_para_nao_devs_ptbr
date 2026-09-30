---
name: codigo-limpo-e-solid
description: >-
  Use ao projetar, revisar ou refatorar código — organizar, reduzir repetição, separar
  responsabilidades, aplicar SOLID — e quando o código estiver confuso ou difícil de
  mudar. Diz também quando não aplicar um padrão. Correção pontual não precisa desta
  skill.
license: MIT
metadata:
  categoria: fundamentos
  versao: "1.0.1"
---

# Código limpo e SOLID

Código é lido muitas vezes mais do que é escrito. O objetivo não é seguir regras: é que a
próxima pessoa — ou o próximo agente — entenda e mude o código sem medo. Os princípios
abaixo servem a esse objetivo. Quando um princípio deixa o código mais difícil de ler,
ele está sendo mal aplicado.

## Regras de decisão

1. **Clareza vence esperteza.** Se precisar escolher entre curto e óbvio, escolha óbvio.
2. **Padrão só com dor real.** Introduza interface, fábrica, camada ou injeção de
   dependência quando existir variação concreta *agora* (duas implementações, um teste que
   precisa substituir algo, uma fronteira de sistema) — não para um futuro imaginado.
3. **Regra de três para duplicação.** Duas cópias parecidas podem ficar; na terceira,
   extraia. Duplicação é mais barata que a abstração errada.
4. **Siga o idioma da linguagem e do projeto.** Nomes, organização de pastas, tratamento
   de erro e formatação seguem o que o projeto já faz e o guia da linguagem. Use o
   formatador padrão (Prettier, Black/Ruff, gofmt, rustfmt, dotnet format…) em vez de
   discutir estilo.
5. **Estrutura e comportamento em mudanças separadas.** Refatoração não muda
   comportamento; correção de bug não reorganiza módulos. Misturar os dois torna a revisão
   impossível.

## Nomes

- O nome diz **o que é** ou **o que faz**, no vocabulário do negócio: `pedidosVencidos`,
  não `lista2`; `calcularFrete`, não `processa`.
- Booleanos como pergunta: `estaAtivo`, `temPermissao`.
- Evite abreviações que só o autor entende e prefixos de tipo (`strNome`).
- Mantenha o idioma que o projeto já usa; não misture português e inglês no mesmo conceito.

## Funções

- Fazem **uma coisa**, num só nível de abstração. Se a descrição tem "e", provavelmente são
  duas funções.
- Poucos parâmetros; muitos parâmetros relacionados viram um objeto com nome.
- Sem efeitos colaterais escondidos: uma função chamada `validar` não grava no banco.
- Retorno antecipado (guard clauses) em vez de `if` aninhados em cascata.

## Erros

- **Falhe cedo e alto.** Valide na fronteira (entrada do usuário, resposta de API,
  arquivo) e recuse o inválido com mensagem que diga o que estava errado e o que se esperava.
- **Nunca engula exceção** (`catch {}` vazio, `except: pass`). Trate, registre com contexto
  ou deixe subir.
- Mensagem para o usuário final é genérica; o detalhe técnico vai para o log — sem senha,
  token ou dado pessoal (veja `observabilidade`).
- Configuração obrigatória ausente derruba a inicialização com erro claro. Nunca use valor
  padrão "de mentira" para credencial (veja `segredos-e-credenciais`).

## Estrutura e acoplamento

- **Regras de negócio no centro, sem I/O.** Banco, rede, arquivos e framework ficam nas
  bordas, finas. Isso torna o núcleo testável sem infraestrutura.
- **Dependências apontam para dentro**: o domínio não importa o controlador HTTP nem o ORM.
- **Alta coesão, baixo acoplamento**: o que muda junto fica junto; o que muda por motivos
  diferentes fica separado.
- **Composição antes de herança.** Herança profunda é o acoplamento mais forte que existe.

## SOLID em uma linha cada

| Princípio | Em uma linha | Sinal de que falta |
|---|---|---|
| **S** — Responsabilidade única | Um módulo tem um único motivo para mudar | A mesma classe muda por regra fiscal *e* por layout de e-mail |
| **O** — Aberto/fechado | Acrescentar um caso novo não exige editar os antigos | Um `switch` por tipo repetido em vários lugares |
| **L** — Substituição de Liskov | Um subtipo funciona onde o tipo base funciona | Subclasse que lança "não suportado" ou exige checar o tipo |
| **I** — Segregação de interfaces | Ninguém depende de métodos que não usa | Implementações cheias de métodos vazios |
| **D** — Inversão de dependência | O núcleo depende de abstrações; a borda fornece a implementação | Regra de negócio instanciando cliente HTTP ou conexão de banco |

Leia [references/solid-na-pratica.md](references/solid-na-pratica.md) quando for aplicar
ou revisar um princípio específico: ele traz, para cada um, a correção mínima e quando
**não** aplicar.

## Comentários

- Explique o **porquê** — decisão, restrição, incidente que motivou — nunca o óbvio que o
  código já diz.
- Comentário que contradiz o código é pior que nenhum: ao mudar o código, atualize ou
  remova o comentário.
- Código comentado não fica no repositório; o histórico do git guarda.

## Refatoração segura

1. Garanta testes cobrindo o comportamento atual **antes** de mexer.
2. Passos pequenos, rodando os testes a cada passo.
3. Commit de refatoração separado de commit de mudança de comportamento.
4. Pare quando o código ficou claro o suficiente para a tarefa — refatoração não é
   reescrita.

Para revisar código existente, use [references/sinais-de-alerta.md](references/sinais-de-alerta.md)
como lista de verificação.

## Armadilhas

- **Superengenharia em nome do SOLID**: interface com uma única implementação, fábrica
  para um único tipo, camadas que só repassam chamadas. Remova o que não carrega peso.
- **Refatorar sem pedido** dentro de uma correção de bug ou funcionalidade. Sugira ao
  usuário; não faça junto (veja `disciplina-de-codigo`).
- **Renomear em massa** num PR de funcionalidade: o diff fica ilegível e esconde o que
  realmente mudou.
- **"Código limpo" como desculpa para reescrever** o que funciona e está testado.
