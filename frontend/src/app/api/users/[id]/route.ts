import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findById, updateUser, deleteUser, toPublic } from "@/lib/users-store";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isAdminOrAbove } from "@/types";
type Ctx = { params: Promise<{ id: string }> };

type AssignablePerfil = "administrador" | "formador_comunitario";
const VALID_PERFIS: AssignablePerfil[] = ["administrador", "formador_comunitario"];

export async function PUT(request: Request, ctx: Ctx) {
  const session = await auth();
  const actor = session?.user;

  if (!actor) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(actor.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rlPut = await limiters.mutation(actor.id ?? "unknown");
  if (!rlPut.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const { id } = await ctx.params;
    const body = await request.json() as Record<string, unknown>;

    // Allowlist explícita — rejeita campos não autorizados
    const nome = typeof body.nome === "string" ? body.nome.trim() : undefined;
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    const perfilRaw = body.perfil as string | undefined;
    const moradaId = typeof body.moradaId === "string" ? body.moradaId : (body.moradaId === null ? undefined : undefined);
    const ativo = typeof body.ativo === "boolean" ? body.ativo : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;

    if (nome !== undefined && (nome.length === 0 || nome.length > 255)) {
      return NextResponse.json({ error: "Nome deve ter entre 1 e 255 caracteres" }, { status: 400 });
    }
    if (perfilRaw !== undefined && !VALID_PERFIS.includes(perfilRaw as AssignablePerfil)) {
      return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
    }
    const perfil = perfilRaw as AssignablePerfil | undefined;
    const orgId = actor.organizacaoId;
    if (!orgId) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    const target = await findById(id, orgId);
    if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if ((target.perfil as string) === "super_admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const updated = await updateUser(id, { nome, email, perfil, moradaId, ativo, password, organizacaoId: orgId });
    if (!updated) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    logAction("user_updated", actor.id ?? undefined, getClientIp(request), { targetId: id }, orgId);
    return NextResponse.json(toPublic(updated));
  } catch (err) {
    logError("users/[id] PUT", err);
    return NextResponse.json({ error: "Falha ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await auth();
  const actor = session?.user;

  if (!actor) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(actor.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rlDel = await limiters.mutation(actor.id ?? "unknown");
  if (!rlDel.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const { id } = await ctx.params;
    const orgId = actor.organizacaoId;
    if (!orgId) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    if (id === actor.id) {
      return NextResponse.json({ error: "Não é possível excluir a própria conta por esta rota" }, { status: 400 });
    }

    const target = await findById(id, orgId);
    if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if ((target.perfil as string) === "super_admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const ok = await deleteUser(id, orgId);
    if (!ok) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    logAction("user_deleted", actor.id ?? undefined, getClientIp(request), { targetId: id }, orgId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logError("users/[id] DELETE", err);
    return NextResponse.json({ error: "Falha ao excluir usuário" }, { status: 500 });
  }
}
