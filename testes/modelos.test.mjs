import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Regressão dos modelos que o agente copia para o projeto do usuário: um defeito aqui se
// repete em cada projeto que usa o modelo.

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTA_WORKFLOWS = path.join(RAIZ, 'skills', 'esteira-ci-cd', 'assets', 'github-actions');

const temBash = spawnSync('bash', ['--version']).status === 0;
const python = ['python3', 'python'].find((p) => spawnSync(p, ['--version']).status === 0);

// Senhas de teste geradas em tempo de execução: uma URL com senha fixa no repositório
// dispararia os scanners de segredo (os deste kit e os da hospedagem).
const aleatorio = (n, alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') =>
  Array.from({ length: n }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('');

const linhasDe = (texto) => texto.split(/\r?\n/);
const recuo = (linha) => linha.match(/^ */)[0].length;

const modelos = readdirSync(PASTA_WORKFLOWS)
  .filter((nome) => nome.endsWith('.yml'))
  .sort()
  .map((nome) => ({ nome, texto: readFileSync(path.join(PASTA_WORKFLOWS, nome), 'utf8') }));
const modelo = (nome) => modelos.find((m) => m.nome === nome).texto;

/**
 * Cada chave `run:` de um workflow, com o valor da própria linha e, se for bloco `|`/`>`, as
 * linhas do bloco — o texto que o runner entrega ao shell. Lido por recuo: o kit não tem
 * dependências, então não há parser de YAML, e os modelos só usam essas duas formas.
 */
function comandosRun(texto) {
  const linhas = linhasDe(texto);
  const runs = [];
  linhas.forEach((linha, i) => {
    const m = linha.match(/^(\s*(?:-\s+)?)run:\s*(.*)$/);
    if (!m) return;
    const coluna = m[1].length;
    const bloco = [];
    if (/^[|>][+-]?\s*(#.*)?$/.test(m[2])) {
      for (let j = i + 1; j < linhas.length && (linhas[j].trim() === '' || recuo(linhas[j]) > coluna); j++) bloco.push(linhas[j]);
    }
    runs.push({ linha: i + 1, valor: m[2], bloco });
  });
  return runs;
}

/** Tira o recuo comum das linhas de um bloco, como o YAML faz ao entregar o texto. */
function semRecuoComum(linhas) {
  const minimo = Math.min(...linhas.filter((l) => l.trim()).map(recuo));
  return linhas.map((l) => l.slice(minimo)).join('\n');
}

/** Linhas do passo (item "- " de uma lista) que contém a linha `i`. */
function passoDaLinha(linhas, i) {
  let inicio = i;
  while (inicio > 0 && !(/^\s*-\s/.test(linhas[inicio]) && recuo(linhas[inicio]) <= recuo(linhas[i]))) inicio--;
  const recuoDoItem = recuo(linhas[inicio]);
  let fim = inicio + 1;
  while (fim < linhas.length && (linhas[fim].trim() === '' || recuo(linhas[fim]) > recuoDoItem)) fim++;
  return linhas.slice(inicio, fim);
}

/** Bloco `permissions:` do nível do workflow (sem recuo), ou null. */
function permissoesDoWorkflow(texto) {
  const linhas = linhasDe(texto);
  const inicio = linhas.findIndex((l) => /^permissions:/.test(l));
  if (inicio < 0) return null;
  let fim = inicio + 1;
  while (fim < linhas.length && (linhas[fim].trim() === '' || /^\s/.test(linhas[fim]))) fim++;
  return linhas.slice(inicio, fim).join('\n');
}

/** Jobs do workflow: o nome e as linhas de cada um (chaves com dois espaços sob `jobs:`). */
function blocosDeJob(texto) {
  const linhas = linhasDe(texto);
  const jobs = [];
  for (const linha of linhas.slice(linhas.findIndex((l) => /^jobs:\s*$/.test(l)) + 1)) {
    const m = linha.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (m) jobs.push({ nome: m[1], linhas: [] });
    else if (jobs.length) jobs.at(-1).linhas.push(linha);
  }
  return jobs;
}

describe('modelos de workflow (esteira-ci-cd)', () => {
  const workflows = modelos.filter(({ texto }) => /^jobs:/m.test(texto));

  it('todo checkout desliga persist-credentials no próprio passo', () => {
    let checkouts = 0;
    for (const { nome, texto } of workflows) {
      const linhas = linhasDe(texto);
      linhas.forEach((linha, i) => {
        if (!/^\s*(-\s+)?uses:\s*actions\/checkout@/.test(linha)) return;
        checkouts++;
        const passo = passoDaLinha(linhas, i);
        assert.ok(
          passo.some((l) => /^\s*persist-credentials:\s*false\b/.test(l)),
          `${nome}, linha ${i + 1}: checkout sem "persist-credentials: false" deixa o token no git para os passos seguintes`,
        );
      });
    }
    assert.ok(checkouts > 0, 'nenhum checkout encontrado: o teste não está lendo os modelos');
  });

  it('nenhum run: põe expressão ${{ }} direto no script', () => {
    const runs = workflows.flatMap(({ nome, texto }) => comandosRun(texto).map((r) => ({ nome, ...r })));
    assert.ok(runs.length > 0, 'nenhum run: encontrado: o teste não está lendo os modelos');
    for (const { nome, linha, valor, bloco } of runs) {
      assert.ok(!`${valor}\n${bloco.join('\n')}`.includes('${{'), `${nome}, linha ${linha}: passe o valor por env: e use a variável entre aspas`);
    }
  });

  it('nenhum modelo cancela run em andamento de forma incondicional', () => {
    for (const { nome, texto } of workflows) {
      assert.doesNotMatch(texto, /^\s*cancel-in-progress:\s*true\s*(#.*)?$/m, `${nome}: cancel-in-progress: true interrompe migração ou deploy pela metade`);
    }
  });

  it('o CI modelo só cancela run em andamento em PR, nunca no push que publica a homologação', () => {
    const m = modelo('ci.modelo.yml').match(/^\s*cancel-in-progress:\s*(.+?)\s*$/m);
    assert.ok(m, 'cancel-in-progress ausente no CI modelo');
    assert.equal(m[1], "${{ github.event_name == 'pull_request' }}");
  });

  it('o workflow só lê; escrita só no job que cria a release, leitura de runs só na trava', () => {
    for (const { nome, texto } of workflows) {
      const topo = permissoesDoWorkflow(texto);
      assert.ok(topo, `${nome}: sem permissions: no nível do workflow`);
      assert.doesNotMatch(topo, /write|actions:/, `${nome}: permissão elevada no nível do workflow vale para todos os jobs`);
      for (const job of blocosDeJob(texto)) {
        const corpo = job.linhas.join('\n');
        assert.equal(
          /^\s*contents:\s*write\b/m.test(corpo),
          corpo.includes('gh release create'),
          `${nome}, job ${job.nome}: "contents: write" só no job que cria a release`,
        );
      }
    }
    const trava = blocosDeJob(modelo('release-promocao.modelo.yml')).find((j) => j.nome === 'homologacao');
    assert.match(trava.linhas.join('\n'), /^\s*actions:\s*read\b/m, 'a trava consulta os runs do CI: sem "actions: read" a API responde 403');
  });

  it('a release em tronco só roda para CI de push: PR de fork também dispara o workflow_run', () => {
    const [release] = blocosDeJob(modelo('release-tronco.modelo.yml'));
    const condicao = release.linhas.find((l) => /^ {4}if:/.test(l)) ?? ''; // o if: do job, não de um passo
    assert.match(condicao, /github\.event\.workflow_run\.event == 'push'/);
    assert.match(condicao, /github\.event\.workflow_run\.conclusion == 'success'/);
  });
});

describe('trava de promoção (release-promocao.modelo.yml)', () => {
  const texto = modelo('release-promocao.modelo.yml');
  const passoDaTrava = comandosRun(texto).find((r) => r.bloco.some((l) => l.includes('HEAD^2')));

  it('confere, além do CI verde, que a árvore publicada é a homologada', () => {
    assert.ok(passoDaTrava, 'passo da trava (o que lê o segundo pai do merge) não encontrado');
    assert.match(semRecuoComum(passoDaTrava.bloco), /git diff --quiet "\$SHA" HEAD/);
  });

  describe('executada num repositório de teste', { skip: !temBash && 'bash indisponível' }, () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'trava-promocao-'));
    const repo = path.join(dir, 'repo');
    const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
    const commitar = (arquivo, mensagem) => {
      writeFileSync(path.join(repo, arquivo), `${mensagem}\n`);
      git('add', arquivo);
      git('commit', '-q', '-m', mensagem);
      return git('rev-parse', 'HEAD');
    };
    const mesclar = (origem) => git('merge', '-q', '--no-ff', '-m', `Merge ${origem}`, origem);

    // A API do GitHub é simulada por uma função de shell com o nome do comando: responde
    // "success" só para os commits que tiveram CI verde na staging.
    const arquivoScript = path.join(dir, 'trava.sh');
    writeFileSync(
      arquivoScript,
      [
        'gh() {',
        '  for verde in $SHAS_VERDES; do',
        '    case "$*" in *"head_sha=$verde"*) printf success; return 0 ;; esac',
        '  done',
        '}',
        semRecuoComum(passoDaTrava?.bloco ?? ['exit 2']),
        '',
      ].join('\n'),
    );
    const rodarTrava = (verdes) =>
      spawnSync('bash', [arquivoScript], {
        cwd: repo,
        encoding: 'utf8',
        env: { ...process.env, REPO: 'exemplo/app', GH_TOKEN: 'falso', SHAS_VERDES: verdes.join(' ') },
      });

    execFileSync('git', ['init', '-q', repo]);
    git('symbolic-ref', 'HEAD', 'refs/heads/main');
    git('config', 'user.email', 'teste@exemplo.com');
    git('config', 'user.name', 'teste');
    git('config', 'commit.gpgsign', 'false');
    git('config', 'core.autocrlf', 'false');
    commitar('app.txt', 'feat: versão inicial');
    git('checkout', '-q', '-b', 'staging');
    const verdes = [commitar('app.txt', 'feat: funcionalidade homologada')];

    it('promoção normal (merge da staging homologada) passa', () => {
      git('checkout', '-q', 'main');
      mesclar('staging');
      const r = rodarTrava(verdes);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /Homologação confirmada/);
    });

    it('push direto na main é barrado como "não homologado", não como "não consegui verificar"', () => {
      commitar('fora-da-staging.txt', 'fix: push direto na main');
      const r = rodarTrava(verdes);
      assert.equal(r.status, 1);
      // Sem segundo pai, o candidato é o próprio HEAD, e o SHA consultado é um só.
      assert.match(r.stdout, /Commit a promover: [0-9a-f]{40}\n/);
      assert.match(r.stdout, /Nenhum run concluído/);
    });

    it('a promoção seguinte não leva de carona o commit que entrou direto na main', () => {
      git('checkout', '-q', 'staging');
      verdes.push(commitar('app.txt', 'feat: outra funcionalidade homologada'));
      git('checkout', '-q', 'main');
      mesclar('staging');
      const r = rodarTrava(verdes);
      assert.equal(r.status, 1, 'a trava liberou uma árvore com arquivo que nunca passou pela staging');
      assert.match(r.stdout, /difere da homologada/);
      assert.match(r.stdout, /fora-da-staging\.txt/);
    });

    it('depois de levar a mudança pela staging, a promoção volta a passar', () => {
      git('checkout', '-q', 'staging');
      mesclar('main');
      verdes.push(git('rev-parse', 'HEAD'));
      git('checkout', '-q', 'main');
      mesclar('staging');
      const r = rodarTrava(verdes);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /Árvore publicada idêntica à homologada/);
    });
  });
});

