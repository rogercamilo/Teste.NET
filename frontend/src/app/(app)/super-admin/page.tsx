import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/auth-helpers";
import SuperAdminClient from "./SuperAdminClient";

export default async function SuperAdminPage() {
  let session;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  const user = session?.user as SessionUser | undefined;
  if (!user || user.role !== "super_admin") redirect("/acesso-plataforma");

  return (
    <Suspense>
      <SuperAdminClient />
    </Suspense>
  );
}
