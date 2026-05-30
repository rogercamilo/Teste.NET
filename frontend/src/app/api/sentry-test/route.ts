import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const eventId = Sentry.captureException(new Error("Sentry test event — triggered manually via /api/sentry-test"));

  return NextResponse.json({ ok: true, eventId });
}
