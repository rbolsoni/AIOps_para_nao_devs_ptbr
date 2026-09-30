/**
 * Criação de links para os testes (importado por eles; não é um arquivo de teste).
 *
 * O `npx skills` instala cada skill como link para uma cópia central — junction no Windows,
 * link simbólico nos demais sistemas —, e é por esse caminho que o agente e a esteira do
 * usuário chamam os scripts. Os testes reproduzem isso numa pasta temporária.
 *
 * Se o sistema não permitir criar o link, a função devolve o motivo, e o teste pula com ele
 * (`t.skip(motivo)`) em vez de falhar.
 */
import { symlinkSync } from 'node:fs';

const SEM_PERMISSAO = new Set(['EPERM', 'EACCES']);

function criar(alvo, link, tipo) {
  try {
    symlinkSync(alvo, link, tipo);
    return null;
  } catch (e) {
    if (SEM_PERMISSAO.has(e.code)) return `este sistema não permitiu criar link (${tipo}, ${e.code})`;
    throw e;
  }
}

/**
 * Link de pasta, como o `npx skills` cria. No Windows, junction: ao contrário do link
 * simbólico, não exige modo de desenvolvedor nem administrador.
 * Devolve null se criou, ou o motivo para pular o teste.
 */
export const criarLinkDePasta = (alvo, link) => criar(alvo, link, process.platform === 'win32' ? 'junction' : 'dir');

/**
 * Link simbólico de arquivo. No Windows, sem modo de desenvolvedor nem administrador, falha
 * com EPERM e o teste pula; na CI em Linux, roda.
 * Devolve null se criou, ou o motivo para pular o teste.
 */
export const criarLinkDeArquivo = (alvo, link) => criar(alvo, link, 'file');
