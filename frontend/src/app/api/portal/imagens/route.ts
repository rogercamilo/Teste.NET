import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { limiters } from "@/lib/rate-limit";
import { logError, logAction, getClientIp } from "@/lib/audit-log";
import { assinaturaConfere } from "@/lib/file-signature";
import { scanUpload } from "@/lib/av-scan";

/**
 * Upload de foto do PORTAL (a própria pessoa troca sua foto em /portal/perfil).
 * Espelha `/api/imagens`, mas o ator é o `Formando` autenticado pela sessão do
 * portal (headers `x-formando-id`/`x-formando-org` injetados pelo proxy), não um
 * `Usuario` via `auth()`. Devolve a key R2/local (o cliente a envia no PATCH do
 * perfil) — mantém a mesma disciplina de armazenamento do app, sem base64 no DB.
 */

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.upload(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Campo 'file' ausente ou inválido." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Imagem muito grande. Máximo 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Valida a assinatura real do arquivo (magic bytes) — impede spoofing de MIME.
    if (!assinaturaConfere(buffer, file.type)) {
      return NextResponse.json({ error: "Conteúdo do arquivo não corresponde a uma imagem válida." }, { status: 400 });
    }

    // Filtro heurístico de malware (EICAR) antes de persistir.
    const scan = await scanUpload(buffer, file.type);
    if (!scan.clean) {
      logAction("upload_rejected_malware", undefined, getClientIp(request), { motivo: scan.reason, formandoId }, organizacaoId);
      return NextResponse.json({ error: "Arquivo rejeitado por suspeita de conteúdo malicioso." }, { status: 400 });
    }

    const ext = EXT_MAP[file.type] ?? ".jpg";
    const key = await uploadFile(organizacaoId, "imagens", buffer, ext, file.type);

    return NextResponse.json({ key }, { status: 201 });
  } catch (err) {
    logError("portal imagens POST", err);
    return NextResponse.json({ error: "Falha ao fazer upload da imagem." }, { status: 500 });
  }
}
