# Política de segurança

## Como reportar

**Não abra issue pública.** Use o relato privado do GitHub: aba "Security" deste repositório →
"Report a vulnerability".

Inclua o que encontrou, como reproduzir e o impacto que você enxerga.

## Escopo

- Os scripts das skills (`skills/*/scripts/`), o validador (`ferramentas/`) e o servidor MCP
  (`mcp/`).
- Orientações de uma skill que levem um agente a produzir código inseguro também são bem-vindas
  como relato.

## O que esperar

Confirmação de recebimento em até 5 dias úteis e aviso quando a correção for publicada.

## Garantias do servidor MCP

O servidor é somente leitura: não executa scripts nem grava arquivos, e recusa ler fora da
pasta de cada skill (ver `docs/adr/0003-mcp-somente-leitura.md`). Isso vale também para o
`SKILL.md`: se ele for link para fora da pasta, a skill é recusada. Quando a pasta da skill é
um link (como o `npx skills` instala), o limite é a pasta real para onde ele aponta. Qualquer
forma de contornar isso é uma vulnerabilidade.
