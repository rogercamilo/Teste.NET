/**
 * D2.5 — Importação de dados do localStorage para PostgreSQL.
 * Endpoint exclusivo para administradores: recebe JSON exportado do browser
 * e cria/atualiza registros no banco com upsert (idempotente).
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";

type SU = { id?: string; role?: string; organizacaoId?: string };

interface ImportPayload {
  moradas?: unknown[];
  formandos?: unknown[];
  agendamentos?: unknown[];
  comentarios?: unknown[];
  presencas?: unknown[];
  eventos?: unknown[];
}

function isAdmin(role?: string) { return role === "administrador"; }

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Apenas administradores podem importar dados" }, { status: 403 });

  let body: ImportPayload;
  try {
    body = await request.json() as ImportPayload;
  } catch (err) {
    console.error("[api]", err);
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const orgId = user.organizacaoId;
  const results: Record<string, number> = {};

  try {
    // Moradas
    if (Array.isArray(body.moradas) && body.moradas.length > 0) {
      let count = 0;
      for (const m of body.moradas) {
        const row = m as Record<string, unknown>;
        if (!row.id || !row.nome || !row.nivelFormativo) continue;
        await prisma.morada.upsert({
          where: { id: String(row.id) },
          update: {},
          create: {
            id: String(row.id),
            organizacaoId: orgId,
            nome: String(row.nome),
            localReuniao: row.localReuniao ? String(row.localReuniao) : null,
            nivelFormativo: String(row.nivelFormativo),
            ativo: row.ativo !== false,
          },
        });
        count++;
      }
      results.moradas = count;
    }

    // Formandos
    if (Array.isArray(body.formandos) && body.formandos.length > 0) {
      let count = 0;
      for (const f of body.formandos) {
        const row = f as Record<string, unknown>;
        if (!row.id || !row.nome) continue;
        await prisma.formando.upsert({
          where: { id: String(row.id) },
          update: {},
          create: {
            id: String(row.id),
            organizacaoId: orgId,
            nome: String(row.nome),
            dataNascimento: row.dataNascimento ? new Date(String(row.dataNascimento)) : new Date("2000-01-01"),
            estadoCivil: row.estadoCivil ? String(row.estadoCivil) : "solteiro",
            modalidade: row.modalidade ? String(row.modalidade) : "presencial",
            nivelFormativo: row.nivelFormativo ? String(row.nivelFormativo) : "pre-discipulado",
            dataIngresso: row.dataIngresso ? new Date(String(row.dataIngresso)) : new Date(),
            telefone: row.telefone ? String(row.telefone) : "",
            email: row.email ? String(row.email) : "",
            ativo: row.ativo !== false,
            moradaId: row.moradaId ? String(row.moradaId) : null,
          },
        });
        count++;
      }
      results.formandos = count;
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
              tipo: row.tipo ? String(row.tipo) : "observacao",
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
    console.error("Erro na importação:", err);
    return NextResponse.json({ error: "Falha durante a importação" }, { status: 500 });
  }
}
