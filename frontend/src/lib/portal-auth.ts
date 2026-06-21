import { SignJWT, jwtVerify } from "jose";

export const PORTAL_COOKIE = "portal_session";
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado");
  return new TextEncoder().encode(s);
}

export interface PortalPayload {
  formandoId: string;
  organizacaoId: string;
}

export async function signPortalToken(payload: PortalPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("portal")
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyPortalToken(token: string): Promise<PortalPayload> {
  const { payload } = await jwtVerify(token, secret(), { audience: "portal" });
  if (
    typeof payload.formandoId !== "string" ||
    typeof payload.organizacaoId !== "string"
  ) {
    throw new Error("Token inválido");
  }
  return { formandoId: payload.formandoId, organizacaoId: payload.organizacaoId };
}

export function portalCookieOptions(maxAge = TTL_SECONDS) {
  return {
    name: PORTAL_COOKIE,
    maxAge,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

/** Lê e valida o portal_session em Server Components / API routes (usa next/headers). */
export async function getPortalSession(): Promise<PortalPayload | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifyPortalToken(token);
  } catch {
    return null;
  }
}
