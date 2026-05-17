import { auth } from "@/auth";
import { saveArquivo } from "@/lib/arquivos-store";
import { type NextRequest } from "next/server";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

type SessionUser = { id?: string; role?: string; name?: string | null };

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
  const entityType = (formData.get("entityType") as string) || "";
  const entityId = (formData.get("entityId") as string) || "";

  if (!file || !entityType || !entityId) {
    return Response.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const extensao = ALLOWED_TYPES[file.type];
  if (!extensao) {
    return Response.json(
      { error: "Tipo de arquivo não permitido. Use PDF ou Word." },
      { status: 422 }
    );
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Arquivo excede o limite de 10 MB." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const meta = saveArquivo(
    {
      entityType,
      entityId,
      nome: file.name,
      tamanho: file.size,
      tipo: file.type,
      extensao,
      uploadadoPor: user.id ?? "unknown",
    },
    buffer
  );

  return Response.json(
    { id: meta.id, nome: meta.nome, tamanho: meta.tamanho, tipo: meta.tipo, criadoEm: meta.criadoEm },
    { status: 201 }
  );
}
