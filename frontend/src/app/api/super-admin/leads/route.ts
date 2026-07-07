import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SessionUser as SU } from "@/lib/auth-helpers";
import { toCsv } from "@/lib/relatorios/csv";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError } from "@/lib/audit-log";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  descadastrado: "Descadastrado",
};

/**
 * Lista os leads de marketing capturados na landing (super-admin). Sem escopo
 * de tenant — leads são da plataforma. `?format=csv` exporta a base completa.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as SU | undefined;
    if (!user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const format = new URL(request.url).searchParams.get("format");

    const leads = await prisma.newsletterLead.findMany({
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        status: true,
        origem: true,
        whatsappOptIn: true,
        criadoEm: true,
        confirmadoEm: true,
        descadastradoEm: true,
      },
    });

    if (format === "csv") {
      const rl = await limiters.export(user.id);
      if (!rl.allowed) {
        return NextResponse.json({ error: "Muitas exportações. Aguarde." }, { status: 429 });
      }
      const rows = leads.map((l) => [
        l.nome,
        l.email,
        l.telefone ?? "",
        STATUS_LABEL[l.status] ?? l.status,
        l.origem,
        l.whatsappOptIn ? "Sim" : "Não",
        l.criadoEm.toISOString(),
        l.confirmadoEm?.toISOString() ?? "",
      ]);
      const csv = toCsv(
        ["Nome", "E-mail", "Telefone", "Status", "Origem", "WhatsApp", "Cadastro", "Confirmado em"],
        rows
      );
      logAction("leads_exportados", user.id, undefined, { total: leads.length }, user.organizacaoId);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const counts = leads.reduce(
      (acc, l) => {
        acc[l.status] = (acc[l.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      leads,
      total: leads.length,
      counts: {
        pendente: counts.pendente ?? 0,
        confirmado: counts.confirmado ?? 0,
        descadastrado: counts.descadastrado ?? 0,
      },
    });
  } catch (err) {
    logError("super-admin/leads", err);
    return NextResponse.json({ error: "Falha ao carregar leads" }, { status: 500 });
  }
}
