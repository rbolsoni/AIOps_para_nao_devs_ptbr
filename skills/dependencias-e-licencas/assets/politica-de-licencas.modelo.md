# Política de licenças de dependências — <Nome do projeto>

> Registre esta política também como ADR. A checagem automática fica em
> `<caminho do script>` e roda na esteira (`<comando>`).

## Contexto

- O projeto é: <aberto sob LICENÇA | fechado>.
- É distribuído como: <serviço web | imagem de contêiner publicada | app | pacote>.

## Licenças permitidas sem análise

MIT, MIT-0, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, Unlicense,
BlueOak-1.0.0, Python-2.0.

## Exceções por pacote

| Pacote | Licença | Produção? | Motivo | Invalida se |
|---|---|---|---|---|
| <pacote> | <licença> | <sim/não> | <por que é aceitável aqui> | <condição que obriga a rever> |

A mesma licença em outro pacote **não** está liberada: exige nova análise e nova linha.

## Bloqueadas

GPL e AGPL em código de produção; licenças de fonte disponível sem análise; pacotes sem
licença ou com licença desconhecida.

## Ferramenta

<nome>@<versão fixada>. Mudar a versão é uma decisão revisada em PR.

## Revisão

- Toda exceção é revista quando a dependência muda de versão major.
- Exceção que não casa mais com nenhum pacote é removida.
