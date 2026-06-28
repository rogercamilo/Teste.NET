import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { montarTextoEncerramento } from "@/lib/livro-registro";
import { requireLivroAccess } from "../../guard";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const gate = await requireLivroAccess({ minPapel: "administrador" });
  if ("error" in gate) return gate.error;
  const { user, organizacaoId } = gate.access;

  try {
    const { id } = await params;
    const tomo = await prisma.livroRegistroTomo.findFirst({
      where: { id, organizacaoId },
    });
    if (!tomo) return NextResponse.json({ error: "Tomo não encontrado" }, { status: 404 });

    const contentType = req.headers.get("content-type") ?? "";

    // ── Anexar PDF assinado/digitalizado (multipart) ──────────────────────────
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const alvo = String(form.get("alvo") ?? "");
      const arquivo = form.get("arquivo");
      if (alvo !== "abertura" && alvo !== "encerramento") {
        return NextResponse.json({ error: "alvo inválido" }, { status: 400 });
      }
      if (!(arquivo instanceof File)) {
        return NextResponse.json({ error: "arquivo é obrigatório" }, { status: 400 });
      }
      if (arquivo.type !== "application/pdf") {
        return NextResponse.json({ error: "Apenas PDF é aceito" }, { status: 400 });
      }

      const buffer = Buffer.from(await arquivo.arrayBuffer());
      const storageKey = await uploadFile(organizacaoId, "livro-registro", buffer, ".pdf", "application/pdf");
      const arq = await prisma.arquivo.create({
        data: {
          organizacaoId,
          nome: `Termo de ${alvo === "abertura" ? "Abertura" : "Encerramento"} (assinado) — Tomo ${tomo.numero}.pdf`,
          tamanho: buffer.length,
          tipo: "application/pdf",
          extensao: ".pdf",
          storageKey,
          uploadedById: user.id,
          uploadedByNome: user.name ?? undefined,
        },
      });
      await prisma.livroRegistroTomo.update({
        where: { id },
        data: alvo === "abertura" ? { aberturaArquivoId: arq.id } : { encerramentoArquivoId: arq.id },
      });

      logAction("livro_doc_assinado_anexado", user.id, getClientIp(req), { tomoId: id, alvo }, organizacaoId);
      return NextResponse.json({ arquivoId: arq.id });
    }

    // ── Encerrar tomo (JSON) ──────────────────────────────────────────────────
    const body = (await req.json()) as { action?: string };
    if (body.action !== "encerrar") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
    if (tomo.status !== "aberto") {
      return NextResponse.json({ error: "Tomo já está encerrado" }, { status: 409 });
    }

    const faixa = await prisma.termoRegistro.aggregate({
      where: { tomoId: id },
      _min: { numero: true },
      _max: { numero: true },
    });

    const encerramentoData = new Date();
    await prisma.livroRegistroTomo.update({
      where: { id },
      data: {
        status: "encerrado",
        encerramentoData,
        encerramentoTexto: montarTextoEncerramento({
          numeroTomo: tomo.numero,
          totalFolhas: tomo.totalFolhas,
          primeiroTermo: faixa._min.numero,
          ultimoTermo: faixa._max.numero,
        }),
      },
    });

    logAction("livro_tomo_encerrado", user.id, getClientIp(req), { tomoId: id, numero: tomo.numero }, organizacaoId);
    return NextResponse.json({ id, status: "encerrado" });
  } catch (err) {
    logError("livro-registro tomos PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar tomo" }, { status: 500 });
  }
}
