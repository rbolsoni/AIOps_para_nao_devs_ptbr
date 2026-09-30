# Exemplos de tarefas de painel

Cartões prontos para as situações mais comuns. Os caminhos refletem as interfaces na data
desta versão — painéis mudam. Antes de entregar, confira na documentação oficial quando
puder, e mantenha o "Se a tela estiver diferente".

---

### Cadastrar segredos por ambiente no GitHub — bloqueante

**Por quê:** a esteira precisa das credenciais para publicar, e cada ambiente (homologação
e produção) deve ver só as suas.

**Onde:** GitHub → repositório → "Settings" → "Environments"

**Passos:**
1. Se não existir, clique em "New environment", escreva `staging` e confirme. Repita com
   `production`.
2. Abra o environment `production`.
3. Em "Environment secrets", clique em "Add environment secret".
4. Em "Name", escreva: `DEPLOY_TOKEN`
5. Em "Value", cole o token que você gerou no painel da plataforma de deploy.
6. Clique em "Add secret". Repita para cada segredo da lista, em cada environment.

**Como confirmar:** o nome aparece na lista (o valor nunca é mostrado de novo — isso é
normal). Eu vou disparar a esteira e conferir que a etapa "Conferir segredos obrigatórios"
passou.

**Não faça:** não cadastre em "Settings" → "Secrets and variables" → "Actions" →
"Repository secrets": ali o segredo fica visível para todo workflow, não só para o ambiente.

**Se a tela estiver diferente:** procure "Environments" na documentação do GitHub Actions.

---

### Exigir PR e CI verde na branch principal (ruleset) — recomendado

**Por quê:** impede push direto e merge com a esteira vermelha. Disponível em repositórios
públicos e nos planos pagos para privados; a trava da esteira continua valendo mesmo sem
isto.

**Onde:** GitHub → repositório → "Settings" → "Rules" → "Rulesets"

**Passos:**
1. Clique em "New ruleset" → "New branch ruleset".
2. Em "Ruleset name", escreva: `proteger-main`
3. Em "Enforcement status", escolha "Active".
4. Em "Target branches", clique em "Add target" → "Include default branch".
5. Marque "Restrict deletions" e "Block force pushes".
6. Marque "Require a pull request before merging".
7. Marque "Require status checks to pass", clique em "Add checks" e escolha os jobs do CI
   (eles só aparecem depois de terem rodado ao menos uma vez).
8. Clique em "Create".

**Como confirmar:** um push direto na `main` é recusado; um PR com o CI vermelho mostra o
merge bloqueado.

**Não faça:** não adicione você mesmo à lista de "Bypass" "só por garantia" — a regra passa
a não valer para quem mais faz merge.

**Se a tela estiver diferente:** procure "rulesets" na documentação do GitHub.

---

### Ativar varredura de segredos e bloqueio de push — recomendado

**Por quê:** o GitHub recusa o push que contém uma chave conhecida, antes que ela entre no
histórico.

**Onde:** GitHub → repositório → "Settings" → "Advanced Security" (em alguns repositórios
aparece como "Code security")

**Passos:**
1. Em "Secret Protection" (ou "Secret scanning"), clique em "Enable", se ainda não estiver
   ativo.
2. Em "Push protection", clique em "Enable".
3. Na mesma página, ative "Dependabot alerts" e "Private vulnerability reporting".

**Como confirmar:** os itens aparecem como ativos. Em repositório público estes recursos
são gratuitos; em privado, dependem do plano.

**Se a tela estiver diferente:** procure "secret scanning" e "push protection" na
documentação do GitHub.

---

### Desligar o deploy automático por git da plataforma — bloqueante

**Por quê:** a produção só pode receber código pela esteira, depois da trava. Com o deploy
automático ligado, todo push publica direto.

**Como (Vercel):** esta é uma mudança **versionada**, não de painel: o arquivo `vercel.json`
na raiz do repositório recebe `"git": { "deploymentEnabled": false }` — eu faço essa parte.
Do seu lado:

1. Vercel → projeto → "Settings" → "Environment Variables": confira que as variáveis de
   "Production" e "Preview" estão cadastradas (eu passo a lista de nomes).
2. Vercel → sua conta → "Settings" → "Tokens" → "Create": gere um token para a esteira e
   cadastre como segredo `DEPLOY_TOKEN` nos environments do GitHub (cartão acima).

**Como confirmar:** depois do próximo merge, a lista de deployments da Vercel mostra o
deploy vindo da CLI (da esteira), não do "Git".

---

### Desligar integração do banco que aplica migração ao detectar merge — bloqueante

**Por quê:** a integração aplicaria migrações em produção sem passar pela trava da esteira.

**Onde (Supabase):** projeto de **produção** → "Project Settings" → "Integrations" → bloco
"GitHub"

**Passos:**
1. Confira se o bloco "GitHub" está conectado e se a opção de aplicar mudanças em produção
   no merge está ativa.
2. Clique em "Disable integration" (ou desmarque a opção de deploy para produção).
3. Não mexa nos outros blocos (por exemplo, a sincronização de variáveis com a plataforma de
   deploy) sem combinar.

