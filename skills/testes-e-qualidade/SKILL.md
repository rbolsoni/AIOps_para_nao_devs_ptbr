---
name: testes-e-qualidade
description: >-
  Use ao escrever, corrigir ou planejar testes (unitário, integração, ponta a ponta),
  configurar cobertura, investigar teste instável, e ao corrigir um bug — o bug ganha um
  teste que o reproduz. Também quando perguntarem "como testar" ou "está testado?".
license: MIT
metadata:
  categoria: projeto-e-entrega
  versao: "1.1.1"
---

# Testes e qualidade

Teste existe para permitir mudança sem medo. Um teste que falha sem motivo ou que passa
sem provar nada é pior que nenhum: ensina a equipe a ignorar a esteira.

## O que testar, em que nível

| Nível | Prova | Quantidade |
|---|---|---|
| Unitário | regras de negócio e funções puras, sem I/O | muitos, rápidos |
| Integração | o código conversando com banco, fila, API real ou local | alguns, nos pontos de fronteira |
| Ponta a ponta (E2E) | fluxos críticos do usuário, no navegador/app | poucos: login, compra, cadastro, o que dá dinheiro ou dor |
| Checagem empírica de segurança | o sistema *recusa* o que é proibido | um por regra de acesso importante |

Priorize pelo risco: o que, se quebrar, causa prejuízo ou vaza dado, tem teste primeiro.

## Regras

1. **Bug → teste que falha → correção → teste que passa.** Nessa ordem. O teste fica.
2. **Teste comportamento, não implementação.** Verifique o que o usuário ou o chamador
   observa (retorno, estado final, resposta HTTP), não a ordem das chamadas internas.
3. **Determinístico.** Relógio, aleatoriedade, rede e fuso horário são controlados pelo
   teste (relógio falso, semente fixa, servidor local). Um teste que depende do horário em
   que roda vai falhar num domingo à meia-noite.
4. **Independente.** Cada teste prepara e limpa o próprio estado; nenhum depende da ordem
   nem de dado deixado por outro.
5. **Não simule o que você não controla por dentro.** Envolva a biblioteca externa num
   adaptador seu e simule o adaptador; teste o adaptador contra a coisa real num teste de
   integração.
6. **Nomes que contam a regra**: `rejeita_cadastro_se_email_duplicado`, não
   `teste2`.
7. **Teste contra o ambiente certo.** Integração e E2E rodam contra local ou homologação,
   nunca produção (skill `isolamento-de-ambientes`). Prévia protegida por senha/SSO exige o
   mecanismo oficial de bypass da plataforma, guardado como segredo da esteira.
8. **Falhou? Leia o erro específico.** Analise a pilha do teste que falhou antes de rodar a
   suíte inteira de novo.
9. **Teste não se ajusta ao código quebrado.** Não apague, não pule (`skip`, `only`, `xit` e
   afins), não afrouxe a asserção, não troque o valor esperado nem baixe o piso de cobertura
   para a esteira passar — e nada de código que detecta que está rodando em teste. Se o teste
   estiver errado, mostre por quê e peça aprovação antes de mudá-lo.

## Cobertura: catraca manual com folga

Cobertura é termômetro, não meta. Use como **catraca**: o piso só sobe, e ninguém regride
sem perceber.

- **Meça sobre todo o código-fonte**, não só os arquivos que os testes importam. Sem isso,
  arquivo nunca testado some da conta e o número fica inflado.
- **Piso um pouco abaixo do medido** (ex.: 1 a 2 pontos percentuais), atualizado à mão
  quando a cobertura sobe de verdade.
- **Não use atualização automática do piso** para o valor exato medido. Com piso exato, um
  PR que acrescenta *uma* linha de interface sem teste derruba a esteira sem ter regredido
  nada — só o denominador aumentou. E a atualização automática local apaga a folga sem
  aviso.
- Em projeto que ainda não tem testes, comece com o piso no valor atual (mesmo que baixo)
  e suba aos poucos.

## Testes instáveis (flaky)

- Não "resolva" com retentativa automática silenciosa: isso esconde bugs reais de
  concorrência.
- Reproduza localmente rodando o teste isolado várias vezes; procure dependência de tempo,
  ordem, rede ou estado compartilhado.
- Se precisar tirar da esteira, coloque em quarentena **com issue aberta e responsável**,
  não com `skip` esquecido.

## E2E

- Seletores estáveis e acessíveis (papel e nome visível, ou atributo `data-testid`), não
  classes CSS que mudam com o estilo.
- Espere por condições (elemento visível, requisição concluída), nunca por tempo fixo.
- Guarde relatório, capturas e trace quando falhar, como artefato da esteira.
- Inclua uma verificação automática de acessibilidade nos fluxos principais (skill
  `acessibilidade-web`).

## Verificação

- [ ] O teste novo falha sem a correção e passa com ela.
- [ ] A suíte roda igual na máquina e na esteira, com um comando.
- [ ] Nenhum teste depende de rede externa, relógio real ou ordem.
- [ ] O piso de cobertura está abaixo do medido, com folga, e o valor foi atualizado à mão.

## Armadilhas

- **Teste que passa com o código quebrado**: asserção fraca (`expect(resultado).toBeTruthy()`),
  exceção engolida, `await` esquecido. Confira que o teste falha quando deveria.
- **Ambiente de teste de hooks/componentes**: um ambiente simulado de DOM (jsdom,
  happy-dom) é suficiente para a maior parte dos testes de componente; reserve o navegador
  real para E2E. Registre a escolha num ADR para ninguém refazer a discussão.
- **Dados de homologação vindos de seed** dão falsa confiança: o fluxo real que grava o
  dado precisa de teste próprio.
- **"Consertar" a esteira mexendo no teste**: a esteira fica verde e o defeito vai para
  produção. Agente pressionado a "fazer passar" tende a isso; a regra 9 existe por isso.
- **Segredo realista em fixture**: tokens "falsos" no formato real disparam scanners e
  bloqueios de push. Gere valores de teste em tempo de execução ou use marcadores óbvios.
