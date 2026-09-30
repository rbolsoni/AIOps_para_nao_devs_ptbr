# Front-end e Core Web Vitals

As três métricas de experiência de carregamento que o Google publica em web.dev (confira os
limiares atuais antes de fixá-los como meta):

| Métrica | O que mede | "Bom" |
|---|---|---|
| LCP (*Largest Contentful Paint*) | quando o maior conteúdo visível aparece | até 2,5 s |
| INP (*Interaction to Next Paint*) | quanto a página demora para responder a cliques e toques | até 200 ms |
| CLS (*Cumulative Layout Shift*) | quanto a tela "pula" enquanto carrega | até 0,1 |

A avaliação usa o percentil 75 das visitas, separando celular e computador.

## Campo × laboratório

- **Campo** — dados de visitas reais (relatório de experiência do Chrome, PageSpeed Insights,
  monitoramento de usuário real): é o que conta para o usuário.
- **Laboratório** — Lighthouse e a aba de desempenho do navegador: reproduzível, bom para depurar
  e para a esteira; não substitui o campo.

## Causas comuns e correções

| Sintoma | Causa comum | Correção |
|---|---|---|
| LCP alto | imagem principal grande, sem prioridade, sem CDN; fonte que bloqueia o texto; conteúdo principal montado só no navegador | imagem no tamanho certo e em formato moderno, com prioridade alta; CDN; `font-display: swap`; renderizar no servidor o conteúdo principal |
| INP alto | JavaScript pesado ocupando a thread principal; tarefas longas; hidratação da página inteira | dividir o JS por rota, adiar o que não é essencial, quebrar tarefas longas, trocar bibliotecas pesadas |
| CLS alto | imagem, iframe ou anúncio sem dimensões; conteúdo injetado acima do que já está na tela; fonte que muda de tamanho ao carregar | declarar largura e altura (ou `aspect-ratio`); reservar o espaço; fonte substituta com métricas parecidas |

## Orçamento na esteira

Rode o Lighthouse com versão fixada contra a URL de homologação e falhe a etapa quando uma meta
for ultrapassada — como a catraca de cobertura. Guarde o relatório como artefato para comparar
entre versões.
