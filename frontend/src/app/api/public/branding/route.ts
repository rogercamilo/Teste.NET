import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint público (sem autenticação) — retorna dados de branding da organização padrão.
// Usado pela página de login para exibir logo e nome antes do usuário autenticar.
export async function GET() {
  const orgId = process.env.DEFAULT_ORG_ID;
  if (!orgId) return NextResponse.json({ nome: "Formatio", nomePlataforma: null, logoUrl: null, temaCor: "azul" });

  try {
    const org = await prisma.organizacao.findUnique({
      where: { id: orgId },
      select: { nome: true, nomePlataforma: true, logoUrl: true, temaCor: true },
    });
    if (!org) return NextResponse.json({ nome: "Formatio", nomePlataforma: null, logoUrl: null, temaCor: "azul" });
    const safeLogoUrl = org.logoUrl?.startsWith("https://") ? org.logoUrl : null;
    return NextResponse.json({
      nome: org.nome,
      nomePlataforma: org.nomePlataforma ?? null,
      logoUrl: safeLogoUrl,
      temaCor: org.temaCor,
    });
  } catch {
    return NextResponse.json({ nome: "Formatio", nomePlataforma: null, logoUrl: null, temaCor: "azul" });
  }
}
