import { auth } from "@/auth";
import GradesClient from "./GradesClient";

export default async function GradesPage() {
  const session = await auth();
  const user = session?.user as { role?: string; moradaId?: string | null } | undefined;

  return (
    <GradesClient
      role={user?.role ?? "formador_comunitario"}
      moradaId={user?.moradaId ?? null}
    />
  );
}
