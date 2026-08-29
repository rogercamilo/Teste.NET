"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListaNotificacoes, type Notificacao } from "@/components/notificacoes/shared";

// ── Componente principal ──────────────────────────────────────────────────────

export function NotificacoesBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);

  const total = notificacoes.length;

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notificacoes");
      if (res.ok) setNotificacoes(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega ao abrir o popover
  useEffect(() => {
    if (open) carregar();
  }, [open, carregar]);

  // Polling leve a cada 60s enquanto a aba está visível
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) carregar();
    }, 60_000);
    return () => clearInterval(id);
  }, [carregar]);

  const handleOpen = useCallback(
    async (n: Notificacao) => {
      // Marca como lida localmente para resposta imediata
      setNotificacoes((prev) => prev.filter((x) => x.id !== n.id));
      await fetch(`/api/notificacoes/${n.id}`, { method: "PATCH" });
      setOpen(false);
      if (n.linkAcao) router.push(n.linkAcao);
    },
    [router]
  );

  async function marcarTodas() {
    setNotificacoes([]);
    await fetch("/api/notificacoes", { method: "PATCH" });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 max-w-[calc(100vw-1rem)] p-0 shadow-lg"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <p className="text-base font-semibold">Notificações</p>
          {total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground gap-1"
              onClick={marcarTodas}
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Lista */}
        {loading && notificacoes.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
            <BellOff className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Sem notificações pendentes</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[min(80vh,44rem)]">
            <ListaNotificacoes notificacoes={notificacoes} onOpen={handleOpen} />
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
