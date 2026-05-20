import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/users-store";
import { validatePassword } from "@/lib/password-validation";
import { logAction, getClientIp } from "@/lib/audit-log";

const PRIVACY_VERSION = "1.0";

export async function POST(request: Request) {
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

    // Verificar se e-mail já está em uso em qualquer organização
    const existingUser = await prisma.usuario.findFirst({
      where: { email: { equals: adminEmail.toLowerCase().trim(), mode: "insensitive" } },
    });
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado na plataforma" }, { status: 409 });
    }

    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 14);

    const org = await prisma.organizacao.create({
      data: {
        nome: orgNome.trim(),
        status: "TRIAL",
        planoAssinatura: "GRATUITO",
        trialExpiresAt,
        privacyVersion: PRIVACY_VERSION,
      },
    });

    const usuario = await prisma.usuario.create({
      data: {
        organizacaoId: org.id,
        nome: adminNome.trim(),
        email: adminEmail.toLowerCase().trim(),
        passwordHash: hashPassword(senha),
        perfil: "administrador",
        ativo: true,
        primeiroAcesso: false,
      },
    });

    await prisma.privacyAcceptance.create({
      data: {
        usuarioId: usuario.id,
        organizacaoId: org.id,
        tipo: "privacidade",
        versao: PRIVACY_VERSION,
      },
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
    console.error("[registro] Erro:", err);
    return NextResponse.json({ error: "Falha ao criar organização" }, { status: 500 });
  }
}
