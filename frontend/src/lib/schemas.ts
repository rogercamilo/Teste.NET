import { z } from "zod";

// ── Enums compartilhados ──────────────────────────────────────────────────────

export const NivelFormativoEnum = z.enum([
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
]);

export const EstadoCivilEnum = z.enum(["solteiro", "casado", "divorciado", "viuvo"]);

export const ModalidadeEnum = z.enum(["presencial", "online", "hibrida"]);

export const PerfilEnum = z.enum([
  "formador_comunitario",
  "administrador",
  "formador_geral",
]);

export const StatusAgendamentoEnum = z.enum([
  "agendada",
  "confirmada",
  "realizada",
  "cancelada",
  "reagendada",
]);

export const TipoFormacaoEnum = z.enum([
  "comunitaria",
  "retiro-comunitario",
  "retiro-pessoal",
]);

export const MotivoInatividadeEnum = z.enum([
  "desligamento-voluntario",
  "desligamento-compulsorio",
  "licenca",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

const nonEmptyString = (max = 500) =>
  z.string().min(1, "Campo obrigatório").max(max, `Máximo ${max} caracteres`).trim();

const optionalString = (max = 500) =>
  z.string().max(max, `Máximo ${max} caracteres`).trim().optional();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)");

const isoDatetime = z
  .string()
  .refine((s) => !isNaN(Date.parse(s)), { message: "Data/hora inválida" });

// ── Usuário ───────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  nome: nonEmptyString(255),
  email: z.string().email("E-mail inválido").max(255),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(128).optional(),
  perfil: PerfilEnum.optional(),
  moradaId: z.string().cuid("ID inválido").optional().or(z.literal("")).transform((v) => v || undefined),
  ativo: z.boolean().optional(),
});

