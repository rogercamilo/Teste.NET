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
//
// MODO DE CONSENTIMENTO (Meta Consent Mode): o pixel é carregado já no load da
// página, mas em estado `consent: 'revoke'` — presente e DETECTÁVEL pelas
// ferramentas da Meta (Configurar eventos, Eventos de Teste, Pixel Helper), sem
// enviar NENHUM evento nem gravar cookie de marketing até o consentimento ser
// concedido. O `revoke` é chamado ANTES do `init` justamente para impedir o
// PageView/cookie automático. Só após o opt-in de marketing chamamos `grant`.
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

  // Consentimento NEGADO por padrão (antes do init): nada é enviado nem gravado
  // até o grant. É o que torna o pixel compatível com LGPD sem escondê-lo da Meta.
  fbq("consent", "revoke");
  fbq("init", META_PIXEL_ID);
}

/**
 * Meta Pixel com consent mode. Montado uma vez no layout raiz.
 * - No mount: carrega o pixel em `revoke` (detectável, mas mudo).
 * - Ao consentir marketing: `grant` + PageView. Reage ao vivo ao banner.
 * - Ao revogar marketing (via "Gerenciar cookies"): volta para `revoke`.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const loadedRef = useRef(false);
  const grantedRef = useRef(false);
  const firstNav = useRef(true);

  useEffect(() => {
    if (!META_PIXEL_ID) return;

    if (!loadedRef.current) {
      loadedRef.current = true;
      loadPixel();
    }

    // Sincroniza o estado de consentimento do pixel com a escolha do usuário,
    // nos dois sentidos (conceder e revogar).
    const syncConsent = () => {
      const w = window as unknown as { fbq?: FbqShim };
      if (!w.fbq) return;
      const consented = hasMarketingConsent();
      if (consented && !grantedRef.current) {
        grantedRef.current = true;
        w.fbq("consent", "grant");
        w.fbq("track", "PageView");
      } else if (!consented && grantedRef.current) {
        grantedRef.current = false;
        w.fbq("consent", "revoke");
      }
    };

    syncConsent();
    window.addEventListener(CONSENT_EVENT, syncConsent);
    return () => window.removeEventListener(CONSENT_EVENT, syncConsent);
  }, []);

  // PageView em navegações SPA — só após o consentimento (o PageView inicial é
  // disparado no grant). Sob `revoke` o trackMetaEvent é retido pelo fbevents.
  useEffect(() => {
    if (!META_PIXEL_ID) return;
    if (firstNav.current) {
      firstNav.current = false;
      return;
    }
    if (!grantedRef.current) return;
    trackMetaEvent("PageView");
  }, [pathname]);

  return null;
}
