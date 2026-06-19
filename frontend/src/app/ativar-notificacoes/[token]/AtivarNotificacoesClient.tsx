"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, CheckCircle2, Loader2, XCircle } from "lucide-react";

interface Props {
  token: string;
  nome: string;
  grupoNome: string | null;
  orgNome: string;
}

type State = "idle" | "loading" | "subscribed" | "unsubscribed" | "denied" | "unsupported" | "error";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output.buffer as ArrayBuffer;
}

export default function AtivarNotificacoesClient({ token, nome, grupoNome, orgNome }: Props) {
  const [state, setState] = useState<State>("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    if (!supported) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) setState("subscribed");
    }).catch(() => {});
  }, []);

  async function handleSubscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js") ??
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });

      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await fetch("/api/push/subscribe-formando", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
      });

      setState(res.ok ? "subscribed" : "error");
    } catch {
      setState("error");
    }
  }

  async function handleUnsubscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setState("unsubscribed"); return; }

      const json = sub.toJSON() as { endpoint: string };
      await fetch("/api/push/subscribe-formando", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, endpoint: json.endpoint }),
      });

      await sub.unsubscribe();
      setState("unsubscribed");
    } catch {
      setState("error");
    }
  }

  const firstName = nome.split(" ")[0];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b25433]/10 border border-[#b25433]/20 mb-6">
          <Bell className="h-7 w-7 text-[#b25433]" />
        </div>

        <p className="text-sm font-medium text-[#b25433] uppercase tracking-widest mb-3">
          {orgNome}
        </p>

        <h1 className="text-2xl font-bold text-white mb-2">
          Olá, {firstName}!
        </h1>

        {grupoNome && (
          <p className="text-slate-400 text-sm mb-6">
            Grupo de formação: <span className="text-slate-200">{grupoNome}</span>
          </p>
        )}

        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Ative as notificações para receber avisos sobre encontros, datas e comunicados
          diretamente no seu dispositivo — sem precisar de aplicativo.
        </p>

        {!mounted ? null : state === "unsupported" ? (
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-400 text-sm">
            <XCircle className="h-5 w-5 shrink-0" />
            Seu navegador não suporta notificações.
          </div>
        ) : state === "denied" ? (
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-400 text-sm">
            <BellOff className="h-5 w-5 shrink-0" />
            Notificações bloqueadas. Ative nas configurações do navegador.
          </div>
        ) : state === "subscribed" ? (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Notificações ativas neste dispositivo</span>
            </div>
            <div>
              <button
                onClick={handleUnsubscribe}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors inline-flex items-center gap-1.5 mt-1"
              >
                <BellOff className="h-3 w-3" /> Desativar notificações
              </button>
            </div>
          </div>
        ) : state === "unsubscribed" ? (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-400 text-sm">
              <BellOff className="h-5 w-5 shrink-0" />
              Notificações desativadas.
            </div>
            <button
              onClick={handleSubscribe}
              className="block mx-auto text-sm text-[#b25433] hover:text-[#b25433]/80 transition-colors"
            >
              Ativar novamente
            </button>
          </div>
        ) : state === "error" ? (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <XCircle className="h-5 w-5 shrink-0" />
              Ocorreu um erro. Tente novamente.
            </div>
            <button
              onClick={handleSubscribe}
              className="block mx-auto text-sm text-[#b25433] hover:text-[#b25433]/80 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={state === "loading"}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#b25433] text-white font-semibold rounded-xl hover:bg-[#b25433]/90 disabled:opacity-60 transition-colors text-sm"
          >
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {state === "loading" ? "Ativando…" : "Ativar notificações"}
          </button>
        )}

        <p className="mt-8 text-xs text-slate-600">
          Sem spam. Apenas avisos da sua comunidade. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
}
