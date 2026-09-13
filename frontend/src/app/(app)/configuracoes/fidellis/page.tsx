import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SessionUser } from "@/lib/auth-helpers";
import { isGestao } from "@/types";
import FidellisConfigClient from "./FidellisConfigClient";

export const metadata = { title: "Integração Fidellis" };

export default async function FidellisConfigPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) redirect("/dashboard");
  if (!isGestao(user.role)) redirect("/configuracoes");
  return <FidellisConfigClient />;
}
