import { NextResponse } from "next/server";
import { listUsers, createUser, findByEmail, toPublic } from "@/lib/users-store";

export async function GET() {
  try {
    return NextResponse.json(listUsers().map(toPublic));
  } catch {
    return NextResponse.json({ error: "Falha ao carregar usuários" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      nome?: string;
      email?: string;
      password?: string;
      perfil?: string;
      moradaId?: string;
      ativo?: boolean;
    };
    const { nome, email, password, perfil, moradaId, ativo } = body;

    if (!nome || !email || !password) {
      return NextResponse.json(
        { error: "Nome, e-mail e senha são obrigatórios" },
        { status: 400 }
      );
    }
    if (findByEmail(email)) {
      return NextResponse.json({ error: "E-mail já está em uso" }, { status: 409 });
    }

    const user = createUser({
      nome,
      email,
      password,
      perfil: (perfil as "administrador" | "formador_comunitario") ?? "formador_comunitario",
      moradaId,
      ativo: ativo ?? true,
    });
    return NextResponse.json(toPublic(user), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao criar usuário" }, { status: 500 });
  }
}
