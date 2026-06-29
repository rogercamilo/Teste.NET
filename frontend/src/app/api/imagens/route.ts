import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadFile } from "@/lib/storage";
import { limiters } from "@/lib/rate-limit";
import { logError } from "@/lib/audit-log";
import { matchesDeclaredType } from "@/lib/file-validation";
import { SessionUser as SU } from "@/lib/auth-helpers";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

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

    // Valida a assinatura real do arquivo (magic bytes) — impede spoofing de MIME
    // type: o `file.type` é controlado pelo cliente e sozinho não garante nada.
    if (!matchesDeclaredType(buffer, file.type)) {
      return NextResponse.json({ error: "Conteúdo do arquivo não corresponde a uma imagem válida." }, { status: 400 });
    }

    const ext = EXT_MAP[file.type] ?? ".jpg";
    const key = await uploadFile(user.organizacaoId, "imagens", buffer, ext, file.type);

    return NextResponse.json({ key }, { status: 201 });
  } catch (err) {
    logError("imagens POST", err);
    return NextResponse.json({ error: "Falha ao fazer upload da imagem." }, { status: 500 });
  }
}
