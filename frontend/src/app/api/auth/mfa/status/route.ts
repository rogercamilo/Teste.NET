import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findById } from "@/lib/users-store";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const organizacaoId = (session.user as { organizacaoId?: string }).organizacaoId;
  if (!organizacaoId) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  const user = await findById(userId, organizacaoId);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  return NextResponse.json({ mfaEnabled: user.mfaEnabled });
}
