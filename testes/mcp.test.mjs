import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { criarServidor } from '../mcp/servidor.mjs';
import { criarLinkDePasta } from './links.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Skill mínima numa pasta temporária; `arquivos` acrescenta ou substitui arquivos. */
function criarSkill(base, nome, arquivos = {}) {
  const todos = { 'SKILL.md': `---\nname: ${nome}\ndescription: Use sempre.\n---\n# ${nome}\n`, ...arquivos };
  for (const [rel, conteudo] of Object.entries(todos)) {
    mkdirSync(path.dirname(path.join(base, nome, rel)), { recursive: true });
    writeFileSync(path.join(base, nome, rel), conteudo);
  }
}

/**
 * Sobe o servidor de verdade (processo separado) e conversa por stdio.
 * Se o processo morrer, os pedidos em aberto falham na hora, com o stderr dele, em vez de
 * esperar o tempo limite.
 */
function iniciarServidor({ script = path.join(RAIZ, 'mcp', 'servidor.mjs'), args = [] } = {}) {
  const processo = spawn(process.execPath, [script, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pendentes = new Map();
  let buffer = '';
  let stderr = '';
  processo.stdin.on('error', () => {}); // escrever para um servidor que caiu: quem acusa é o 'close'
  processo.stderr.setEncoding('utf8');
  processo.stderr.on('data', (dados) => {
    stderr += dados;
  });
  processo.stdout.setEncoding('utf8');
  processo.stdout.on('data', (dados) => {
    buffer += dados;
    let fim;
    while ((fim = buffer.indexOf('\n')) !== -1) {
      const linha = buffer.slice(0, fim);
      buffer = buffer.slice(fim + 1);
      const msg = JSON.parse(linha);
      pendentes.get(msg.id)?.resolve(msg);
      pendentes.delete(msg.id);
    }
  });
  processo.on('close', (codigo) => {
    for (const { reject } of pendentes.values()) reject(new Error(`o servidor encerrou (código ${codigo}): ${stderr.trim()}`));
    pendentes.clear();
  });
  const esperarId = (id, rotulo = `o id ${id}`) =>
    new Promise((resolve, reject) => {
      const limite = setTimeout(() => reject(new Error(`sem resposta para ${rotulo}`)), 5000);
      pendentes.set(id, {
        resolve: (msg) => {
          clearTimeout(limite);
          resolve(msg);
        },
        reject: (erro) => {
          clearTimeout(limite);
          reject(erro);
        },
      });
    });
  let proximoId = 1;
  return {
    processo,
    enviarBruto: (texto) => processo.stdin.write(`${texto}\n`),
    pedir(method, params) {
      const id = proximoId++;
      const resposta = esperarId(id, method);
      processo.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      return resposta;
    },
    esperarId,
  };
}

describe('servidor MCP', () => {
  let s;
  before(() => {
    s = iniciarServidor();
  });
  after(() => s.processo.kill());

  it('responde ao initialize com a versão pedida e as capacidades', async () => {
    const r = await s.pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'teste', version: '0' } });
    assert.equal(r.result.protocolVersion, '2025-06-18');
    assert.ok(r.result.capabilities.tools);
    assert.ok(r.result.capabilities.prompts);
    assert.equal(r.result.serverInfo.name, 'aiops-para-nao-devs-ptbr');
    // O título que o cliente mostra é o do README: se um mudar sem o outro, este teste avisa.
    const tituloDoReadme = readFileSync(path.join(RAIZ, 'README.md'), 'utf8').match(/^# (.+?)\s*$/m)[1];
    assert.equal(r.result.serverInfo.title, tituloDoReadme);
    s.enviarBruto(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  });

  it('informa como versão a do pacote mais a impressão do conteúdo servido', async () => {
    const r = await s.pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'teste', version: '0' } });
    const doPacote = JSON.parse(readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;
    // SemVer com metadado de build: <versão do pacote>+<12 hex do sha256 do conteúdo>.
    assert.match(r.result.serverInfo.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\+[0-9a-f]{12}$/);
    assert.ok(r.result.serverInfo.version.startsWith(`${doPacote}+`), r.result.serverInfo.version);
  });

  it('oferece a versão mais recente quando a pedida não é suportada', async () => {
    const r = await s.pedir('initialize', { protocolVersion: '1999-01-01' });
    assert.match(r.result.protocolVersion, /^\d{4}-\d{2}-\d{2}$/);
    assert.notEqual(r.result.protocolVersion, '1999-01-01');
  });

  it('lista as três ferramentas, todas somente leitura', async () => {
    const r = await s.pedir('tools/list', {});
    assert.deepEqual(r.result.tools.map((t) => t.name).sort(), ['ler_arquivo_da_skill', 'ler_skill', 'listar_skills']);
    assert.ok(r.result.tools.every((t) => t.annotations.readOnlyHint === true));
  });

  it('listar_skills traz cada skill com categoria, versão e descrição', async () => {
    const r = await s.pedir('tools/call', { name: 'listar_skills', arguments: {} });
    const texto = r.result.content[0].text;
    assert.match(texto, /^- \*\*segredos-e-credenciais\*\* \(seguranca-e-conformidade, v\d+\.\d+\.\d+\): Use /m);
    assert.match(texto, /esteira-ci-cd/);
  });

  it('ler_skill devolve o SKILL.md e os arquivos de apoio (sem os evals)', async () => {
    const r = await s.pedir('tools/call', { name: 'ler_skill', arguments: { nome: 'esteira-ci-cd' } });
    const texto = r.result.content[0].text;
    assert.match(texto, /^---\nname: esteira-ci-cd/);
    assert.match(texto, /references\/licoes-de-esteira\.md/);
    assert.doesNotMatch(texto, /evals\/gatilhos\.json/);
  });

  it('ler_arquivo_da_skill lê referência e recusa escapar da pasta', async () => {
    const ok = await s.pedir('tools/call', { name: 'ler_arquivo_da_skill', arguments: { nome: 'esteira-ci-cd', caminho: 'references/licoes-de-esteira.md' } });
    assert.match(ok.result.content[0].text, /Lições de esteira/);
    const fuga = await s.pedir('tools/call', { name: 'ler_arquivo_da_skill', arguments: { nome: 'esteira-ci-cd', caminho: '../../package.json' } });
    assert.equal(fuga.result.isError, true);
    assert.match(fuga.result.content[0].text, /sai da pasta/);
  });

  it('skill inexistente vira erro de ferramenta com a lista das disponíveis', async () => {
    const r = await s.pedir('tools/call', { name: 'ler_skill', arguments: { nome: 'nao-existe' } });
    assert.equal(r.result.isError, true);
    assert.match(r.result.content[0].text, /Disponíveis:/);
  });

  it('expõe um prompt por skill e monta o prompt com a tarefa', async () => {
    const lista = await s.pedir('prompts/list', {});
    assert.ok(lista.result.prompts.some((p) => p.name === 'iniciar-projeto'));
    const r = await s.pedir('prompts/get', { name: 'iniciar-projeto', arguments: { tarefa: 'configurar meu repo' } });
    const texto = r.result.messages[0].content.text;
    assert.match(texto, /Tarefa: configurar meu repo/);
    assert.match(texto, /name: iniciar-projeto/);
  });

  it('responde erros de protocolo sem cair', async () => {
    const desconhecido = await s.pedir('recurso/inventado', {});
    assert.equal(desconhecido.error.code, -32601);
    const esperaNull = s.esperarId(null);
    s.enviarBruto('{isto não é json');
    const invalido = await esperaNull;
    assert.equal(invalido.error.code, -32700);
    const ping = await s.pedir('ping', {});
    assert.deepEqual(ping.result, {});
  });
});

