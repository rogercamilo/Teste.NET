import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PlanoFormPage from "../PlanoFormPage";

export default async function NovoPlanoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <PlanoFormPage />;
}
