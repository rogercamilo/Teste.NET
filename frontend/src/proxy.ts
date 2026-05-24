import { auth } from "@/auth";
import { NextResponse } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Inline styles required by Tailwind; eval by Next.js dev runtime only
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "frame-src https://js.stripe.com",
    "connect-src 'self' https://api.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; "),
};

export default auth(function proxy(req) {
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const { pathname } = req.nextUrl;

  // Exact matches (paths where startsWith would be too broad)
  const publicExact = ["/"];
  // Prefix matches
  const publicPrefixes = [
    "/login",
    "/registro",
    "/convite",
    "/privacidade",
    "/termos",
    "/api/health",
    "/api/public/",
    "/api/registro",
    "/api/convites/",
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
  const isPublic =
    publicExact.includes(pathname) ||
    publicPrefixes.some((p) => pathname.startsWith(p));

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protege /super-admin — apenas super_admin pode acessar
  if (pathname.startsWith("/super-admin") && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
