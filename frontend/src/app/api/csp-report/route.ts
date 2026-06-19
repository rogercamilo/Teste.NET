import { type NextRequest } from "next/server";

// Recebe relatórios de violação de CSP do browser (report-to / report-uri).
// Rota pública e sem autenticação — browsers enviam relatórios automaticamente.
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (
      !contentType.includes("application/csp-report") &&
      !contentType.includes("application/json") &&
      !contentType.includes("application/reports+json")
    ) {
      return new Response(null, { status: 204 });
    }

    const body = await request.json();
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        tag: "csp-violation",
        // Log apenas campos relevantes para evitar log injection via campos não confiáveis
        report: {
          blockedUri: (body?.["csp-report"]?.["blocked-uri"] ?? body?.blockedURL ?? "")
            .toString()
            .slice(0, 500),
          violatedDirective: (
            body?.["csp-report"]?.["violated-directive"] ??
            body?.effectiveDirective ??
            ""
          )
            .toString()
            .slice(0, 200),
          documentUri: (body?.["csp-report"]?.["document-uri"] ?? body?.documentURL ?? "")
            .toString()
            .slice(0, 500),
        },
      })
    );
  } catch {
    // Falha silenciosa — relatórios CSP são best-effort
  }

  return new Response(null, { status: 204 });
}
