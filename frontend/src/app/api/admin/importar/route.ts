/**
 * D2.5 — Importação de dados do localStorage para PostgreSQL.
 * Endpoint exclusivo para administradores: recebe JSON exportado do browser
 * e cria/atualiza registros no banco com upsert (idempotente).
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { NivelFormativoEnum, EstadoCivilEnum, ModalidadeEnum, TipoComentarioEnum } from "@/lib/schemas";
import { SessionUser as SU } from "@/lib/auth-helpers";

const NIVEL_FORMATIVO_VALUES = NivelFormativoEnum.options;
const ESTADO_CIVIL_VALUES = EstadoCivilEnum.options;
const MODALIDADE_VALUES = ModalidadeEnum.options;
const TIPO_COMENTARIO_VALUES = TipoComentarioEnum.options;

function validEnum<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

interface ImportPayload {
  gruposFormacao?: unknown[];
  moradas?: unknown[]; // compat legado
  formandos?: unknown[];
  comentarios?: unknown[];
}

// Importação restrita a administrador — formador_geral não tem acesso a esta operação destrutiva
function isOnlyAdmin(role?: string) { return role === "administrador"; }

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isOnlyAdmin(user.role)) return NextResponse.json({ error: "Apenas administradores podem importar dados" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  let body: ImportPayload;
  try {
    const rawText = await request.text();
    if (Buffer.byteLength(rawText, "utf8") > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "Payload excede o limite de 5 MB" }, { status: 413 });
    }
    body = JSON.parse(rawText) as ImportPayload;
  } catch (err) {
    logError("admin/importar parse", err);
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const orgId = user.organizacaoId;
  const results: Record<string, number> = {};

  try {
    // Moradas — skip IDs already in this org; createMany handles true duplicates
    if (Array.isArray(body.gruposFormacao) && body.gruposFormacao.length > 0) {
      const validRows = (body.gruposFormacao as Record<string, unknown>[]).filter(
        (row) => row.id && row.nome && row.nivelFormativo
      );
      if (validRows.length > 0) {
        const ids = validRows.map((r) => String(r.id));
        const existing = await prisma.grupoFormacao.findMany({ where: { id: { in: ids }, organizacaoId: orgId }, select: { id: true } });
        const existingIds = new Set(existing.map((r) => r.id));
        const toCreate = validRows.filter((r) => !existingIds.has(String(r.id)));
        if (toCreate.length > 0) {
          await prisma.grupoFormacao.createMany({
            data: toCreate.map((row) => ({
              id: String(row.id),
              organizacaoId: orgId,
              nome: String(row.nome),
              localReuniao: row.localReuniao ? String(row.localReuniao) : null,
              nivelFormativo: String(row.nivelFormativo),
              ativo: row.ativo !== false,
            })),
            skipDuplicates: true,
          });
        }
      }
      results.gruposFormacao = validRows.length;
    }

    // Formandos — skip IDs already in this org; createMany handles true duplicates
    if (Array.isArray(body.formandos) && body.formandos.length > 0) {
      const validRows = (body.formandos as Record<string, unknown>[]).filter(
        (row) => row.id && row.nome
      );
      if (validRows.length > 0) {
        const ids = validRows.map((r) => String(r.id));
        const existing = await prisma.formando.findMany({ where: { id: { in: ids }, organizacaoId: orgId }, select: { id: true } });
        const existingIds = new Set(existing.map((r) => r.id));
        const toCreate = validRows.filter((r) => !existingIds.has(String(r.id)));
        if (toCreate.length > 0) {
          await prisma.formando.createMany({
            data: toCreate.map((row) => ({
              id: String(row.id),
              organizacaoId: orgId,
              nome: String(row.nome),
              dataNascimento: row.dataNascimento ? new Date(String(row.dataNascimento)) : new Date("2000-01-01"),
              estadoCivil: validEnum(row.estadoCivil, ESTADO_CIVIL_VALUES, "solteiro"),
              modalidade: validEnum(row.modalidade, MODALIDADE_VALUES, "presencial"),
              nivelFormativo: validEnum(row.nivelFormativo, NIVEL_FORMATIVO_VALUES, "pre-discipulado"),
              dataIngresso: row.dataIngresso ? new Date(String(row.dataIngresso)) : new Date(),
              telefone: row.telefone ? String(row.telefone) : "",
              email: row.email ? String(row.email) : "",
              ativo: row.ativo !== false,
              grupoFormacaoId: row.grupoFormacaoId ? String(row.grupoFormacaoId) : null,
            })),
            skipDuplicates: true,
          });
        }
      }
      results.formandos = validRows.length;
    }

    // Comentários — verifica FKs em batch para evitar N+1
    if (Array.isArray(body.comentarios) && body.comentarios.length > 0) {
      const validRows = (body.comentarios as Record<string, unknown>[]).filter(
        (row) => row.id && row.formandoId && row.formadorId && row.texto
      );

      if (validRows.length > 0) {
        const formandoIds = [...new Set(validRows.map((r) => String(r.formandoId)))];
        const formadorIds = [...new Set(validRows.map((r) => String(r.formadorId)))];

        const [existingFormandos, existingFormadores] = await Promise.all([
          prisma.formando.findMany({ where: { id: { in: formandoIds }, organizacaoId: orgId }, select: { id: true } }),
          prisma.usuario.findMany({ where: { id: { in: formadorIds }, organizacaoId: orgId }, select: { id: true } }),
        ]);
        const validFormandoIds = new Set(existingFormandos.map((f) => f.id));
        const validFormadorIds = new Set(existingFormadores.map((f) => f.id));

        let count = 0;
        for (const row of validRows) {
          if (!validFormandoIds.has(String(row.formandoId)) || !validFormadorIds.has(String(row.formadorId))) continue;
          await prisma.comentarioFormando.upsert({
            where: { id: String(row.id) },
            update: {},
            create: {
              id: String(row.id),
              organizacaoId: orgId,
              formandoId: String(row.formandoId),
              formandoNome: row.formandoNome ? String(row.formandoNome) : "",
              formadorId: String(row.formadorId),
              formadorNome: row.formadorNome ? String(row.formadorNome) : null,
              texto: String(row.texto),
              tipo: validEnum(row.tipo, TIPO_COMENTARIO_VALUES, "observacao"),
            },
          });
          count++;
        }
        results.comentarios = count;
      }
    }

    logAction(
      "dados_importados",
      user.id,
      getClientIp(request),
      { totais: results },
      orgId
    );

    return NextResponse.json({ ok: true, importados: results });
  } catch (err) {
    logError("admin/importar", err);
    return NextResponse.json({ error: "Falha durante a importação" }, { status: 500 });
  }
}
