import { auth } from "@/auth.config";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { jwtVerify, decodeJwt } from "jose";
import { portalHomeFor, type PortalAudiencia } from "@/lib/portal-routes";
import { FORMADOR_PEDAGOGICO_ROTAS_BLOQUEADAS } from "@/types";

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
      "font-src 'self' data: blob:",
      "frame-src 'self' https://*.r2.cloudflarestorage.com https://js.stripe.com https://hooks.stripe.com",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://www.facebook.com https://connect.facebook.net",
      // 'blob:' cobre o worker do pdf.js (visualizador de documentos).
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(isProd ? [`report-to csp-endpoint`, `report-uri ${CSP_REPORT_URI}`] : []),
    ].join("; "),
  };
}

// ── Rotas públicas de marketing (cacheáveis na borda / Cloudflare) ───────────
// Resposta idêntica para todos os visitantes → pode ser cacheada no edge. Ao
// contrário do app autenticado, NÃO usam nonce por request (o HTML seria único
// e impediria o cache). Ver buildMarketingSecurityHeaders.
const MARKETING_PREFIXES = ["/precos", "/recursos", "/para-quem-e", "/faq", "/termos", "/blog"];

function isMarketing(pathname: string): boolean {
  if (pathname === "/") return true;
  // /privacidade (política) é marketing; /privacidade/contato é formulário dinâmico (excluir).
  if (pathname === "/privacidade") return true;
  if (pathname.startsWith("/privacidade/") && !pathname.startsWith("/privacidade/contato")) return true;
  return MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// TTL de borda por rota. Blog muda devagar → cacheia mais.
function marketingCacheControl(pathname: string): string {
  const isBlog = pathname === "/blog" || pathname.startsWith("/blog/");
  const sMaxAge = isBlog ? 86400 : 3600;
  // max-age=0: navegador revalida sempre (rápido, atinge o edge); s-maxage: a
  // Cloudflare serve do edge; stale-while-revalidate: reaquece sem bloquear.
  return `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=86400`;
}

// CSP das rotas de marketing: SEM nonce e SEM strict-dynamic → HTML idêntico e
// cacheável. Sem nonce/hash na política, o 'unsafe-inline' É honrado (cobre os
// scripts inline do Next). Essas páginas não renderizam dado de usuário; o app
// autenticado mantém o CSP forte (nonce+strict-dynamic) em buildSecurityHeaders.
function buildMarketingSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-Download-Options": "noopen",
    "X-DNS-Prefetch-Control": "off",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), accelerometer=(), gyroscope=()",
    ...(isProd ? {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      "Report-To": `{"group":"csp-endpoint","max_age":86400,"endpoints":[{"url":"${CSP_REPORT_URI}"}]}`,
    } : {}),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": [
      "default-src 'self'",
      // Sem nonce/strict-dynamic. 'unsafe-inline' cobre os scripts inline do Next;
      // hosts externos (Stripe, Meta Pixel) allowlistados explicitamente.
      `script-src 'self' 'unsafe-inline' https://js.stripe.com https://connect.facebook.net${isProd ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "frame-src 'self' https://*.r2.cloudflarestorage.com https://js.stripe.com https://hooks.stripe.com",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://www.facebook.com https://connect.facebook.net",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(isProd ? [`report-to csp-endpoint`, `report-uri ${CSP_REPORT_URI}`] : []),
    ].join("; "),
  };
}

// Rotas públicas do portal do formando (autenticação própria via portal_session)
const PORTAL_PUBLIC_EXACT = new Set(["/portal", "/portal/formando", "/portal/vocacional"]);
const PORTAL_PUBLIC_PREFIXES = [
  "/api/portal/login",
  "/api/portal/ativar",
  "/api/portal/recuperar",
  "/portal/ativar",
  "/portal/recuperar",
];

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

// Lê a audiência do portal_session SEM verificar assinatura/expiração. Uso
// exclusivo: escolher a porta de retorno quando a sessão expirou (o jwtVerify
// já falhou). É só destino de redirect para uma página pública — nenhuma
// confiança de segurança depende disso.
function readPortalAudienciaUnsafe(token: string): PortalAudiencia {
  try {
    return decodeJwt(token).audiencia === "vocacional" ? "vocacional" : "formando";
  } catch {
    return "formando";
  }
}

export default auth(async function proxy(req) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  // Exact matches (paths where startsWith would be too broad)
  const publicExact = [
    "/",
    // Arquivos para crawlers (gerados por app/robots.ts e app/sitemap.ts). Sem
    // isto o proxy os trata como rota protegida e responde 307 → /login, e o
    // Googlebot nunca lê o sitemap. O matcher não os exclui (não são assets de /public).
    "/robots.txt",
    "/sitemap.xml",
    // Portal do formando — páginas públicas exatas (não usar prefixo: /portal/* inclui rotas protegidas)
    "/portal",
    "/portal/formando",
    // Portal do vocacionado — entrada distinta, mesma autenticação por trás
    "/portal/vocacional",
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
    "/blog",
    "/faq",
    // Captura de leads (ímã eBook) — página de obrigado, PDF do eBook e endpoints públicos
    "/materiais",
    "/api/leads/",
    "/.well-known/",
    "/api/og",
    "/api/health",
    "/api/public/",
    "/api/registro",
    "/api/csp-report",
    // Cron jobs — autenticam por CRON_SECRET no próprio handler (não via sessão)
    "/api/cron/",
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
    // RSVP público por deep link (token do formando) — página + API
    "/rsvp",
    "/api/rsvp/",
    // Portal do formando — login por senha + primeiro acesso + reset (sem sessão ainda)
    "/api/portal/login",
    "/api/portal/ativar",
    "/api/portal/recuperar",
    "/portal/ativar",
    "/portal/recuperar",
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
      return NextResponse.redirect(new URL("/portal/formando", req.url));
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
      // Sessão inválida/expirada: devolve o formando à SUA porta (formando ou
      // vocacionado) lendo a audiência do token expirado sem verificá-lo.
      const home = portalHomeFor(readPortalAudienciaUnsafe(portalToken));
      const response = NextResponse.redirect(new URL(home, req.url));
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
      new URL(role === "super_admin" ? "/super-admin" : "/dashboard", req.url)
    );
  }

  // Redireciona usuários autenticados que acessam a página exclusiva de acesso
  if (isLoggedIn && pathname.startsWith("/acesso-plataforma")) {
    return NextResponse.redirect(
      new URL(role === "super_admin" ? "/super-admin" : "/dashboard", req.url)
    );
  }

  // Protege /super-admin — apenas super_admin pode acessar
  if (pathname.startsWith("/super-admin") && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Formador Pedagógico é especialista de CONTEÚDO: não acessa as áreas
  // operacionais/comunitárias (moradas, formandos, vocacional, livros...). É uma
  // deny-list (o papel vê "todo o resto"); as PÁGINAS bloqueadas redirecionam ao
  // dashboard. As APIs não entram aqui — cada handler valida o papel e responde
  // 403 (redirecionar um fetch quebraria o cliente); só páginas são redirecionadas.
  if (
    role === "formador_pedagogico" &&
    !pathname.startsWith("/api/") &&
    FORMADOR_PEDAGOGICO_ROTAS_BLOQUEADAS.some(
      (r) => pathname === r || pathname.startsWith(r + "/")
    )
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // super_admin é o operador da PLATAFORMA e não acessa NENHUMA conta de cliente:
  // vive apenas no cockpit (/super-admin). Qualquer PÁGINA de tenant autenticada é
  // redirecionada ao cockpit. É allow-list (não deny-list): rotas de tenant novas já
  // nascem bloqueadas para o super_admin, sem depender de manutenção de uma lista.
  // As APIs de tenant não entram aqui — cada handler checa o papel e responde 403
  // (redirecionar um fetch quebraria o cliente); só páginas são redirecionadas.
  if (
    role === "super_admin" &&
    !isPublic &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/super-admin")
  ) {
    return NextResponse.redirect(new URL("/super-admin", req.url));
  }

  // Rotas públicas de marketing: CSP sem nonce + Cache-Control cacheável na borda
  // (Cloudflare). Resposta idêntica para todos; só GET/HEAD. Nunca setar x-nonce
  // aqui — o HTML precisa ser estável para o edge. Vem DEPOIS dos redirects para
  // nunca cachear um redirect.
  if ((req.method === "GET" || req.method === "HEAD") && isMarketing(pathname)) {
    const marketingResponse = NextResponse.next();
    for (const [key, value] of Object.entries(buildMarketingSecurityHeaders())) {
      marketingResponse.headers.set(key, value);
    }
    marketingResponse.headers.set("Cache-Control", marketingCacheControl(pathname));
    return marketingResponse;
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
    // `sw.js` precisa ser servido como asset estático puro (sem o gate de auth do
    // proxy): o portal (formando deslogado em /portal/ativar, /portal/recuperar)
    // registra o service worker, e um redirect 307 → /login quebra o registro.
    // Mesma razão para o manifesto PWA.
    "/((?!_next/static|_next/image|favicon.ico|public|brand|sw.js|site.webmanifest).*)",
  ],
};
