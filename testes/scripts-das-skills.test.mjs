import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { verificar } from '../skills/headers-de-seguranca/scripts/verificar-headers.mjs';
import { varrer } from '../skills/segredos-e-credenciais/scripts/verificar-segredos.mjs';
import { criarLinkDePasta } from './links.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_SEGREDOS = path.join(RAIZ, 'skills', 'segredos-e-credenciais', 'scripts', 'verificar-segredos.mjs');
const SCRIPT_VERSAO = path.join(RAIZ, 'skills', 'esteira-ci-cd', 'scripts', 'proxima-versao.sh');

/** Link para a pasta da skill numa pasta temporária, como o `npx skills` instala. */
function ligarSkill(nome) {
  const link = path.join(mkdtempSync(path.join(tmpdir(), 'link-')), nome);
  return { link, motivo: criarLinkDePasta(path.join(RAIZ, 'skills', nome), link) };
}

/** Roda o Node em outro processo sem bloquear este (o servidor HTTP dos testes precisa responder). */
function rodarNode(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, args, { encoding: 'utf8' }, (erro, stdout, stderr) => {
      resolve({ status: erro ? erro.code : 0, stdout, stderr });
    });
  });
}

// Segredos falsos gerados em tempo de execução: um token no formato real gravado no
// repositório dispararia os próprios scanners e o bloqueio de push da hospedagem.
const aleatorio = (n, alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') =>
  Array.from({ length: n }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('');
const juntar = (...partes) => partes.join('');

describe('verificar-segredos', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'segredos-'));
  const tokenGithub = juntar('gh', 'p_', aleatorio(36));
  writeFileSync(
    path.join(dir, 'app.js'),
    [
      'const url = process.env.DATABASE_URL;',
      juntar("const chave = process.env.PAGAMENTO_API_KEY || '", aleatorio(32), "';"),
      "const publica = process.env.NEXT_PUBLIC_SITE_KEY || 'abcdefghijklmnopqrst';",
      juntar("const gh = '", tokenGithub, "';"),
      juntar("const doc = 'AK", "IAIOSFODNN7EXAMPLE';"),
      "const local = 'postgres://postgres:postgres@localhost:5432/app';",
      juntar("const aceito = '", juntar('gh', 'p_', aleatorio(36)), "'; // verificar-segredos: ignorar (teste)"),
    ].join('\n'),
  );
  writeFileSync(path.join(dir, 'config.py'), juntar("import os\nSECRET_KEY = os.getenv('DJANGO_SECRET_KEY', '", aleatorio(30), "')\n"));
  writeFileSync(path.join(dir, 'chave.txt'), juntar('-----BEGIN ', 'PRIVATE KEY', '-----\nabc\n'));
  // Montado em partes para este arquivo de teste não casar com a própria regra.
  writeFileSync(path.join(dir, 'README.md'), juntar('Evite `process.env.API_KEY', " || 'valor-qualquer-aqui'` no código.\n"));
  writeFileSync(path.join(dir, '.env.example'), 'API_TOKEN=<seu-token-aqui>\n');

  it('encontra os segredos plantados e ignora marcadores, públicos, exemplos e documentação', () => {
    const { achados } = varrer(dir, { usarGit: false });
    const regras = achados.map((a) => `${a.arquivo}:${a.regra}`).sort();
    assert.deepEqual(regras, [
      'app.js:github-token',
      'app.js:valor-padrao-de-credencial',
      'chave.txt:chave-privada',
      'config.py:valor-padrao-de-credencial',
    ]);
  });

  it('nunca imprime o segredo inteiro', () => {
    const r = spawnSync(process.execPath, [SCRIPT_SEGREDOS, dir, '--todos', '--json'], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.ok(!r.stdout.includes(tokenGithub));
  });

  it('chamado por um caminho com link (como o npx skills instala), varre e acusa', (t) => {
    const { link, motivo } = ligarSkill('segredos-e-credenciais');
    if (motivo) return t.skip(motivo);
    const r = spawnSync(process.execPath, [path.join(link, 'scripts', 'verificar-segredos.mjs'), dir, '--todos', '--json'], { encoding: 'utf8' });
    assert.equal(r.status, 1, `saída ${r.status}; stdout: "${r.stdout}"; stderr: "${r.stderr}"`);
    assert.ok(JSON.parse(r.stdout).achados.some((a) => a.regra === 'github-token'));
  });

  it('no modo git, acusa .env versionado', () => {
    const repo = mkdtempSync(path.join(tmpdir(), 'segredos-git-'));
    writeFileSync(path.join(repo, '.env'), 'NADA=1\n');
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('git', ['add', '.env'], { cwd: repo });
    const { achados } = varrer(repo);
    assert.ok(achados.some((a) => a.regra === 'arquivo-env-versionado'));
  });

  it('o próprio repositório do kit está limpo', () => {
    const { achados } = varrer(RAIZ, { usarGit: false });
    assert.deepEqual(achados, []);
  });

  it('pasta sem git e sem --todos sai com código 2 e explica', () => {
    const vazia = mkdtempSync(path.join(tmpdir(), 'sem-git-'));
    const r = spawnSync(process.execPath, [SCRIPT_SEGREDOS, vazia], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--todos/);
  });
});

