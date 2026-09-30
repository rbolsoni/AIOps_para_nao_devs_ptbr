---
name: depuracao-guiada
description: >-
  Use quando algo não funciona, dá erro, quebrou depois de uma mudança, piorou após várias
  tentativas ou o agente está andando em círculos. Conduz reprodução, evidência e uma hipótese
  por vez, e volta ao último estado bom antes de insistir.
license: MIT
metadata:
  categoria: fundamentos
  versao: "1.0.0"
---

# Depuração guiada

O jeito mais caro de consertar um erro é o laço de tentativas às cegas: cada "arruma" em cima
do anterior empilha mudanças, e em pouco tempo ninguém sabe o que causou o quê — nem o agente.
Depurar é método: reproduzir, colher evidência e testar uma hipótese por vez.

## Procedimento

1. **Pare de mudar código.** Duas tentativas sem progresso bastam: pare e diga ao usuário o que
   foi tentado e o que se observou (`disciplina-de-codigo`).
2. **Volte ao último estado bom** quando as tentativas pioraram. Guarde o que está pela metade
   (`git stash` ou um commit numa branch), volte ao commit que funcionava e confirme que ali
   funciona. A diferença entre o bom e o ruim (`git diff`) contém a causa.
3. **Reproduza.** Passos exatos, em qual ambiente (local, homologação ou produção —
   `isolamento-de-ambientes`), com quais dados e em qual versão. Sem reprodução não há como
   provar a correção.
4. **Colete evidência.** A mensagem de erro completa, não um resumo; a pilha; os logs com
   horário; a requisição que falhou; e o que mudou desde a última vez que funcionou — commits,
   dependência atualizada, variável de ambiente, configuração de painel. Roteiros para pedir isso
   a quem não programa e para achar o commit culpado:
   [references/coletar-evidencias.md](references/coletar-evidencias.md).
5. **Isole.** Reduza o caso ao menor que ainda falha. Divida o espaço de busca: entre o commit
   bom e o ruim, o `git bisect` acha o culpado em poucos passos. Confira na fonte (banco, API,
   arquivo): explicação plausível não é diagnóstico.
6. **Uma hipótese por vez.** Escreva a hipótese e o experimento que a confirma ou a derruba;
   mude uma coisa só; registre o resultado — inclusive quando a hipótese caiu.
7. **Corrija com teste.** O teste que reproduz o defeito falha antes da correção e passa depois
   (`testes-e-qualidade`). Rode a suíte inteira.
8. **Feche o ciclo.** Causa que pode voltar vira checagem automática
   (`incidente-vira-checagem`). Descoberta não óbvia — e o que foi tentado e não funcionou —
   vai para a memória do projeto (`memoria-de-projeto`).

## Quando escalar

Duas hipóteses derrubadas sem informação nova: pare e entregue ao usuário um relatório curto —
o que se sabe, o que foi descartado e como, o que falta (um acesso, um dado, uma decisão).
Continuar no escuro custa tempo, tokens e, às vezes, o código que funcionava.

## Ao falar com quem não programa

- Peça evidência com passos concretos ("aperte F12 e copie o texto em vermelho"), não
  "manda o log".
- Captura de tela serve, desde que sem dados pessoais e nunca com senha ou chave.
- Diga o que vai fazer com a informação e o que falta para resolver.

## Armadilhas

- **Corrigir o sintoma**: engolir a exceção, aumentar o tempo limite, repetir a chamada até dar
  certo. O erro some da tela e continua acontecendo.
- **Mudar várias coisas de uma vez**: se funcionar, ninguém sabe qual mudança resolveu; se
  piorar, qual quebrou.
- **Apagar ou afrouxar o teste que falha** para "passar". O teste é a evidência; o defeito
  continua lá.
- **"Funciona na minha máquina"**: versão do runtime, variáveis, dados, dependências e flags
  diferem entre ambientes. Compare-os (tabela na referência).
- **Cache mascarando a correção** (navegador, CDN, build): a mudança está certa e a tela mostra
  a versão velha.
- **Mensagem de erro de outra camada**: "restrições de rede" que era falta de IPv6 no runner;
  "não autorizado" que era variável vazia. Leia a mensagem e depois confirme a causa.
