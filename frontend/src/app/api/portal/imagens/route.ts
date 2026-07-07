import { NextResponse } from "next/server";
import { limiters } from "@/lib/rate-limit";
import { logError, logAction, getClientIp } from "@/lib/audit-log";
import { processImageUpload } from "@/lib/image-upload";

/**
 * Upload de foto do PORTAL (a própria pessoa troca sua foto em /portal/perfil).
 * O ator é o `Formando` autenticado pela sessão do portal (headers
 * `x-formando-id`/`x-formando-org` injetados pelo proxy), não um `Usuario` via
 * `auth()`. A validação (magic bytes + AV) e a persistência vivem em
 * `processImageUpload` — o mesmo pipeline de `/api/imagens`; devolve a key
 * R2/local (o cliente a envia no PATCH do perfil), sem base64 no DB.
 */
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
    const result = await processImageUpload(formData.get("file"), organizacaoId);
    if (!result.ok) {
      if (result.malwareReason) {
        logAction("upload_rejected_malware", undefined, getClientIp(request), { motivo: result.malwareReason, formandoId }, organizacaoId);
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ key: result.key }, { status: 201 });
  } catch (err) {
    logError("portal imagens POST", err);
    return NextResponse.json({ error: "Falha ao fazer upload da imagem." }, { status: 500 });
  }
}
