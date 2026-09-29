# Modelo de checagem

Salve no projeto como `scripts/checar-<o-que-verifica>.<ext>` e acrescente um comando
canônico (ex.: `npm run check:<nome>`, `make check-<nome>`) listado no `AGENTS.md` e chamado
pela esteira.

## Cabeçalho (obrigatório)

```text
<Uma linha: o que esta checagem impede.>

ORIGEM
  <Incidente ou issue que a motivou, com data. O que aconteceu, em duas ou três linhas.
   Por que as proteções existentes não pegaram.>

O QUE VERIFICA
  1. <regra>
  2. <regra>

O QUE NÃO VERIFICA
  <Limites conhecidos, para ninguém confiar além do que ela faz.>

USO
  <comando>            # saída legível
  <comando> --json     # saída para automação

SAÍDA
  0 = tudo certo; 1 = violação encontrada; 2 = não foi possível verificar (erro de
  execução, credencial ausente, rede) — diferente de "verificou e falhou".
```

## Esqueleto em JavaScript (Node.js)

```javascript
#!/usr/bin/env node
/**
 * <cabeçalho acima>
 */
const json = process.argv.includes('--json');

function coletar() {
  // Leia arquivos, consulte o banco de homologação, chame a API…
  // Lance erro com mensagem clara se NÃO for possível verificar.
  return [];
}

function avaliar(itens) {
  const violacoes = [];
  for (const item of itens) {
    // if (<regra violada>) violacoes.push({ onde: `${item.arquivo}:${item.linha}`, problema: '<o que>', correcao: '<o que fazer>' });
  }
  return violacoes;
}

let violacoes;
try {
  violacoes = avaliar(coletar());
} catch (erro) {
  console.error(`Não foi possível verificar: ${erro.message}`);
  process.exit(2);
}

if (json) console.log(JSON.stringify({ violacoes }, null, 2));
else if (violacoes.length === 0) console.log('OK: nenhuma violação.');
else {
  for (const v of violacoes) console.log(`${v.onde}  ${v.problema} → ${v.correcao}`);
  console.log(`\n${violacoes.length} violação(ões).`);
}
process.exit(violacoes.length ? 1 : 0);
```

## Esqueleto em Python

```python
#!/usr/bin/env python3
"""<cabeçalho acima>"""
import json
import sys


def coletar():
    # Leia arquivos, consulte o banco de homologação, chame a API…
    # Lance RuntimeError com mensagem clara se NÃO for possível verificar.
    return []


def avaliar(itens):
    violacoes = []
    for item in itens:
        pass  # if <regra violada>: violacoes.append({"onde": ..., "problema": ..., "correcao": ...})
    return violacoes


def main():
    try:
        violacoes = avaliar(coletar())
    except Exception as erro:  # noqa: BLE001 — qualquer falha aqui é "não verificado"
        print(f"Não foi possível verificar: {erro}", file=sys.stderr)
        return 2
    if "--json" in sys.argv:
        print(json.dumps({"violacoes": violacoes}, ensure_ascii=False, indent=2))
    elif not violacoes:
        print("OK: nenhuma violação.")
    else:
        for v in violacoes:
            print(f"{v['onde']}  {v['problema']} → {v['correcao']}")
        print(f"\n{len(violacoes)} violação(ões).")
    return 1 if violacoes else 0


if __name__ == "__main__":
    sys.exit(main())
```

## Checagem empírica contra o banco (padrão)

Para regras de acesso, a checagem conecta na **homologação** (nunca produção — use a trava
de ambiente da skill `isolamento-de-ambientes`), abre uma transação, **tenta** cada operação
proibida com a identidade de teste adequada, registra se foi recusada, e desfaz tudo com
`ROLLBACK` no fim. Uma tentativa aceita é violação.

## Prove que pega

Antes de ligar na esteira, rode contra um exemplo que viola a regra (arquivo temporário,
usuário de teste bloqueado, política removida numa transação) e confirme a saída 1 com a
mensagem certa. Registre isso no PR.
