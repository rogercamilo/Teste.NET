import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { assinaturaConfere } from "@/lib/file-signature";
import { scanUpload } from "@/lib/av-scan";
import { canUpload } from "@/lib/plan-limits";
import { montarTextoEncerramento } from "@/lib/livro-registro";
import { requireLivroAccess } from "../../guard";

type RouteCtx = { params: Promise<{ id: string }> };

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB — alinhado com /api/arquivos e /api/documentos

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
      // Next lança ao parsear um corpo acima do limite — devolve 413 limpo em vez
      // de 500 (o check explícito de 10 MB abaixo cobre corpos dentro do limite).
      let form: FormData;
      try {
        form = await req.formData();
      } catch {
        return NextResponse.json({ error: "Arquivo excede o limite de 10 MB." }, { status: 413 });
      }
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
      if (arquivo.size > MAX_PDF_SIZE) {
        return NextResponse.json({ error: "Arquivo excede o limite de 10 MB." }, { status: 422 });
      }

      const buffer = Buffer.from(await arquivo.arrayBuffer());

      // Valida a assinatura real (magic bytes) — o type do multipart é do cliente.
      if (!assinaturaConfere(buffer, "application/pdf")) {
        return NextResponse.json({ error: "Conteúdo do arquivo não corresponde a um PDF." }, { status: 422 });
      }

      // Filtro heurístico de malware (PDF ativo/EICAR) antes de persistir.
      const scan = await scanUpload(buffer, "application/pdf");
      if (!scan.clean) {
        logAction("upload_rejected_malware", user.id, getClientIp(req), { tomoId: id, alvo, motivo: scan.reason }, organizacaoId);
        return NextResponse.json({ error: "Arquivo rejeitado por suspeita de conteúdo malicioso." }, { status: 422 });
      }

      // Respeita a quota de armazenamento do plano (igual aos demais uploads).
      const uploadCheck = await canUpload(organizacaoId, buffer.length);
      if (!uploadCheck.allowed) {
        return NextResponse.json({ error: uploadCheck.reason }, { status: 403 });
      }

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
    const body = (await req.json().catch(() => ({}))) as { action?: string };
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
