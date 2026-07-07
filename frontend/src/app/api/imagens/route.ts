import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { limiters } from "@/lib/rate-limit";
import { logError, logAction, getClientIp } from "@/lib/audit-log";
import { processImageUpload } from "@/lib/image-upload";
import { SessionUser as SU } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.id || !user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.upload(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    // Validação (magic bytes + AV) e persistência compartilhadas com o portal.
    const result = await processImageUpload(formData.get("file"), user.organizacaoId);
    if (!result.ok) {
      if (result.malwareReason) {
        logAction("upload_rejected_malware", user.id, getClientIp(request), { motivo: result.malwareReason }, user.organizacaoId);
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ key: result.key }, { status: 201 });
  } catch (err) {
    logError("imagens POST", err);
    return NextResponse.json({ error: "Falha ao fazer upload da imagem." }, { status: 500 });
  }
}
