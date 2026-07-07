import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { PerfilPortalSchema, parseJson } from "@/lib/schemas";

/**
 * Atualiza os DADOS PESSOAIS do próprio formando/vocacionado (self-service em
 * /portal/perfil). O ator é o `Formando` da sessão do portal (headers
 * `x-formando-id`/`x-formando-org` injetados pelo proxy). `PerfilPortalSchema`
 * é `.strict()`: qualquer campo formativo (nível, grupo, modalidade, ingresso,
 * ativo…) é REJEITADO no parse — a fronteira formador×pessoa é imposta no zod.
 * Auditoria: ator formando → `usuarioId: undefined` + id em details (a FK de
 * `logAction` aponta para `Usuario`; ver feedback-logaction-usuarioid-fk).
 */
export async function PATCH(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, PerfilPortalSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
      select: { id: true },
    });
    if (!formando) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    await prisma.formando.update({
      where: { id: formando.id },
      data: {
        // A pessoa PODE limpar a própria data (diferente do PUT do formador, onde
        // `x ? new Date() : undefined` vira no-op): tratamos null explicitamente.
        ...(body.dataNascimento !== undefined
          ? { dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : null }
          : {}),
        ...(body.estadoCivil !== undefined ? { estadoCivil: body.estadoCivil } : {}),
        ...(body.telefone !== undefined ? { telefone: body.telefone } : {}),
        ...(body.foto !== undefined ? { foto: body.foto || null } : {}),
        ...(body.nomeSocial !== undefined ? { nomeSocial: body.nomeSocial || null } : {}),
        ...(body.nacionalidade !== undefined ? { nacionalidade: body.nacionalidade || null } : {}),
        ...(body.rg !== undefined ? { rg: body.rg || null } : {}),
        ...(body.orgaoEmissor !== undefined ? { orgaoEmissor: body.orgaoEmissor || null } : {}),
        ...(body.cep !== undefined ? { cep: body.cep || null } : {}),
        ...(body.paroquiaReferencia !== undefined ? { paroquiaReferencia: body.paroquiaReferencia || null } : {}),
        ...(body.numFilhos !== undefined ? { numFilhos: body.numFilhos } : {}),
      },
    });

    logAction(
      "portal_perfil_atualizado",
      undefined,
      getClientIp(request),
      { formandoId, campos: Object.keys(body) },
      organizacaoId
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal perfil PATCH", err);
    return NextResponse.json({ error: "Falha ao salvar perfil" }, { status: 500 });
  }
}
