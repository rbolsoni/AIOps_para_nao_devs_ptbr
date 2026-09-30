---
name: isolamento-de-ambientes
description: >-
  Use ao configurar ou usar ambientes (local, homologação, produção), variáveis de
  ambiente, bancos de teste, seeds e dados fictícios, e antes de rodar script, teste,
  migração ou importação que possa tocar dados reais. Garante que nada de teste aponte
  para produção.
license: MIT
metadata:
  categoria: projeto-e-entrega
  versao: "1.0.2"
---

# Isolamento de ambientes

Produção tem dados de pessoas reais e dinheiro real. Um teste que roda contra produção uma
única vez pode apagar, duplicar ou expor esses dados. O isolamento não depende de cuidado:
depende de ser **impossível** errar de ambiente por acidente.

## Os ambientes

| | Desenvolvimento | Homologação (QA/staging) | Produção |
|---|---|---|---|
| Para quê | escrever e testar código | provar que a versão funciona antes de ir ao ar | atender usuários reais |
| Dados | fictícios (local ou de homologação) | fictícios, vindos de seed versionado | reais |
| Quem altera | a pessoa, na própria máquina | **a esteira**, no merge na branch de homologação | **somente a esteira**, na release |
| Credenciais | de desenvolvimento/homologação | environment de homologação na esteira | environment de produção na esteira |

Cada ambiente é um **projeto separado** no provedor (banco, autenticação, storage), com URL
e chaves próprias. Esquema ou prefixo diferente dentro do mesmo projeto não é isolamento.

## Regras

1. **Desenvolvimento e testes nunca apontam para produção.** O `.env` local usa o banco
   local ou o de homologação. Chaves de produção não ficam na máquina de ninguém.
2. **Trava de ambiente em todo script que escreve dados.** Antes de escrever, o script
   confere que o alvo é o esperado e aborta se não for (modelo abaixo). Não confie na
   variável "certa" estar carregada.
3. **Produção muda só pela esteira.** Nada de SQL no painel, ajuste manual de
   configuração ou "só dessa vez". Mudança manual vira divergência invisível entre
   ambientes — detecte com uma checagem agendada de drift (esquema de homologação × produção
   × migrações do repositório).
4. **Seed só em homologação e desenvolvimento**, versionado em pasta própria
   (ex.: `seeds/homologacao/`), com dados claramente fictícios. Nunca roda em produção.
5. **Dado de produção não desce para teste** sem anonimização irreversível (veja
   `privacidade-e-lgpd`). Prefira gerar dados fictícios.
6. **Diga sempre de qual ambiente veio a observação.** "Os registros estão zerados" não
   serve; "os registros estão zerados na homologação, consultando a tabela X" serve. Os dados
   dos ambientes são diferentes, e uma conclusão de um não vale para o outro.
7. **Ferramentas de inspeção com acesso de leitura.** Conectores de banco para agentes de
   IA, dashboards e consoles usam credencial somente leitura sempre que possível. Escrita
   exige pedido explícito do usuário e a trava de ambiente.
8. **Desligue integrações que pulam a esteira**: sincronizações automáticas entre
   plataformas que aplicam migração, publicam deploy ou copiam configuração para produção
   ao detectar um merge.

## Trava de ambiente (modelo)

Coloque no início de qualquer script que escreve dados, com os hosts permitidos escritos no
próprio script (não vindos do mesmo `.env` que pode estar errado). A trava extrai o host da
URL e o compara com a lista exata. Ao abortar, mostra só o host: a URL do banco carrega a
senha, e a mensagem vai para o terminal, para o log da esteira e para a conversa com a IA.

```javascript
// Node.js — troque DATABASE_URL pela variável que o script usa para escrever.
const HOSTS_PERMITIDOS = ['<host-da-homologacao>']; // em minúsculas
let host = '';
try {
  host = new URL(process.env.DATABASE_URL).hostname.toLowerCase();
} catch {
  // Ausente ou inválida: host fica vazio e a trava aborta, sem mostrar o valor.
}
if (!HOSTS_PERMITIDOS.includes(host)) {
  console.error(`Abortado: o host "${host || 'vazio ou inválido'}" não é um ambiente permitido para escrita.`);
  process.exit(1);
}
```

```python
# Python — troque DATABASE_URL pela variável que o script usa para escrever.
import os
import sys
from urllib.parse import urlsplit

HOSTS_PERMITIDOS = {"<host-da-homologacao>"}  # em minúsculas
try:
    host = urlsplit(os.environ.get("DATABASE_URL", "")).hostname or ""
except ValueError:  # URL inválida: aborta sem mostrar o valor
    host = ""
if host not in HOSTS_PERMITIDOS:
    mostrado = host or "vazio ou inválido"
    sys.exit(f'Abortado: o host "{mostrado}" não é um ambiente permitido para escrita.')
```

Para comandos destrutivos, exija também uma confirmação explícita por argumento
(`--confirmo-ambiente=homologacao`).

## Variáveis de ambiente

- Toda variável lida pelo código está no `.env.example`, com marcador e comentário.
- **Público × segredo**: variáveis com prefixo que o framework envia ao navegador
  (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `EXPO_PUBLIC_`, `REACT_APP_`) **não são segredo** —
  qualquer visitante as lê. Na esteira podem ficar como *variables*, não *secrets*. Nunca
  coloque uma chave secreta com esses prefixos.
- Chave de serviço/administração (que ignora as regras de acesso) nunca vai para o
  navegador nem para a máquina de quem não precisa.
- Configuração obrigatória ausente derruba a aplicação na inicialização com mensagem
  clara. Variável pública ausente no build pode cair num valor inofensivo (ex.: projeto de
  demonstração), desde que isso seja visível.

## Checagem antes de agir

Antes de rodar migração, seed, importação, script de correção ou teste de integração:

- [ ] Qual é o ambiente alvo? Confirmei pelo host da URL, não pelo nome do arquivo.
- [ ] O script tem trava de ambiente?
- [ ] Existe backup/ponto de restauração, se o alvo tiver dados que importam?
- [ ] O usuário pediu explicitamente esta escrita?

## Armadilhas

- **Trava que imprime a URL inteira vaza a senha.** A URL do banco leva usuário e senha;
  uma mensagem de erro com ela expõe a senha no terminal, no log da esteira e na conversa
  com a IA. Mostre só o host.
- **Comparar o começo da URL** aceita domínio parecido
  (`https://homolog.exemplo.com.outro-dominio.net` começa com
  `https://homolog.exemplo.com`) e tropeça no esquema: diante de um prefixo `https://`, a
  URL do banco (`postgres://…`) nunca bate, e a trava barra sempre. Extraia o host e compare
  com a lista exata.
- **Seed que esconde bug.** Em homologação, datas e campos vinham preenchidos pelo seed; o
  fluxo real nunca os preenchia. Só a produção revelou. Teste o fluxo real de ponta a ponta
  em homologação, não só telas alimentadas pelo seed.
- **Conexão que só falha na esteira.** Strings de conexão diretas podem ser só IPv6, e os
  runners da esteira podem não ter IPv6. Use o pooler de conexões (IPv4) em scripts e CI; a
  mensagem de erro costuma falar em "restrições de rede" e engana.
- **Vincular a ferramenta local ao projeto remoto** (ex.: `link` de CLIs de banco) pode
  fazer comandos locais agirem no banco remoto. Prefira passar a URL explicitamente, com a
  trava.
- **Arquivo local com token de produção** usado por uma ferramenta de build: o build local
  passa a publicar coisas em produção. Revise os arquivos `.env*` que as ferramentas
  carregam sozinhas.
