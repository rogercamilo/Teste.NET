import { NextResponse } from "next/server";
import { logError } from "@/lib/audit-log";
import { getPortalDashboardData } from "@/lib/portal-data";

export async function GET(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");

  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const data = await getPortalDashboardData(formandoId, organizacaoId);
    if (!data) {
      return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    logError("portal/me GET", err);
    return NextResponse.json({ error: "Falha ao carregar dados" }, { status: 500 });
  }
}
