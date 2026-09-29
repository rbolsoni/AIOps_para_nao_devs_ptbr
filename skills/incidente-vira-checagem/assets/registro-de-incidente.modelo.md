# Incidente — <título curto> (<AAAA-MM-DD>)

> Registro sem culpados: descreve processos e lacunas de proteção, não pessoas.
> Não inclua segredos, dados pessoais nem prints com dados reais.

## Resumo

<Duas ou três frases: o que aconteceu, em qual ambiente, qual o impacto.>

## Linha do tempo (horário de Brasília)

| Quando | O quê |
|---|---|
| <data hora> | <início / detecção / contenção / correção / encerramento> |

## Impacto

- Quem foi afetado e quantos: <…>
- Dados pessoais envolvidos? <não / sim — ver obrigações de comunicação na skill privacidade-e-lgpd>
- Duração: <…>

## Causa raiz

<O mecanismo técnico que produziu a falha.>

## Por que nada pegou antes

<Qual proteção deveria ter pegado e por que não pegou: não existia, existia mas não rodava,
rodava mas não cobria este caso, passou sem executar.>

## O que mudou

| Ação | Tipo | Onde | Estado |
|---|---|---|---|
| <correção do defeito> | correção | <PR> | feito |
| <checagem automática que impede a reincidência> | proteção | <script + esteira> | feito |
| <regra/armadilha documentada> | conhecimento | <AGENTS.md / skill / memória> | feito |

## Como provamos que a proteção funciona

<A checagem foi rodada contra um caso que viola a regra e falhou como esperado: saída.>
