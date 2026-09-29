# Ferramentas e permissões

## Desenho de uma ferramenta

- **Um propósito por ferramenta**, com nome que diz a ação: `buscar_pedido`, não `banco`.
- **Parâmetros tipados e restritos** (JSON Schema): enums em vez de texto livre, limites de
  tamanho, formatos. O código valida de novo antes de executar — o schema enviado ao modelo
  é uma sugestão, não uma garantia.
- **Descrição escrita para o modelo**: quando usar, quando não usar, o que retorna, erros
  comuns. A descrição é parte do prompt.
- **Saída previsível e limitada**: resumo por padrão, paginação para o resto; formato
  estruturado. Saída gigante é truncada pelo harness e o modelo perde exatamente o que
  importava.
- **Erros acionáveis**: o que deu errado e o que tentar ("data inválida: use AAAA-MM-DD").
- **Idempotência**: o modelo pode repetir a chamada; "criar se não existir" é mais seguro
  que "criar e falhar se duplicado".
- **Modo de simulação** (`dry_run`) para ferramentas que alteram estado.

## Classes de risco

| Classe | Exemplos | Política padrão |
|---|---|---|
| 0 — leitura interna | ler arquivo do projeto, consultar pedido do próprio usuário | executa |
| 1 — escrita local reversível | editar arquivo no workspace, criar rascunho | executa e registra |
| 2 — efeito externo reversível | abrir PR, criar issue, enviar para homologação | executa com registro; aprovação conforme contexto |
| 3 — irreversível ou visível para terceiros | enviar e-mail/mensagem, publicar, deploy em produção, apagar dados | **aprovação humana** a cada vez |
| 4 — alto impacto | pagamentos, mudança de permissão, acesso a dados pessoais em massa, credenciais | aprovação humana + limites no código (valor máximo, escopo) |

A classe é atributo da ferramenta, definido no código — nunca decidido pelo modelo.
Aprovação vale para aquela ação, com aqueles argumentos; não se estende à próxima.

## Isolamento

- Código gerado roda em sandbox (contêiner, VM, ambiente gerenciado) com: sistema de arquivos
  restrito ao workspace, rede desligada ou com lista de destinos permitidos, limites de CPU,
  memória e tempo.
- Ferramentas de shell com lista de comandos permitidos ou análise do comando antes de rodar.
- Segredos injetados pelo harness como variáveis do processo da ferramenta, fora do texto
  que o modelo vê; saída filtrada para não devolver o segredo ao contexto.

## Conteúdo não confiável

Tudo que chega por ferramenta (página web, arquivo, e-mail, resultado de busca, resposta de
outro agente) pode conter instruções escritas para enganar o modelo. Regras:

- Marque no contexto a origem do conteúdo e trate-o como dado.
- Um agente que lê conteúdo não confiável não deve ter, na mesma sessão, ferramentas de
  classe 3 ou 4 sem aprovação.
- Ações derivadas de conteúdo externo (ex.: "o e-mail pede para transferir") sempre passam
  por aprovação.

## MCP (Model Context Protocol)

- Servidores MCP são ferramentas de terceiros: avalie origem, permissões pedidas e o que
  enviam para fora antes de conectar.
- Prefira servidores somente leitura para inspeção; escrita com credencial de menor
  privilégio e ambiente de homologação.
- Descrições de ferramentas vindas de um servidor MCP também são conteúdo não confiável (um
  servidor malicioso pode tentar instruir o modelo pela descrição).
- Fixe a versão do servidor, como qualquer dependência.

## Descoberta automática de ferramentas

Registrar ferramentas por convenção (pasta, decorador, manifesto) evita esquecer de
cadastrar — mas toda ferramenta descoberta passa pela mesma validação: schema válido,
classe de risco declarada, testes. Ferramenta sem classe de risco não é registrada.
