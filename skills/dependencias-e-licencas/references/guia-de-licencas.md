# Guia de licenças

Este guia ajuda a decidir; não é parecer jurídico. Para produto comercial com dúvida real,
a decisão final é de quem responde juridicamente pelo projeto.

## Perguntas que decidem

1. **O software é distribuído?** App instalado, imagem de contêiner publicada, pacote
   publicado, biblioteca entregue a cliente = distribuição. Serviço web só acessado pela
   rede = não é distribuição (exceto para AGPL).
2. **A dependência vai para produção ou só para desenvolvimento/build?**
3. **O código da dependência é modificado?**
4. **Como ela é ligada?** Dinamicamente (biblioteca separada, substituível) ou
   estaticamente/incorporada.
5. **O projeto é aberto ou fechado?**

## Por família

**Permissivas (MIT, BSD, ISC, Apache-2.0…)** — use à vontade; mantenha o aviso de copyright
e o texto da licença na distribuição. Apache-2.0 acrescenta concessão de patente e exige
manter o arquivo NOTICE, se existir.

**LGPL** — pode ser usada em software fechado se ligada dinamicamente e sem modificação da
biblioteca; ao distribuir, é preciso permitir que o usuário troque a biblioteca e
disponibilizar a fonte dela. Modificar ou ligar estaticamente muda o cenário.

**MPL-2.0** — copyleft por arquivo: só os arquivos MPL modificados precisam ter o código
publicado. Usar sem modificar é tranquilo, inclusive em software fechado.

**GPL** — obra derivada distribuída precisa sair sob GPL, com código-fonte. Incompatível com
distribuir software fechado que a incorpore.

**AGPL** — como a GPL, e mais: quem oferece pela rede uma versão modificada do programa
(ou uma obra que o incorpora) precisa disponibilizar o código-fonte a quem a usa, mesmo sem
distribuir nada. Evite em SaaS fechado.

**Fonte disponível (BUSL, SSPL, FSL, Elastic, Commons Clause)** — não são licenças open
source. Geralmente proíbem uso que concorra com o autor ou oferta como serviço gerenciado;
algumas convertem para licença aberta depois de alguns anos. Leia a restrição e registre
por que ela não alcança o seu uso.

**Creative Commons** — feitas para conteúdo, não código. CC-BY exige atribuição ao
redistribuir; CC-BY-SA exige compartilhar derivados pela mesma licença; NC proíbe uso
comercial; ND proíbe derivados.

**Licença não comercial customizada** (comum em repositórios de tutoriais) — não use o
conteúdo em projeto comercial nem republique. Estude e escreva o seu.

**Sem licença** — "todos os direitos reservados" por padrão. Não há permissão de uso,
cópia ou modificação, mesmo estando público no GitHub.

## Casos comuns

| Caso | Decisão típica |
|---|---|
| Biblioteca de processamento de imagem com parte LGPL, sem modificação, em imagem Docker publicada | permitir com exceção nomeada; condição: não modificar nem ligar estaticamente |
| CLI de build com licença de fonte disponível que proíbe concorrer com o autor, sendo o projeto de outro ramo | permitir com exceção nomeada; condição: revisar se o produto passar a concorrer |
| Base de dados de compatibilidade de navegadores em CC-BY, usada só no build | permitir: não é redistribuída |
| Ferramenta de teste/build em MPL-2.0, sem modificação | permitir |
| Biblioteca GPL num app fechado distribuído | bloquear; procurar alternativa |
| Pacote sem campo de licença | bloquear até descobrir a licença no repositório de origem |
