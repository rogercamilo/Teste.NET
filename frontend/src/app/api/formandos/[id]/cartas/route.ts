import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { getUserName } from "@/lib/current-user";
import { uploadFile } from "@/lib/storage";
import { limiters } from "@/lib/rate-limit";
import { canUpload, notifyAvancadoLimitIfNeeded } from "@/lib/plan-limits";
import { NivelFormativoEnum } from "@/lib/schemas";
import { assinaturaConfere } from "@/lib/file-signature";
import { scanUpload } from "@/lib/av-scan";
import type { SessionUser } from "@/lib/auth-helpers";
import { NIVEL_FORMATIVO_LABELS } from "@/types";

/**
 * Cartas de etapa do formando (recorrentes — uma por etapa formativa).
 *
 * Reaproveita o modelo `Arquivo` (sem tabela nova): a etapa é codificada no
 * `tipoEvento` como `carta_etapa:{nivel}`, e o vínculo é por `formandoId`.
 * O GET das cartas é feito no server component da página do formando (props);
 * aqui só tratamos o upload.
 */
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB — espelha o fluxo da carta vocacional

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id || !user.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const organizacaoId = user.organizacaoId;
  const { id } = await params;

  const rl = await limiters.upload(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Limite de uploads atingido. Tente novamente mais tarde." }, { status: 429 });

  try {
    // FC só anexa em formandos do próprio grupo; gestão em qualquer um da org.
    const grupoFilter = user.role === "formador_comunitario" ? { grupoFormacaoId: user.grupoFormacaoId ?? null } : {};
    const formando = await prisma.formando.findFirst({
      where: { id, organizacaoId, deletedAt: null, ...grupoFilter },
      select: { id: true, nome: true },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const form = await request.formData();
    const arquivo = form.get("arquivo");
    const nivelRaw = String(form.get("nivelFormativo") ?? "");

    // Data de realização do evento (opcional). YYYY-MM-DD ancorado ao meio-dia
    // local para não rolar de dia em UTC-3; ausente/ inválida → null (a data
    // efetiva passa a ser o `criadoEm` do registro).
    const dataEventoRaw = String(form.get("dataEvento") ?? "").trim();
    const dataEvento = /^\d{4}-\d{2}-\d{2}$/.test(dataEventoRaw)
      ? new Date(`${dataEventoRaw}T12:00:00`)
      : null;

    const nivel = NivelFormativoEnum.safeParse(nivelRaw);
    if (!nivel.success) return NextResponse.json({ error: "Etapa formativa inválida" }, { status: 400 });
    if (!(arquivo instanceof File)) return NextResponse.json({ error: "Arquivo da carta ausente" }, { status: 400 });

    const ext = EXT_BY_MIME[arquivo.type];
    if (!ext) return NextResponse.json({ error: "Formato não suportado (use PDF ou imagem)" }, { status: 400 });
    if (arquivo.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo muito grande (máx. 15 MB)" }, { status: 400 });

    const uploadCheck = await canUpload(organizacaoId, arquivo.size);
    if (!uploadCheck.allowed) {
      notifyAvancadoLimitIfNeeded(organizacaoId, "storage");
      return NextResponse.json({ error: uploadCheck.reason }, { status: 403 });
    }

    const buffer = Buffer.from(await arquivo.arrayBuffer());
    // Anti-spoof: confere a assinatura real contra o MIME declarado (P2.1).
    if (!assinaturaConfere(buffer, arquivo.type)) {
      return NextResponse.json({ error: "Conteúdo do arquivo não corresponde ao tipo declarado." }, { status: 400 });
    }
    // Filtro heurístico de malware (macros/PDF ativo/EICAR) antes de persistir.
    const scan = await scanUpload(buffer, arquivo.type);
    if (!scan.clean) {
      logAction("upload_rejected_malware", user.id, getClientIp(request), { formandoId: formando.id, motivo: scan.reason }, organizacaoId);
      return NextResponse.json({ error: "Arquivo rejeitado por suspeita de conteúdo malicioso." }, { status: 400 });
    }
    const storageKey = await uploadFile(organizacaoId, "cartas-etapa", buffer, ext, arquivo.type);

    const arq = await prisma.arquivo.create({
      data: {
        organizacaoId,
        nome: `Carta de etapa — ${NIVEL_FORMATIVO_LABELS[nivel.data]} — ${formando.nome}${ext}`,
        tamanho: buffer.length,
        tipo: arquivo.type,
        extensao: ext,
        storageKey,
        uploadedById: user.id,
        uploadedByNome: (await getUserName(user.id)) ?? user.name ?? undefined,
        formandoId: formando.id,
        formandoNome: formando.nome,
        // Etapa codificada no tipoEvento — sem coluna nova no schema.
        tipoEvento: `carta_etapa:${nivel.data}`,
        dataEvento,
      },
    });

    logAction("carta_etapa_registrada", user.id, getClientIp(request), { formandoId: formando.id, nivel: nivel.data, arquivoId: arq.id }, organizacaoId);
    return NextResponse.json({ id: arq.id }, { status: 201 });
  } catch (err) {
    logError("formando cartas POST", err);
    return NextResponse.json({ error: "Falha ao registrar carta de etapa" }, { status: 500 });
  }
}
