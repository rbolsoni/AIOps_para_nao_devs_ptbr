# Checklist de revisão de segurança

Organizado pelos temas do OWASP Top 10 e do OWASP ASVS. Para cada item marcado como
problema, registre: local, cenário de exploração, impacto, correção e prioridade.

## Controle de acesso

- [ ] Toda rota/ação de servidor confere autenticação e autorização no próprio ponto de
      execução.
- [ ] Acesso por objeto: o ID recebido pertence ao usuário (ou ele tem papel para vê-lo).
- [ ] Negar por padrão; nenhuma política de banco que libera tudo.
- [ ] Papéis privilegiados com barreiras independentes; ninguém se autopromove.
- [ ] Conta bloqueada não escreve (verificado no banco) e perde as sessões.
- [ ] Nenhum dado de outro usuário em respostas de listagem, exportação ou busca.

## Falhas criptográficas e dados sensíveis

- [ ] HTTPS obrigatório (HSTS); nenhum recurso misto.
- [ ] Senhas com Argon2id/bcrypt; nenhuma criptografia caseira.
- [ ] Dados sensíveis em repouso protegidos conforme o provedor; backups também.
- [ ] Nenhum segredo no código, em log, em mensagem de erro ou no bundle do navegador.

## Injeção

- [ ] SQL/NoSQL parametrizado; ORM sem concatenação em trechos crus.
- [ ] Nenhum comando de shell montado com entrada externa.
- [ ] Saída codificada; nenhum atalho que desliga o escape sem sanitização.
- [ ] Caminhos de arquivo não derivam de entrada externa sem normalização e lista permitida.

## Design inseguro e lógica de negócio

- [ ] Operações sobre saldo (dinheiro, créditos, vagas, estoque) atômicas, com trava, no servidor.
- [ ] Limites de taxa em autenticação e endpoints caros.
- [ ] Fluxos de várias etapas não podem ser pulados chamando a última etapa direto.
- [ ] Valores calculados no servidor (preço, desconto, taxa, total), nunca aceitos do cliente.
- [ ] Nenhuma rota grava o corpo da requisição inteiro: campos permitidos listados (sem
      papel, dono, preço, saldo ou status vindos do cliente).
- [ ] Rotas que chamam IA, e-mail, SMS ou API paga exigem login e têm limite por usuário e
      teto diário.

## Configuração

- [ ] Debug, stack trace e listagem de diretório desligados em produção.
- [ ] Headers de segurança presentes e corretos (rode o verificador da skill
      `headers-de-seguranca`).
- [ ] CORS restrito; cookies com `HttpOnly`, `Secure`, `SameSite`.
- [ ] Pasta pública sem arquivos internos; páginas logadas com `noindex`.
- [ ] Buckets privados; downloads por URL assinada curta.

## Componentes vulneráveis

- [ ] Auditoria de vulnerabilidades na esteira; nenhuma crítica/alta sem decisão registrada.
- [ ] Lockfile versionado; instalação pelo lockfile na esteira.
- [ ] Actions/imagens/pacotes de pipeline fixados.

## Autenticação

- [ ] Provedor ou biblioteca consolidada.
- [ ] Recuperação de senha com token único, curto, que não revela se o e-mail existe.
- [ ] MFA para papéis administrativos.
- [ ] Sessão expira e é invalidada no logout e no bloqueio.

## Integridade de software e dados

- [ ] Deploy só pela esteira; nenhuma integração paralela publicando em produção.
- [ ] Webhooks verificam assinatura e rejeitam repetição (timestamp/nonce).
- [ ] Nada de desserializar dado não confiável em formato que executa código.

## Registro e monitoramento

- [ ] Ações sensíveis registradas em trilha de auditoria.
- [ ] Falhas de login e picos de erro geram alerta.
- [ ] Logs sem senha, token ou dado pessoal desnecessário.

## SSRF

- [ ] Buscas de URL feitas pelo servidor usam lista de destinos permitidos.
- [ ] Endereços internos, de metadados de nuvem e `localhost` bloqueados.