describe('verificar-headers', () => {
  let servidor;
  let base;
  before(async () => {
    servidor = http.createServer((req, res) => {
      if (req.url === '/bom') {
        res.writeHead(200, {
          'content-security-policy': "default-src 'none'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'strict-origin-when-cross-origin',
          'permissions-policy': 'camera=()',
          'set-cookie': 'sessao=valor-secreto; HttpOnly; SameSite=Lax',
        });
      } else {
        res.writeHead(200, {
          'x-powered-by': 'Express',
          'content-security-policy': "script-src 'self' 'unsafe-inline' 'sha256-abc='",
          'access-control-allow-origin': '*',
          'access-control-allow-credentials': 'true',
          'set-cookie': 'sessao=valor-secreto',
        });
      }
      res.end('ok');
    });
    await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${servidor.address().port}`;
  });
  after(() => servidor.close());

  it('configuração boa não tem erros nem avisos', async () => {
    const r = await verificar(`${base}/bom`);
    assert.equal(r.resumo.erros, 0);
    assert.equal(r.resumo.avisos, 0);
  });

  it('configuração ruim aponta clickjacking, nosniff, CORS e o efeito do hash sobre unsafe-inline', async () => {
    const r = await verificar(`${base}/ruim`);
    const por = (h) => r.resultados.filter((x) => x.header === h).map((x) => x.nivel);
    assert.ok(por('csp frame-ancestors').includes('erro'));
    assert.ok(por('x-content-type-options').includes('erro'));
    assert.ok(por('cors').includes('erro'));
    assert.ok(r.resultados.some((x) => x.header === 'csp script-src' && x.mensagem.includes('ignoram')));
    assert.ok(por('x-powered-by').includes('aviso'));
  });

  it('não expõe o valor dos cookies', async () => {
    const r = await verificar(`${base}/ruim`);
    assert.ok(!JSON.stringify(r).includes('valor-secreto'));
  });

  it('chamado por um caminho com link (como o npx skills instala), audita e acusa', async (t) => {
    const { link, motivo } = ligarSkill('headers-de-seguranca');
    if (motivo) return t.skip(motivo);
    const r = await rodarNode([path.join(link, 'scripts', 'verificar-headers.mjs'), `${base}/ruim`, '--json']);
    assert.equal(r.status, 1, `saída ${r.status}; stdout: "${r.stdout}"; stderr: "${r.stderr}"`);
    assert.ok(JSON.parse(r.stdout).resumo.erros > 0);
  });
});

describe('proxima-versao.sh', { skip: spawnSync('bash', ['--version']).status !== 0 && 'bash indisponível' }, () => {
  const repo = mkdtempSync(path.join(tmpdir(), 'versao-'));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
  const commit = (msg) => git('commit', '-q', '--allow-empty', '-m', msg);
  const calcular = () =>
    Object.fromEntries(
      execFileSync('bash', [SCRIPT_VERSAO], { cwd: repo, encoding: 'utf8' })
        .trim()
        .split('\n')
        .map((l) => l.split('=')),
    );
  git('init', '-q');
  git('config', 'user.email', 'teste@exemplo.com');
  git('config', 'user.name', 'teste');

  it('só docs sem tag: nenhuma versão', () => {
    commit('docs: readme');
    assert.deepEqual(calcular(), { ultima: '', nivel: 'nenhum', proxima: '' });
  });

  it('primeira feat: versão inicial', () => {
    commit('feat: primeira funcionalidade');
    assert.equal(calcular().proxima, 'v1.0.0');
  });

  it('fix após tag: patch; feat: minor; breaking no corpo: major', () => {
    git('tag', 'v1.0.0');
    commit('fix(api): corrige');
    assert.equal(calcular().proxima, 'v1.0.1');
    commit('feat(ui): nova tela');
    assert.equal(calcular().proxima, 'v1.1.0');
    git('commit', '-q', '--allow-empty', '-m', 'refactor: remove rota', '-m', 'BREAKING CHANGE: a rota /v1 saiu');
    assert.equal(calcular().proxima, 'v2.0.0');
  });

  it('só chore/docs depois da tag: nenhuma versão', () => {
    git('tag', 'v2.0.0');
    commit('chore: atualiza dependências de desenvolvimento');
    commit('docs: ajusta guia');
    assert.equal(calcular().nivel, 'nenhum');
  });

  it('o workflow de release do repositório usa o mesmo script da skill', () => {
    const copia = readFileSync(path.join(RAIZ, '.github', 'scripts', 'proxima-versao.sh'), 'utf8');
    assert.equal(copia, readFileSync(SCRIPT_VERSAO, 'utf8'));
  });
});
