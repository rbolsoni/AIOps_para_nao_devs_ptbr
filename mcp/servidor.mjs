#!/usr/bin/env node
/**
 * Servidor MCP (Model Context Protocol) somente leitura que entrega as skills deste
 * repositório a qualquer cliente MCP — útil para agentes que ainda não leem o formato
 * Agent Skills nativamente.
 *
 * Expõe:
 *   ferramentas  listar_skills, ler_skill, ler_arquivo_da_skill
 *   prompts      um por skill (o cliente pode oferecer como comando)
 *
 * Nada é escrito nem executado: o servidor só lê arquivos de dentro da pasta de cada skill,
 * recusando caminhos que saiam dela, links simbólicos, binários e arquivos grandes.
 *
 * A versão informada ao cliente (serverInfo.version) é a do pacote mais uma impressão do
 * conteúdo das skills (ex.: 1.0.0+3f2a9c1b7d4e): identifica exatamente o que está sendo servido.
 *
 * Transporte: stdio, JSON-RPC 2.0, uma mensagem por linha. Logs vão para stderr.
 *
 * Uso:
 *   node mcp/servidor.mjs                     # usa a pasta skills/ deste pacote
 *   node mcp/servidor.mjs --skills <pasta>    # usa outra pasta de skills
 *   npx -y github:rbolsoni/IA-skills-para-nao-devs#<tag>   # versão fixada numa tag
 */
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { carregarSkills, lerArquivoDaSkill, listarArquivosDaSkill } from '../ferramentas/lib/skills.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACOTE = JSON.parse(readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
const VERSOES_SUPORTADAS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const AJUDA = `Servidor MCP somente leitura com as skills de ${PACOTE.name} ${PACOTE.version}.

Uso: node mcp/servidor.mjs [--skills <pasta>]

Fala MCP por stdio; configure-o no seu cliente MCP em vez de executá-lo direto.
Exemplo (JSON de configuração de cliente):
  { "mcpServers": { "ia-skills-para-nao-devs": { "command": "npx", "args": ["-y", "github:rbolsoni/IA-skills-para-nao-devs#v1.7.3"] } } }`;

const INSTRUCOES = [
  'Este servidor entrega skills de boas práticas de engenharia (padrão Agent Skills) em português.',
  'No início de uma tarefa, chame listar_skills e escolha as skills cuja descrição combina com o pedido.',
  'Depois, chame ler_skill para obter as instruções completas e siga-as.',
  'Leia arquivos de references/ e assets/ com ler_arquivo_da_skill apenas quando a skill indicar.',
].join(' ');

