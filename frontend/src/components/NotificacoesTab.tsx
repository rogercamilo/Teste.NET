"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellOff, BellRing, CheckCircle2, Copy, Loader2, Send, Smartphone, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/use-push-subscription";

interface GrupoOption { id: string; nome: string; }

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

interface EnviarCardProps {
  onSent: () => void;
  isGestao: boolean;
  userGrupoFormacaoId?: string | null;
}

function EnviarNotificacaoCard({ onSent, isGestao, userGrupoFormacaoId }: EnviarCardProps) {
  const isFC = !isGestao;
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [sending, setSending] = useState(false);
  // FC nunca pode enviar para todos — destino fixo em "grupo"
  const [destino, setDestino] = useState<"todos" | "grupo">(isFC ? "grupo" : "todos");
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  // FC começa com o próprio grupo pré-selecionado
  const [grupoId, setGrupoId] = useState<string>(isFC ? (userGrupoFormacaoId ?? "") : "");

  useEffect(() => {
    fetch("/api/grupos-formacao")
      .then((r) => r.ok ? r.json() : [])
      .then((data: { id: string; nome: string }[]) => {
        setGrupos(data);
        // Para gestão, se só há um grupo, pré-seleciona ao trocar para "Por grupo"
        if (!isFC && data.length === 1 && !grupoId) setGrupoId(data[0].id);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    if (!titulo.trim() || !corpo.trim()) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }
    if (destino === "grupo" && !grupoId) {
      toast.error("Selecione um grupo de formação.");
      return;
    }
    setSending(true);
    try {
      const body: Record<string, string> = { titulo: titulo.trim(), corpo: corpo.trim() };
      if (destino === "grupo") body.grupoFormacaoId = grupoId;

      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const nomeGrupo = grupos.find((g) => g.id === grupoId)?.nome ?? "";

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          Enviar notificação
        </CardTitle>
        <CardDescription className="text-xs">
          {isFC
            ? "Envie um alerta para os membros do seu grupo de formação."
            : "Escolha o público-alvo e a mensagem será entregue imediatamente."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Toggle destinatário — apenas para gestão */}
        {isGestao && (
          <div className="space-y-1.5">
            <Label className="text-xs">Destinatário</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={destino === "todos" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => setDestino("todos")}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Todos da organização
              </Button>
              <Button
                type="button"
                variant={destino === "grupo" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => setDestino("grupo")}
              >
                <Bell className="h-3.5 w-3.5 mr-1.5" />
                Por grupo
              </Button>
            </div>
          </div>
        )}

        {/* Seletor de grupo — gestão vê dropdown; FC vê o próprio grupo como label */}
        {destino === "grupo" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Grupo de formação</Label>
            {isFC ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                <Bell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {nomeGrupo || "Seu grupo"}
              </div>
            ) : (
              <Select value={grupoId} onValueChange={(v) => setGrupoId(v ?? "")}>
                <SelectTrigger className="text-sm h-8">
                  <SelectValue placeholder="Selecione um grupo…">
                    {nomeGrupo || "Selecione um grupo…"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-sm">
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

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
          disabled={sending || !titulo.trim() || !corpo.trim() || (destino === "grupo" && !grupoId)}
          size="sm"
          className="w-full gap-2"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {sending
            ? "Enviando…"
            : destino === "grupo"
            ? "Enviar para o grupo"
            : "Enviar para todos os dispositivos"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Instruções para ativar ────────────────────────────────────────────────────

function InstrucoesCard() {
  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/portal`
      : "https://formattio.com.br/portal";

  function copyLink() {
    navigator.clipboard.writeText(portalUrl).then(() => {
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
          Oriente seus formandos a ativarem as notificações pelo Portal do Formando.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-3">
          {[
            "Compartilhe o link do Portal do Formando (abaixo) com seus formandos — por WhatsApp, e-mail ou grupo.",
            "O formando informa o e-mail dele e recebe na caixa de entrada um link de acesso seguro, sem senha. Ao clicar, entra no portal.",
            'Já no painel, ele toca em "Ativar notificações" e, quando o navegador pedir, em "Permitir".',
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
            {portalUrl}
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

interface NotificacoesTabProps {
  isGestao?: boolean;
  userRole?: string;
  userGrupoFormacaoId?: string | null;
}

export default function NotificacoesTab({ isGestao = false, userRole, userGrupoFormacaoId }: NotificacoesTabProps) {
  const { count, loading, refresh } = useSubscriptionCount();
  const isFC = userRole === "formador_comunitario";
  // FC com grupo pode enviar push para o próprio grupo
  const canSendPush = isGestao || (isFC && !!userGrupoFormacaoId);

  return (
    <div className="space-y-4">
      <MeuDispositivoCard />
      {isGestao && (
        <>
          <VisaoGeralCard count={count} loading={loading} />
          <InstrucoesCard />
        </>
      )}
      {canSendPush && (
        <EnviarNotificacaoCard
          onSent={refresh}
          isGestao={isGestao}
          userGrupoFormacaoId={userGrupoFormacaoId}
        />
      )}
    </div>
  );
}
