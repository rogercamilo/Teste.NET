import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/users-store";
import { validatePassword } from "@/lib/password-validation";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

type Params = { params: Promise<{ token: string }> };

// Raw token is 32 random bytes encoded as 64 hex chars
const TOKEN_RE = /^[0-9a-f]{64}$/i;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const ip = getClientIp(request);

  const rl = await limiters.conviteAccept(ip);
  if (!rl.allowed) return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });

  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

  const convite = await prisma.conviteUsuario.findFirst({
    where: { token: hashToken(token) },
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
  const ip = getClientIp(request);

  const rl = await limiters.conviteAccept(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

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

    // Hash computado antes da transação para não bloquear a conexão com operação CPU-intensiva
    const passwordHash = await hashPassword(senha);
    const tokenHash = hashToken(token);

    const { usuario, convite } = await prisma.$transaction(async (tx) => {
      const found = await tx.conviteUsuario.findFirst({ where: { token: tokenHash } });
      if (!found) throw new Error("NOT_FOUND");
      if (found.aceitoEm) throw new Error("ALREADY_ACCEPTED");
      if (found.expiresAt < new Date()) throw new Error("EXPIRED");

      const existing = await tx.usuario.findFirst({
        where: { email: { equals: found.email, mode: "insensitive" }, organizacaoId: found.organizacaoId },
      });
      if (existing) throw new Error("EMAIL_EXISTS");

      // Atomic claim — only succeeds if aceitoEm is still null
      const claimed = await tx.conviteUsuario.updateMany({
        where: { id: found.id, aceitoEm: null },
        data: { aceitoEm: new Date() },
      });
      if (claimed.count === 0) throw new Error("ALREADY_ACCEPTED");

      const newUsuario = await tx.usuario.create({
        data: {
          organizacaoId: found.organizacaoId,
          nome: nome?.trim() || found.nome,
          email: found.email,
          passwordHash,
          perfil: found.perfil,
          grupoFormacaoId: found.grupoFormacaoId ?? null,
          ativo: true,
          primeiroAcesso: false,
        },
      });

      return { usuario: newUsuario, convite: found };
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
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
      if (err.message === "ALREADY_ACCEPTED") return NextResponse.json({ error: "Convite já foi aceito" }, { status: 410 });
      if (err.message === "EXPIRED") return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
      if (err.message === "EMAIL_EXISTS") return NextResponse.json({ error: "Não foi possível completar o cadastro. Verifique os dados e tente novamente." }, { status: 409 });
    }
    logError("convites/[token]", err);
    return NextResponse.json({ error: "Falha ao aceitar convite" }, { status: 500 });
  }
}
