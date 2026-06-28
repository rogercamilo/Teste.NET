import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { uploadFile } from "@/lib/storage";
import { limiters } from "@/lib/rate-limit";
import { isGestao } from "@/lib/auth-helpers";
import { cartaPermitida } from "@/lib/vocacional-rules";
import { requireVocacionalAccess } from "../../../guard";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireVocacionalAccess({ minPapel: "formador_comunitario" });
  if ("error" in guard) return guard.error;
  const { user, organizacaoId } = guard.access;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  const { id } = await params;

  try {
    const participacao = await prisma.participacaoVocacional.findFirst({
      where: { id, organizacaoId },
      include: {
        formando: { select: { id: true, nome: true } },
        turma: { select: { formadorId: true } },
      },
    });
    if (!participacao) return NextResponse.json({ error: "Participação não encontrada" }, { status: 404 });

    // FC só registra carta na turma da qual é formador; gestão sempre pode.
    if (!isGestao(user.role) && participacao.turma.formadorId !== user.id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Não permite carta em participação já encerrada (evita reverter o desfecho).
    if (!cartaPermitida(participacao.status)) {
      return NextResponse.json({ error: "Participação já encerrada — carta não pode ser registrada." }, { status: 409 });
    }

    const form = await request.formData();
    const arquivo = form.get("arquivo");
    const desfecho = String(form.get("desfecho") ?? "");
    if (!(arquivo instanceof File)) return NextResponse.json({ error: "Arquivo da carta ausente" }, { status: 400 });
    if (desfecho !== "pedido" && desfecho !== "recusa") return NextResponse.json({ error: "Desfecho inválido" }, { status: 400 });

    const ext = EXT_BY_MIME[arquivo.type];
    if (!ext) return NextResponse.json({ error: "Formato não suportado (use PDF ou imagem)" }, { status: 400 });
    if (arquivo.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo muito grande (máx. 15 MB)" }, { status: 400 });

    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const storageKey = await uploadFile(organizacaoId, "vocacional-cartas", buffer, ext, arquivo.type);

    const cartaRecebidaEm = new Date();
    const arq = await prisma.arquivo.create({
      data: {
        organizacaoId,
        nome: `Carta de discernimento — ${participacao.formando.nome}${ext}`,
        tamanho: buffer.length,
        tipo: arquivo.type,
        extensao: ext,
        storageKey,
        uploadedById: user.id,
        uploadedByNome: user.name ?? undefined,
        formandoId: participacao.formandoId,
        formandoNome: participacao.formando.nome,
        tipoEvento: "carta_vocacional",
      },
    });

    await prisma.participacaoVocacional.update({
      where: { id },
      data: {
        cartaArquivoId: arq.id,
        cartaRecebidaEm,
        desfechoCarta: desfecho,
        // A carta inicia o discernimento pelas autoridades.
        status: "em_discernimento",
      },
    });

    logAction("vocacional_carta_recebida", user.id, getClientIp(request), { participacaoId: id, desfecho }, organizacaoId);
    return NextResponse.json({ ok: true, arquivoId: arq.id });
  } catch (err) {
    logError("vocacional carta POST", err);
    return NextResponse.json({ error: "Falha ao registrar carta" }, { status: 500 });
  }
}
