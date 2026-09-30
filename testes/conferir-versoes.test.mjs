import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { conferirVersoes, NaoConsegui } from '../ferramentas/conferir-versoes.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(RAIZ, 'ferramentas', 'conferir-versoes.mjs');

/** Repositório git temporário com a branch main e identidade local (sem assinatura de commit). */
function criarRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'versoes-'));
  const git = (...args) => execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], { cwd: dir, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'teste@exemplo.com');
  git('config', 'user.name', 'teste');
  const commit = (mensagem) => {
    git('add', '-A');
    git('commit', '-q', '-m', mensagem);
  };
  return { dir, git, commit };
}

function escreverSkill(dir, nome, versao, corpo = '# Corpo\n') {
  mkdirSync(path.join(dir, 'skills', nome, 'evals'), { recursive: true });
  const metadata = versao === undefined ? '' : `\nmetadata:\n  versao: "${versao}"`;
  writeFileSync(path.join(dir, 'skills', nome, 'SKILL.md'), `---\nname: ${nome}\ndescription: Use sempre.${metadata}\n---\n${corpo}`);
}

/** Base com duas skills na main e uma branch de trabalho aberta a partir dela. */
function repoComBase() {
  const r = criarRepo();
  escreverSkill(r.dir, 'alfa', '1.0.0');
  escreverSkill(r.dir, 'beta', '1.9.0');
  writeFileSync(path.join(r.dir, 'skills', 'alfa', 'evals', 'evals.json'), '{}\n');
  r.commit('feat: base');
  r.git('switch', '-q', '-c', 'trabalho');
  return r;
}

const situacao = (resultado, nome) => resultado.skills.find((s) => s.skill === nome)?.situacao;
const rodarCli = (cwd, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });

describe('conferir-versoes', () => {
  it('sem mudança em skills/: nada a conferir, saída 0', () => {
    const r = repoComBase();
    writeFileSync(path.join(r.dir, 'README.md'), 'sem skill\n');
    r.commit('docs: readme');
    assert.deepEqual(conferirVersoes({ base: 'main', cwd: r.dir }).skills, []);
    assert.equal(rodarCli(r.dir, '--base', 'main').status, 0);
  });

  it('skill alterada sem subir a versão é violação, saída 1', () => {
    const r = repoComBase();
    escreverSkill(r.dir, 'alfa', '1.0.0', '# Corpo mudado\n');
    r.commit('fix: muda alfa');
    const resultado = conferirVersoes({ base: 'main', cwd: r.dir });
    assert.equal(situacao(resultado, 'alfa'), 'nao-subiu');
    assert.equal(resultado.violacoes, 1);
    const cli = rodarCli(r.dir, '--base', 'main');
    assert.equal(cli.status, 1);
    assert.match(cli.stdout, /alfa: metadata\.versao não subiu/);
  });

  it('versão menor que a da base é violação', () => {
    const r = repoComBase();
    escreverSkill(r.dir, 'beta', '1.8.9', '# Corpo mudado\n');
    r.commit('fix: muda beta');
    assert.equal(situacao(conferirVersoes({ base: 'main', cwd: r.dir }), 'beta'), 'versao-menor');
  });

  it('versão que subiu passa, comparando números e não texto (1.9.0 → 1.10.0)', () => {
    const r = repoComBase();
    escreverSkill(r.dir, 'alfa', '1.0.1', '# Corpo mudado\n');
    escreverSkill(r.dir, 'beta', '1.10.0', '# Corpo mudado\n');
    r.commit('feat: muda as duas');
    const resultado = conferirVersoes({ base: 'main', cwd: r.dir });
    assert.equal(situacao(resultado, 'alfa'), 'subiu');
    assert.equal(situacao(resultado, 'beta'), 'subiu');
    assert.equal(resultado.violacoes, 0);
    assert.equal(rodarCli(r.dir, '--base', 'main').status, 0);
  });

  it('mudança só em evals/ não exige versão nova', () => {
    const r = repoComBase();
    writeFileSync(path.join(r.dir, 'skills', 'alfa', 'evals', 'evals.json'), '{"mudou": true}\n');
    r.commit('test: evals de alfa');
    const resultado = conferirVersoes({ base: 'main', cwd: r.dir });
    assert.equal(situacao(resultado, 'alfa'), 'so-evals');
    assert.equal(resultado.violacoes, 0);
  });

  it('skill nova precisa de versão X.Y.Z; skill apagada é ignorada', () => {
    const r = repoComBase();
    escreverSkill(r.dir, 'gama', '1.0.0');
    escreverSkill(r.dir, 'delta', undefined);
    rmSync(path.join(r.dir, 'skills', 'beta'), { recursive: true });
    r.commit('feat: gama, delta e sem beta');
    const resultado = conferirVersoes({ base: 'main', cwd: r.dir });
    assert.equal(situacao(resultado, 'gama'), 'nova');
    assert.equal(situacao(resultado, 'delta'), 'versao-invalida');
    assert.equal(situacao(resultado, 'beta'), 'apagada');
    assert.equal(resultado.violacoes, 1);
  });

  it('mudança ainda não commitada não entra na conta', () => {
    const r = repoComBase();
    escreverSkill(r.dir, 'alfa', '1.0.0', '# Rascunho não commitado\n');
    assert.deepEqual(conferirVersoes({ base: 'main', cwd: r.dir }).skills, []);
  });

  it('não consegui verificar (saída 2) nunca vira 0 nem 1', () => {
    const r = repoComBase();
    assert.throws(() => conferirVersoes({ base: 'nao-existe', cwd: r.dir }), NaoConsegui);
    const semBase = rodarCli(r.dir, '--base', 'nao-existe');
    assert.equal(semBase.status, 2);
    assert.match(semBase.stderr, /não consegui verificar/);
    assert.equal(rodarCli(r.dir, '--base', '--json').status, 2, 'referência começando com "-" seria lida como opção do git');
    assert.equal(rodarCli(r.dir, '--opcao-inventada').status, 2);
    const foraDeRepo = mkdtempSync(path.join(tmpdir(), 'sem-git-'));
    assert.equal(rodarCli(foraDeRepo, '--base', 'main').status, 2);
  });

  it('--json devolve o resultado estruturado e --help documenta as saídas', () => {
    const r = repoComBase();
    escreverSkill(r.dir, 'alfa', '1.1.0', '# Corpo mudado\n');
    r.commit('feat: muda alfa');
    const json = JSON.parse(rodarCli(r.dir, '--base', 'main', '--json').stdout);
    assert.equal(json.base, 'main');
    assert.deepEqual(
      json.skills.map((s) => [s.skill, s.situacao, s.versaoBase, s.versaoAtual]),
      [['alfa', 'subiu', '1.0.0', '1.1.0']],
    );
    const ajuda = rodarCli(RAIZ, '--help');
    assert.equal(ajuda.status, 0);
    assert.match(ajuda.stdout, /Código de saída: 0 ok; 1 .*; 2/s);
  });
});
