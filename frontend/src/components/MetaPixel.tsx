"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID, trackMetaEvent } from "@/lib/analytics-config";

// Chaves compartilhadas com o CookieBanner (consentimento) — mantê-las em sincronia.
const CONSENT_KEY = "Formattio_cookie_consent";
const CONSENT_EVENT = "Formattio-consent-changed";

function hasMarketingConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { marketing?: boolean } | null;
    return parsed?.marketing === true;
  } catch {
    return false;
  }
}

interface FbqShim {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: FbqShim;
  loaded: boolean;
  version: string;
}

// Snippet oficial do Meta Pixel, adaptado. Sob a CSP do app (nonce +
// strict-dynamic, sem 'unsafe-inline' em produção), o bundle da aplicação é
// confiável; o <script> criado programaticamente aqui é autorizado por
// PROPAGAÇÃO do strict-dynamic — não precisa de nonce nem de allowlist de host
// em script-src. As chamadas de rede do pixel usam img-src (https:) e
// connect-src (facebook), ambos liberados em src/proxy.ts.
function loadPixel(): void {
  const w = window as unknown as { fbq?: FbqShim; _fbq?: FbqShim };
  if (w.fbq) return;

  const fbq = function (this: unknown, ...args: unknown[]) {
    if (fbq.callMethod) {
      // Reflect.apply preserva o `this` (fbq) que o fbevents.js espera.
      Reflect.apply(fbq.callMethod, fbq, args);
    } else {
      fbq.queue.push(args);
    }
  } as FbqShim;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  w.fbq = fbq;
  w._fbq = w._fbq ?? fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");
}

/**
 * Carrega o Meta Pixel de forma condicionada ao consentimento de marketing.
 * Montado uma vez no layout raiz. Reage ao evento de consentimento para ativar
 * sem recarregar a página quando o usuário aceita marketing no banner.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const loaded = useRef(false);
  const firstNav = useRef(true);

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    const activate = () => {
      if (loaded.current || !hasMarketingConsent()) return;
      loaded.current = true;
      loadPixel();
    };
    activate();
    window.addEventListener(CONSENT_EVENT, activate);
    return () => window.removeEventListener(CONSENT_EVENT, activate);
  }, []);

  // PageView em navegações SPA (o PageView inicial é disparado no loadPixel).
  useEffect(() => {
    if (!META_PIXEL_ID) return;
    if (firstNav.current) {
      firstNav.current = false;
      return;
    }
    if (!loaded.current) return;
    trackMetaEvent("PageView");
  }, [pathname]);

  return null;
}