const FERRAMENTAS = [
  {
    name: 'listar_skills',
    title: 'Listar skills',
    description: 'Lista as skills disponíveis com nome, categoria, versão e descrição de quando usar cada uma. Chame no início da tarefa para escolher quais seguir.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'ler_skill',
    title: 'Ler skill',
    description: 'Retorna as instruções completas (SKILL.md) de uma skill e a lista dos arquivos de apoio dela.',
    inputSchema: {
      type: 'object',
      properties: { nome: { type: 'string', description: 'Nome da skill, como em listar_skills (ex.: "segredos-e-credenciais").' } },
      required: ['nome'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'ler_arquivo_da_skill',
    title: 'Ler arquivo de apoio da skill',
    description: 'Lê um arquivo de apoio de uma skill (references/, assets/, scripts/). Use quando o SKILL.md mandar consultar o arquivo.',
    inputSchema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome da skill.' },
        caminho: { type: 'string', description: 'Caminho relativo à pasta da skill, ex.: "references/licoes-de-esteira.md".' },
      },
      required: ['nome', 'caminho'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

/**
 * `params` e `arguments` ausentes ou null valem {}; outro valor que não seja objeto é inválido
 * (devolve null). O padrão `= {}` da desestruturação só cobre undefined: com "params": null, o
 * acesso a params.name lançava erro fora de qualquer try/catch e derrubava o servidor.
 */
function comoObjeto(valor) {
  if (valor === undefined || valor === null) return {};
  return typeof valor === 'object' && !Array.isArray(valor) ? valor : null;
}

/**
 * Impressão do conteúdo servido: sha256 do caminho relativo e dos bytes de cada arquivo das
 * skills (menos evals/, que não é entregue), em ordem fixa. Vai na versão informada ao
 * cliente, porque a do package.json não muda a cada release das skills.
 */
function impressaoDoConteudo(skills) {
  const hash = createHash('sha256');
  // Ordem por código de caractere, não por idioma: a mesma em qualquer máquina.
  const porPasta = [...skills].sort((a, b) => (a.pasta < b.pasta ? -1 : a.pasta > b.pasta ? 1 : 0));
  for (const s of porPasta) {
    for (const rel of ['SKILL.md', ...listarArquivosDaSkill(s.dir).filter((a) => !a.startsWith('evals/'))]) {
      const bytes = readFileSync(path.join(s.dir, rel));
      // Caminho entre aspas e tamanho delimitam cada arquivo sem ambiguidade.
      hash.update(`${JSON.stringify(`${s.pasta}/${rel}`)} ${bytes.length}\n`);
      hash.update(bytes);
    }
  }
  return hash.digest('hex').slice(0, 12);
}

function lerOpcoes(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { ajuda: true };
  const i = argv.indexOf('--skills');
  if (i !== -1 && !argv[i + 1]) throw new Error('--skills exige o caminho de uma pasta');
  return { pastaSkills: path.resolve(i !== -1 ? argv[i + 1] : path.join(RAIZ, 'skills')) };
}

export function criarServidor(pastaSkills) {
  const skills = carregarSkills(pastaSkills).filter((s) => s.frontmatter?.name && s.frontmatter?.description);
  const porNome = new Map(skills.map((s) => [s.frontmatter.name, s]));
  const versao = `${PACOTE.version}+${impressaoDoConteudo(skills)}`;

  const texto = (t) => ({ content: [{ type: 'text', text: t }] });
  const erroDeFerramenta = (t) => ({ content: [{ type: 'text', text: t }], isError: true });

  function obterSkill(nome) {
    const skill = porNome.get(nome);
    if (!skill) {
      throw new Error(`skill "${nome}" não existe. Disponíveis: ${[...porNome.keys()].join(', ')}`);
    }
    return skill;
  }

  function chamarFerramenta(nome, args = {}) {
    try {
      if (nome === 'listar_skills') {
        const linhas = skills.map((s) => {
          const { categoria = 'sem categoria', versao: v } = s.frontmatter.metadata ?? {};
          return `- **${s.frontmatter.name}** (${v ? `${categoria}, v${v}` : categoria}): ${s.frontmatter.description}`;
        });
        return texto(`${skills.length} skills disponíveis:\n\n${linhas.join('\n')}`);
      }
      if (nome === 'ler_skill') {
        const skill = obterSkill(args.nome);
        const arquivos = listarArquivosDaSkill(skill.dir).filter((a) => !a.startsWith('evals/'));
        const apoio = arquivos.length ? `\n\n---\nArquivos de apoio (leia com ler_arquivo_da_skill quando a skill indicar):\n${arquivos.map((a) => `- ${a}`).join('\n')}` : '';
        return texto(skill.texto + apoio);
      }
      if (nome === 'ler_arquivo_da_skill') {
        const skill = obterSkill(args.nome);
        return texto(lerArquivoDaSkill(skill.dir, args.caminho));
      }
      return null;
    } catch (e) {
      return erroDeFerramenta(`Erro: ${e.message}`);
    }
  }

  function tratar(mensagem) {
    const { id, method } = mensagem;
    const ok = (result) => ({ jsonrpc: '2.0', id, result });
    const falha = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
    const params = comoObjeto(mensagem.params);
    if (!params) return falha(-32602, 'params inválido: esperado um objeto');

    switch (method) {
      case 'initialize': {
        const pedida = params.protocolVersion;
        return ok({
          protocolVersion: VERSOES_SUPORTADAS.includes(pedida) ? pedida : VERSOES_SUPORTADAS[0],
          capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
          serverInfo: { name: PACOTE.name, title: 'Kit de skills de agente para não devs (PT-BR)', version: versao },
          instructions: INSTRUCOES,
        });
      }
      case 'ping':
        return ok({});
      case 'tools/list':
        return ok({ tools: FERRAMENTAS });
      case 'tools/call': {
        const args = comoObjeto(params.arguments);
        if (!args) return falha(-32602, 'arguments inválido: esperado um objeto');
        const resultado = chamarFerramenta(params.name, args);
        return resultado ? ok(resultado) : falha(-32602, `ferramenta desconhecida: ${params.name}`);
      }
      case 'prompts/list':
        return ok({
          prompts: skills.map((s) => ({
            name: s.frontmatter.name,
            description: s.frontmatter.description,
            arguments: [{ name: 'tarefa', description: 'O que você quer fazer (opcional).', required: false }],
          })),
        });
      case 'prompts/get': {
        const args = comoObjeto(params.arguments);
        if (!args) return falha(-32602, 'arguments inválido: esperado um objeto');
        const skill = porNome.get(params.name);
        if (!skill) return falha(-32602, `prompt desconhecido: ${params.name}`);
        const tarefa = args.tarefa ? `\n\nTarefa: ${args.tarefa}` : '';
        return ok({
          description: skill.frontmatter.description,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Siga as instruções da skill "${skill.frontmatter.name}" abaixo. Arquivos de apoio podem ser lidos com a ferramenta ler_arquivo_da_skill.${tarefa}\n\n${skill.texto}`,
              },
            },
          ],
        });
      }
      default:
        return falha(-32601, `método não suportado: ${method}`);
    }
  }

  /** Processa uma linha recebida; devolve a resposta (ou null para notificações). */
  function processarLinha(linha) {
    if (!linha.trim()) return null;
    let mensagem;
    try {
      mensagem = JSON.parse(linha);
    } catch {
      return { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } };
    }
    if (mensagem === null || typeof mensagem !== 'object' || Array.isArray(mensagem)) {
      return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'requisição inválida' } };
    }
    if (mensagem.id === undefined || mensagem.id === null) return null; // notificação: sem resposta
    if (typeof mensagem.method !== 'string') {
      return { jsonrpc: '2.0', id: mensagem.id, error: { code: -32600, message: 'requisição sem "method"' } };
    }
    try {
      return tratar(mensagem);
    } catch (e) {
      // Um defeito ao tratar um pedido não pode derrubar o servidor: o cliente perderia todas as
      // ferramentas. O detalhe vai para o stderr; o stdout é o canal do protocolo.
      console.error(`[${PACOTE.name}] erro interno ao tratar "${mensagem.method}": ${e?.stack ?? e}`);
      return { jsonrpc: '2.0', id: mensagem.id, error: { code: -32603, message: 'erro interno do servidor' } };
    }
  }

  return { skills, versao, processarLinha };
}

function main() {
  let opcoes;
  try {
    opcoes = lerOpcoes(process.argv.slice(2));
  } catch (e) {
    console.error(`erro: ${e.message}\n\n${AJUDA}`);
    process.exit(2);
  }
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return;
  }
  const servidor = criarServidor(opcoes.pastaSkills);
  if (servidor.skills.length === 0) {
    console.error(`erro: nenhuma skill encontrada em ${opcoes.pastaSkills}`);
    process.exit(2);
  }
  console.error(`[${PACOTE.name}] ${servidor.skills.length} skills carregadas de ${opcoes.pastaSkills} (versão ${servidor.versao})`);
  const entrada = createInterface({ input: process.stdin, crlfDelay: Infinity });
  entrada.on('line', (linha) => {
    const resposta = servidor.processarLinha(linha);
    if (resposta) process.stdout.write(`${JSON.stringify(resposta)}\n`);
  });
}

// Executado direto ou pelo atalho do npx (bin, que pode ser link simbólico): compara o
// caminho real dos dois lados.
function executadoDireto() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
if (executadoDireto()) main();
