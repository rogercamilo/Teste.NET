import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/audit-log";
import { countSubscriptions } from "@/lib/push";
import type { SessionUser as SU } from "@/lib/auth-helpers";

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const total = await countSubscriptions(user.organizacaoId);
    return NextResponse.json({ total });
  } catch (err) {
    logError("push/count GET", err);
    return NextResponse.json({ error: "Falha ao contar subscriptions." }, { status: 500 });
  }
}
