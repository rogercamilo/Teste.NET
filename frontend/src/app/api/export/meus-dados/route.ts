import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

type SessionUser = { id?: string; organizacaoId?: string };

export async function GET(request: Request) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;
  if (!actor?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.export(actor.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Limite de exportações atingido. Tente novamente em 1 hora." }, { status: 429 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      nome: true,
      email: true,
      perfil: true,
      criadoEm: true,
      atualizadoEm: true,
      privacyAcceptances: {
        select: { tipo: true, versao: true, criadoEm: true },
        orderBy: { criadoEm: "asc" },
      },
      auditLogs: {
        select: { acao: true, ip: true, detalhes: true, criadoEm: true },
        orderBy: { criadoEm: "desc" },
        take: 200,
      },
    },
  });

  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const cookieConsent = await prisma.cookieConsent.findFirst({
    where: { userId: actor.id },
    select: { necessarios: true, analiticos: true, marketing: true, preferencias: true, versao: true, criadoEm: true },
  });

  const payload = {
    exportadoEm: new Date().toISOString(),
    versaoExportacao: "1.0",
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      criadoEm: usuario.criadoEm,
      atualizadoEm: usuario.atualizadoEm,
    },
    aceitesLegais: usuario.privacyAcceptances,
    consentimentoCookies: cookieConsent ?? null,
    historicoAcessos: usuario.auditLogs,
  };

  logAction("dados_exportados", actor.id, getClientIp(request), { tipo: "meus-dados" }, actor.organizacaoId);

  const filename = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
