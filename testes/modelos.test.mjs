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
