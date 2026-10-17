import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SessionUser as SU } from "@/lib/auth-helpers";
import { toCsv } from "@/lib/relatorios/csv";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError } from "@/lib/audit-log";
import {
  rotuloDe,
  TIPO_ORGANIZACAO_OPCOES,
  NUMERO_MEMBROS_OPCOES,
  INTENCAO_OPCOES,
} from "@/lib/acesso-antecipado-opcoes";

/**
 * Lista os pedidos de acesso antecipado (lead de alta intenção) capturados na
 * landing (super-admin). Sem escopo de tenant — são da plataforma. `?format=csv`
 * exporta a base completa com rótulos humanizados.
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

    const leads = await prisma.acessoAntecipadoLead.findMany({
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        nome: true,
        papel: true,
        comunidade: true,
        tipoOrganizacao: true,
        numeroMembros: true,
        intencao: true,
        whatsapp: true,
        email: true,
        desafio: true,
        planoInteresse: true,
        status: true,
        origem: true,
        criadoEm: true,
      },
    });

    if (format === "csv") {
      const rl = await limiters.export(user.id);
      if (!rl.allowed) {
        return NextResponse.json({ error: "Muitas exportações. Aguarde." }, { status: 429 });
      }
      const rows = leads.map((l) => [
        l.nome,
        l.papel ?? "",
        l.comunidade,
        rotuloDe(TIPO_ORGANIZACAO_OPCOES, l.tipoOrganizacao),
        rotuloDe(NUMERO_MEMBROS_OPCOES, l.numeroMembros),
        rotuloDe(INTENCAO_OPCOES, l.intencao),
        l.whatsapp,
        l.email,
        l.planoInteresse ?? "",
        l.desafio ?? "",
        l.status,
        l.criadoEm.toISOString(),
      ]);
      const csv = toCsv(
        [
          "Nome",
          "Função",
          "Comunidade/Instituto",
          "Tipo de organização",
          "Porte (em formação)",
          "Intenção",
          "WhatsApp",
          "E-mail",
          "Plano de interesse",
          "Maior desafio",
          "Status",
          "Recebido em",
        ],
        rows
      );
      logAction("acesso_antecipado_exportados", user.id, undefined, { total: leads.length }, user.organizacaoId);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="acesso-antecipado-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const counts = leads.reduce(
      (acc, l) => {
        acc[l.intencao] = (acc[l.intencao] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      leads,
      total: leads.length,
      counts: {
        demonstracao: counts.demonstracao ?? 0,
        acesso_antecipado: counts.acesso_antecipado ?? 0,
        duvida: counts.duvida ?? 0,
      },
    });
  } catch (err) {
    logError("super-admin/acesso-antecipado", err);
    return NextResponse.json({ error: "Falha ao carregar pedidos de acesso antecipado" }, { status: 500 });
  }
}
