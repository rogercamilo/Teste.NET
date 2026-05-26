import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = Date.now();
  let db: "connected" | "disconnected" = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "connected";
  } catch {
    // DB may not be ready yet — process is still healthy
  }
  return NextResponse.json(
    { status: "ok", db, dbLatencyMs: Date.now() - start },
    { headers: { "Cache-Control": "no-store" } }
  );
}
