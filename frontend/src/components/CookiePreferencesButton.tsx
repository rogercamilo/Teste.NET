"use client";

import { openCookiePreferences } from "@/components/CookieBanner";

/**
 * Link "Gerenciar cookies" para rodapés. Reabre o banner de consentimento para
 * que o usuário possa rever/alterar suas escolhas (inclusive marketing, que
 * governa o Meta Pixel).
 */
export default function CookiePreferencesButton({
  className = "text-sm text-slate-500 hover:text-slate-300 transition-colors",
}: {
  className?: string;
}) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className}>
      Gerenciar cookies
    </button>
  );
}
