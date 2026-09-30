# <Nome do projeto> — instruções para agentes de IA

> Fonte única de regras para qualquer agente (e pessoa) que trabalhe neste repositório.
> Arquivos como `CLAUDE.md` e `GEMINI.md` apenas apontam para cá. Mudou uma regra? Mude aqui.

## O que é este projeto

<Uma ou duas frases: o que faz, para quem.>

- **Stack:** <linguagens, frameworks, banco, plataforma de deploy>
- **Público de quem mantém:** <ex.: "a pessoa responsável não é programadora — explique em
  linguagem simples e detalhe as tarefas de painel">

## Comandos canônicos

Use estes comandos; não invente variações. A esteira roda exatamente os mesmos.

| Finalidade | Comando |
|---|---|
| Instalar dependências | `__COMANDO_INSTALAR__` |
| Rodar localmente | `__COMANDO_DEV__` |
| Formatar | `__COMANDO_FORMATAR__` |
| Lint | `__COMANDO_LINT__` |
| Checar tipos | `__COMANDO_TIPOS__` |
| Testes com cobertura | `__COMANDO_TESTES__` |
| Varredura de segredos | `__COMANDO_SEGREDOS__` |
| Licenças de dependências | `__COMANDO_LICENCAS__` |
| Vulnerabilidades | `__COMANDO_VULNERABILIDADES__` |

## Fluxo de trabalho

1. Crie uma branch a partir de `<branch base>`: `tipo/descricao-curta`.
2. Commits no padrão Commits Convencionais (`feat:`, `fix:`, `docs:`, `chore:`…).
3. Abra PR para `<branch base>`. O CI precisa fechar **verde** — confira a conclusão do run,
   não só o comando que acompanha.
4. <Se houver homologação: "Merge em `staging` publica em homologação; a promoção para
   `main` só sai de `staging` e só depois de o CI de `staging` fechar verde.">
5. Merge em `main` = <o que acontece: release, deploy de produção…>.

Nunca: push direto em `main`, force push em branch compartilhada, pular hooks
(`--no-verify`), commitar `.env` ou chaves.

## Ambientes

| Ambiente | Onde | Quem altera |
|---|---|---|
| Desenvolvimento | máquina local, aponta para <banco local ou homologação> | você |
| Homologação | <URL/projeto> | a esteira, no merge em `<branch>` |
| Produção | <URL/projeto> | **somente a esteira**, no merge em `main` |

- Nenhum teste, script ou ferramenta local aponta para produção.
- Mudança de banco só por migração versionada em `<pasta de migrações>`, aplicada pela
  esteira. Nada de alteração manual em painel.

## Segurança e dados

- Nenhum segredo no código, em teste, em exemplo ou em log. Variáveis novas entram no
  `.env.example` com marcador.
- Autorização sempre verificada no servidor<, e no banco via políticas de acesso>.
- <Regras específicas: tabelas com dados pessoais, buckets privados, papéis de operador…>

## Definição de pronto

- [ ] Critério do pedido verificado; testes, lint e tipos passando.
- [ ] Diff contém só o que o pedido exige.
- [ ] Documentação e `.env.example` atualizados.
- [ ] Nenhum segredo ou dado pessoal novo exposto.
- [ ] Usuário sabe o que precisa fazer em painéis externos, se houver.

## Skills recomendadas

Se as skills de boas práticas estiverem instaladas, use-as nestas situações:

| Situação | Skill |
|---|---|
| Qualquer mudança de código | `disciplina-de-codigo`, `codigo-limpo-e-solid` |
| Algo não funciona, deu erro ou piorou | `depuracao-guiada` |
| Branch, commit, PR | `fluxo-de-git` |
| Esteira, release, deploy | `esteira-ci-cd`, `isolamento-de-ambientes` |
| Banco de dados | `mudancas-de-banco` |
| Senhas, chaves, `.env` | `segredos-e-credenciais` |
| Login, permissões, formulários, APIs | `seguranca-de-aplicacao`, `headers-de-seguranca` |
| Dependência nova | `dependencias-e-licencas` |
| Dados pessoais | `privacidade-e-lgpd` |
| Interface web | `acessibilidade-web` |
| Algo deu errado | `incidente-vira-checagem` |
| Configuração em painel externo | `guiar-usuario-em-paineis` |
| Configurar o agente, instalar MCP ou skill, ler conteúdo de terceiros | `uso-seguro-de-agentes` |

## Nunca sem pedido explícito

Deploy, push, publicação, exclusão de dados, mudança de permissão, qualquer ação em
produção, qualquer gasto.

## Onde ficam as coisas

- Decisões técnicas: `docs/adr/`
- Memória do projeto para agentes: `.memoria/`
- Procedimentos operacionais e painéis: `docs/runbooks/`
