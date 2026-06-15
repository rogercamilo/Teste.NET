import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { UpdateFormandoSchema, parseBody, isValidId } from "@/lib/schemas";
import type { Formando, ProgressoEtapa } from "@/types";

import { SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };

import { toFormando } from "@/lib/converters";

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const { id } = await params;
    if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
    const where: Record<string, unknown> = { id, organizacaoId: user.organizacaoId };
    if (user.role === "formador_comunitario") where.grupoFormacaoId = user.grupoFormacaoId ?? null;

    const row = await prisma.formando.findFirst({
      where: { ...where, deletedAt: null },
      include: { progressoEtapas: true, grupoFormacao: { select: { gradeId: true } } },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const { grupoFormacao, ...rest } = row;
    let totalFormacoes = rest.totalFormacoes;

    if (grupoFormacao?.gradeId) {
      const grade = await prisma.gradeFormativa.findUnique({
        where: { id: grupoFormacao!.gradeId! },
        select: { totalFormacoes: true },
      });
      if (grade && grade.totalFormacoes > 0) totalFormacoes = grade.totalFormacoes;
    } else {
      const count = await prisma.formacao.count({
        where: { nivelFormativo: rest.nivelFormativo, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }], deletedAt: null },
      });
      if (count > 0) totalFormacoes = count;
    }

    return NextResponse.json(toFormando({ ...rest, totalFormacoes }));
  } catch (err) {
    logError("formandos/:id GET", err);
    return NextResponse.json({ error: "Falha ao carregar formando" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const existing = await prisma.formando.findFirst({ where: { id, organizacaoId: user.organizacaoId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // formador_comunitario só pode editar formandos da própria morada
    if (user.role === "formador_comunitario" && existing.grupoFormacaoId !== (user.grupoFormacaoId ?? null)) {
      return NextResponse.json({ error: "Sem permissão para editar formandos de outra morada" }, { status: 403 });
    }

    const parsed = parseBody(UpdateFormandoSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    if (body.grupoFormacaoId) {
      const grupoFormacao = await prisma.grupoFormacao.findFirst({ where: { id: body.grupoFormacaoId, organizacaoId: user.organizacaoId, ativo: true } });
      if (!grupoFormacao) return NextResponse.json({ error: "Grupo de formação não encontrado" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.formando.update({
        where: { id },
        data: {
          nome: body.nome?.trim(),
          dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : undefined,
          estadoCivil: body.estadoCivil,
          modalidade: body.modalidade,
          nivelFormativo: body.nivelFormativo,
          dataIngresso: body.dataIngresso ? new Date(body.dataIngresso) : undefined,
          telefone: body.telefone,
          email: body.email,
          ativo: body.ativo,
          motivoInatividade: body.motivoInatividade || null,
          ...(body.foto !== undefined ? { foto: body.foto || null } : {}),
          turmaId: body.turmaId || null,
          grupoFormacaoId: body.grupoFormacaoId || null,
          totalFormacoes: body.totalFormacoes,
          formacoesRealizadas: body.formacoesRealizadas,
          ...(body.nomeSocial !== undefined ? { nomeSocial: body.nomeSocial || null } : {}),
          ...(body.nacionalidade !== undefined ? { nacionalidade: body.nacionalidade || null } : {}),
          ...(body.rg !== undefined ? { rg: body.rg || null } : {}),
          ...(body.orgaoEmissor !== undefined ? { orgaoEmissor: body.orgaoEmissor || null } : {}),
          ...(body.cep !== undefined ? { cep: body.cep || null } : {}),
          ...(body.paroquiaReferencia !== undefined ? { paroquiaReferencia: body.paroquiaReferencia || null } : {}),
          ...(body.numFilhos !== undefined ? { numFilhos: body.numFilhos } : {}),
        },
      });

      if (body.progressoEtapas) {
        for (const p of body.progressoEtapas) {
          await tx.progressoEtapa.upsert({
            where: { formandoId_nivelFormativo: { formandoId: id, nivelFormativo: p.nivel } },
            create: {
              formandoId: id, nivelFormativo: p.nivel,
              formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas ?? 0,
              retirosComunitariosRealizados: p.retirosComunitariosRealizados ?? 0,
              retirosPessoaisRealizados: p.retirosPessoaisRealizados ?? 0,
              iniciouEm: p.iniciouEm ? new Date(p.iniciouEm) : null,
              concluiuEm: p.concluiuEm ? new Date(p.concluiuEm) : null,
            },
            update: {
              formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas ?? 0,
              retirosComunitariosRealizados: p.retirosComunitariosRealizados ?? 0,
              retirosPessoaisRealizados: p.retirosPessoaisRealizados ?? 0,
              iniciouEm: p.iniciouEm ? new Date(p.iniciouEm) : null,
              concluiuEm: p.concluiuEm ? new Date(p.concluiuEm) : null,
            },
          });
        }
      }

      return tx.formando.findUniqueOrThrow({ where: { id, organizacaoId: user.organizacaoId }, include: { progressoEtapas: true } });
    });

    logAction("formando_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toFormando(updated));
  } catch (err) { logError("formandos/:id PUT", err); return NextResponse.json({ error: "Falha ao atualizar formando" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.formando.findFirst({ where: { id, organizacaoId: user.organizacaoId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.formando.update({ where: { id, organizacaoId: user.organizacaoId }, data: { deletedAt: new Date(), ativo: false } });
    logAction("formando_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("formandos/:id DELETE", err); return NextResponse.json({ error: "Falha ao excluir formando" }, { status: 500 }); }
}
