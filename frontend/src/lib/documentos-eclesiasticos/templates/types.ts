export interface DadosTemplate {
  orgNome: string;
  termoPreDiscipulado: string;
  termoDiscipulado: string;
  termoPrimeirasPromessas: string;
  termoPromessa: string;

  processoTipo: string;
  nivelFormativo: string;
  favoravelRenovacao: boolean;

  formandoNome: string;
  formandoDataNascimento: string;
  formandoEstadoCivil: string;
  formandoTelefone: string;
  formandoEmail: string;
  formandoNomeSocial?: string | null;
  formandoNacionalidade?: string | null;
  formandoRg?: string | null;
  formandoOrgaoEmissor?: string | null;
  formandoCep?: string | null;
  formandoParoquiaReferencia?: string | null;
  formandoNumFilhos?: number | null;

  formulario: Record<string, unknown>;
  geradoEm: string;
}
