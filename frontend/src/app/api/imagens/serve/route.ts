import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { R2_ENABLED, getImageR2Url, readLocalFile } from "@/lib/storage";
import { logError } from "@/lib/audit-log";
import { SessionUser as SU } from "@/lib/auth-helpers";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";

  if (!key || key.includes("..") || key.startsWith("/")) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Verifica que a key pertence à org do usuário autenticado
  const expectedPrefix = `org_${user.organizacaoId}/`;
  if (!key.startsWith(expectedPrefix)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    if (R2_ENABLED) {
      const url = await getImageR2Url(key, 3600);
      if (!url) return new NextResponse("Not Found", { status: 404 });
      return NextResponse.redirect(url, { status: 302 });
    }

    // Modo local: retorna os bytes diretamente
    const buffer = await readLocalFile(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType = MIME[ext] ?? "image/jpeg";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    logError("imagens/serve GET", err);
    return new NextResponse("Not Found", { status: 404 });
  }
}
