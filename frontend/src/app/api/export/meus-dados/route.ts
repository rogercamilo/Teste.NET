import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { SessionUser } from "@/lib/auth-helpers";
import { isGestao } from "@/types";

export async function GET(request: Request) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;
  if (!actor?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  // Controles de dados/conta são exclusivos da gestão do tenant (Administrador +
  // Formador Geral). O Formador Comunitário solicita à liderança; os titulares reais
  // usam o Portal; o super_admin opera só pelo cockpit da plataforma.
  if (!isGestao(actor.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.export(actor.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Limite de exportações atingido. Tente novamente em 1 hora." }, { status: 429 });
  }

  try {
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
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    logError("export/meus-dados GET", err);
    return NextResponse.json({ error: "Falha ao exportar dados" }, { status: 500 });
  }
}
