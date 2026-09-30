import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { diagnosticar, tabelasSemRls, variaveisPublicas } from '../skills/iniciar-projeto/scripts/diagnosticar-projeto.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(RAIZ, 'skills', 'iniciar-projeto', 'scripts', 'diagnosticar-projeto.mjs');

// Valor gerado em tempo de execução: nenhum segredo com formato real fica no repositório.
const aleatorio = (n) => Array.from({ length: n }, () => 'ABCDFGHJKLMNPQRSTUVWZabcdfghjkmnpqrstuvwz23456789'[Math.floor(Math.random() * 48)]).join('');

function projeto(arquivos, { git = false, versionar = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'diagnostico-'));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), conteudo);
  }
  if (git) {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    if (versionar.length) execFileSync('git', ['add', '--', ...versionar], { cwd: dir });
  }
  return dir;
}

const porNivel = (relatorio, nivel) => relatorio.resultados.filter((r) => r.nivel === nivel).map((r) => r.id).sort();
const rodar = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

describe('diagnosticar-projeto', () => {
  it('acusa os problemas típicos de app gerado por plataforma e sai com 1, sem imprimir segredo', () => {
    const segredo = aleatorio(32);
    const dir = projeto(
      {
        '.env': `CHAVE=${segredo}\n`,
        'package.json': JSON.stringify({ name: 'app', dependencies: { '@supabase/supabase-js': '2.0.0' } }),
        'supabase/migrations/001_inicio.sql': 'create table public.notas (id int);\ncreate table perfis (id int);\n',
        'supabase/migrations/002_rls.sql': '-- create table public.comentada (id int);\nalter table perfis enable row level security;\n',
        'src/app.ts': [
          'const ia = import.meta.env.VITE_OPENAI_API_KEY;',
          'const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;',
          'const mapa = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;',
        ].join('\n'),
        Dockerfile: 'FROM node:22\nCOPY . .\n',
      },
      { git: true, versionar: ['.env'] },
    );
    const relatorio = diagnosticar(dir);
    assert.deepEqual(porNivel(relatorio, 'erro'), ['chave-publica', 'docker', 'gitignore', 'rls', 'segredo-versionado']);
    const texto = JSON.stringify(relatorio);
    assert.match(texto, /VITE_OPENAI_API_KEY \(src\/app\.ts:1\)/);
    assert.match(texto, /VITE_GOOGLE_MAPS_API_KEY/);
    assert.doesNotMatch(texto, /VITE_SUPABASE_ANON_KEY/);
    assert.match(texto, /Row Level Security nas migrações: notas\./);

    const r = rodar(dir);
    assert.equal(r.status, 1);
    assert.ok(!r.stdout.includes(segredo) && !r.stderr.includes(segredo), 'o conteúdo do .env foi impresso');
    assert.match(r.stdout, /→ skill mudancas-de-banco/);
  });

  it('projeto com as proteções básicas não tem erro nem aviso', () => {
    const dir = projeto(
      {
        '.gitignore': 'node_modules/\n.env\n',
        '.env': `CHAVE=${aleatorio(24)}\n`,
        '.env.example': 'CHAVE=<sua-chave-aqui>\n',
        '.claude/settings.json': JSON.stringify({ permissions: { deny: ['Read(./.env)', 'Read(./.env.*)'] } }),
        'AGENTS.md': '# Regras\n',
        'README.md': '# App\n',
        'package.json': JSON.stringify({ name: 'app', scripts: { test: 'node --test' }, dependencies: { '@supabase/supabase-js': '2.0.0' } }),
        'package-lock.json': '{}',
        '.github/workflows/ci.yml': 'name: CI\n',
        '.github/dependabot.yml': 'version: 2\n',
        'supabase/migrations/001.sql': 'create table if not exists "public"."notas" (id int);',
        'supabase/migrations/002.sql': 'alter table only public.notas enable row level security;',
        Dockerfile: 'FROM node:22\nCOPY . .\n',
        '.dockerignore': '.git\n.env*\n',
      },
      { git: true },
    );
    const relatorio = diagnosticar(dir);
    assert.deepEqual(porNivel(relatorio, 'erro'), []);
    assert.deepEqual(porNivel(relatorio, 'aviso'), []);
    assert.equal(rodar(dir).status, 0);
  });

  it('fora de um repositório git avisa e continua conferindo pelo .gitignore', () => {
    const dir = projeto({ '.gitignore': '.env*\n', '.env': 'X=1\n', 'README.md': '# App\n' });
    const relatorio = diagnosticar(dir);
    const git = relatorio.resultados.find((r) => r.id === 'git');
    assert.equal(git.nivel, 'aviso');
    assert.equal(relatorio.resultados.find((r) => r.id === 'gitignore').nivel, 'ok');
    assert.ok(!relatorio.resultados.some((r) => r.id === 'segredo-versionado'), 'sem git, não há como saber o que é versionado');
  });

  it('Supabase sem migrações versionadas manda conferir o RLS no painel', () => {
    const dir = projeto({ 'supabase/config.toml': 'project_id = "x"\n' });
    const rls = diagnosticar(dir).resultados.find((r) => r.id === 'rls');
    assert.equal(rls.nivel, 'aviso');
    assert.match(rls.mensagem, /Security Advisor/);
  });

  it('package.json sem dependências não precisa de arquivo de trava', () => {
    const semDependencias = diagnosticar(projeto({ 'package.json': JSON.stringify({ name: 'x', scripts: {} }) }));
    assert.ok(!semDependencias.resultados.some((r) => r.id === 'trava'));
    const comDependencias = diagnosticar(projeto({ 'package.json': JSON.stringify({ name: 'x', dependencies: { a: '1.0.0' } }) }));
    assert.equal(comDependencias.resultados.find((r) => r.id === 'trava').nivel, 'aviso');
  });

  it('o .gitignore sem .env é aviso quando o arquivo ainda não existe', () => {
    const dir = projeto({ '.gitignore': 'node_modules/\n' }, { git: true });
    assert.equal(diagnosticar(dir).resultados.find((r) => r.id === 'gitignore').nivel, 'aviso');
  });
});

