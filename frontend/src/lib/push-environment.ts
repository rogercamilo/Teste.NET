/**
 * Classificação do ambiente de Web Push do navegador atual.
 *
 * O gate `"PushManager" in window` diz apenas *se* dá para inscrever — não *por
 * que não*. No iPhone isso é insuficiente: o iOS só expõe `PushManager` quando o
 * site foi adicionado à Tela de Início e é aberto pelo ícone (PWA standalone,
 * iOS 16.4+). Numa aba do Safari — e em Chrome/Firefox do iOS, que são todos
 * WebKit — o push simplesmente não existe, e mandar "tente outro navegador" é
 * enganoso. Esta função separa os casos acionáveis para a UI orientar o usuário
 * ao caminho certo (instalar como app, abrir no navegador real, atualizar o iOS).
 */

export type PushEnvironment =
  | "ready" // API de push presente — fluxo normal de inscrição
  | "ios-needs-install" // iOS no Safari: precisa "Adicionar à Tela de Início"
  | "ios-outdated" // iOS instalado como app, mas sem PushManager (iOS < 16.4)
  | "in-app-browser" // aberto dentro de outro app (WhatsApp/Instagram/…): sem push
  | "unsupported"; // realmente sem suporte (ex.: navegador desktop antigo)

// Navegadores embutidos em apps (link aberto de dentro do WhatsApp, Instagram,
// Facebook, etc.). Nesses webviews não há push nem "Adicionar à Tela de Início".
const IN_APP_BROWSER_RE =
  /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|WhatsApp|WeChat|MicroMessenger|GSA\//i;

export function detectPushEnvironment(): PushEnvironment {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "unsupported";
  }

  const supported = "serviceWorker" in navigator && "PushManager" in window;
  if (supported) return "ready";

  const ua = navigator.userAgent || "";

  // iPadOS 13+ se passa por macOS; distingue-se pelos pontos de toque.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const isInApp = IN_APP_BROWSER_RE.test(ua);

  if (isIOS) {
    // Já instalado como app mas sem PushManager ⇒ iOS anterior ao 16.4.
    if (isStandalone) return "ios-outdated";
    // Dentro de um webview não aparece "Adicionar à Tela de Início": mandar
    // abrir no Safari primeiro (só de lá é possível instalar e ativar).
    if (isInApp) return "in-app-browser";
    return "ios-needs-install";
  }

  if (isInApp) return "in-app-browser";
  return "unsupported";
}