describe('servidor MCP: mensagens malformadas', () => {
  let s;
  before(() => {
    s = iniciarServidor();
  });
  after(() => s.processo.kill());

  it('params null ou que não é objeto recebe resposta, e o servidor continua de pé', async () => {
    for (const method of ['tools/call', 'prompts/get']) {
      const r = await s.pedir(method, null);
      assert.equal(r.error?.code, -32602, `${method} com params null: ${JSON.stringify(r)}`);
    }
    // Sem params, o initialize já era aceito com a versão mais recente; null vale o mesmo.
    const inicio = await s.pedir('initialize', null);
    assert.match(inicio.result?.protocolVersion ?? '', /^\d{4}-\d{2}-\d{2}$/, JSON.stringify(inicio));
    for (const method of ['initialize', 'tools/call', 'prompts/get']) {
      for (const params of [42, 'texto', [1, 2]]) {
        const r = await s.pedir(method, params);
        assert.equal(r.error?.code, -32602, `${method} com params ${JSON.stringify(params)}: ${JSON.stringify(r)}`);
      }
    }
    const ping = await s.pedir('ping', {});
    assert.deepEqual(ping.result, {});
  });

  it('arguments null vale como vazio; arguments que não é objeto é recusado', async () => {
    const lista = await s.pedir('tools/call', { name: 'listar_skills', arguments: null });
    assert.match(lista.result.content[0].text, /skills disponíveis/);
    const semNome = await s.pedir('tools/call', { name: 'ler_skill', arguments: null });
    assert.equal(semNome.result.isError, true);
    assert.match(semNome.result.content[0].text, /Disponíveis:/);
    const prompt = await s.pedir('prompts/get', { name: 'iniciar-projeto', arguments: null });
    assert.match(prompt.result.messages[0].content.text, /name: iniciar-projeto/);
    for (const [method, name] of [['tools/call', 'ler_skill'], ['prompts/get', 'iniciar-projeto']]) {
      const r = await s.pedir(method, { name, arguments: 'texto' });
      assert.equal(r.error?.code, -32602, `${method}: ${JSON.stringify(r)}`);
      assert.match(r.error.message, /arguments inválido/);
    }
  });
});