describe('tabelasSemRls', () => {
  it('olha só o esquema public, ignora comentários e acompanha a tabela entre arquivos', () => {
    const { total, sem } = tabelasSemRls([
      '/* create table public.em_bloco (id int); */\ncreate table auth.interna (id int);\ncreate table "Public"."Pedidos" (id int);',
      'create table public.temporaria (id int);\ndrop table if exists public.temporaria;',
      'create table itens (id int);\nalter table if exists public.itens enable row level security;',
    ]);
    assert.equal(total, 2);
    assert.deepEqual(sem, ['pedidos']);
  });
});

describe('variaveisPublicas', () => {
  it('separa segredo exposto, chave a conferir e chave pública por design', () => {
    const { graves, suspeitas } = variaveisPublicas([
      {
        arquivo: 'a.ts',
        texto: [
          'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
          'NEXT_PUBLIC_DATABASE_URL',
          'NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
          'EXPO_PUBLIC_API_TOKEN NEXT_PUBLIC_FIREBASE_API_KEY',
        ].join('\n'),
      },
      { arquivo: 'b.ts', texto: 'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY' },
    ]);
    assert.deepEqual(graves, ['NEXT_PUBLIC_DATABASE_URL (a.ts:2)', 'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY (a.ts:1)']);
    assert.deepEqual(suspeitas, ['EXPO_PUBLIC_API_TOKEN (a.ts:4)']);
  });
});

describe('diagnosticar-projeto pela linha de comando', () => {
  it('--help sai com 0; pasta inexistente, opção desconhecida e duas pastas saem com 2', () => {
    assert.equal(rodar('--help').status, 0);
    assert.equal(rodar(path.join(tmpdir(), 'nao-existe-diagnostico-xyz')).status, 2);
    assert.equal(rodar('--kti').status, 2);
    assert.equal(rodar('a', 'b').status, 2);
  });

  it('--json devolve os resultados e o resumo', () => {
    const r = rodar(projeto({ 'README.md': '# App\n' }), '--json');
    assert.equal(r.status, 0);
    const relatorio = JSON.parse(r.stdout);
    assert.ok(Array.isArray(relatorio.resultados));
    assert.deepEqual(Object.keys(relatorio.resumo), ['erros', 'avisos', 'ok']);
  });
});
