import { NextResponse } from "next/server";
import {
  verifyPortalMagicToken,
  signPortalToken,
  portalCookieOptions,
} from "@/lib/portal-auth";
import { logError } from "@/lib/audit-log";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/portal?erro=link-invalido", url.origin));
  }

  try {
    const payload = await verifyPortalMagicToken(token);
    const sessionToken = await signPortalToken(payload);
    const opts = portalCookieOptions();

    const response = NextResponse.redirect(new URL("/portal/dashboard", url.origin));
    response.cookies.set({
      name: opts.name,
      value: sessionToken,
      maxAge: opts.maxAge,
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      secure: opts.secure,
      path: opts.path,
    });
    return response;
  } catch (err) {
    logError("portal/verificar", err);
    return NextResponse.redirect(new URL("/portal?erro=link-expirado", url.origin));
  }
}