describe('servidor MCP: erro inesperado', () => {
  it('vira erro -32603 com o detalhe só no stderr, sem derrubar o servidor', (t) => {
    const servidor = criarServidor(path.join(RAIZ, 'skills'));
    // Simula um defeito interno: ler a descrição de uma skill lança erro.
    Object.defineProperty(servidor.skills[0].frontmatter, 'description', {
      get() {
        throw new Error('falha simulada');
      },
    });
    const stderr = t.mock.method(console, 'error', () => {});
    const resposta = servidor.processarLinha(JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'prompts/list' }));
    assert.deepEqual(resposta, { jsonrpc: '2.0', id: 7, error: { code: -32603, message: 'erro interno do servidor' } });
    assert.ok(stderr.mock.calls.some((c) => String(c.arguments[0]).includes('falha simulada')));
  });
});

describe('servidor MCP: versão do conteúdo', () => {
  const versaoDe = (pasta) =>
    criarServidor(pasta).processarLinha(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })).result.serverInfo.version;

  it('é a mesma para o mesmo conteúdo, ignora evals/ e muda quando um arquivo servido muda', () => {
    const [a, b] = [mkdtempSync(path.join(tmpdir(), 'mcp-versao-')), mkdtempSync(path.join(tmpdir(), 'mcp-versao-'))];
    for (const base of [a, b]) criarSkill(base, 'exemplo', { 'references/ref.md': '# Ref\n', 'evals/evals.json': '{}' });
    assert.equal(versaoDe(a), versaoDe(b), 'mesmo conteúdo em pastas diferentes');
    writeFileSync(path.join(b, 'exemplo', 'evals', 'evals.json'), '{"mudou": true}');
    assert.equal(versaoDe(a), versaoDe(b), 'evals/ não é servido e não entra na versão');
    writeFileSync(path.join(b, 'exemplo', 'references', 'ref.md'), '# Ref alterada\n');
    assert.notEqual(versaoDe(a), versaoDe(b));
  });
});

describe('servidor MCP chamado por link', () => {
  it('sobe e responde quando chamado por um caminho com link (como o atalho do npx)', async (t) => {
    const link = path.join(mkdtempSync(path.join(tmpdir(), 'link-')), 'mcp');
    const motivo = criarLinkDePasta(path.join(RAIZ, 'mcp'), link);
    if (motivo) return t.skip(motivo);
    const s = iniciarServidor({ script: path.join(link, 'servidor.mjs') });
    t.after(() => s.processo.kill());
    const ping = await s.pedir('ping', {});
    assert.deepEqual(ping.result, {});
  });
});

describe('servidor MCP com skill instalada por link', () => {
  it('lista a skill, entrega os arquivos por ela e continua recusando sair da pasta', async (t) => {
    // Como o `npx skills` instala: a pasta da skill é um link para uma cópia central.
    const pasta = mkdtempSync(path.join(tmpdir(), 'mcp-link-'));
    const motivo = criarLinkDePasta(path.join(RAIZ, 'skills', 'esteira-ci-cd'), path.join(pasta, 'esteira-ci-cd'));
    if (motivo) return t.skip(motivo);
    const s = iniciarServidor({ args: ['--skills', pasta] });
    t.after(() => s.processo.kill());

    const lista = await s.pedir('tools/call', { name: 'listar_skills', arguments: {} });
    assert.match(lista.result.content[0].text, /^1 skills disponíveis/);
    assert.match(lista.result.content[0].text, /\*\*esteira-ci-cd\*\*/);
    const skill = await s.pedir('tools/call', { name: 'ler_skill', arguments: { nome: 'esteira-ci-cd' } });
    assert.match(skill.result.content[0].text, /references\/licoes-de-esteira\.md/);
    const ok = await s.pedir('tools/call', { name: 'ler_arquivo_da_skill', arguments: { nome: 'esteira-ci-cd', caminho: 'references/licoes-de-esteira.md' } });
    assert.match(ok.result.content[0].text, /Lições de esteira/);
    const fuga = await s.pedir('tools/call', { name: 'ler_arquivo_da_skill', arguments: { nome: 'esteira-ci-cd', caminho: '../../package.json' } });
    assert.equal(fuga.result.isError, true);
    assert.match(fuga.result.content[0].text, /sai da pasta/);
  });
});

describe('servidor MCP: skill recusada', () => {
  it('não oferece skill cujo SKILL.md foi recusado (ex.: acima de 512 KB)', () => {
    const base = mkdtempSync(path.join(tmpdir(), 'mcp-skills-'));
    criarSkill(base, 'normal');
    criarSkill(base, 'enorme', { 'SKILL.md': `---\nname: enorme\ndescription: Use sempre.\n---\n${'x'.repeat(520 * 1024)}\n` });
    assert.deepEqual(criarServidor(base).skills.map((s) => s.pasta), ['normal']);
  });
});