export const UpdateUserSchema = z.object({
  nome: nonEmptyString(255).optional(),
  email: z.string().email("E-mail inválido").max(255).optional(),
  perfil: PerfilEnum.optional(),
  moradaId: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

// ── Formando ──────────────────────────────────────────────────────────────────

export const CreateFormandoSchema = z.object({
  nome: nonEmptyString(255),
  dataNascimento: isoDate,
  estadoCivil: EstadoCivilEnum.optional(),
  modalidade: ModalidadeEnum.optional(),
  nivelFormativo: NivelFormativoEnum.optional(),
  dataIngresso: isoDate.optional(),
  telefone: z.string().max(30).optional().default(""),
  email: z.string().email("E-mail inválido").max(255).optional().or(z.literal("")).default(""),
  ativo: z.boolean().optional(),
  motivoInatividade: MotivoInatividadeEnum.optional().nullable(),
  foto: z.string().url("URL inválida").max(2048).optional().nullable(),
  turmaId: z.string().optional().nullable(),
  moradaId: z.string().optional().nullable(),
  totalFormacoes: z.number().int().min(0).optional(),
  formacoesRealizadas: z.number().int().min(0).optional(),
  progressoEtapas: z
    .array(
      z.object({
        nivel: NivelFormativoEnum,
        formacoesComunitariasRealizadas: z.number().int().min(0).optional(),
        retirosComunitariosRealizados: z.number().int().min(0).optional(),
        retirosPessoaisRealizados: z.number().int().min(0).optional(),
        iniciouEm: isoDate.optional(),
        concluiuEm: isoDate.optional(),
      })
    )
    .optional(),
});

export const UpdateFormandoSchema = CreateFormandoSchema.partial();

// ── Morada ────────────────────────────────────────────────────────────────────

export const CreateMoradaSchema = z.object({
  nome: nonEmptyString(255),
  localReuniao: optionalString(500),
  nivelFormativo: NivelFormativoEnum.optional(),
  formadorId: z.string().optional().nullable(),
  planoId: z.string().optional().nullable(),
  gradeId: z.string().optional().nullable(),
  vigenciaInicio: isoDate.optional().nullable(),
  vigenciaFim: isoDate.optional().nullable(),
  ativo: z.boolean().optional(),
});

export const UpdateMoradaSchema = CreateMoradaSchema.partial();

// ── Organização ───────────────────────────────────────────────────────────────

export const UpdateOrganizacaoSchema = z.object({
  nome: nonEmptyString(255).optional(),
  descricao: optionalString(2000).nullable(),
  endereco: optionalString(500).nullable(),
  missao: optionalString(2000).nullable(),
  anoFundacao: z
    .string()
    .max(4)
    .regex(/^\d{0,4}$/, "Ano inválido")
    .optional()
    .nullable(),
  termoMorada: nonEmptyString(100).optional(),
  termoFormando: nonEmptyString(100).optional(),
  termoFormador: nonEmptyString(100).optional(),
  termoPreDiscipulado: nonEmptyString(100).optional(),
  termoDiscipulado: nonEmptyString(100).optional(),
  termoPrimeirasPromessas: nonEmptyString(100).optional(),
  termoFormacaoPermanente: nonEmptyString(100).optional(),
  nomePlataforma: optionalString(100).nullable(),
  logoUrl: z
    .string()
    .max(2_000_000, "Logo muito grande (máximo ~1.5 MB em base64)")
    .refine(
      (v) => v.startsWith("data:image/") || v.startsWith("https://"),
      { message: "logoUrl deve ser uma data URL de imagem ou URL HTTPS" }
    )
    .optional()
    .nullable(),
  temaCor: z.string().max(50).optional(),
  onboardingConcluido: z.boolean().optional(),
});

// ── Convite ───────────────────────────────────────────────────────────────────

export const CreateConviteSchema = z.object({
  email: z.string().email("E-mail inválido").max(255),
  nome: nonEmptyString(255),
  perfil: PerfilEnum,
  moradaId: z.string().optional().nullable(),
});

// ── Agendamento ───────────────────────────────────────────────────────────────

export const CreateAgendamentoSchema = z.object({
  formacaoId: z.string().min(1, "formacaoId obrigatório"),
  formacaoTema: optionalString(500).default(""),
  nivelFormativo: NivelFormativoEnum.optional(),
  tipoFormacao: TipoFormacaoEnum.optional(),
  dataInicio: isoDatetime,
  dataFim: isoDatetime.optional(),
  local: optionalString(500).nullable(),
  linkOnline: z.string().url("URL inválida").max(2048).optional().nullable(),
  status: StatusAgendamentoEnum.optional(),
  participantes: z.number().int().min(0).optional(),
  observacoes: optionalString(2000).nullable(),
  googleCalendarEventId: optionalString(255).nullable(),
});

export const UpdateAgendamentoSchema = CreateAgendamentoSchema.partial();

// ── Formação ──────────────────────────────────────────────────────────────────

export const UpdateFormacaoSchema = z.object({
  tema: nonEmptyString(500).optional(),
  objetivo: optionalString(2000),
  descricao: optionalString(2000),
  nivelFormativo: NivelFormativoEnum.optional(),
  tipoFormacao: TipoFormacaoEnum.optional(),
  eixoId: z.string().optional().nullable(),
  eixoNome: optionalString(255).nullable(),
  etapaId: z.string().optional().nullable(),
  etapaNome: optionalString(255).nullable(),
  formadorNome: optionalString(255),
  cargaHoraria: z.number().int().min(0).optional(),
  modalidade: ModalidadeEnum.optional(),
  materialApoio: optionalString(2000).nullable(),
  documentoAnexo: optionalString(500).nullable(),
  documentoAnexoId: optionalString(255).nullable(),
  gradeId: z.string().optional().nullable(),
  gradeNome: optionalString(255).nullable(),
  vezesUtilizada: z.number().int().min(0).optional(),
});

// ── Formação (criação) ────────────────────────────────────────────────────────

export const CreateFormacaoSchema = UpdateFormacaoSchema.extend({
  tema: nonEmptyString(500),
});

// ── Plano Formativo ───────────────────────────────────────────────────────────

export const StatusPlanoEnum = z.enum(["rascunho", "em-revisao", "ativo", "arquivado"]);

export const EixoPlanoSchema = z.object({
  nome: nonEmptyString(255),
  objetivo: optionalString(2000).default(""),
  intervaloEncontros: optionalString(100).default(""),
  cargaHoraria: z.number().int().min(0).default(0),
  areaFormacao: optionalString(255).default(""),
});

export const UpdatePlanoSchema = z.object({
  nome: nonEmptyString(500).optional(),
  objetivos: optionalString(2000),
  fundamentacao: optionalString(2000),
  nivelFormativo: NivelFormativoEnum.optional(),
  vigenciaInicio: isoDate.optional(),
  vigenciaFim: isoDate.optional(),
  status: StatusPlanoEnum.optional(),
  documentoAnexo: optionalString(500).nullable(),
  documentoAnexoId: optionalString(255).nullable(),
  eixos: z.array(EixoPlanoSchema).optional(),
});

// ── Evento Formando ───────────────────────────────────────────────────────────

export const TipoEventoEnum = z.enum([
  "avaliacao-adesao",
  "solicitacao-desligamento",
  "desligamento",
  "licenca",
]);

export const NotaAdesaoEnum = z.enum(["otima", "boa", "regular", "insuficiente"]);
export const TipoDesligamentoEnum = z.enum(["voluntario", "compulsorio"]);

export const CreateEventoSchema = z.object({
  formandoId: z.string().min(1, "formandoId obrigatório"),
  tipo: TipoEventoEnum,
  periodoInicio: isoDate.optional(),
  periodoFim: isoDate.optional(),
  notaAdesao: NotaAdesaoEnum.optional().nullable(),
  textoAvaliacao: optionalString(5000).nullable(),
  motivo: optionalString(2000).nullable(),
  tipoDesligamento: TipoDesligamentoEnum.optional().nullable(),
  dataEfetiva: isoDate.optional(),
  checklistDevolveuEstatuto: z.boolean().optional().nullable(),
  checklistDevolveuSacramental: z.boolean().optional().nullable(),
  checklistApresentouCarta: z.boolean().optional().nullable(),
  checklistAcompanhadoModerador: z.boolean().optional().nullable(),
  dataInicioLicenca: isoDate.optional(),
  dataFimLicenca: isoDate.optional(),
});

// ── Comentário ────────────────────────────────────────────────────────────────

export const TipoComentarioEnum = z.enum(["adesao", "dificuldade", "progresso", "observacao"]);

export const UpdateComentarioSchema = z.object({
  texto: z.string().min(1, "Texto obrigatório").max(5000, "Máximo 5000 caracteres").trim(),
  tipo: TipoComentarioEnum.optional(),
});

// ── Email Template ────────────────────────────────────────────────────────────

const PassoEmailSchema = z.object({
  titulo: z.string().max(200).trim(),
  descricao: z.string().max(500).trim(),
});

export const EmailTemplateSchema = z.object({
  assunto: z.string().max(255).trim().optional(),
  saudacao: z.string().max(500).trim().optional(),
  mensagem1: z.string().max(2000).trim().optional(),
  mensagem2: z.string().max(2000).trim().optional(),
  passos: z.array(PassoEmailSchema).max(10).optional(),
  textoBotao: z.string().max(100).trim().optional(),
  avisoSeguranca: z.string().max(1000).trim().optional(),
  rodape: z.string().max(500).trim().optional(),
});

// ── Registro de organização ───────────────────────────────────────────────────

export const RegistroSchema = z.object({
  orgNome: z.string().min(2, "Nome da organização deve ter ao menos 2 caracteres").max(255).trim(),
  adminEmail: z.string().email("E-mail inválido").max(255),
  adminNome: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(255).trim(),
  senha: z.string().min(8).max(128),
  aceitouPrivacidade: z.boolean().optional(),
  aceitouTermos: z.boolean().optional(),
});

// ── Validação de IDs ─────────────────────────────────────────────────────────

export function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(id);
}

// ── Helpers de resposta ───────────────────────────────────────────────────────

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first.path.join(".");
    return { ok: false, error: field ? `${field}: ${first.message}` : first.message };
  }
  return { ok: true, data: result.data };
}