describe('trava de ambiente (isolamento-de-ambientes)', () => {
  const skill = readFileSync(path.join(RAIZ, 'skills', 'isolamento-de-ambientes', 'SKILL.md'), 'utf8');
  const secao = skill.split(/^## /m).find((s) => s.startsWith('Trava de ambiente (modelo)')) ?? '';
  const HOST = 'homolog.exemplo.test';
  const dir = mkdtempSync(path.join(tmpdir(), 'trava-ambiente-'));
  const senha = `s${aleatorio(23)}`;
  const urlDoBanco = (host) => `postgres://usuario:${senha}@${host}:5432/app`;
  const semSenha = (texto) => String(texto).replaceAll(senha, '***');

  /** Grava o bloco de código da seção, com os marcadores trocados pelo host de teste. */
  function prepararModelo(linguagem, extensao, sinalDeLiberado) {
    const bloco = secao.match(new RegExp('```' + linguagem + '\\r?\\n([\\s\\S]*?)```'))?.[1];
    assert.ok(bloco, `bloco ${linguagem} da seção "Trava de ambiente (modelo)" não encontrado`);
    const arquivo = path.join(dir, `trava.${extensao}`);
    writeFileSync(arquivo, `${bloco.replace(/<[a-z0-9-]+>/g, HOST)}\n${sinalDeLiberado}\n`);
    return arquivo;
  }

  function rodar(comando, arquivo, url) {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    delete env.API_URL;
    if (url !== undefined) env.DATABASE_URL = url;
    const r = spawnSync(comando, [arquivo], { env, encoding: 'utf8' });
    return { ...r, saida: `${r.stdout}${r.stderr}` };
  }

  describe('modelo Node.js', () => {
    const arquivo = prepararModelo('javascript', 'mjs', "console.log('TRAVA-LIBEROU');");
    const node = (url) => rodar(process.execPath, arquivo, url);

    it('host diferente: aborta com saída 1, mostra só o host e não vaza a senha', () => {
      const r = node(urlDoBanco('producao.exemplo.test'));
      assert.equal(r.status, 1);
      assert.ok(!r.saida.includes(senha), `a senha apareceu na saída: ${semSenha(r.saida)}`);
      assert.match(r.stderr, /producao\.exemplo\.test/);
      assert.doesNotMatch(r.stdout, /TRAVA-LIBEROU/);
    });

    it('domínio que só começa igual ao permitido é barrado', () => {
      const r = node(`https://${HOST}.outro-dominio.test/api`);
      assert.equal(r.status, 1);
      assert.doesNotMatch(r.stdout, /TRAVA-LIBEROU/);
    });

    it('URL ausente ou inválida aborta sem mostrar o valor', () => {
      assert.equal(node(undefined).status, 1);
      const r = node(`postgres://usuario:${senha}`); // sem host
      assert.equal(r.status, 1);
      assert.ok(!r.saida.includes(senha), `a senha apareceu na saída: ${semSenha(r.saida)}`);
      assert.match(r.stderr, /vazio ou inválido/);
    });

    it('host permitido passa, mesmo escrito em maiúsculas na URL', () => {
      for (const host of [HOST, HOST.toUpperCase()]) {
        const r = node(urlDoBanco(host));
        assert.equal(r.status, 0, semSenha(r.saida));
        assert.match(r.stdout, /TRAVA-LIBEROU/);
        assert.ok(!r.saida.includes(senha));
      }
    });
  });

  describe('modelo Python', { skip: !python && 'Python indisponível' }, () => {
    const arquivo = prepararModelo('python', 'py', "print('TRAVA-LIBEROU')");
    const py = (url) => rodar(python, arquivo, url);

    it('host diferente, domínio parecido, URL ausente ou sem host: aborta sem vazar a senha', () => {
      for (const url of [urlDoBanco('producao.exemplo.test'), `https://${HOST}.outro-dominio.test/api`, undefined, `postgres://usuario:${senha}`]) {
        const r = py(url);
        assert.equal(r.status, 1, `deveria abortar com ${semSenha(url)}: ${semSenha(r.saida)}`);
        assert.ok(!r.saida.includes(senha), `a senha apareceu na saída: ${semSenha(r.saida)}`);
        assert.doesNotMatch(r.stdout, /TRAVA-LIBEROU/);
      }
    });

    it('host permitido passa', () => {
      const r = py(urlDoBanco(HOST));
      assert.equal(r.status, 0, semSenha(r.saida));
      assert.match(r.stdout, /TRAVA-LIBEROU/);
    });
  });
});
