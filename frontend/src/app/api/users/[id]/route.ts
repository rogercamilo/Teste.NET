import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findById, updateUser, deleteUser, toPublic, EmailConflictError } from "@/lib/users-store";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isAdminOrAbove, SessionUser } from "@/lib/auth-helpers";
import { PerfilEnum } from "@/lib/schemas";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

// Fonte única dos perfis atribuíveis (mesma da criação) — evita drift como o que
// deixava "formador_pedagogico" fora e quebrava a edição com "Perfil inválido".
type AssignablePerfil = z.infer<typeof PerfilEnum>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(request: Request, ctx: Ctx) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;

  if (!actor?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(actor.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (!actor.organizacaoId) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  const rl = await limiters.mutation(actor.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;

    // Allowlist explícita — rejeita campos não autorizados
    const nome = typeof body.nome === "string" ? body.nome.trim() : undefined;
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    const perfilRaw = body.perfil as string | undefined;
    // null = desatribuir grupo; string = atribuir; undefined = sem alteração
    const grupoFormacaoId: string | null | undefined =
      body.grupoFormacaoId === null ? null
      : typeof body.grupoFormacaoId === "string" ? body.grupoFormacaoId
      : undefined;
    const ativo = typeof body.ativo === "boolean" ? body.ativo : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    // null = remover foto; string = definir key/data URL; undefined = sem alteração
    const foto: string | null | undefined =
      body.foto === null ? null
      : typeof body.foto === "string" ? body.foto
      : undefined;

    if (nome !== undefined && (nome.length === 0 || nome.length > 255)) {
      return NextResponse.json({ error: "Nome deve ter entre 1 e 255 caracteres" }, { status: 400 });
    }
    if (email !== undefined && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }
    if (perfilRaw !== undefined && !PerfilEnum.safeParse(perfilRaw).success) {
      return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
    }
    const perfil = perfilRaw as AssignablePerfil | undefined;

    // Paridade com a criação (CreateUserSchema exige mín. 8): sem isso, a edição
    // aceitava definir senhas fracas de 1 caractere, contornando a política.
    if (password !== undefined && (password.length < 8 || password.length > 128)) {
      return NextResponse.json({ error: "Senha deve ter entre 8 e 128 caracteres" }, { status: 400 });
    }

    const target = await findById(id, actor.organizacaoId);
    if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if ((target.perfil as string) === "super_admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Guarda de auto-bloqueio: espelha a proteção do DELETE (não excluir a própria
    // conta). Um admin não pode se desativar nem se rebaixar para um perfil sem
    // acesso de gestão pela própria edição — evita a org ficar sem quem administre.
    if (id === actor.id) {
      if (ativo === false) {
        return NextResponse.json({ error: "Não é possível desativar a própria conta" }, { status: 400 });
      }
      if (perfil !== undefined && !isAdminOrAbove(perfil)) {
        return NextResponse.json({ error: "Não é possível rebaixar o próprio perfil de gestão" }, { status: 400 });
      }
    }

    // Quando o admin define uma senha explícita pela edição, ela é definitiva:
    // limpa primeiroAcesso para o usuário não cair no modal de "defina sua senha"
    // ao logar. Consistente com a criação (senha explícita ⇒ primeiroAcesso=false)
    // e com a troca self-service (change-password também zera o flag).
    const primeiroAcesso = password ? false : undefined;

    const updated = await updateUser(id, { nome, email, perfil, grupoFormacaoId, ativo, foto, password, primeiroAcesso, organizacaoId: actor.organizacaoId });
    if (!updated) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    logAction("user_updated", actor.id, getClientIp(request), { targetId: id }, actor.organizacaoId);
    return NextResponse.json(toPublic(updated));
  } catch (err) {
    if (err instanceof EmailConflictError) {
      return NextResponse.json({ error: "E-mail já está em uso" }, { status: 409 });
    }
    logError("users/[id] PUT", err);
    return NextResponse.json({ error: "Falha ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;

  if (!actor?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(actor.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (!actor.organizacaoId) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  const rl = await limiters.mutation(actor.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const { id } = await ctx.params;

    if (id === actor.id) {
      return NextResponse.json({ error: "Não é possível excluir a própria conta por esta rota" }, { status: 400 });
    }

    const target = await findById(id, actor.organizacaoId);
    if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    if ((target.perfil as string) === "super_admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const ok = await deleteUser(id, actor.organizacaoId);
    if (!ok) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    logAction("user_deleted", actor.id, getClientIp(request), { targetId: id }, actor.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logError("users/[id] DELETE", err);
    return NextResponse.json({ error: "Falha ao excluir usuário" }, { status: 500 });
  }
}
