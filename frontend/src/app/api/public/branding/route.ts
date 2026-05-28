import { NextResponse } from "next/server";
import { getPublicBranding } from "@/lib/public-branding";

export async function GET() {
  const branding = await getPublicBranding();
  return NextResponse.json(branding);
}
