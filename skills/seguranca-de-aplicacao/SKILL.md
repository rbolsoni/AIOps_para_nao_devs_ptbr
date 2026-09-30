---
name: seguranca-de-aplicacao
description: >-
  Use ao implementar ou revisar login, cadastro, recuperação de senha, permissões, painel
  admin, formulários, APIs, uploads e pagamentos, e quando pedirem para "deixar seguro",
  revisar segurança, pentest ou OWASP. Aplica defesa em camadas, com autorização no
  servidor e no banco.
license: MIT
metadata:
  categoria: seguranca-e-conformidade
  versao: "1.0.1"
---

# Segurança de aplicação

Segurança não é uma etapa no fim: é o jeito de escrever cada rota, consulta e formulário.
O atacante precisa de uma falha; a aplicação precisa de camadas, para que uma falha isolada
não entregue o sistema.

## Antes de codar: mapa de ameaças em cinco minutos

Responda por escrito, no PR ou num ADR:

1. **O que vale proteger?** Dados pessoais, dinheiro, contas, reputação, disponibilidade.
2. **Quem pode atacar?** Visitante anônimo, usuário comum tentando ver dado alheio,
   usuário bloqueado, funcionário, integração comprometida.
3. **Por onde entra?** Cada rota, formulário, upload, webhook, fila e variável de ambiente.
4. **O que acontece se falhar?** Isso define o nível de controle de cada ponto.

## Regras

### Autenticação

- Use provedor ou biblioteca consolidada. Nunca implemente criptografia, hash de senha ou
  gestão de sessão do zero. Senha: Argon2id ou bcrypt, pela biblioteca.
- Papéis privilegiados (administrador, operador) exigem e-mail confirmado e, idealmente,
  MFA. Domínio de e-mail corporativo sozinho não é prova de identidade.
- Recuperação de senha e verificação de e-mail com token de uso único e expiração curta;
  a resposta não revela se o e-mail existe.
- Cookies de sessão: `HttpOnly`, `Secure`, `SameSite=Lax` (ou `Strict`).
- Considere verificar senhas contra bases de senhas vazadas (consulta por prefixo de hash,
  que não envia a senha).

### Autorização

- **Sempre no servidor**, em toda requisição. Esconder botão no front não é controle de
  acesso.
- **Negar por padrão**; liberar explicitamente.
- **Por objeto**: não basta estar logado — confira que *este* usuário pode ver *este*
  pedido (falha clássica: trocar o ID na URL e ver o pedido de outra pessoa).
- **Camadas independentes para papéis críticos**: middleware + função/política no banco +
  trigger que impede autopromoção (skill `mudancas-de-banco`).
- **Bloqueio de conta vale no banco** e encerra as sessões ativas; não só esconde a tela.
- Ações sensíveis (mudar papel, bloquear conta, excluir dados, estornar) ficam num rastro
  de auditoria: quem, quando, o quê, de qual valor para qual.

### Entrada e saída

- **Valide na fronteira** com esquema e lista do que é permitido (tipos, tamanhos,
  formatos, enums). Rejeite o resto com mensagem clara.
- **Consultas parametrizadas** sempre; nunca concatene entrada em SQL, comando de shell,
  caminho de arquivo, LDAP ou template.
- **Codifique a saída** conforme o contexto (HTML, atributo, URL, JS). Frameworks modernos
  fazem isso por padrão — o perigo está nos atalhos que desligam o escape
  (`dangerouslySetInnerHTML`, `|safe`, `v-html`, `raw`).
- **CSRF**: sessão por cookie exige proteção (token e/ou `SameSite`) em toda ação que muda
  estado.
- **SSRF**: se o servidor busca URLs informadas pelo usuário, use lista de destinos
  permitidos e bloqueie endereços internos.
- **Redirecionamento**: só para destinos da lista permitida.

### Arquivos

- Upload: confira tipo pelo conteúdo (não só pela extensão), limite tamanho, renomeie,
  guarde fora da pasta pública, em bucket privado.
- Download de documento sensível: URL assinada de curta duração, gerada depois de checar a
  permissão.
- **Revise a pasta pública** (`public/`, `static/`, `wwwroot/`): tudo ali é acessível por
  qualquer pessoa, com ou sem login. `robots.txt` não é controle de acesso.
- Páginas que exigem login devem ter `noindex` e nunca aparecer em sitemap.

### Abuso e disponibilidade

- Limite de taxa em login, cadastro, recuperação de senha, envio de e-mail/SMS e
  endpoints caros.
- Paginação e limites máximos em toda listagem; nada de "retornar tudo".
- Timeouts em chamadas externas.

### Erros e configuração

- Usuário vê mensagem genérica; o log recebe o detalhe — sem senha, token ou dado pessoal.
- Modo debug, stack trace e listagem de diretório desligados em produção.
- CORS restrito às origens conhecidas; nunca `*` com credenciais.
- Headers de segurança: skill `headers-de-seguranca`. Segredos: skill
  `segredos-e-credenciais`. Dependências: skill `dependencias-e-licencas`.

## Alerta de ferramenta não é achado

Scanners, linters de banco, SAST e auditorias automáticas apontam **candidatos**. Para
cada alerta: confirme se é explorável neste sistema, corrija o que é real, e registre num
ADR o que foi aceito de propósito e por quê. Corrigir tudo em lote "para zerar o painel" já
derrubou funcionalidades inteiras em produção. E alerta aceito sem registro volta na
próxima auditoria como se fosse novo.

## Revisão de segurança

Para revisar um PR ou um sistema, percorra
[references/checklist-de-revisao.md](references/checklist-de-revisao.md). Relate cada
achado com: onde (arquivo:linha ou rota), cenário concreto de exploração, impacto,
correção proposta e prioridade.

## Armadilhas

- **Verificação só no middleware**: rotas de API e ações de servidor que não passam por
  ele ficam abertas. Confira a autorização no ponto que executa a ação.
- **Chave de serviço (que ignora as regras de acesso) usada no navegador** ou em código que
  roda no cliente.
- **Manual interno ou captura de tela de painel administrativo na pasta pública**: expõe
  a estrutura do sistema a qualquer visitante.
- **Documentar a vulnerabilidade com um exemplo real** (token, URL com senha) no relatório.
