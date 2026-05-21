import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let db = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "connected";
  } catch {
    // DB may not be ready yet — process is still healthy
  }
  return NextResponse.json({ status: "ok", db });
}
