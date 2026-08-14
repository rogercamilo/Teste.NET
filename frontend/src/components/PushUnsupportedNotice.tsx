"use client";

import { useState } from "react";
import { ExternalLink, Share, Smartphone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PushInstallGuide } from "@/components/PushInstallGuide";
import type { PushEnvironment } from "@/lib/push-environment";

/**
 * Orientação exibida quando o Web Push não está disponível. Em vez de uma única
 * mensagem "tente outro navegador" (enganosa no iPhone, onde todo navegador é
 * WebKit), mostra o próximo passo certo para cada ambiente. Nos casos que têm
 * solução na mão do usuário (instalar como app no iOS, abrir no navegador),
 * abre um guia visual passo a passo — ver `PushInstallGuide`.
 */
export function PushUnsupportedNotice({
  environment,
  compact = false,
}: {
  environment: PushEnvironment;
  compact?: boolean;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const text = compact ? "text-xs" : "text-sm";

  if (environment === "ios-needs-install") {
    return (
      <>
        <div className={`rounded-lg border border-border bg-muted/30 px-3 py-3 ${text} space-y-3`}>
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Share className="h-4 w-4 shrink-0 text-primary" />
            Ative as notificações no seu iPhone
          </div>
          <p className="text-muted-foreground">
            No iPhone, as notificações funcionam adicionando o Formattio à tela
            inicial. Mostramos como — são 3 passos rápidos.
          </p>
          <Button className="w-full gap-2" onClick={() => setGuideOpen(true)}>
            <Share className="h-4 w-4" />
            Ver como ativar
          </Button>
        </div>
        <PushInstallGuide variant="ios-install" open={guideOpen} onOpenChange={setGuideOpen} />
      </>
    );
  }

  if (environment === "in-app-browser") {
    return (
      <>
        <div className={`rounded-lg border border-border bg-muted/30 px-3 py-3 ${text} space-y-3`}>
          <div className="flex items-center gap-2 font-medium text-foreground">
            <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
            Abra no navegador para ativar
          </div>
          <p className="text-muted-foreground">
            Este link foi aberto dentro de outro app (como o WhatsApp), que não
            permite notificações. É só abrir no navegador do celular.
          </p>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setGuideOpen(true)}
          >
            <ExternalLink className="h-4 w-4" />
            Ver como fazer
          </Button>
        </div>
        <PushInstallGuide variant="in-app" open={guideOpen} onOpenChange={setGuideOpen} />
      </>
    );
  }

  if (environment === "ios-outdated") {
    return (
      <div className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2.5 ${text} text-amber-800 dark:text-amber-300`}>
        <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Seu iPhone precisa estar no <strong>iOS 16.4 ou mais recente</strong>{" "}
          para receber notificações. Atualize em Ajustes → Geral → Atualização de
          Software.
        </span>
      </div>
    );
  }

  // "unsupported" — genuinamente sem push (ex.: navegador desktop antigo).
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 ${text} text-muted-foreground`}>
      <XCircle className="h-4 w-4 shrink-0" />
      Seu navegador não suporta notificações. Tente o Chrome ou o Firefox.
    </div>
  );
}
