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
  logoUrl: z.string().url("URL inválida").max(2048).optional().nullable(),
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
