"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type LoginState = { error?: string; mfaRequired?: boolean };

export async function superAdminLogin(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const totp = String(formData.get("totp") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      loginSource: "super_admin",
      ...(totp ? { totp } : {}),
      redirectTo: "/super-admin/dashboard",
    });
  } catch (err) {
    // signIn lança NEXT_REDIRECT em caso de sucesso — re-lançar para o Next.js redirecionar
    const digest = (err as { digest?: string }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      throw err;
    }

    if (err instanceof AuthError) {
      const inner = (err as { cause?: { err?: { code?: string } } }).cause?.err;
      if (inner?.code === "MFARequired") return { mfaRequired: true };
      return { error: "Credenciais inválidas ou acesso não autorizado." };
    }

    console.error("[super-admin-login]", err);
    return { error: "Credenciais inválidas ou acesso não autorizado." };
  }

  return {};
}
