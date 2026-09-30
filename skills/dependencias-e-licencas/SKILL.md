---
name: dependencias-e-licencas
description: >-
  Use ao adicionar, atualizar ou remover pacotes e bibliotecas, decidir entre usar um
  pacote ou escrever o código, copiar código de outro projeto, tratar alerta de
  vulnerabilidade, conferir licenças ou distribuir software, e quando perguntarem se "pode
  usar" algo de terceiros.
license: MIT
metadata:
  categoria: seguranca-e-conformidade
  versao: "1.1.0"
---

# Dependências e licenças

Cada dependência é código de terceiros rodando com os seus privilégios, uma licença com
obrigações e um item a mais para manter atualizado. Acrescentar é fácil; saber o que se
acrescentou é o trabalho.

## Antes de adicionar uma dependência

1. **Precisa mesmo?** A biblioteca padrão ou algo já instalado resolve? Dez linhas suas
   podem valer mais que um pacote com quarenta dependências transitivas.
2. **É o pacote certo — e ele existe mesmo?** Confira o nome exato (pacotes com nome quase
   igual são um ataque comum), o repositório de origem, o mantenedor e a atividade recente.
   Pacote sugerido por IA merece cuidado dobrado: modelos inventam nomes plausíveis, e
   atacantes registram esses nomes esperando quem instale sem conferir. Pacote que não existe
   no registro oficial, ou criado há poucos dias com um nome "óbvio", é sinal de alerta.
3. **Qual a licença?** Veja a seção abaixo. Na dúvida, não adicione e pergunte.
4. **Tem vulnerabilidade conhecida?** Consulte o auditor do ecossistema antes.
5. **Roda código na instalação?** Scripts de `postinstall` e afins executam na máquina e na
   esteira, com os segredos que estiverem ali — é o caminho mais comum de pacote malicioso.
   Desconfie de pacote pequeno com script de instalação.
6. Adicione pelo gerenciador (que atualiza o lockfile) e **commite o lockfile**.

## Política de licenças

| Grupo | Exemplos | Regra padrão |
|---|---|---|
| Permissivas | MIT, MIT-0, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, Unlicense, CC0-1.0, BlueOak-1.0.0, Python-2.0 | **permitidas** |
| Copyleft fraco | LGPL, MPL-2.0, EPL-2.0 | **revisar**: obrigações nascem ao distribuir (e dependem de modificar ou ligar estaticamente) |
| Copyleft forte | GPL-2.0, GPL-3.0 | **bloquear** em software fechado distribuído, salvo decisão registrada |
| Copyleft de rede | AGPL-3.0 | **bloquear** em serviço web fechado: se o seu serviço incorpora ou modifica o código AGPL, quem o usa pela rede tem direito ao código-fonte |
| Código-fonte disponível (não é open source) | BUSL/BSL, SSPL, FSL, Elastic License, "Commons Clause" | **revisar**: restringem uso (ex.: concorrer com o autor) |
| Conteúdo/dados | CC-BY-4.0, CC-BY-SA | **revisar**: atribuição e compartilhamento ao redistribuir |
| Sem licença, `UNKNOWN`, `UNLICENSED` | — | **bloquear**: sem licença, não há permissão de uso |

Detalhes, perguntas de decisão e casos comuns:
[references/guia-de-licencas.md](references/guia-de-licencas.md).

### Como aplicar

- **Lista permitida + exceções nomeadas por pacote, cada uma com motivo escrito.** Uma lista
  permitida crua só tem duas saídas quando aparece uma licença nova: liberar aquela licença
  para o projeto inteiro, ou ficar vermelho para sempre. A exceção por pacote libera *aquele*
  pacote, *por aquele motivo* — a mesma licença em outro pacote continua barrando.
- Cada exceção registra **a condição que a invalida** ("se a biblioteca for modificada ou
  ligada estaticamente", "se passarmos a oferecer monitoramento como produto").
- **Produção é mais rígida que desenvolvimento.** Dependência de desenvolvimento não é
  distribuída; copyleft fraco só obriga quem distribui.
- **Exceção que não casa mais com nenhum pacote gera aviso**: o pacote saiu ou mudou de
  licença, e o registro sugeriria uma análise que não vale mais.
- **Versão da ferramenta de verificação fixada**, para o resultado ser reprodutível numa
  auditoria.
- **A checagem roda na esteira**, inclusive no portão de release: publicar imagem ou
  pacote é o momento em que a obrigação de licença deixa de ser teórica.

Modelo de política para o repositório:
[assets/politica-de-licencas.modelo.md](assets/politica-de-licencas.modelo.md).
Ferramentas por ecossistema:
[references/ferramentas-por-ecossistema.md](references/ferramentas-por-ecossistema.md).

## Código copiado de outros projetos

A licença vale também para trechos. Antes de copiar código, documentação ou exemplos de
outro repositório:

- Licença permissiva: pode, mantendo o aviso de copyright e a licença exigidos.
- Licença não comercial, copyleft ou nenhuma: não copie. Estude a ideia e escreva do zero,
  com suas palavras e sua estrutura; cite a inspiração com link.
- Registre a origem num arquivo de créditos ou no próprio arquivo.

## Cadeia de suprimentos

- Lockfile versionado; na esteira, instalação que respeita o lockfile (`npm ci`,
  `uv sync --frozen`, `dotnet restore --locked-mode`…).
- Auditoria de vulnerabilidades na esteira; crítica/alta exige correção ou decisão
  registrada com prazo.
- Atualizações automáticas (Dependabot/Renovate) com PRs pequenos e agrupados.
- Actions, imagens base e ferramentas da esteira fixadas por SHA/digest ou versão exata.
- **Idade mínima de versão.** Versões maliciosas publicadas em pacotes legítimos costumam
  ser descobertas e retiradas em horas ou dias. Espere alguns dias antes de adotar uma versão
  nova — no Dependabot, no Renovate e nos gerenciadores que oferecem a opção. Correção de
  segurança segue o fluxo dela. Como configurar em cada ferramenta:
  [references/ferramentas-por-ecossistema.md](references/ferramentas-por-ecossistema.md).
- **Scripts de instalação desligados por padrão** onde o gerenciador permitir, liberando só
  os pacotes que precisam compilar.
- **MCP, skills, plugins de agente, extensões de editor e actions da esteira também são
  dependências**: origem conferida, versão fixada e menor privilégio (`uso-seguro-de-agentes`).
- Prefira pacotes com procedência verificável (assinatura, *provenance*) quando o
  ecossistema oferecer.

## Armadilhas

- **Metadado de licença errado**: ferramentas leem o campo declarado pelo pacote; pacote que
  declara errado passa errado. A checagem reduz surpresa; não é parecer jurídico.
- **Exceção por prefixo de nome** cobre variantes por plataforma, mas também cobriria um
  pacote novo com o mesmo prefixo. Revise ao aparecer pacote novo.
- **Licença dupla (`A OR B`) e composta (`A AND B`)**: em `OR` você escolhe uma; em `AND`
  cumpre as duas.
- **Pacote sugerido pela IA instalado sem conferir.** O nome parecia certo — e era um
  pacote registrado dias antes por quem apostou que alguém instalaria sem olhar.
- **Ferramenta de verificação sem versão fixa** (`npx ferramenta` sem `@versão`): o
  resultado muda sozinho entre duas execuções.
