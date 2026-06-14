import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUsage } from "@/lib/plan-limits";
import { logError } from "@/lib/audit-log";
import { SessionUser as SU } from "@/lib/auth-helpers";

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const uso = await getUsage(user.organizacaoId);
    return NextResponse.json(uso);
  } catch (err) {
    logError("organizacao/uso GET", err);
    return NextResponse.json({ error: "Falha ao carregar uso" }, { status: 500 });
  }
}
