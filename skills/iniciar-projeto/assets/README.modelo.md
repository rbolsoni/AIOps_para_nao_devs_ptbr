# <Nome do projeto>

<Uma frase: o que faz e para quem.>

## Como rodar

Pré-requisitos: <ex.: Node.js 22, Docker>.

```bash
<comando para instalar dependências>
cp .env.example .env    # preencha os valores — veja a seção Configuração
<comando para rodar localmente>
```

Acesse <http://localhost:PORTA>.

## Configuração

Todas as variáveis estão descritas em [`.env.example`](.env.example). Os valores reais
**nunca** entram no repositório: localmente ficam no `.env` (ignorado pelo git); na esteira
e na plataforma de deploy, nos cofres de segredos de cada uma.

## Como testar

```bash
<comando de testes>
<comando de lint>
```

## Como contribuir

Leia o [CONTRIBUTING.md](CONTRIBUTING.md). Em resumo: branch nova, Commits Convencionais,
PR com o CI verde.

## Decisões técnicas

As decisões com trade-off estão registradas em [`docs/adr/`](docs/adr/).

## Segurança

Encontrou uma vulnerabilidade? Siga o [SECURITY.md](SECURITY.md) — não abra issue pública.

## Licença

<Nome da licença> — veja [LICENSE](LICENSE).