**Como confirmar:** na próxima release com migração nova, o passo de migração da esteira
mostra a migração sendo aplicada — e não "banco já atualizado".

**Não faça:** não religue "para agilizar": a lentidão é o portão.

---

### Obter a string de conexão pelo pooler (IPv4) para a esteira — bloqueante

**Por quê:** a conexão direta pode ser só IPv6, e os runners da esteira podem não ter IPv6 —
o erro fala em "restrições de rede" e engana.

**Onde (Supabase):** projeto → botão "Connect" no topo → aba de strings de conexão →
"Session pooler"

**Passos:**
1. Copie a string do "Session pooler" (porta 5432).
2. Substitua a senha pela senha do banco (em "Project Settings" → "Database", se precisar
   redefinir).
3. Cadastre como segredo `DATABASE_URL` no environment certo do GitHub (homologação e
   produção são projetos diferentes, com strings diferentes).

**Como confirmar:** a etapa de migração da esteira conecta e aplica.

---

### Apontar um domínio (DNS) — bloqueante para ir ao ar

**Por quê:** faz o endereço do site levar à plataforma de hospedagem.

**Onde:** no site onde o domínio foi registrado ou onde o DNS é gerenciado (Registro.br,
Cloudflare, etc.) → "DNS" / "Editar zona" (o nome varia)

**Passos:**
1. Na plataforma de hospedagem, adicione o domínio ao projeto e anote os registros que ela
   pedir (tipo, nome, valor).
2. No painel de DNS, crie cada registro exatamente como indicado (ex.: tipo `CNAME`, nome
   `www`, valor `<destino indicado pela plataforma>`).
3. Salve. A propagação pode levar de minutos a algumas horas.

**Como confirmar:** a plataforma de hospedagem mostra o domínio como verificado e com
certificado HTTPS emitido; eu rodo o verificador de headers no endereço.

**Não faça:** não apague registros `MX` ou `TXT` existentes — eles cuidam do e-mail e de
verificações de outros serviços.

---

### Ativar a verificação em duas etapas (2FA) nas contas — bloqueante

**Por quê:** quem entra na sua conta do repositório, da hospedagem ou do provedor de IA
controla o projeto inteiro — código, deploy, dados e fatura. Senha vaza; a segunda etapa segura.

**Onde:** nas configurações de segurança de cada conta. No GitHub: foto do perfil →
"Settings" → "Password and authentication".

**Passos:**
1. Comece pelo **e-mail**: é ele que recupera todas as outras contas.
2. Em cada conta (repositório, hospedagem, banco, registro de domínio, provedores de IA),
   ative a verificação em duas etapas. Prefira chave de acesso (*passkey*) ou aplicativo
   autenticador; SMS é a opção mais fraca.
3. Guarde os códigos de recuperação fora do computador (impressos ou num gerenciador de
   senhas).

**Como confirmar:** ao entrar de novo, a conta pede a segunda etapa.

**Não faça:** não guarde os códigos de recuperação junto da senha.

**Se a tela estiver diferente:** procure "Two-factor", "2FA" ou "Passkeys" nas configurações
de segurança da conta.

---

### Criar token com validade e permissão mínima — recomendado

**Por quê:** token vazado vale até expirar e faz tudo o que a permissão dele deixa. Validade
curta e escopo mínimo limitam o estrago.

**Onde (GitHub):** foto do perfil → "Settings" → "Developer settings" → "Personal access
tokens" → "Fine-grained tokens".

**Passos:**
1. Clique em "Generate new token".
2. Em "Expiration", escolha uma data (ex.: 90 dias) — evite "No expiration".
3. Em "Repository access", escolha "Only select repositories" e marque só os necessários.
4. Em "Permissions", dê só o que a tarefa exige (ex.: leitura de conteúdo).
5. Gere e copie o token direto para onde ele vai ser usado (secret da esteira, variável de
   ambiente da ferramenta) — não cole na conversa nem num arquivo do projeto.

**Como confirmar:** o token aparece na lista com a data de expiração e os repositórios
escolhidos.

**Não faça:** não use token clássico com acesso a todos os repositórios.

**Se a tela estiver diferente:** procure "fine-grained personal access tokens" na
documentação do GitHub. Em outras plataformas (hospedagem, banco), procure as opções de escopo
(projeto ou time) e de validade na hora de criar o token.

---

### Definir limite de gasto e alertas — bloqueante antes de ir ao ar

**Por quê:** cobrança por uso não tem teto por padrão: um robô, um laço ou uma chave vazada
vira fatura.

**Onde:** no faturamento de cada provedor pago. Onde fica em cada um, e se o limite corta ou só
avisa: skill `controle-de-custos`.

**Passos:**
1. Defina o valor máximo por mês.
2. Ative alertas em 50%, 80% e 100% para um e-mail que alguém lê.
3. Se o provedor oferece corte automático, ligue-o; se só avisa, combine com limite no código.

**Como confirmar:** o painel mostra o limite e os alertas; o primeiro alerta chega ao e-mail
certo.

**Não faça:** não trate alerta como teto.
