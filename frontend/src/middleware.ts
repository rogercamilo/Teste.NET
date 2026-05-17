/**
 * Next.js middleware — runs on Edge Runtime before every matched request.
 * Protects all UI routes: unauthenticated requests are redirected to /login.
 * API routes handle their own auth via await auth() inside each handler.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  /*
   * Match everything EXCEPT:
   *   /login          — public sign-in page
   *   /api/auth/*     — NextAuth internal endpoints
   *   /_next/*        — Next.js static assets
   *   /favicon.ico    — browser icon
   */
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
