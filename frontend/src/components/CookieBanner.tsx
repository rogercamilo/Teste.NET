"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cookie, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "Formattio_cookie_consent";
const SESSION_ID_KEY = "Formattio_consent_session_id";
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

// Persiste o sessionId para que atualizações de preferência apontem para o mesmo
// registro no banco — sem isso, cada chamada criaria um registro órfão.
function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = `anon_${crypto.randomUUID()}`;
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

async function saveConsent(consent: Omit<ConsentState, "version">) {
  const payload: ConsentState = { ...consent, version: CONSENT_VERSION };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  // Avisa recursos condicionados a consentimento (ex.: Meta Pixel) para que
  // ativem/desativem sem exigir recarga da página.
  window.dispatchEvent(new Event("Formattio-consent-changed"));

  const sessionId = getOrCreateSessionId();
  await fetch("/api/cookies/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...consent, sessionId }),
  }).catch((err) => console.warn("[CookieBanner] falha ao persistir consentimento:", err));
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [analiticos, setAnaliticos] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [preferencias, setPreferencias] = useState(false);

  useEffect(() => {
    const stored = loadConsent();
    if (!stored) {
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  // Reserva espaço no rodapé igual à altura real do banner enquanto ele estiver
  // visível, para não cobrir o botão de ação da página (ex.: "Próximo" no
  // onboarding, sobretudo no mobile, onde o banner é mais alto). O ResizeObserver
  // mantém o padding sincronizado ao expandir "Personalizar" ou redimensionar.
  useEffect(() => {
    if (!visible) return;
    const el = bannerRef.current;
    if (!el) return;
    const apply = () => { document.body.style.paddingBottom = `${el.offsetHeight}px`; };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [visible]);

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
      ref={bannerRef}
      role="dialog"
      aria-modal="true"
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
            onClick={acceptNecessary}
            className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground"
            aria-label="Fechar (aceitar apenas necessários)"
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
