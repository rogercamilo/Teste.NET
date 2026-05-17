import { auth } from "@/auth";
import { saveDocumento, listDocumentos } from "@/lib/documentos-store";
import { type NextRequest } from "next/server";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

type SessionUser = {
  id?: string;
  role?: string;
  moradaId?: string | null;
  name?: string | null;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = session.user as SessionUser;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const eventoId = formData.get("eventoId") as string;
  const formandoId = formData.get("formandoId") as string;
  const formandoNome = (formData.get("formandoNome") as string) || "";
  const tipoEvento = (formData.get("tipoEvento") as string) || "";
  const moradaId = (formData.get("moradaId") as string) || user.moradaId || undefined;

  if (!file || !eventoId || !formandoId) {
    return Response.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  if (!ALLOWED_TYPES[file.type]) {
    return Response.json(
      { error: "Tipo de arquivo não permitido. Use PDF ou DOCX." },
      { status: 422 }
    );
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Arquivo excede o limite de 5 MB." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const meta = saveDocumento(
    {
      eventoId,
      formandoId,
      formandoNome,
      tipoEvento,
      uploadadoPor: user.id ?? "unknown",
      uploadadoPorNome: user.name ?? "",
      moradaId: moradaId ?? undefined,
      nome: file.name,
      tamanho: file.size,
      tipo: file.type,
      extensao: ALLOWED_TYPES[file.type],
    },
    buffer
  );

  return Response.json(
    { id: meta.id, nome: meta.nome, tamanho: meta.tamanho, tipo: meta.tipo, criadoEm: meta.criadoEm },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const role = user.role;
  const url = new URL(request.url);
  const eventoId = url.searchParams.get("eventoId") ?? undefined;
  const formandoId = url.searchParams.get("formandoId") ?? undefined;

  if (role === "administrador" || role === "formador_geral") {
    return Response.json(listDocumentos({ eventoId, formandoId }));
  }

  // formador_comunitario: only documents from their morada or uploaded by them
  const all = listDocumentos({ eventoId, formandoId });
  const userId = user.id;
  const userMoradaId = user.moradaId ?? undefined;

  return Response.json(
    all.filter(
      (d) =>
        d.uploadadoPor === userId ||
        (userMoradaId !== undefined && d.moradaId === userMoradaId)
    )
  );
}
