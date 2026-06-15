export const PERSONALIZADO_BASE_PRECO = 889;
export const PERSONALIZADO_BASE_USUARIOS = 500;
export const PERSONALIZADO_PRECO_BLOCO = 100;
export const PERSONALIZADO_TAMANHO_BLOCO = 50;
export const PERSONALIZADO_DESCONTO_ANUAL = 0.17;
export const PERSONALIZADO_STORAGE_MB_POR_USUARIO = 25;
export const PERSONALIZADO_STORAGE_MARGEM = 3;

export function calcularPrecoMensal(usuarios: number): number {
  if (usuarios <= PERSONALIZADO_BASE_USUARIOS) return PERSONALIZADO_BASE_PRECO;
  const blocos = Math.ceil((usuarios - PERSONALIZADO_BASE_USUARIOS) / PERSONALIZADO_TAMANHO_BLOCO);
  return PERSONALIZADO_BASE_PRECO + blocos * PERSONALIZADO_PRECO_BLOCO;
}

export function calcularPrecoAnualTotal(usuarios: number): number {
  const mensal = calcularPrecoMensal(usuarios);
  return Math.round(mensal * 12 * (1 - PERSONALIZADO_DESCONTO_ANUAL));
}

export function calcularPrecoAnualMensal(usuarios: number): number {
  return Math.round(calcularPrecoMensal(usuarios) * (1 - PERSONALIZADO_DESCONTO_ANUAL));
}

export function calcularStorageGB(usuarios: number): number {
  const mb = usuarios * PERSONALIZADO_STORAGE_MB_POR_USUARIO * PERSONALIZADO_STORAGE_MARGEM;
  return Math.ceil(mb / 1024);
}
