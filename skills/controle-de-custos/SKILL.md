---
name: controle-de-custos
description: >-
  Use ao contratar ou configurar nuvem, hospedagem, banco ou API de IA paga, ao pôr no ar algo
  que chame serviço cobrado por uso, e quando o usuário temer conta alta ou perguntar de
  plano, limite ou custo. Garante teto de gasto, alertas e limites de uso.
license: MIT
metadata:
  categoria: operacao
  versao: "1.0.0"
---

# Controle de custos

Conta surpresa é um dos sustos mais comuns de quem publica o primeiro projeto. Cobrança por uso
não tem teto por padrão: um robô no formulário, um laço de agente, uma chave vazada ou uma
imagem enorme servida milhares de vezes vira fatura. O teto e o alerta vêm **antes** de ir ao
ar.

## Regras

1. **Teto e alerta em cada provedor pago, antes de ir ao ar** — IA, hospedagem, banco, nuvem,
   e-mail e SMS. Saiba qual limite **corta** o serviço e qual só **avisa**: orçamento de nuvem,
   em geral, só manda e-mail, e mesmo o corte chega com atraso de minutos a horas. Alertas em 50,
   80 e 100% para um e-mail que alguém lê. Onde fica em cada provedor e o que cada um faz:
   [references/onde-configurar-limites.md](references/onde-configurar-limites.md). A
   configuração é tarefa de painel (`guiar-usuario-em-paineis`).
2. **Chave paga só no servidor.** Nunca com prefixo público (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`,
   `EXPO_PUBLIC_`…) nem dentro de app móvel: quem acha a chave usa a sua conta
   (`segredos-e-credenciais`).
3. **Toda rota que custa dinheiro** — chamada de IA, envio de e-mail ou SMS, API paga — exige
   usuário autenticado, limite por usuário e por IP e um teto diário no código. Formulário
   público que dispara uma dessas tem proteção contra robôs (`seguranca-de-aplicacao`).
4. **Orçamento no código** para laços e agentes: máximo de chamadas, tokens e tempo por tarefa,
   com corte ao estourar (`arquitetura-de-agentes`). Retentativa sempre com limite e espera
   crescente.
5. **O menor modelo ou serviço que resolve.** Escolha pelo resultado nas avaliações, não pelo
   nome; limite os tokens de saída; mantenha estável o começo do prompt para aproveitar o cache
   de prompt; guarde a resposta de pergunta repetida e determinística.
6. **Plano gratuito com consciência.** Conheça os limites (pausa por inatividade, cotas, backup
   ausente) e o que acontece ao estourar — cobra, pausa ou bloqueia. Registre a escolha e o que
   muda quando o projeto crescer.
7. **Custo por funcionalidade.** Saiba quanto custa cada parte (IA, banco, tráfego, logs) e
   tenha alerta de gasto anormal (`observabilidade`).
8. **Limpe o que não usa.** Prévias com recursos próprios, bancos e instâncias de teste,
   buckets, retenção de logs: revisão mensal.
9. **Custo de desenvolver com agentes.** Contexto enxuto (só os arquivos necessários), sessões
   focadas, modelo adequado à tarefa e skills que carregam sob demanda. Limite de gasto também
   na conta usada pelo agente (`uso-seguro-de-agentes`).

## Verificação

- [ ] Cada provedor pago tem limite de gasto e alertas; sei qual corta e qual só avisa.
- [ ] Nenhuma chave paga no navegador, no app móvel ou com prefixo público.
- [ ] Rotas que custam dinheiro exigem login e têm limite por usuário e teto diário.
- [ ] Laços e agentes têm orçamento com corte no código.
- [ ] Sei o que acontece quando o plano gratuito estoura.
- [ ] Há alerta de gasto anormal chegando a alguém.

## Armadilhas

- **Limite que só avisa, tratado como teto.** O e-mail chega depois do gasto — às vezes horas
  depois.
- **Função que chama a si mesma, ou webhook que dispara o próprio webhook**: laço infinito
  cobrado por execução.
- **Retentativa sem limite contra API paga** enquanto o provedor responde erro.
- **Imagem ou vídeo enorme servido direto**, pago por tráfego a cada visita
  (`desempenho-e-escalabilidade`).
- **Log em nível debug em produção**: ingestão e retenção são cobradas.
- **Chave de IA dentro do app móvel**: qualquer um extrai do pacote.
- **Prévia automática por branch com banco pago** e ambiente de teste esquecido ligado.
- **Robô no formulário público** disparando e-mail, SMS ou IA na sua conta.
