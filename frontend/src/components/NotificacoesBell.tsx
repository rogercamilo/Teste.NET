"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// Button é usado no header da lista (marcar todas lidas)
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type TipoNotificacao =
  | "nova_formacao"
  | "novo_formando"
  | "novo_agendamento"
  | "processo_aprovado"
  | "plano_atribuido"
  | "plano_atualizado"
  | "grade_atribuida"
  | "grade_atualizada"
  | "dados_formando_pendentes"
  | "formando_em_risco";

interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  corpo: string | null;
  linkAcao: string | null;
  lida: boolean;
  criadaEm: string;
}

// ── Ícone e cor por tipo ──────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoNotificacao, { dot: string }> = {
  nova_formacao:           { dot: "bg-blue-500"    },
  novo_formando:           { dot: "bg-emerald-500" },
  novo_agendamento:        { dot: "bg-violet-500"  },
  processo_aprovado:       { dot: "bg-green-500"   },
  plano_atribuido:         { dot: "bg-amber-500"   },
  plano_atualizado:        { dot: "bg-amber-400"   },
  grade_atribuida:         { dot: "bg-orange-500"  },
  grade_atualizada:        { dot: "bg-orange-400"  },
  dados_formando_pendentes:{ dot: "bg-red-500"     },
  formando_em_risco:       { dot: "bg-amber-500"   },
};

// ── Formatação de data relativa ───────────────────────────────────────────────

function dataRelativa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);
  if (min < 1)  return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  if (h   < 24) return `há ${h}h`;
  if (d   < 7)  return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

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

  async function handleClick(n: Notificacao) {
    // Marca como lida localmente para resposta imediata
    setNotificacoes((prev) => prev.filter((x) => x.id !== n.id));
    await fetch(`/api/notificacoes/${n.id}`, { method: "PATCH" });
    setOpen(false);
    if (n.linkAcao) router.push(n.linkAcao);
  }

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
        className="w-80 p-0 shadow-lg"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Notificações</p>
          {total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground gap-1"
              onClick={marcarTodas}
            >
              <CheckCheck className="h-3.5 w-3.5" />
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
          <ScrollArea className="max-h-[420px]">
            <ul className="divide-y divide-border">
              {notificacoes.map((n) => {
                const config = TIPO_CONFIG[n.tipo] ?? { dot: "bg-muted-foreground" };
                return (
                  <li key={n.id}>
                    <button
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                        "hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
                      )}
                      onClick={() => handleClick(n)}
                    >
                      {/* Dot indicador de tipo */}
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", config.dot)} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">
                          {n.titulo}
                        </p>
                        {n.corpo && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.corpo}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          {dataRelativa(n.criadaEm)}
                        </p>
                      </div>

                      {n.linkAcao && (
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-1 text-muted-foreground/50" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
