import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/users-store";
import { validatePassword } from "@/lib/password-validation";
import { logAction, getClientIp, anonymizeIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-versions";
import { RegistroSchema, parseBody } from "@/lib/schemas";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await limiters.register(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const parsed = parseBody(RegistroSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { orgNome, adminEmail, adminNome, senha, aceitouPrivacidade } = parsed.data;

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
    const passwordHash = await hashPassword(senha);
    const ipAnon = anonymizeIp(ip);

    const { org, usuario } = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.usuario.findFirst({
        where: { email: { equals: adminEmail.toLowerCase().trim(), mode: "insensitive" } },
      });
      if (existingUser) throw new Error("EMAIL_EXISTS");

      // Em Phase 2 (single-tenant), força o ID do org para DEFAULT_ORG_ID
      // para garantir que o tenant seja sempre o mesmo.
      const defaultOrgId = process.env.DEFAULT_ORG_ID;
      const newOrg = await tx.organizacao.create({
        data: {
          ...(defaultOrgId ? { id: defaultOrgId } : {}),
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

      // Registra aceite da Política de Privacidade com IP anonimizado (art. 7º Marco Civil)
      await tx.privacyAcceptance.create({
        data: {
          usuarioId: newUsuario.id,
          organizacaoId: newOrg.id,
          tipo: "privacidade",
          versao: PRIVACY_VERSION,
          ip: ipAnon,
        },
      });

      // Registra aceite dos Termos de Uso com IP anonimizado (validade jurídica — cláusula 1)
      await tx.privacyAcceptance.create({
        data: {
          usuarioId: newUsuario.id,
          organizacaoId: newOrg.id,
          tipo: "termos",
          versao: TERMS_VERSION,
          ip: ipAnon,
        },
      });

      return { org: newOrg, usuario: newUsuario };
    });

    logAction("privacy_accepted", usuario.id, ip, { versao: PRIVACY_VERSION }, org.id);
    logAction("terms_accepted", usuario.id, ip, { versao: TERMS_VERSION }, org.id);
    logAction("organizacao_created", usuario.id, ip, { orgNome: org.nome, adminEmail }, org.id);

    return NextResponse.json(
      { organizacaoId: org.id, usuarioId: usuario.id, email: usuario.email },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "Não foi possível completar o cadastro. Verifique os dados e tente novamente." }, { status: 409 });
    }
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Organização já cadastrada. Faça login." }, { status: 409 });
    }
    logError("registro", err);
    return NextResponse.json({ error: "Falha ao criar organização" }, { status: 500 });
  }
}
