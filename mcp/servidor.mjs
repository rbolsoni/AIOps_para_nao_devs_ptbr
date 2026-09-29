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
 * Transporte: stdio, JSON-RPC 2.0, uma mensagem por linha. Logs vão para stderr.
 *
 * Uso:
 *   node mcp/servidor.mjs                     # usa a pasta skills/ deste pacote
 *   node mcp/servidor.mjs --skills <pasta>    # usa outra pasta de skills
 *   npx -y github:rbolsoni/Padroes_skill_para_AIOps_ptbr
 */
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
  { "mcpServers": { "padroes-skill": { "command": "npx", "args": ["-y", "github:rbolsoni/Padroes_skill_para_AIOps_ptbr"] } } }`;

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
    description: 'Lista as skills disponíveis com nome, categoria e descrição de quando usar cada uma. Chame no início da tarefa para escolher quais seguir.',
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

function lerOpcoes(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { ajuda: true };
  const i = argv.indexOf('--skills');
  if (i !== -1 && !argv[i + 1]) throw new Error('--skills exige o caminho de uma pasta');
  return { pastaSkills: path.resolve(i !== -1 ? argv[i + 1] : path.join(RAIZ, 'skills')) };
}

export function criarServidor(pastaSkills) {
  const skills = carregarSkills(pastaSkills).filter((s) => s.frontmatter?.name && s.frontmatter?.description);
  const porNome = new Map(skills.map((s) => [s.frontmatter.name, s]));

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
        const linhas = skills.map((s) => `- **${s.frontmatter.name}** (${s.frontmatter.metadata?.categoria ?? 'sem categoria'}): ${s.frontmatter.description}`);
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
    const { id, method, params = {} } = mensagem;
    const ok = (result) => ({ jsonrpc: '2.0', id, result });
    const falha = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

    switch (method) {
      case 'initialize': {
        const pedida = params.protocolVersion;
        return ok({
          protocolVersion: VERSOES_SUPORTADAS.includes(pedida) ? pedida : VERSOES_SUPORTADAS[0],
          capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
          serverInfo: { name: PACOTE.name, title: 'Padrões de Skills para AIOps (PT-BR)', version: PACOTE.version },
          instructions: INSTRUCOES,
        });
      }
      case 'ping':
        return ok({});
      case 'tools/list':
        return ok({ tools: FERRAMENTAS });
      case 'tools/call': {
        const resultado = chamarFerramenta(params.name, params.arguments);
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
        const skill = porNome.get(params.name);
        if (!skill) return falha(-32602, `prompt desconhecido: ${params.name}`);
        const tarefa = params.arguments?.tarefa ? `\n\nTarefa: ${params.arguments.tarefa}` : '';
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
    return tratar(mensagem);
  }

  return { skills, processarLinha };
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
  console.error(`[${PACOTE.name}] ${servidor.skills.length} skills carregadas de ${opcoes.pastaSkills}`);
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
