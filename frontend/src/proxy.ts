import { auth } from "@/auth.config";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { jwtVerify } from "jose";

const isProd = process.env.NODE_ENV === "production";

const CSP_REPORT_URI = "/api/csp-report";

function buildSecurityHeaders(nonce: string): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-Download-Options": "noopen",
    "X-DNS-Prefetch-Control": "off",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), accelerometer=(), gyroscope=()",
    ...(isProd ? {
      // HSTS com preload — submeter em https://hstspreload.org após validar domínio.
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      // Report-To define o grupo de endpoints para relatórios de CSP (Reporting API v1).
      "Report-To": `{"group":"csp-endpoint","max_age":86400,"endpoints":[{"url":"${CSP_REPORT_URI}"}]}`,
    } : {}),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": [
      "default-src 'self'",
      // 'strict-dynamic' permite que scripts com nonce carreguem outros scripts dinamicamente.
      // Em browsers modernos, 'strict-dynamic' ignora 'unsafe-inline' e allowlists de host.
      // Em dev: 'unsafe-eval' (Turbopack HMR) + 'unsafe-inline' (fallback dev).
      // Em prod: nenhum dos dois — apenas nonce + strict-dynamic.
      `script-src 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com${isProd ? "" : " 'unsafe-eval' 'unsafe-inline'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "frame-src 'self' https://*.r2.cloudflarestorage.com https://js.stripe.com https://hooks.stripe.com",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.sentry.io https://*.ingest.sentry.io",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(isProd ? [`report-to csp-endpoint`, `report-uri ${CSP_REPORT_URI}`] : []),
    ].join("; "),
  };
}

// Rotas públicas do portal do formando (autenticação própria via portal_session)
const PORTAL_PUBLIC_EXACT = new Set(["/portal", "/portal/verificar"]);
const PORTAL_PUBLIC_PREFIXES = ["/api/portal/solicitar-acesso", "/api/portal/verificar"];

function isPortalPublic(pathname: string): boolean {
  return (
    PORTAL_PUBLIC_EXACT.has(pathname) ||
    PORTAL_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

function isPortalProtected(pathname: string): boolean {
  return (
    (pathname.startsWith("/portal/") || pathname.startsWith("/api/portal/")) &&
    !isPortalPublic(pathname)
  );
}

export default auth(async function proxy(req) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  // Exact matches (paths where startsWith would be too broad)
  const publicExact = [
    "/",
    // Portal do formando — páginas públicas exatas (não usar prefixo: /portal/* inclui rotas protegidas)
    "/portal",
    "/portal/verificar",
  ];
  // Prefix matches
  const publicPrefixes = [
    "/login",
    "/recuperar-senha",
    "/acesso-plataforma",
    "/registro",
    "/convite",
    "/privacidade",
    "/termos",
    "/recursos",
    "/para-quem-e",
    "/precos",
    "/faq",
    "/.well-known/",
    "/api/og",
    "/api/health",
    "/api/public/",
    "/api/registro",
    "/api/csp-report",
    // /api/convites/[token] handled separately below — only token paths are public
    "/api/cookies/",
    "/api/stripe/webhook",
    "/api/auth/signin",
    "/api/auth/signout",
    "/api/auth/callback",
    "/api/auth/session",
    "/api/auth/csrf",
    "/api/auth/providers",
    "/api/auth/error",
    "/api/auth/recuperar-senha",
    "/ativar-notificacoes",
    "/api/push/subscribe-formando",
    // Portal do formando — API pública (magic link)
    "/api/portal/solicitar-acesso",
    "/api/portal/verificar",
  ];
  // Only /api/convites/<token> (exactly one non-empty segment) is public.
  // /api/convites and /api/convites/ (admin list/create/delete) remain auth-protected.
  const afterConvitePrefix = pathname.slice("/api/convites/".length);
  const isPublicConviteToken = afterConvitePrefix.length > 0 && !afterConvitePrefix.includes("/");

  const isPublic =
    publicExact.includes(pathname) ||
    publicPrefixes.some((p) => pathname.startsWith(p)) ||
    isPublicConviteToken;

  // CSRF: rejeita requisições de mutação vindas de origens diferentes da aplicação.
  // Stripe webhook usa verificação de assinatura própria; NextAuth tem proteção CSRF nativa.
  // Confia em DUAS origens: NEXTAUTH_URL (corrige mismatch http/https em produção) e
  // req.nextUrl.origin (permite acesso via IP de rede local em dev, ex: http://192.168.x.x:3000).
  const trustedOrigins = (() => {
    const set = new Set([req.nextUrl.origin]);
    try { set.add(new URL(process.env.NEXTAUTH_URL ?? "").origin); } catch { /* ignora URL inválida */ }
    return set;
  })();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method ?? "");
  if (isMutation && !pathname.startsWith("/api/stripe/webhook") && !pathname.startsWith("/api/auth/")) {
    const origin = req.headers.get("origin");
    if (origin !== null && !trustedOrigins.has(origin)) {
      return new NextResponse(
        JSON.stringify({ error: "Origem da requisição inválida" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (req.headers.get("content-type")?.includes("application/json")) {
      const contentLength = req.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 256 * 1024) {
        return new NextResponse(
          JSON.stringify({ error: "Payload muito grande" }),
          { status: 413, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  }

  // ── Portal do formando — autenticação independente do NextAuth ───────────────
  if (isPortalProtected(pathname)) {
    const portalToken = req.cookies.get("portal_session")?.value;
    if (!portalToken) {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
    try {
      const authSecret = process.env.AUTH_SECRET;
      if (!authSecret) throw new Error("AUTH_SECRET não configurado");
      const { payload } = await jwtVerify(
        portalToken,
        new TextEncoder().encode(authSecret),
        { audience: "portal" }
      );
      const formandoId = payload.formandoId as string;
      const formandoOrg = payload.organizacaoId as string;
      if (!formandoId || !formandoOrg) throw new Error("Payload inválido");

      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-nonce", nonce);
      requestHeaders.set("x-formando-id", formandoId);
      requestHeaders.set("x-formando-org", formandoOrg);
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      for (const [key, value] of Object.entries(buildSecurityHeaders(nonce))) {
        response.headers.set(key, value);
      }
      return response;
    } catch {
      const response = NextResponse.redirect(new URL("/portal", req.url));
      response.cookies.set("portal_session", "", { maxAge: 0, path: "/" });
      return response;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(
      new URL(role === "super_admin" ? "/super-admin/dashboard" : "/dashboard", req.url)
    );
  }

  // Redireciona usuários autenticados que acessam a página exclusiva de acesso
  if (isLoggedIn && pathname.startsWith("/acesso-plataforma")) {
    return NextResponse.redirect(
      new URL(role === "super_admin" ? "/super-admin/dashboard" : "/dashboard", req.url)
    );
  }

  // Protege /super-admin — apenas super_admin pode acessar
  if (pathname.startsWith("/super-admin") && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // super_admin não tem acesso a funcionalidades operacionais das organizações
  const superAdminBlocked = [
    "/dashboard", "/formandos", "/grupos-formacao", "/formacoes",
    "/planos", "/grades", "/presenca", "/agenda",
    "/documentos", "/comentarios", "/viewer", "/jornada-vocacional",
  ];
  if (role === "super_admin" && superAdminBlocked.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/super-admin/dashboard", req.url));
  }

  const response = NextResponse.next({
    request: { headers: new Headers({ ...Object.fromEntries(req.headers), "x-nonce": nonce }) },
  });
  for (const [key, value] of Object.entries(buildSecurityHeaders(nonce))) {
    response.headers.set(key, value);
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|brand).*)",
  ],
};
