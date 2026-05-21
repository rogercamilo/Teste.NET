import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { ComunidadeConfig } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };

function isAdmin(role?: string) { return role === "administrador" || role === "formador_geral"; }

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { nome: true, descricao: true, endereco: true, missao: true, anoFundacao: true, termoMorada: true, termoFormando: true, termoFormador: true, nomePlataforma: true, logoUrl: true, temaCor: true },
  });
  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

  const config: ComunidadeConfig = {
    nome: org.nome,
    descricao: org.descricao ?? "",
    endereco: org.endereco ?? "",
    missao: org.missao ?? "",
    anoFundacao: org.anoFundacao ?? "",
    termoMorada: org.termoMorada,
    termoFormando: org.termoFormando,
    termoFormador: org.termoFormador,
    nomePlataforma: org.nomePlataforma ?? undefined,
    logoUrl: org.logoUrl ?? undefined,
    temaCor: org.temaCor,
  };
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json() as Partial<ComunidadeConfig & { onboardingConcluido?: boolean }>;
    const updated = await prisma.organizacao.update({
      where: { id: user.organizacaoId },
      data: {
        nome: body.nome?.trim() || undefined,
        descricao: body.descricao || null,
        endereco: body.endereco || null,
        missao: body.missao || null,
        anoFundacao: body.anoFundacao || null,
        termoMorada: body.termoMorada || undefined,
        termoFormando: body.termoFormando || undefined,
        termoFormador: body.termoFormador || undefined,
        nomePlataforma: body.nomePlataforma?.trim() || null,
        logoUrl: body.logoUrl !== undefined ? (body.logoUrl || null) : undefined,
        temaCor: body.temaCor || undefined,
        ...(body.onboardingConcluido === true ? { onboardingConcluido: true } : {}),
      },
      select: { nome: true, descricao: true, endereco: true, missao: true, anoFundacao: true, termoMorada: true, termoFormando: true, termoFormador: true, onboardingConcluido: true, nomePlataforma: true, logoUrl: true, temaCor: true },
    });
    logAction("organizacao_updated", user.id, getClientIp(request), {}, user.organizacaoId);
    const config: ComunidadeConfig = {
      nome: updated.nome,
      descricao: updated.descricao ?? "",
      endereco: updated.endereco ?? "",
      missao: updated.missao ?? "",
      anoFundacao: updated.anoFundacao ?? "",
      termoMorada: updated.termoMorada,
      termoFormando: updated.termoFormando,
      termoFormador: updated.termoFormador,
      nomePlataforma: updated.nomePlataforma ?? undefined,
      logoUrl: updated.logoUrl ?? undefined,
      temaCor: updated.temaCor,
    };
    return NextResponse.json({ ...config, onboardingConcluido: updated.onboardingConcluido });
  } catch { return NextResponse.json({ error: "Falha ao atualizar organização" }, { status: 500 }); }
}
