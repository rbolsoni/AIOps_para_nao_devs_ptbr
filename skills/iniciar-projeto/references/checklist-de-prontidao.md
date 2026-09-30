# Checklist de prontidão para produção

Marque o que está coberto. O que ficar desmarcado vai para o relatório ao usuário com o
motivo e o risco — em linguagem simples.

## Repositório e governança

- [ ] `AGENTS.md` com comandos reais do projeto e regras; `CLAUDE.md`/`GEMINI.md` só
      apontam para ele.
- [ ] `README.md` explica o que é, como rodar e como testar em poucos passos.
- [ ] `LICENSE` escolhida conscientemente (ou aviso de direitos reservados).
- [ ] `SECURITY.md` diz como reportar vulnerabilidade.
- [ ] `.gitignore` cobre `.env*`, chaves, builds e dependências; `.gitattributes` fixa a
      terminação de linha.
- [ ] Modelo de PR com "o que muda e por quê", "como verificar" e "o que rodei".
- [ ] Primeiro ADR registrando a adoção destas práticas.

## Qualidade

- [ ] Formatação, lint, checagem de tipos e testes rodam com um comando cada.
- [ ] Cobertura medida sobre todo o código-fonte, com piso manual (catraca).
- [ ] Os mesmos comandos rodam na máquina e na esteira.

## Segurança

- [ ] Nenhum segredo no código ou no histórico; varredura na esteira.
- [ ] Varredura de segredos da hospedagem ligada (ex.: secret scanning + push protection).
- [ ] Dependências auditadas (vulnerabilidades e licenças) na esteira.
- [ ] Autorização verificada no servidor (e no banco, se o cliente acessa o banco).
- [ ] Headers de segurança configurados e verificados na URL publicada.
- [ ] Pasta pública não expõe arquivo interno (manuais, prints de painel, backups).
- [ ] Verificação em duas etapas em todas as contas: repositório, hospedagem, banco, domínio,
      provedores de IA e o e-mail que recupera todas.
- [ ] Agente de IA configurado: sem acesso a `.env` e a credenciais de produção, aprovações
      ligadas, MCPs com versão fixada e token por variável de ambiente.
- [ ] Dependências com idade mínima de versão e scripts de instalação sob controle.

## Dados e ambientes

- [ ] Desenvolvimento e testes nunca apontam para produção; scripts têm trava de ambiente.
- [ ] Mudanças de banco só por migração versionada, aplicada pela esteira.
- [ ] Backups/recuperação configurados no banco de produção.
- [ ] Restauração de backup ensaiada, com tempo medido; caminho para voltar a versão do
      site ensaiado.
- [ ] Dados pessoais mapeados: finalidade, base legal, retenção e como excluir.

## Esteira e deploy

- [ ] PR roda validação completa e precisa ficar verde.
- [ ] Deploy de produção só pela esteira; deploy automático da plataforma e integrações
      paralelas desligados.
- [ ] Produção só recebe o commit que passou verde na homologação.
- [ ] Versão semântica calculada pelos commits; release com notas.
- [ ] Segredos por ambiente; falta de segredo faz a etapa falhar, não pular.

## Operação

- [ ] Erros monitorados (sem dados pessoais nem segredos nos eventos).
- [ ] Logs estruturados; health check; alerta que chega a alguém.
- [ ] Tarefas agendadas avisam quando não rodam.
- [ ] Runbook dos painéis externos: o que foi configurado, onde, por quem (nomes, nunca
      valores de segredo).
- [ ] Limite de gasto e alertas em cada provedor pago; sei qual corta e qual só avisa.
- [ ] Desempenho medido nas rotas e páginas principais, quando há usuários.

## Legal e acessibilidade

- [ ] Política de privacidade e termos, se houver usuários externos.
- [ ] Encarregado de dados definido, se houver tratamento de dados pessoais em escala.
- [ ] Interface web verificada contra WCAG 2.2 AA (automático + teclado).
