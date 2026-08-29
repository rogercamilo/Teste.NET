"use client";

// Peças visuais COMPARTILHADas das notificações (sino do app + card do Portal do
// Formando), para o mesmo padrão em ambos: disco-âncora com ícone+cor, título
// como frase, etiqueta com a PALAVRA da categoria (código redundante, não só
// cor — acessibilidade), data por extenso, ação explícita e agrupamento por
// assunto. Ver [[feedback-ux-inclusao-digital]].

import { useState } from "react";
import {
  Bell,
  ChevronRight,
  ChevronDown,
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
  AlertTriangle,
  CalendarX,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoNotificacao =
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
  | "formando_em_risco"
  | "aviso_comunidade";

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  corpo: string | null;
  linkAcao: string | null;
  lida: boolean;
  criadaEm: string;
}

// ── Ícone, cor e rótulo por tipo ──────────────────────────────────────────────

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
  aviso_comunidade:         { Icon: Megaphone,     label: "Aviso da comunidade", className: "bg-primary/10 text-primary"       },
};

const FALLBACK_CONFIG: TipoConfig = { Icon: Bell, label: "Aviso", className: "bg-muted text-muted-foreground" };

// ── Formatação de data amigável ───────────────────────────────────────────────
// Texto por extenso ("ontem", "há 3 dias") — mais fácil para quem tem
// dificuldade de leitura.

export function dataRelativa(iso: string): string {
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

// ── Agrupamento por assunto ───────────────────────────────────────────────────
// Vários avisos do MESMO assunto (mesmo tipo + mesmo título) viram um só cartão
// com contagem e expansão. A lista já vem ordenada por data desc.

export interface GrupoNotificacao {
  key: string;
  tipo: TipoNotificacao;
  titulo: string;
  items: Notificacao[];
}

export function agruparNotificacoes(lista: Notificacao[]): GrupoNotificacao[] {
  const mapa = new Map<string, GrupoNotificacao>();
  const ordem: string[] = [];
  for (const n of lista) {
    const key = `${n.tipo}::${n.titulo}`;
    let g = mapa.get(key);
    if (!g) {
      g = { key, tipo: n.tipo, titulo: n.titulo, items: [] };
      mapa.set(key, g);
      ordem.push(key);
    }
    g.items.push(n);
  }
  return ordem.map((k) => mapa.get(k)!);
}

// ── Item único ────────────────────────────────────────────────────────────────

export function NotificacaoItem({
  n,
  onOpen,
}: {
  n: Notificacao;
  onOpen: (n: Notificacao) => void;
}) {
  const config = TIPO_CONFIG[n.tipo] ?? FALLBACK_CONFIG;
  const Icon = config.Icon;
  return (
    <li>
      <button
        className={cn(
          "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
        )}
        onClick={() => onOpen(n)}
      >
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
}

// ── Grupo de avisos do mesmo assunto ──────────────────────────────────────────

export function NotificacaoGrupo({
  grupo,
  onOpen,
}: {
  grupo: GrupoNotificacao;
  onOpen: (n: Notificacao) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const config = TIPO_CONFIG[grupo.tipo] ?? FALLBACK_CONFIG;
  const Icon = config.Icon;
  const recente = grupo.items[0];
  const qtd = grupo.items.length;

  return (
    <li>
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={cn(
          "w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            config.className
          )}
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">
              {grupo.titulo}
            </p>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {qtd} avisos
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-snug text-foreground/75 line-clamp-2">
            {recente.corpo}
          </p>

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
              {dataRelativa(recente.criadaEm)}
            </span>
          </div>

          <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
            {aberto ? "Ocultar avisos" : `Ver os ${qtd} avisos`}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", aberto && "rotate-180")}
            />
          </span>
        </div>
      </button>

      {aberto && (
        <ul className="border-t border-border/60 bg-muted/20">
          {grupo.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className={cn(
                  "w-full pl-[4.25rem] pr-4 py-3 text-left transition-colors",
                  "hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/50"
                )}
              >
                <p className="text-sm leading-snug text-foreground">
                  {item.corpo || grupo.titulo}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs text-muted-foreground">
                    {dataRelativa(item.criadaEm)}
                  </span>
                  {item.linkAcao && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Ver detalhes
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Lista pronta (agrupada) ───────────────────────────────────────────────────

export function ListaNotificacoes({
  notificacoes,
  onOpen,
}: {
  notificacoes: Notificacao[];
  onOpen: (n: Notificacao) => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {agruparNotificacoes(notificacoes).map((g) =>
        g.items.length === 1 ? (
          <NotificacaoItem key={g.key} n={g.items[0]} onOpen={onOpen} />
        ) : (
          <NotificacaoGrupo key={g.key} grupo={g} onOpen={onOpen} />
        )
      )}
    </ul>
  );
}
