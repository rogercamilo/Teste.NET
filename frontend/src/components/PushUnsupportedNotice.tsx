"use client";

import { ExternalLink, Share, Smartphone, XCircle } from "lucide-react";
import type { PushEnvironment } from "@/lib/push-environment";

/**
 * Orientação exibida quando o Web Push não está disponível. Em vez de uma única
 * mensagem "tente outro navegador" (enganosa no iPhone, onde todo navegador é
 * WebKit), mostra o próximo passo certo para cada ambiente — ver
 * `detectPushEnvironment`.
 */
export function PushUnsupportedNotice({
  environment,
  compact = false,
}: {
  environment: PushEnvironment;
  compact?: boolean;
}) {
  const text = compact ? "text-xs" : "text-sm";

  if (environment === "ios-needs-install") {
    return (
      <div className={`rounded-lg border border-border bg-muted/30 px-3 py-2.5 ${text} text-muted-foreground space-y-2.5`}>
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Share className="h-4 w-4 shrink-0 text-primary" />
          Ativar no iPhone
        </div>
        <ol className="space-y-1.5 list-decimal pl-4">
          <li>
            Toque em <strong>Compartilhar</strong> (o quadrado com a seta ↑) na
            barra do Safari.
          </li>
          <li>
            Escolha <strong>Adicionar à Tela de Início</strong>.
          </li>
          <li>Abra o Formattio pelo novo ícone e toque em ativar aqui.</li>
        </ol>
        <p className="text-xs">
          O iPhone só entrega notificações quando o site é aberto como app pela
          tela inicial.
        </p>
      </div>
    );
  }

  if (environment === "in-app-browser") {
    return (
      <div className={`rounded-lg border border-border bg-muted/30 px-3 py-2.5 ${text} text-muted-foreground space-y-1.5`}>
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
          Abra no navegador
        </div>
        <p>
          Você abriu este link dentro de outro app (WhatsApp, Instagram…), que
          não permite notificações. Toque no menu <strong>⋯</strong> e escolha
          <strong> Abrir no Safari</strong> (iPhone) ou <strong>Abrir no Chrome</strong>{" "}
          (Android). Depois ative as notificações por lá.
        </p>
      </div>
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
