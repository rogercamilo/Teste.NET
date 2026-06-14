import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/auth-helpers";
import SuperAdminClient from "./SuperAdminClient";

export default async function SuperAdminPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (user?.role !== "super_admin") redirect("/dashboard");

  return <SuperAdminClient />;
}
