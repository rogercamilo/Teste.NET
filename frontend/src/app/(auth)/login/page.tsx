import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { getPublicBranding } from "@/lib/public-branding";

export default async function LoginPage() {
  const branding = await getPublicBranding();
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm branding={branding} />
    </Suspense>
  );
}
