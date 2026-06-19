"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, BellRing, CheckCircle2, Copy, Loader2, Send, Smartphone, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/use-push-subscription";

// ── Contagem de inscritos ─────────────────────────────────────────────────────

function useSubscriptionCount() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/push/count");
      if (res.ok) setCount((await res.json()).total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { count, loading, refresh };
}

// ── Card: Meu dispositivo ────────────────────────────────────────────────────

function MeuDispositivoCard() {
  const [mounted, setMounted] = useState(false);
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushSubscription();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Este dispositivo
        </CardTitle>
        <CardDescription className="text-xs">
          Receba alertas instantâneos neste navegador mesmo com a aba fechada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSupported ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            <XCircle className="h-4 w-4 shrink-0" />
            Seu navegador não suporta notificações push. Tente Chrome ou Firefox.
          </div>
        ) : permission === "denied" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
              <BellOff className="h-4 w-4 shrink-0" />
              Notificações bloqueadas neste navegador. Para ativar, desbloqueie nas configurações do site (ícone de cadeado na barra de endereço).
            </div>
          </div>
        ) : isSubscribed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Notificações ativas neste dispositivo.
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={unsubscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BellOff className="h-3.5 w-3.5" />
              )}
              Desativar notificações
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={subscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
            {isLoading ? "Ativando…" : "Ativar notificações"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Painel de envio manual ────────────────────────────────────────────────────

function EnviarNotificacaoCard({ onSent }: { onSent: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!titulo.trim() || !corpo.trim()) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: titulo.trim(), corpo: corpo.trim() }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "Falha ao enviar.");
        return;
      }
      const { sent } = await res.json();
      toast.success(
        sent === 0
          ? "Nenhum dispositivo inscrito no momento."
          : `Notificação enviada para ${sent} dispositivo${sent !== 1 ? "s" : ""}.`
      );
      setTitulo("");
      setCorpo("");
      onSent();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          Enviar notificação
        </CardTitle>
        <CardDescription className="text-xs">
          A mensagem será entregue imediatamente a todos os dispositivos inscritos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Título</Label>
          <Input
            placeholder="Ex: Formação de amanhã confirmada"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={100}
            className="text-sm h-8"
          />
          <p className="text-xs text-muted-foreground text-right">{titulo.length}/100</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Mensagem</Label>
          <Textarea
            placeholder="Ex: A formação de amanhã às 19h no salão paroquial está confirmada. Não falte!"
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            maxLength={300}
            rows={3}
            className="text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{corpo.length}/300</p>
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || !titulo.trim() || !corpo.trim()}
          size="sm"
          className="w-full gap-2"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {sending ? "Enviando…" : "Enviar para todos os dispositivos"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Instruções para ativar ────────────────────────────────────────────────────

function InstrucoesCard() {
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://formattio.com.br";

  function copyLink() {
    navigator.clipboard.writeText(appUrl).then(() => {
      toast.success("Link copiado!");
    });
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          Como ativar nos dispositivos dos formandos
        </CardTitle>
        <CardDescription className="text-xs">
          Siga os passos abaixo para orientar seus formandos a ativarem as notificações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-3">
          {[
            "Compartilhe o link do Formattio com seus formandos (WhatsApp, e-mail ou grupo).",
            'O formando acessa o site e clica em "Ativar notificações" na página inicial ou em Configurações.',
            'O dispositivo exibirá um prompt pedindo permissão — o formando toca em "Permitir".',
            "Pronto! O dispositivo passa a receber notificações mesmo com o navegador fechado.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>

        <Separator />

        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground truncate font-mono">
            {appUrl}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </Button>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2.5">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <strong>iOS:</strong> O formando precisa acessar o site pelo Safari e adicionar à tela inicial antes de ativar notificações.
            No <strong>Android</strong> qualquer navegador moderno funciona diretamente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Visão geral ───────────────────────────────────────────────────────────────

function VisaoGeralCard({ count, loading }: { count: number | null; loading: boolean }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" />
            Notificações push
          </CardTitle>
          {!loading && (
            <Badge
              variant="outline"
              className={
                count && count > 0
                  ? "text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                  : "text-xs text-muted-foreground"
              }
            >
              {count && count > 0 ? "Ativo" : "Sem inscritos"}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Envie alertas instantâneos para os dispositivos dos formandos sem nenhum aplicativo instalado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 bg-muted/20">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dispositivos inscritos</p>
            {loading ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin inline-block mt-1" />
            ) : (
              <p className="text-xl font-bold text-foreground">{count ?? 0}</p>
            )}
          </div>
        </div>

        {!loading && count === 0 && (
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <BellOff className="h-3.5 w-3.5 shrink-0" />
            Nenhum formando inscrito ainda. Compartilhe o link abaixo para que eles ativem as notificações.
          </p>
        )}
        {!loading && count !== null && count > 0 && (
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            {count} dispositivo{count !== 1 ? "s" : ""} receberá{count !== 1 ? "ão" : ""} a próxima notificação.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Tab principal ─────────────────────────────────────────────────────────────

export default function NotificacoesTab({ isGestao }: { isGestao?: boolean }) {
  const { count, loading, refresh } = useSubscriptionCount();

  return (
    <div className="space-y-4">
      <MeuDispositivoCard />
      {isGestao && (
        <>
          <VisaoGeralCard count={count} loading={loading} />
          <InstrucoesCard />
          <EnviarNotificacaoCard onSent={refresh} />
        </>
      )}
    </div>
  );
}
