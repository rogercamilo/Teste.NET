import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { getFidellisConfig, fidellisGive, fidellisPledge } from "@/lib/fidellis-integration";

/**
 * Contribuição do formando-membro (dízimo/oferta) pelo portal — encaminha ao Fidellis server-to-server
 * (#80). O `externalId` no Fidellis é o próprio `Formando.id`. Gated por consentimento ativo. A recorrência
 * é OPCIONAL e indicada pelo membro (só dízimo). "Formattio lança, não armazena": nada de financeiro fica aqui.
 */
const Schema = z.object({
  entryType: z.enum(["tithe", "offering"]),
  amount: z.number().positive(),
  recorrente: z.boolean().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  method: z.enum(["pix", "boleto"]).default("pix"),
});

export async function POST(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  try {
    const cfg = await getFidellisConfig(organizacaoId);
    if (!cfg) return NextResponse.json({ error: "Integração de contribuição indisponível." }, { status: 404 });

    const consent = await prisma.consentimentoDizimo.findUnique({ where: { formandoId } });
    if (!consent || consent.revogadoEm) {
      return NextResponse.json({ error: "Consentimento necessário para contribuir." }, { status: 403 });
    }

    // Oferta é sempre pontual; recorrência só para dízimo (indicada pelo membro).
    const recorrente = body.recorrente === true && body.entryType === "tithe";
    const result = recorrente
      ? await fidellisPledge(cfg, { externalId: formandoId, amount: body.amount, dayOfMonth: body.dayOfMonth ?? 5, method: body.method })
      : await fidellisGive(cfg, { externalId: formandoId, amount: body.amount, entryType: body.entryType, method: body.method });

    if (!result.ok) {
      const msg = (result.data as { error?: string })?.error ?? "Falha ao processar a contribuição.";
      // 404 do Fidellis = membro ainda não sincronizado; sinaliza como 409 (transitório) ao portal.
      return NextResponse.json({ error: msg }, { status: result.status === 404 ? 409 : 502 });
    }

    logAction(recorrente ? "fidellis_pledge" : "fidellis_give", undefined, getClientIp(request),
      { entryType: body.entryType, method: body.method, recorrente, formandoId }, organizacaoId);
    return NextResponse.json({ recorrente, ...(result.data as object) });
  } catch (err) {
    logError("portal/contribuir POST", err);
    return NextResponse.json({ error: "Falha ao processar a contribuição." }, { status: 500 });
  }
}
