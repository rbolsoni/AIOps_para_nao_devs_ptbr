# Onde configurar limites e alertas

Conferido na documentação oficial de cada provedor em 2026-09-30. Painéis, planos e nomes de
menu mudam: abra a documentação antes de configurar. O que mais engana está na última coluna:
**alerta não é teto**, e mesmo o teto age com atraso.

| Provedor | Onde | O que acontece ao atingir |
|---|---|---|
| OpenAI (API) | página de limites da organização: alertas de gasto e limite rígido (*hard spend limit*) | o alerta manda e-mail; o limite rígido **para** o tráfego da API afetado quando o gasto chega ao valor — a documentação pede para revisar o guia de limites antes de ligar em produção |
| Anthropic (API) | Console → Settings → Billing → "Spend limits" (organização) e limites por workspace | cada nível de uso tem um teto mensal; o limite que você define abaixo dele **recusa** as requisições até o mês seguinte ou até você subir o limite |
| Google Cloud (inclui APIs de IA cobradas lá e o Firebase no plano pago) | Billing → Budgets & alerts | o orçamento comum **só avisa**; cortar exige orçamento com teto (em prévia, onde houver) ou uma automação que desliga o faturamento do projeto a partir da notificação |
| AWS | Billing and Cost Management → Budgets | o orçamento **só avisa** (e-mail ou SNS), com atraso de horas; *budget actions* podem aplicar sozinhas uma política que impede criar recursos |
| Vercel | Team Settings → Billing → Spend Management (Pro e Enterprise com compromisso flexível) | avisos em 50, 75 e 100%; o valor sozinho **não corta** — ligue "Pause Production Deployments" para pausar a produção de todos os projetos; a checagem roda a cada poucos minutos e a pausa não interrompe o uso do AI Gateway nem do v0 |
| Supabase | Organização → Billing → Spend Cap (plano Pro) | com o teto ligado, o uso acima da cota é **bloqueado** até o próximo ciclo, sem cobrança extra — mas computação, PITR, domínio personalizado, IPv4, disco provisionado e outros itens previsíveis ficam **fora** do teto |

Outros provedores (Netlify, Cloudflare, Azure, e-mail, SMS, gateways de pagamento): procure na
documentação por "budget", "spend limit", "usage alert" ou "billing alert" e responda às mesmas
duas perguntas — **onde fica** e **o que acontece ao atingir**. Se só avisa, compense com
limite no código (regras 3 e 4 da skill).
