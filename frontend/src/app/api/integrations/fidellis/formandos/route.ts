import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";

/**
 * Canal de sincronização de identidade para o Fidellis (#80, Opção A — "Fidellis puxa").
 *
 * O Fidellis chama este endpoint (server-to-server) e faz o upsert dos membros no seu lado
 * (`POST /api/crm/donors/federated`). Minimização (LGPD/ADR-0013): devolvemos apenas o mínimo para o
 * vínculo federado — `externalId` (= Formando.id), nome, e-mail e o flag `active`. NADA de formação,
 * vocação, documentos ou demais dados sensíveis. Autenticação por segredo dedicado (FIDELLIS_PULL_SECRET),
 * comparado em tempo constante — separado do CRON_SECRET.
 *
 * Contrato Fidellis: docs/integrations/formattio-fidellis-contract.md (repo Fidellis).
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.FIDELLIS_PULL_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const organizacaoId = new URL(request.url).searchParams.get("organizacaoId");
  if (!organizacaoId) {
    return NextResponse.json({ error: "organizacaoId é obrigatório" }, { status: 400 });
  }

  try {
    const formandos = await prisma.formando.findMany({
      where: { organizacaoId, deletedAt: null },
      select: { id: true, nome: true, email: true, ativo: true },
      orderBy: { criadoEm: "asc" },
      take: 20000,
    });

    const members = formandos.map((f) => ({
      externalId: f.id,
      name: f.nome,
      email: f.email,
      active: f.ativo,
    }));

    logAction("fidellis_sync_pull", undefined, getClientIp(request), { total: members.length }, organizacaoId);

    return NextResponse.json({
      organizacaoId,
      exportadoEm: new Date().toISOString(),
      versaoContrato: "1.0",
      members,
    });
  } catch (err) {
    logError("integrations/fidellis/formandos GET", err);
    return NextResponse.json({ error: "Falha ao listar formandos" }, { status: 500 });
  }
}
