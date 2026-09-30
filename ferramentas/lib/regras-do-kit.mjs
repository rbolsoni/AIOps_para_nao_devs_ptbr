/**
 * Regras próprias deste kit (AGENTS.md), além do padrão Agent Skills. Ficam num lugar só para
 * que o validador, a conferência de versões e os testes usem a mesma fonte.
 */

/** Valores de `metadata.categoria`, na ordem das seções do catálogo do README. */
export const CATEGORIAS = ['fundamentos', 'projeto-e-entrega', 'seguranca-e-conformidade', 'operacao', 'agentes-de-ia'];

/** `metadata.versao`: X.Y.Z do versionamento semântico, sem zero à esquerda. */
export const VERSAO_VALIDA = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * Acima disto a `description` gera aviso. O agente carrega o nome e a descrição de todas as
 * skills instaladas em toda sessão, antes de qualquer pedido: cada caractere a mais sai do
 * contexto que sobra para o trabalho.
 */
export const LIMITE_AVISO_DESCRICAO = 360;

/**
 * Compara duas versões válidas (VERSAO_VALIDA) pelos números, não como texto (1.10.0 > 1.9.0).
 * Devolve negativo se a < b, 0 se iguais e positivo se a > b.
 */
export function compararVersoes(a, b) {
  const pa = a.split('.').map(BigInt);
  const pb = b.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}
