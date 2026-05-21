import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth(function proxy(req) {
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;
  const { pathname } = req.nextUrl;

  const publicPaths = [
    "/login",
    "/registro",
    "/convite",
    "/api/health",
    "/api/public/",
    "/api/registro",
    "/api/convites/",
    "/api/stripe/webhook",
    "/api/auth/signin",
    "/api/auth/signout",
    "/api/auth/callback",
    "/api/auth/session",
    "/api/auth/csrf",
    "/api/auth/providers",
    "/api/auth/error",
  ];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

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

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
