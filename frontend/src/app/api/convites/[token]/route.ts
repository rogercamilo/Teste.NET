import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/users-store";
import { validatePassword } from "@/lib/password-validation";
import { logAction, getClientIp } from "@/lib/audit-log";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;

  const convite = await prisma.conviteUsuario.findFirst({
    where: { token },
    select: {
      id: true, email: true, nome: true, perfil: true, expiresAt: true, aceitoEm: true,
      organizacao: { select: { nome: true } },
    },
  });

  if (!convite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (convite.aceitoEm) return NextResponse.json({ error: "Convite já foi aceito" }, { status: 410 });
  if (convite.expiresAt < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });

  return NextResponse.json({
    email: convite.email,
    nome: convite.nome,
    perfil: convite.perfil,
    orgNome: convite.organizacao.nome,
  });
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;

  try {
    const body = await request.json() as { senha?: string; nome?: string };
    const { senha, nome } = body;

    if (!senha) return NextResponse.json({ error: "Senha é obrigatória" }, { status: 400 });

    const pwValidation = validatePassword(senha);
    if (!pwValidation.valid) {
      return NextResponse.json(
        { error: `Senha inválida: ${pwValidation.errors.join("; ")}` },
        { status: 400 }
      );
    }

    const convite = await prisma.conviteUsuario.findFirst({
      where: { token },
    });

    if (!convite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
    if (convite.aceitoEm) return NextResponse.json({ error: "Convite já foi aceito" }, { status: 410 });
    if (convite.expiresAt < new Date()) return NextResponse.json({ error: "Convite expirado" }, { status: 410 });

    const existing = await prisma.usuario.findFirst({
      where: { email: { equals: convite.email, mode: "insensitive" }, organizacaoId: convite.organizacaoId },
    });
    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário com este e-mail" }, { status: 409 });
    }

    const usuario = await prisma.usuario.create({
      data: {
        organizacaoId: convite.organizacaoId,
        nome: nome?.trim() || convite.nome,
        email: convite.email,
        passwordHash: hashPassword(senha),
        perfil: convite.perfil,
        moradaId: convite.moradaId ?? null,
        ativo: true,
        primeiroAcesso: false,
      },
    });

    await prisma.conviteUsuario.update({
      where: { id: convite.id },
      data: { aceitoEm: new Date() },
    });

    logAction(
      "convite_aceito",
      usuario.id,
      getClientIp(request),
      { email: usuario.email },
      convite.organizacaoId
    );

    return NextResponse.json({ ok: true, email: usuario.email });
  } catch (err) {
    console.error("[convite/token] Erro:", err);
    return NextResponse.json({ error: "Falha ao aceitar convite" }, { status: 500 });
  }
}
