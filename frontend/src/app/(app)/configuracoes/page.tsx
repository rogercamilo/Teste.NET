import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ConfiguracoesClient from "./ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const session = await auth();
  const sessionUser = session?.user as {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };

  if (sessionUser?.role !== "administrador") {
    redirect("/dashboard");
  }

  return (
    <ConfiguracoesClient
      userId={sessionUser.id ?? ""}
      userName={sessionUser.name ?? "Usuário"}
      userEmail={sessionUser.email ?? ""}
    />
  );
}
