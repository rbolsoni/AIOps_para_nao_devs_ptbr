# Coletar evidências

Roteiros para conseguir a evidência certa — inclusive de quem não programa — e para achar o
commit que introduziu o defeito. Nunca peça senha, chave ou token: se aparecer num log ou numa
captura, apague antes de colar; se já foi colado, a credencial precisa ser rotacionada.

## Erro na tela (navegador)

1. Abra as ferramentas do desenvolvedor: **F12** (ou Ctrl+Shift+I; no macOS, Cmd+Option+I).
2. Aba **Console**: reproduza o erro e copie o texto das linhas em vermelho.
3. Aba **Rede** (*Network*): reproduza; clique na requisição em vermelho (status 4xx ou 5xx) e
   anote a URL, o status e a resposta (aba *Resposta*/*Response*). Antes de colar, apague tokens,
   cookies e dados pessoais.
4. Informe o horário aproximado e o navegador.

## Logs da aplicação ou da plataforma

- Filtre pelo horário do erro e, se houver, pelo identificador de correlação da requisição
  (`observabilidade`).
- Plataformas de hospedagem e de banco mostram logs no painel. Se a pessoa não sabe onde fica,
  guie o caminho no formato da `guiar-usuario-em-paineis`.
- Copie as linhas de erro completas, com a pilha — o começo e o fim importam.

## Banco de dados

Consulta só de leitura, em homologação sempre que possível. Para número estranho, consulte
separadamente a tabela de origem, o cache e a função que calcula, nessa ordem.

## Achar o commit que quebrou (`git bisect`)

```bash
git bisect start
git bisect bad                  # o commit atual tem o defeito
git bisect good <commit-bom>    # um commit (SHA ou tag) em que funcionava
# o git faz checkout de um commit no meio do caminho: teste e responda
git bisect good                 # ou: git bisect bad
# repita até o git apontar o primeiro commit ruim
git bisect reset                # volta para onde você estava
```

Com um comando que sai com 0 quando passa e com outro código quando falha — por exemplo, o
teste que reproduz o defeito —, o git conduz a busca sozinho:

```bash
git bisect run <comando-que-roda-o-teste-que-reproduz>
```

## O que comparar entre ambientes

| O quê | Como conferir |
|---|---|
| Versão do runtime | `node --version`, `python --version` e equivalentes, nos dois ambientes |
| Dependências | o lockfile é o mesmo? a instalação respeitou o lockfile? |
| Variáveis de ambiente | os **nomes** existem nos dois — nunca compare valores colando-os na conversa |
| Dados | o registro que falha existe nos dois? com os mesmos campos? |
| Configuração da plataforma | flags, região, plano, recursos ligados |
| Versão publicada | o commit no ar é mesmo o que você acha que é? |
