"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "formatio_cookie_consent";
const CONSENT_VERSION = "1";

interface ConsentState {
  analiticos: boolean;
  marketing: boolean;
  preferencias: boolean;
  version: string;
}

function loadConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveConsent(consent: Omit<ConsentState, "version">) {
  const payload: ConsentState = { ...consent, version: CONSENT_VERSION };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  const sessionId = `anon_${crypto.randomUUID()}`;
  await fetch("/api/cookies/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...consent, sessionId }),
  }).catch(() => {});
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analiticos, setAnaliticos] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [preferencias, setPreferencias] = useState(false);

  useEffect(() => {
    const stored = loadConsent();
    if (!stored) {
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  if (!visible) return null;

  async function acceptAll() {
    await saveConsent({ analiticos: true, marketing: true, preferencias: true });
    setVisible(false);
  }

  async function acceptNecessary() {
    await saveConsent({ analiticos: false, marketing: false, preferencias: false });
    setVisible(false);
  }

  async function saveCustom() {
    await saveConsent({ analiticos, marketing, preferencias });
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Preferências de cookies"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-2xl"
    >
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Usamos cookies para melhorar sua experiência
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Cookies necessários são sempre ativos. Os demais só serão ativados com seu consentimento.{" "}
              <Link href="/privacidade#cookies" className="text-primary hover:underline" target="_blank">
                Saiba mais
              </Link>
            </p>

            {expanded && (
              <div className="mt-3 space-y-2 border border-border rounded-lg p-3 bg-background/50">
                <CategoryRow
                  label="Necessários"
                  description="Autenticação e funcionamento básico da plataforma."
                  checked={true}
                  disabled
                />
                <CategoryRow
                  label="Analíticos"
                  description="Métricas de uso anônimas para melhorar o serviço."
                  checked={analiticos}
                  onChange={setAnaliticos}
                />
                <CategoryRow
                  label="Marketing"
                  description="Comunicações personalizadas e relevantes para você."
                  checked={marketing}
                  onChange={setMarketing}
                />
                <CategoryRow
                  label="Preferências"
                  description="Tema, idioma e configurações da interface."
                  checked={preferencias}
                  onChange={setPreferencias}
                />
              </div>
            )}
          </div>

          <button
            onClick={() => setVisible(false)}
            className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button size="sm" onClick={acceptAll} className="h-8 text-xs">
            Aceitar todos
          </Button>
          <Button size="sm" variant="outline" onClick={acceptNecessary} className="h-8 text-xs">
            Apenas necessários
          </Button>
          {expanded && (
            <Button size="sm" variant="secondary" onClick={saveCustom} className="h-8 text-xs">
              Salvar preferências
            </Button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Personalizar
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <div className={`w-9 h-5 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full ${disabled ? "bg-primary/50 cursor-not-allowed" : "bg-muted peer-checked:bg-primary"}`} />
      </label>
    </div>
  );
}
