import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/users-store";
import { validatePassword } from "@/lib/password-validation";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

const PRIVACY_VERSION = "1.0";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = limiters.register(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const body = await request.json() as {
      orgNome?: string;
      adminEmail?: string;
      adminNome?: string;
      senha?: string;
      aceitouPrivacidade?: boolean;
    };

    const { orgNome, adminEmail, adminNome, senha, aceitouPrivacidade } = body;

    if (!orgNome?.trim() || !adminEmail?.trim() || !adminNome?.trim() || !senha) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
    }

    if (!aceitouPrivacidade) {
      return NextResponse.json(
        { error: "É necessário aceitar a Política de Privacidade" },
        { status: 400 }
      );
    }

    const pwValidation = validatePassword(senha);
    if (!pwValidation.valid) {
      return NextResponse.json(
        { error: `Senha inválida: ${pwValidation.errors.join("; ")}` },
        { status: 400 }
      );
    }

    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 14);

    // Hash computado antes da transação para não bloquear a conexão com operação CPU-intensiva
    const passwordHash = hashPassword(senha);

    const { org, usuario } = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.usuario.findFirst({
        where: { email: { equals: adminEmail.toLowerCase().trim(), mode: "insensitive" } },
      });
      if (existingUser) throw new Error("EMAIL_EXISTS");

      const newOrg = await tx.organizacao.create({
        data: {
          nome: orgNome.trim(),
          status: "TRIAL",
          planoAssinatura: "GRATUITO",
          trialExpiresAt,
          privacyVersion: PRIVACY_VERSION,
        },
      });

      const newUsuario = await tx.usuario.create({
        data: {
          organizacaoId: newOrg.id,
          nome: adminNome.trim(),
          email: adminEmail.toLowerCase().trim(),
          passwordHash,
          perfil: "administrador",
          ativo: true,
          primeiroAcesso: false,
        },
      });

      await tx.privacyAcceptance.create({
        data: {
          usuarioId: newUsuario.id,
          organizacaoId: newOrg.id,
          tipo: "privacidade",
          versao: PRIVACY_VERSION,
        },
      });

      return { org: newOrg, usuario: newUsuario };
    });

    logAction(
      "organizacao_created",
      usuario.id,
      getClientIp(request),
      { orgNome: org.nome, adminEmail },
      org.id
    );

    return NextResponse.json(
      { organizacaoId: org.id, usuarioId: usuario.id, email: usuario.email },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "E-mail já cadastrado na plataforma" }, { status: 409 });
    }
    console.error("[registro] Erro:", err);
    return NextResponse.json({ error: "Falha ao criar organização" }, { status: 500 });
  }
}
