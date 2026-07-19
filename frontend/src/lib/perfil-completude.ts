/**
 * Completude do cadastro do formando/vocacionado (Fase 3 do cadastro mínimo).
 *
 * No cadastro mínimo o formador informa só nome + e-mail + nível + grupo; os
 * DADOS PESSOAIS ficam para a própria pessoa completar no portal
 * (`/portal/perfil`). Este helper define quais desses campos compõem a
 * "completude" e é a fonte única usada pelos três consumidores da fase:
 *  - nudge/banner no portal (dashboard + página de perfil);
 *  - badge "cadastro pendente" na listagem do formador.
 *
 * Fica de fora, por decisão:
 *  - `estadoCivil`: tem default (`solteiro`) indistinguível de escolha real;
 *  - `foto`, `nomeSocial`, endereço e os campos CANÔNICOS (nacionalidade, RG,
 *    órgão emissor, CEP, paróquia, nº de filhos): opcionais — os canônicos só
 *    são exigidos, quando for o caso, nos documentos eclesiásticos, então não
 *    pressionamos o formando por eles aqui.
 * Restam os essenciais de contato/identidade que a formação de fato precisa.
 */

export interface DadosPessoaisCompletude {
  dataNascimento?: string | null;
  telefone?: string | null;
}

export const CAMPOS_COMPLETUDE: {
  campo: keyof DadosPessoaisCompletude;
  label: string;
}[] = [
  { campo: "dataNascimento", label: "Data de nascimento" },
  { campo: "telefone", label: "Telefone" },
];

function vazio(v: string | null | undefined): boolean {
  return v == null || v.trim() === "";
}

/** Rótulos dos campos pessoais ainda não preenchidos (na ordem de exibição). */
export function camposFaltantes(d: DadosPessoaisCompletude): string[] {
  return CAMPOS_COMPLETUDE.filter(({ campo }) => vazio(d[campo])).map(
    ({ label }) => label
  );
}

/** `true` quando falta ao menos um campo pessoal essencial. */
export function perfilIncompleto(d: DadosPessoaisCompletude): boolean {
  return CAMPOS_COMPLETUDE.some(({ campo }) => vazio(d[campo]));
}
