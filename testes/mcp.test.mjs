import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { criarLinkDePasta } from './links.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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
    assert.equal(r.result.serverInfo.name, 'padroes-skill-aiops-ptbr');
    s.enviarBruto(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
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

  it('listar_skills traz as skills com descrição', async () => {
    const r = await s.pedir('tools/call', { name: 'listar_skills', arguments: {} });
    const texto = r.result.content[0].text;
    assert.match(texto, /segredos-e-credenciais/);
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
