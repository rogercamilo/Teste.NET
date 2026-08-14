"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, CheckCircle2, Loader2 } from "lucide-react";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { PushUnsupportedNotice } from "@/components/PushUnsupportedNotice";

/**
 * Ativação/desativação de Web Push a partir do próprio portal do formando/
 * vocacionado — usa a sessão do portal (`/api/portal/push`), então funciona
 * sem depender do link mágico individual. Resolve a reativação após troca de
 * aparelho ou limpeza do navegador.
 */
export function PortalNotificacoesCard() {
  const [mounted, setMounted] = useState(false);
  const { isSupported, environment, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushSubscription("/api/portal/push");

  // Evita divergência de hidratação: Notification.permission só existe no cliente.
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Notificações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isSupported ? (
          <PushUnsupportedNotice environment={environment} />
        ) : permission === "denied" ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
            <BellOff className="h-4 w-4 shrink-0" />
            Notificações bloqueadas neste navegador. Para ativar, desbloqueie nas
            configurações do site (ícone de cadeado na barra de endereço).
          </div>
        ) : isSubscribed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Notificações ativas neste aparelho.
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={unsubscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              Desativar notificações
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Receba notificações diretamente no seu celular sobre encontros, datas e
              avisos da sua comunidade.
            </p>
            <Button className="w-full gap-2" onClick={subscribe} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {isLoading ? "Ativando…" : "Ativar notificações"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
