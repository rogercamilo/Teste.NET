import { auth } from "@/auth";
import { NextResponse } from "next/server";
import crypto from "crypto";

const isProd = process.env.NODE_ENV === "production";

function buildSecurityHeaders(nonce: string): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...(isProd ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": [
      "default-src 'self'",
      // 'strict-dynamic' allows nonce-trusted scripts to load further scripts dynamically.
      // In supporting browsers it ignores 'unsafe-inline'; older browsers fall back to it.
      // 'unsafe-eval' is only needed for Turbopack in dev.
      `script-src 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"} https://js.stripe.com 'unsafe-inline'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "frame-src 'self' https://*.r2.cloudflarestorage.com https://js.stripe.com https://hooks.stripe.com",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.sentry.io https://*.ingest.sentry.io",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  };
}

export default auth(function proxy(req) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  // Exact matches (paths where startsWith would be too broad)
  const publicExact = ["/"];
  // Prefix matches
  const publicPrefixes = [
    "/login",
    "/acesso-plataforma",
    "/registro",
    "/convite",
    "/privacidade",
    "/termos",
    "/api/health",
    "/api/public/",
    "/api/registro",
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
  ];
  // Only /api/convites/<token> (exactly one non-empty segment) is public.
  // /api/convites and /api/convites/ (admin list/create/delete) remain auth-protected.
  const isPublicConviteToken =
    pathname.startsWith("/api/convites/") && pathname.length > "/api/convites/".length;

  const isPublic =
    publicExact.includes(pathname) ||
    publicPrefixes.some((p) => pathname.startsWith(p)) ||
    isPublicConviteToken;

  // CSRF: rejeita requisições de mutação vindas de origens diferentes da aplicação.
  // Stripe webhook usa verificação de assinatura própria; NextAuth tem proteção CSRF nativa.
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method ?? "");
  if (isMutation && !pathname.startsWith("/api/stripe/webhook") && !pathname.startsWith("/api/auth/")) {
    const origin = req.headers.get("origin");
    if (origin !== null && origin !== req.nextUrl.origin) {
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
    "/documentos", "/comentarios", "/viewer",
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
