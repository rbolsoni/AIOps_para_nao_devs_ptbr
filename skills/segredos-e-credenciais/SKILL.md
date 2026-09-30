---
name: segredos-e-credenciais
description: >-
  Use ao lidar com senhas, chaves de API, tokens, strings de conexão, .env e secrets da
  esteira ou da hospedagem — ao ler configuração, integrar serviço, montar Dockerfile ou
  commitar — e quando um segredo puder ter vazado. Inclui varredor de segredos.
license: MIT
compatibility: O script de varredura requer Node.js 20+; usa o git quando disponível.
metadata:
  categoria: seguranca-e-conformidade
  versao: "1.2.0"
---

# Segredos e credenciais

Um segredo que entrou no repositório deve ser tratado como vazado — mesmo que o
repositório seja privado, mesmo que o commit tenha sido apagado. O histórico guarda tudo,
clones e caches guardam o histórico, e repositório privado muda de visibilidade, ganha
colaboradores e é copiado por ferramentas.

## Regras

1. **Nenhum segredo em arquivo versionado**: nem no código, nem em teste, exemplo,
   documentação, comentário, notebook ou mensagem de commit.
2. **Configuração obrigatória ausente derruba a aplicação** com erro claro. Nunca use valor
   padrão literal para credencial:

   ```javascript
   // Errado: embute a chave e ainda a usa em silêncio quando a variável falta
   const chave = process.env.PAGAMENTO_API_KEY || '<chave-real>';

   // Certo
   const chave = process.env.PAGAMENTO_API_KEY;
   if (!chave) throw new Error('PAGAMENTO_API_KEY não configurada (veja .env.example)');
   ```

3. **`.env` fica fora do git e fora da imagem.** `.gitignore` e `.dockerignore` excluem
   `.env*` (exceto `.env.example`). Sem `.dockerignore`, um `COPY . .` leva o `.env` para uma
   camada da imagem — e a camada fica no cache e no registro.
4. **`.env.example` lista toda variável**, com marcador (`<sua-chave-aqui>`) e comentário
   dizendo onde obter o valor.
5. **Segredo mora em cofre**: secrets da esteira separados por ambiente, variáveis da
   plataforma de deploy, gerenciador de segredos da nuvem. Configuração pública (enviada ao
   navegador) pode ficar como variável comum — e nunca carrega segredo.
6. **Menor privilégio e uma chave por ambiente e por uso.** Chave de desenvolvimento não
   abre produção. Chave que ignora as regras de acesso (service role, admin) só no servidor,
   só onde é indispensável.
7. **Nunca peça ao usuário para colar um segredo na conversa.** Diga onde ele deve
   cadastrar (arquivo `.env` local, painel de secrets) e como confirmar que funcionou (skill
   `guiar-usuario-em-paineis`). Se o usuário colar um segredo na conversa, avise que ele
   deve ser considerado exposto e rotacionado.
8. **Segredo não aparece em log, erro ou saída de ferramenta.** Mascare (primeiros
   caracteres + tamanho) quando precisar identificar qual chave está em uso.
9. **Arquivos locais de ferramentas também carregam segredo** (tokens de plugins de build,
   `.npmrc`, credenciais de CLI). Eles precisam estar no `.gitignore` — e causam efeitos
   externos quando a ferramenta roda localmente.
10. **O agente de IA não lê segredos.** Bloqueie a leitura de `.env*` e de chaves na
    configuração da ferramenta (`uso-seguro-de-agentes`): o `.gitignore` não protege do
    agente, e o que ele lê vai para o provedor do modelo e para o histórico da conversa.
11. **Configuração de MCP e de ferramentas de IA não leva token literal.** `.mcp.json`,
    `.vscode/mcp.json`, `.cursor/mcp.json` e afins costumam ser versionados: use a referência
    a variável de ambiente que a ferramenta oferece — `${API_KEY}` no `.mcp.json` do Claude
    Code; `${input:id}` ou `envFile` no VS Code; `$VAR` no `settings.json` do Gemini CLI.
    Confira a sintaxe na documentação da sua ferramenta.

## Varredura

Use as três camadas, da mais barata para a mais completa:

1. **Na hospedagem**: varredura de segredos com bloqueio de push (no GitHub, *secret
   scanning* e *push protection*, gratuitos em repositório público; em privado dependem do
   plano). É tarefa de painel para o usuário.
2. **Na esteira e antes do commit**: gitleaks, ou o script desta skill quando não houver
   instalação:
   `node scripts/verificar-segredos.mjs` (arquivos do git) ou `--todos` (pasta sem git).
3. **Revisão**: todo PR é lido procurando credencial, URL com senha, token em teste.

Falso positivo se resolve na linha, com motivo (`verificar-segredos: ignorar (fixture
gerada)`), nunca desligando a regra — e nunca para um segredo real.

## Se vazou

Siga [references/resposta-a-vazamento.md](references/resposta-a-vazamento.md). O primeiro
passo é sempre **rotacionar**: remover do código e reescrever o histórico não invalidam a
credencial.

## Script disponível

- **`scripts/verificar-segredos.mjs`** — procura chaves privadas, tokens de provedores
  conhecidos (GitHub, GitLab, npm, AWS, Google, Stripe, Slack, Discord, Telegram, SendGrid,
  Hugging Face, Supabase, provedores de LLM), JWT com papel de serviço, URL com senha, `.env`
  versionado, credencial literal de alta entropia — inclusive em JSON, como configurações de
  app e de MCP — e valor padrão literal para variável sensível (JS/TS, Python, Ruby, PHP, C#,
  Java). Lê arquivos UTF-16 (o `>` do Windows PowerShell 5.1 grava assim) e **lista o que não
  varreu** (acima de 1 MB, binário), para "não verifiquei" não passar por "está limpo".
  Opções: `--todos`, `--json`, `--help`. Sai com 1 se encontrar algo. Nunca imprime o
  segredo inteiro.

## Armadilhas

- **Fixture de teste com token no formato real**: dispara scanners e o bloqueio de push da
  hospedagem. Gere o valor em tempo de execução ou use marcador óbvio.
- **Scanner que acusa configuração pública** (chave anônima, variável com prefixo público):
  a equipe aprende a ignorar o scanner. Diferencie público de secreto nas regras.
- **Documentar o incidente com o padrão vulnerável** faz o scanner acusar a documentação.
  Restrinja regras de código a arquivos de código.
- **Segredo passado como argumento de linha de comando** aparece na lista de processos e
  no histórico do shell. Use variável de ambiente ou arquivo com permissão restrita.
- **Log ou mensagem de erro colado na conversa com o token dentro**: ele agora está no
  histórico da conversa e no provedor do modelo. Mascare antes; se já foi, rotacione.
- **`echo $SEGREDO` para "depurar" na esteira**: a máscara automática da plataforma não
  cobre valores transformados (base64, trechos). Não imprima.
