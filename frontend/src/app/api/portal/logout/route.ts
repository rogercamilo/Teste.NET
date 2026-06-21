import { NextResponse } from "next/server";
import { portalCookieOptions } from "@/lib/portal-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const opts = portalCookieOptions(0); // maxAge=0 apaga o cookie
  response.cookies.set({ ...opts, value: "" });
  return response;
}
