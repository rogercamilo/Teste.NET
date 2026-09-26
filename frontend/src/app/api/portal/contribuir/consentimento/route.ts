import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { CONSENTIMENTO_DIZIMO_VERSAO } from "@/lib/fidellis-integration";

/**
 * Consentimento específico e destacado (LGPD art. 11, I) do formando para o cruzamento membro ×
 * dízimo/oferta (integração Fidellis, #80). Ator = Formando da sessão do portal (headers
 * `x-formando-id`/`x-formando-org`). `logAction` com `usuarioId: undefined` (a FK aponta p/ Usuario).
 */
export async function POST(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  try {
    await prisma.consentimentoDizimo.upsert({
      where: { formandoId },
      create: { formandoId, versao: CONSENTIMENTO_DIZIMO_VERSAO, ip: getClientIp(request) },
      update: { versao: CONSENTIMENTO_DIZIMO_VERSAO, ip: getClientIp(request), revogadoEm: null, aceitoEm: new Date() },
    });
    logAction("fidellis_give", undefined, getClientIp(request), { evento: "consentimento_aceito", versao: CONSENTIMENTO_DIZIMO_VERSAO, formandoId }, organizacaoId);
    return NextResponse.json({ consentido: true, versao: CONSENTIMENTO_DIZIMO_VERSAO });
  } catch (err) {
    logError("portal/contribuir/consentimento POST", err);
    return NextResponse.json({ error: "Falha ao registrar consentimento" }, { status: 500 });
  }
}

/** Revogação do consentimento (LGPD): marca revogadoEm. O offboarding da recorrência é tratado à parte. */
export async function DELETE(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  try {
    await prisma.consentimentoDizimo.updateMany({
      where: { formandoId, revogadoEm: null },
      data: { revogadoEm: new Date() },
    });
    logAction("fidellis_give", undefined, getClientIp(request), { evento: "consentimento_revogado", formandoId }, organizacaoId);
    return NextResponse.json({ consentido: false });
  } catch (err) {
    logError("portal/contribuir/consentimento DELETE", err);
    return NextResponse.json({ error: "Falha ao revogar consentimento" }, { status: 500 });
  }
}
