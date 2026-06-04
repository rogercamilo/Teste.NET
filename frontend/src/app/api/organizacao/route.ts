import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { UpdateOrganizacaoSchema, parseBody } from "@/lib/schemas";
import type { ComunidadeConfig } from "@/types";

import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const org = await prisma.organizacao.findUnique({
      where: { id: user.organizacaoId },
      select: { tipoOrganizacao: true, nome: true, descricao: true, endereco: true, missao: true, anoFundacao: true, termoGrupoFormacao: true, termoFormando: true, termoFormador: true, termoPreDiscipulado: true, termoDiscipulado: true, termoPrimeirasPromessas: true, termoFormacaoPermanente: true, nomePlataforma: true, logoUrl: true, temaCor: true },
    });
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const config: ComunidadeConfig = {
      tipoOrganizacao: org.tipoOrganizacao as ComunidadeConfig["tipoOrganizacao"],
      nome: org.nome,
      descricao: org.descricao ?? "",
      endereco: org.endereco ?? "",
      missao: org.missao ?? "",
      anoFundacao: org.anoFundacao ?? "",
      termoGrupoFormacao: org.termoGrupoFormacao,
      termoFormando: org.termoFormando,
      termoFormador: org.termoFormador,
      termoPreDiscipulado: org.termoPreDiscipulado,
      termoDiscipulado: org.termoDiscipulado,
      termoPrimeirasPromessas: org.termoPrimeirasPromessas,
      termoFormacaoPermanente: org.termoFormacaoPermanente,
      nomePlataforma: org.nomePlataforma ?? undefined,
      logoUrl: org.logoUrl ?? undefined,
      temaCor: org.temaCor,
    };
    return NextResponse.json(config);
  } catch (err) {
    logError("organizacao GET", err);
    return NextResponse.json({ error: "Falha ao carregar organização" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  try {
    const parsed = parseBody(UpdateOrganizacaoSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    // tipoOrganizacao só pode ser alterado antes do onboarding ser concluído
    const current = await prisma.organizacao.findUnique({
      where: { id: user.organizacaoId },
      select: { onboardingConcluido: true },
    });
    const podeMudarTipo = body.tipoOrganizacao && current && !current.onboardingConcluido;

    const updated = await prisma.organizacao.update({
      where: { id: user.organizacaoId },
      data: {
        ...(podeMudarTipo ? { tipoOrganizacao: body.tipoOrganizacao } : {}),
        nome: body.nome?.trim() || undefined,
        descricao: body.descricao || null,
        endereco: body.endereco || null,
        missao: body.missao || null,
        anoFundacao: body.anoFundacao || null,
        termoGrupoFormacao: body.termoGrupoFormacao || undefined,
        termoFormando: body.termoFormando || undefined,
        termoFormador: body.termoFormador || undefined,
        termoPreDiscipulado: body.termoPreDiscipulado || undefined,
        termoDiscipulado: body.termoDiscipulado || undefined,
        termoPrimeirasPromessas: body.termoPrimeirasPromessas || undefined,
        termoFormacaoPermanente: body.termoFormacaoPermanente || undefined,
        nomePlataforma: body.nomePlataforma?.trim() || null,
        logoUrl: body.logoUrl !== undefined ? (body.logoUrl || null) : undefined,
        temaCor: body.temaCor || undefined,
        ...(body.planoAssinatura ? { planoAssinatura: body.planoAssinatura } : {}),
        ...(body.onboardingConcluido === true ? { onboardingConcluido: true } : {}),
      },
      select: { tipoOrganizacao: true, nome: true, descricao: true, endereco: true, missao: true, anoFundacao: true, termoGrupoFormacao: true, termoFormando: true, termoFormador: true, termoPreDiscipulado: true, termoDiscipulado: true, termoPrimeirasPromessas: true, termoFormacaoPermanente: true, onboardingConcluido: true, nomePlataforma: true, logoUrl: true, temaCor: true },
    });
    logAction("organizacao_updated", user.id, getClientIp(request), {}, user.organizacaoId);
    const config: ComunidadeConfig = {
      tipoOrganizacao: updated.tipoOrganizacao as ComunidadeConfig["tipoOrganizacao"],
      nome: updated.nome,
      descricao: updated.descricao ?? "",
      endereco: updated.endereco ?? "",
      missao: updated.missao ?? "",
      anoFundacao: updated.anoFundacao ?? "",
      termoGrupoFormacao: updated.termoGrupoFormacao,
      termoFormando: updated.termoFormando,
      termoFormador: updated.termoFormador,
      termoPreDiscipulado: updated.termoPreDiscipulado,
      termoDiscipulado: updated.termoDiscipulado,
      termoPrimeirasPromessas: updated.termoPrimeirasPromessas,
      termoFormacaoPermanente: updated.termoFormacaoPermanente,
      nomePlataforma: updated.nomePlataforma ?? undefined,
      logoUrl: updated.logoUrl ?? undefined,
      temaCor: updated.temaCor,
    };
    return NextResponse.json({ ...config, onboardingConcluido: updated.onboardingConcluido });
  } catch (err) {
    logError("organizacao PUT", err);
    return NextResponse.json({ error: "Falha ao atualizar organização" }, { status: 500 });
  }
}
