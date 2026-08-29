"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  BookOpen,
  UserPlus,
  CalendarPlus,
  CheckCircle2,
  RotateCcw,
  Eye,
  Play,
  ClipboardList,
  LayoutGrid,
  AlertCircle,
  CalendarX,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
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
  | "processo_devolvido"
  | "processo_em_revisao"
  | "processo_concluido"
  | "processo_iniciado"
  | "plano_atribuido"
  | "plano_atualizado"
  | "grade_atribuida"
  | "grade_atualizada"
  | "dados_formando_pendentes"
  | "justificativa_formando"
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

// ── Ícone, cor e rótulo por tipo ──────────────────────────────────────────────
// Cada tipo tem uma PALAVRA (label) + ÍCONE + COR — código redundante para não
// depender só de cor (acessibilidade / inclusão). O `className` pinta tanto o
// disco-âncora à esquerda quanto a etiqueta de categoria.

interface TipoConfig {
  Icon: LucideIcon;
  label: string;
  className: string;
}

const TIPO_CONFIG: Record<TipoNotificacao, TipoConfig> = {
  nova_formacao:            { Icon: BookOpen,      label: "Nova formação",       className: "bg-blue-100 text-blue-700"       },
  novo_formando:            { Icon: UserPlus,      label: "Novo formando",       className: "bg-emerald-100 text-emerald-700" },
  novo_agendamento:         { Icon: CalendarPlus,  label: "Novo encontro",       className: "bg-violet-100 text-violet-700"   },
  processo_aprovado:        { Icon: CheckCircle2,  label: "Processo aprovado",   className: "bg-green-100 text-green-700"      },
  processo_devolvido:       { Icon: RotateCcw,     label: "Processo devolvido",  className: "bg-amber-100 text-amber-700"      },
  processo_em_revisao:      { Icon: Eye,           label: "Em revisão",          className: "bg-yellow-100 text-yellow-700"    },
  processo_concluido:       { Icon: CheckCircle2,  label: "Processo concluído",  className: "bg-emerald-100 text-emerald-700" },
  processo_iniciado:        { Icon: Play,          label: "Processo iniciado",   className: "bg-blue-100 text-blue-700"        },
  plano_atribuido:          { Icon: ClipboardList, label: "Plano atribuído",     className: "bg-amber-100 text-amber-700"      },
  plano_atualizado:         { Icon: ClipboardList, label: "Plano atualizado",    className: "bg-amber-100 text-amber-700"      },
  grade_atribuida:          { Icon: LayoutGrid,    label: "Grade atribuída",     className: "bg-orange-100 text-orange-700"    },
  grade_atualizada:         { Icon: LayoutGrid,    label: "Grade atualizada",    className: "bg-orange-100 text-orange-700"    },
  dados_formando_pendentes: { Icon: AlertCircle,   label: "Dados pendentes",     className: "bg-red-100 text-red-700"          },
  justificativa_formando:   { Icon: CalendarX,     label: "Falta avisada",       className: "bg-amber-100 text-amber-700"      },
  formando_em_risco:        { Icon: AlertTriangle, label: "Formando em risco",   className: "bg-red-100 text-red-700"          },
};

const FALLBACK_CONFIG: TipoConfig = { Icon: Bell, label: "Aviso", className: "bg-muted text-muted-foreground" };

// ── Formatação de data amigável ───────────────────────────────────────────────
// Texto por extenso ("ontem", "há 3 dias") em vez de abreviações — mais fácil
// para quem tem dificuldade de leitura.

function dataRelativa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);
  if (min < 1)  return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  if (h   < 24) return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  if (d === 1)  return "ontem";
  if (d   < 7)  return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
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
          <ScrollArea className="max-h-[440px]">
            <ul className="divide-y divide-border">
              {notificacoes.map((n) => {
                const config = TIPO_CONFIG[n.tipo] ?? FALLBACK_CONFIG;
                const Icon = config.Icon;
                return (
                  <li key={n.id}>
                    <button
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors",
                        "hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
                      )}
                      onClick={() => handleClick(n)}
                    >
                      {/* Disco-âncora: ícone + cor por tipo (reconhecimento visual) */}
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          config.className
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold leading-snug text-foreground">
                          {n.titulo}
                        </p>
                        {n.corpo && (
                          <p className="mt-0.5 text-sm leading-snug text-foreground/75 line-clamp-3">
                            {n.corpo}
                          </p>
                        )}

                        {/* Categoria (palavra) + data amigável */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              config.className
                            )}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {dataRelativa(n.criadaEm)}
                          </span>
                        </div>

                        {/* Ação explícita (não depende de descobrir que o card é clicável) */}
                        {n.linkAcao && (
                          <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                            Ver detalhes
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        )}
                      </div>
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
