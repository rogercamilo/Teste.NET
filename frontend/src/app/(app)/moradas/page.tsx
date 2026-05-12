import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MoradasClient from "./MoradasClient";

export default async function MoradasPage() {
  const session = await auth();
  const user = session?.user as { role?: string; moradaId?: string | null };

  if (user?.role === "formador_comunitario" && user?.moradaId) {
    redirect(`/moradas/${user.moradaId}`);
  }

  return <MoradasClient />;
}
