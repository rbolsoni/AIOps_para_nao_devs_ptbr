<!--
  Base do PR: <branch base>. Fluxo completo no CONTRIBUTING.md.
  Marque só o que rodou de fato: desmarcado é informação útil; marcado sem rodar é falso.
-->

## O que muda e por quê

<!-- O problema, não só a solução. -->

Fecha #

## Como verificar

<!-- Passos para o revisor reproduzir: comando, tela, cenário. -->

## O que rodei

- [ ] formatação e lint
- [ ] checagem de tipos
- [ ] testes
- [ ] varredura de segredos
- [ ] e2e / teste manual (descreva)

## Banco de dados

- [ ] Este PR não toca o banco.

Se toca:

- [ ] A mudança é uma migração versionada (nada manual em painel).
- [ ] As políticas de acesso novas verificam o usuário (nenhuma liberando tudo).
- [ ] Rodei as checagens de banco contra a homologação.

## Riscos, passos manuais e o que ficou de fora

<!-- Efeitos colaterais, tarefas em painel externo, o que ficou para depois. -->
