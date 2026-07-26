import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SessionUser as SU } from "@/lib/auth-helpers";
import { parseJson } from "@/lib/schemas";
import { logError } from "@/lib/audit-log";
import { listDepoimentos, createDepoimento } from "@/lib/depoimentos-store";
import { DepoimentoSchema, type Gate } from "./_shared";

/** Guard inline (o literal `super_admin` fica visível à matriz de authz). */
async function requireSuperAdmin(): Promise<Gate> {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.id) return { ok: false, res: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (user.role !== "super_admin") {
    return { ok: false, res: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}

/** Lista todos os depoimentos (todos os status) para o cockpit. */
export async function GET() {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return gate.res;
    const data = await listDepoimentos();
    return NextResponse.json(data);
  } catch (err) {
    logError("super-admin/depoimentos GET", err);
    return NextResponse.json({ error: "Falha ao carregar depoimentos" }, { status: 500 });
  }
}

/** Cria um novo depoimento (entrada manual). */
export async function POST(request: Request) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return gate.res;

    const parsed = await parseJson(request, DepoimentoSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const dep = await createDepoimento(parsed.data, gate.userId);
    return NextResponse.json({ ok: true, id: dep.id });
  } catch (err) {
    logError("super-admin/depoimentos POST", err);
    return NextResponse.json({ error: "Falha ao criar depoimento" }, { status: 500 });
  }
}
