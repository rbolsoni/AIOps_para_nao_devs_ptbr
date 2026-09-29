---
name: acessibilidade-web
description: >-
  Use ao criar ou alterar interfaces web ou mobile — páginas, formulários, botões, links,
  modais, menus, abas, tabelas, gráficos, imagens, cores e textos — e quando o usuário
  mencionar acessibilidade, WCAG, leitor de tela, contraste, navegação por teclado,
  inclusão ou a Lei Brasileira de Inclusão. Garante semântica, teclado, foco, rótulos,
  contraste e alternativas em texto, com verificação automática e manual.
license: MIT
metadata:
  categoria: seguranca-e-conformidade
  versao: "1.0.0"
---

# Acessibilidade web

Uma interface acessível funciona para quem usa leitor de tela, só teclado, zoom, alto
contraste ou tem pouca coordenação motora — e fica melhor para todo mundo. No Brasil, a Lei
Brasileira de Inclusão (Lei 13.146/2015, art. 63) exige acessibilidade em sites de empresas
com sede ou representação no país. A referência técnica é a WCAG 2.2, nível AA.

## Regras

1. **HTML semântico primeiro.** `<button>` para ação, `<a href>` para navegação, `<label>`
   para campo, `<nav>`, `<main>`, `<header>`, títulos `<h1>`…`<h6>` em ordem. Um `<div>`
   clicável não é botão: não recebe foco nem responde a Enter/Espaço.
2. **ARIA só quando o HTML não resolve**, e nunca contradizendo o elemento. ARIA errado é
   pior que nenhum.
3. **Tudo funciona pelo teclado**, na ordem visual, com **foco visível**. Nunca remova o
   contorno de foco sem colocar outro indicador claro.
4. **Todo campo tem rótulo visível** associado; erros aparecem em texto, ligados ao campo
   (`aria-describedby`) e anunciados; não dependem só de cor.
5. **Imagens**: `alt` que diz o que a imagem comunica; `alt=""` quando é decorativa. Ícone
   sem texto em botão precisa de nome acessível (`aria-label`).
6. **Contraste**: 4,5:1 para texto normal; 3:1 para texto grande e para bordas/ícones de
   componentes. Cor nunca é o único jeito de passar informação.
7. **Área de toque/clique** de pelo menos 24×24 px (WCAG 2.2).
8. **Modais e diálogos**: o foco vai para dentro ao abrir, fica preso nele, `Esc` fecha, o
   foco volta ao elemento que abriu, e o conteúdo de fundo fica inerte (`inert` ou
   `<dialog>` modal). Escolha um padrão para o projeto inteiro e registre num ADR.
9. **Movimento**: respeite `prefers-reduced-motion`; nada pisca mais de três vezes por
   segundo; carrossel automático tem pausa.
10. **Idioma e títulos**: `<html lang="pt-BR">` e `<title>` único e descritivo por página.
11. **Tabelas de dados** com `<th>` e `scope`; **gráficos** com resumo em texto ou tabela
    equivalente.
12. **Zoom de 200%** sem perder conteúdo nem exigir rolagem horizontal em telas estreitas.

## Verificação

Automática (pega cerca de um terço dos problemas — necessária, não suficiente):

- Verificador axe nos testes E2E dos fluxos principais (ex.: `@axe-core/playwright`), falhando
  a esteira em violações sérias.
- Plugin de lint de acessibilidade do framework (ex.: `eslint-plugin-jsx-a11y`).

Manual, a cada tela nova:

- [ ] Percorri a tela só com Tab, Shift+Tab, Enter, Espaço, setas e Esc.
- [ ] O foco é sempre visível e segue a ordem visual.
- [ ] Com leitor de tela (NVDA no Windows, VoiceOver no macOS/iOS, TalkBack no Android), os
      botões, campos e erros são anunciados com nome e função.
- [ ] Zoom de 200% sem conteúdo cortado.
- [ ] Contraste conferido nas cores novas.

## Armadilhas

- **Placeholder no lugar de rótulo**: some ao digitar e costuma ter contraste baixo.
- **`outline: none` global** no CSS de reset.
- **Clique em `div`/`span`** com `onClick`: invisível para teclado e leitor de tela.
- **Modal que deixa o fundo navegável** pelo Tab.
- **Mensagem de sucesso/erro só visual** (toast) sem região `aria-live`.
- **Texto em imagem** (banner com texto embutido) sem alternativa.
