import { NextRequest, NextResponse } from "next/server";
import { subDays } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { temPermissao, NIVEL_FORMATIVO_LABELS, type NivelFormativo, type ProgressoEtapa } from "@/types";
import type { SessionUser } from "@/lib/auth-helpers";
import {
  montarRelatorioGrupo,
  type FormandoRel,
  type PresencaRel,
} from "@/lib/relatorios/grupo-relatorio";
import { renderGrupoRelatorioPdf } from "@/lib/relatorios/grupo-relatorio-pdf";
import { toCsv } from "@/lib/relatorios/csv";

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase()
      .replace(/^-+|-+$/g, "") || "grupo"
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id || !user.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const organizacaoId = user.organizacaoId;
  const isFC = user.role === "formador_comunitario";
  // Coordenação (FG/Admin) OU o Formador Comunitário do próprio grupo.
  if (!temPermissao(user.role, "formador_geral") && !(isFC && user.grupoFormacaoId === id)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const rl = await limiters.export(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Limite de exportações atingido. Aguarde." }, { status: 429 });
  }

  try {
    const grupo = await prisma.grupoFormacao.findFirst({
      where: { id, organizacaoId },
      select: { id: true, nome: true, formador: { select: { nome: true } } },
    });
    if (!grupo) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });

    const desde = subDays(new Date(), 90);
    const [org, formandos, presencas] = await Promise.all([
      prisma.organizacao.findUnique({
        where: { id: organizacaoId },
        select: {
          nome: true,
          termoPreDiscipulado: true,
          termoDiscipulado: true,
          termoPrimeirasPromessas: true,
          termoFormacaoPermanente: true,
        },
      }),
      prisma.formando.findMany({
        where: { grupoFormacaoId: id, organizacaoId, deletedAt: null },
        select: {
          id: true,
          nome: true,
          nivelFormativo: true,
          ativo: true,
          progressoEtapas: {
            select: {
              nivelFormativo: true,
              formacoesComunitariasRealizadas: true,
              retirosComunitariosRealizados: true,
              retirosPessoaisRealizados: true,
              iniciouEm: true,
            },
          },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.presencaFormacao.findMany({
        where: { organizacaoId, data: { gte: desde }, formando: { grupoFormacaoId: id } },
        select: { formandoId: true, data: true, presente: true },
      }),
    ]);

    const labelMap: Partial<Record<NivelFormativo, string>> = {
      "pre-discipulado": org?.termoPreDiscipulado || undefined,
      discipulado: org?.termoDiscipulado || undefined,
      "primeiras-promessas": org?.termoPrimeirasPromessas || undefined,
      "formacao-permanente": org?.termoFormacaoPermanente || undefined,
    };
    const etapaLabel = (n: NivelFormativo) => labelMap[n] || NIVEL_FORMATIVO_LABELS[n] || n;

    const formandosRel: FormandoRel[] = formandos.map((f) => ({
      id: f.id,
      nome: f.nome,
      nivelFormativo: f.nivelFormativo as NivelFormativo,
      ativo: f.ativo,
      progressoEtapas: f.progressoEtapas.map(
        (p): ProgressoEtapa => ({
          nivel: p.nivelFormativo as NivelFormativo,
          formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas,
          retirosComunitariosRealizados: p.retirosComunitariosRealizados,
          retirosPessoaisRealizados: p.retirosPessoaisRealizados,
          iniciouEm: p.iniciouEm?.toISOString(),
        })
      ),
    }));
    const presencasRel: PresencaRel[] = presencas.map((p) => ({
      formandoId: p.formandoId,
      data: p.data.toISOString(),
      presente: p.presente,
    }));

    const relatorio = montarRelatorioGrupo(formandosRel, presencasRel, etapaLabel);

    const formato = (req.nextUrl.searchParams.get("formato") ?? "pdf").toLowerCase();
    const nome = `relatorio-${slugify(grupo.nome)}-${new Date().toISOString().slice(0, 10)}`;

    logAction("relatorio_grupo_exportado", user.id, getClientIp(req), { grupoId: id, formato }, organizacaoId);

    if (formato === "csv") {
      const csv = toCsv(
        [
          "Nome",
          "Etapa",
          "Progresso (feitas)",
          "Progresso (requerido)",
          "Progresso (%)",
          "Presença 90d (%)",
          "Em risco",
          "Motivos",
        ],
        relatorio.membros.map((m) => [
          m.nome,
          m.etapaLabel,
          m.progressoDone,
          m.progressoTotal,
          m.progressoPct,
          m.presenca ?? "",
          m.emRisco ? "Sim" : "Não",
          m.motivos.join("; "),
        ])
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${nome}.csv`)}`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdf = await renderGrupoRelatorioPdf({
      orgNome: org?.nome ?? "Organização",
      grupoNome: grupo.nome,
      formadorNome: grupo.formador?.nome ?? null,
      geradoEm: new Date().toLocaleDateString("pt-BR"),
      dataLonga: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      relatorio,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logError("grupos-formacao relatorio GET", err);
    return NextResponse.json({ error: "Falha ao gerar relatório" }, { status: 500 });
  }
}
