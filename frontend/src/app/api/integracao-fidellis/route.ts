import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptField } from "@/lib/crypto";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { SessionUser } from "@/lib/auth-helpers";
import { isGestao } from "@/types";

/**
 * Configuração da integração Fidellis por organização (#80) — gestão (Administrador + Formador Geral).
 * A chave de serviço é gravada CIFRADA e nunca é devolvida ao cliente (só o flag `temChave`).
 */
async function requireGestao() {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;
  if (!actor?.id || !actor.organizacaoId) return { error: "Não autenticado", status: 401 as const };
  if (!isGestao(actor.role)) return { error: "Sem permissão", status: 403 as const };
  return { actor };
}

export async function GET() {
  const g = await requireGestao();
  if ("error" in g) return NextResponse.json({ error: g.error }, { status: g.status });
  const cfg = await prisma.integracaoFidellis.findUnique({ where: { organizacaoId: g.actor.organizacaoId! } });
  return NextResponse.json({
    habilitado: cfg?.habilitado ?? false,
    tenantSlug: cfg?.tenantSlug ?? "",
    organizationId: cfg?.organizationId ?? "",
    baseUrl: cfg?.baseUrl ?? "",
    temChave: !!cfg?.serviceKeyEnc,
  });
}

const PutSchema = z.object({
  habilitado: z.boolean(),
  tenantSlug: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  baseUrl: z.string().trim().url(),
  serviceKey: z.string().trim().optional(), // só grava/rotaciona se vier não-vazia
});

export async function PUT(request: Request) {
  const g = await requireGestao();
  if ("error" in g) return NextResponse.json({ error: g.error }, { status: g.status });
  const organizacaoId = g.actor.organizacaoId!;

  let body: z.infer<typeof PutSchema>;
  try {
    body = PutSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos (tenant, organizationId e baseUrl são obrigatórios; baseUrl deve ser uma URL)." }, { status: 400 });
  }

  try {
    const existing = await prisma.integracaoFidellis.findUnique({ where: { organizacaoId } });
    const temChaveNova = !!body.serviceKey && body.serviceKey.length > 0;
    if (!existing && !temChaveNova) {
      return NextResponse.json({ error: "Informe a chave de serviço na primeira configuração." }, { status: 400 });
    }
    const serviceKeyEnc = temChaveNova ? encryptField(body.serviceKey!) : existing!.serviceKeyEnc;

    await prisma.integracaoFidellis.upsert({
      where: { organizacaoId },
      create: { organizacaoId, habilitado: body.habilitado, tenantSlug: body.tenantSlug, organizationId: body.organizationId, baseUrl: body.baseUrl, serviceKeyEnc },
      update: { habilitado: body.habilitado, tenantSlug: body.tenantSlug, organizationId: body.organizationId, baseUrl: body.baseUrl, serviceKeyEnc },
    });

    logAction("fidellis_give", g.actor.id, getClientIp(request), { evento: "config_salva", habilitado: body.habilitado }, organizacaoId);
    return NextResponse.json({ ok: true, temChave: true });
  } catch (err) {
    logError("integracao-fidellis PUT", err);
    return NextResponse.json({ error: "Falha ao salvar a configuração" }, { status: 500 });
  }
}
