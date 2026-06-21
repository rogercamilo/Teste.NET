"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  TrendingUp, AlertTriangle, Gift, Ban, BadgeCheck, Activity, KeyRound,
  CalendarPlus, Search, ExternalLink, CircleAlert, Filter, X, Download,
  MessageSquare, CheckSquare2, MoreHorizontal, RefreshCw, Clock,
  Loader2, Send, CheckCircle2,
} from "lucide-react";
import {
  PLANO_COLORS, STATUS_COLORS, STORAGE_LIMITS, TIPO_LABELS, PAGE_SIZE,
  activityBadge, engajamentoBadge, exportOrgsCSV, formatBytes,
} from "../_utils";
import type { OrgRow, DialogAcao } from "../_types";

interface Props {
  orgs: OrgRow[];
  filteredOrgs: OrgRow[];
  orgFilter: "all" | "trials" | "fantasmas";
  setOrgFilter: (v: "all" | "trials" | "fantasmas") => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterPlano: string;
  setFilterPlano: (v: string) => void;
  filterTipo: string;
  setFilterTipo: (v: string) => void;
  filterOnboarding: boolean;
  setFilterOnboarding: (v: (prev: boolean) => boolean) => void;
  clearAdvancedFilters: () => void;
  actionLoading: string | null;
  onAction: (org: OrgRow, acao: DialogAcao) => void;
  onReload: () => Promise<void>;
}

export function TabOrganizacoes({
  orgs, filteredOrgs, orgFilter, setOrgFilter,
  filterStatus, setFilterStatus, filterPlano, setFilterPlano,
  filterTipo, setFilterTipo, filterOnboarding, setFilterOnboarding,
  clearAdvancedFilters, actionLoading, onAction, onReload,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [pageOrgs, setPageOrgs] = useState(1);

  // Bulk selection
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [bulkTrialDays, setBulkTrialDays] = useState("30");
  const [bulkDialogOpen, setBulkDialogOpen] = useState<"trial" | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Comunicado
  const [comunicadoOpen, setComunicadoOpen] = useState(false);
  const [comunicadoAssunto, setComunicadoAssunto] = useState("");
  const [comunicadoMensagem, setComunicadoMensagem] = useState("");
  const [comunicadoScope, setComunicadoScope] = useState<"filtradas" | "selecionadas">("filtradas");
  const [comunicadoLoading, setComunicadoLoading] = useState(false);
  const [comunicadoResult, setComunicadoResult] = useState<{ orgs: number; admins: number; sent: number; failed: number } | null>(null);

  const hasAdvancedFilter = !!(filterStatus || filterPlano || filterTipo || filterOnboarding);

  const visibleOrgs = search.trim()
    ? filteredOrgs.filter((o) => o.nome.toLowerCase().includes(search.trim().toLowerCase()))
    : filteredOrgs;

  function toggleOrgSelection(id: string) {
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePageSelection(pageItems: OrgRow[]) {
    const pageIds = pageItems.map((o) => o.id);
    const allSelected = pageIds.every((id) => selectedOrgIds.has(id));
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function executeBulkAction(acao: "suspender" | "reativar" | "estender_trial") {
    const orgIds = Array.from(selectedOrgIds);
    setBulkLoading(true);
    try {
      const res = await fetch("/api/super-admin/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgIds, acao, diasTrial: Number(bulkTrialDays) }),
      });
      const json = await res.json().catch(() => ({})) as { success?: number; failed?: number; error?: string };
      if (!res.ok) { toast.error(json.error ?? "Falha ao executar ação em massa."); return; }
      toast.success(`${json.success} org${(json.success ?? 0) !== 1 ? "s" : ""} atualizada${(json.success ?? 0) !== 1 ? "s" : ""}.${(json.failed ?? 0) > 0 ? ` (${json.failed} falha${(json.failed ?? 0) !== 1 ? "s" : ""})` : ""}`);
      setSelectedOrgIds(new Set());
      setBulkDialogOpen(null);
      await onReload();
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function sendComunicado() {
    if (!comunicadoAssunto.trim() || !comunicadoMensagem.trim()) {
      toast.error("Preencha o assunto e a mensagem.");
      return;
    }
    const orgIds = comunicadoScope === "selecionadas" ? Array.from(selectedOrgIds) : undefined;
    const isQuickFilter = comunicadoScope === "filtradas" && orgFilter !== "all";
    const filtros = comunicadoScope === "filtradas" && !isQuickFilter ? {
      status: filterStatus ? [filterStatus] : undefined,
      plano: filterPlano ? [filterPlano] : undefined,
      tipo: filterTipo ? [filterTipo] : undefined,
    } : undefined;
    const quickFilter = isQuickFilter ? orgFilter as "trials" | "fantasmas" : undefined;
    setComunicadoLoading(true);
    setComunicadoResult(null);
    try {
      const res = await fetch("/api/super-admin/comunicado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assunto: comunicadoAssunto, mensagem: comunicadoMensagem, orgIds, filtros, quickFilter }),
      });
      const json = await res.json().catch(() => ({})) as { orgs?: number; admins?: number; sent?: number; failed?: number; error?: string };
      if (!res.ok) { toast.error(json.error ?? "Falha ao enviar comunicado."); return; }
      setComunicadoResult({ orgs: json.orgs ?? 0, admins: json.admins ?? 0, sent: json.sent ?? 0, failed: json.failed ?? 0 });
      toast.success(`Comunicado enviado — ${json.sent} de ${json.admins} admin${(json.admins ?? 0) !== 1 ? "s" : ""} alcançado${(json.admins ?? 0) !== 1 ? "s" : ""}.`);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setComunicadoLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Organizações ({visibleOrgs.length}{search.trim() || orgFilter !== "all" || hasAdvancedFilter ? ` de ${orgs.length}` : ""})
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setComunicadoScope("filtradas"); setComunicadoResult(null); setComunicadoOpen(true); }}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-muted transition-colors"
                title="Enviar comunicado para os admins das orgs filtradas"
              >
                <MessageSquare className="h-3.5 w-3.5" />Comunicado
              </button>
              <button
                onClick={() => exportOrgsCSV(visibleOrgs)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-muted transition-colors"
              >
                <Download className="h-3.5 w-3.5" />Exportar CSV
              </button>
            </div>
          </div>

          {orgFilter !== "all" && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${
                orgFilter === "trials"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-red-100 text-red-800 border-red-300"
              }`}>
                {orgFilter === "trials" ? <Clock className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
                {orgFilter === "trials" ? "Trials expirando ≤7 dias" : "Sem atividade >30 dias"}
              </span>
              <button onClick={() => setOrgFilter("all")} className="text-xs text-muted-foreground hover:text-foreground underline">
                Limpar
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterStatus || "__all__"} onValueChange={(v) => { setFilterStatus(!v || v === "__all__" ? "" : v); setPageOrgs(1); }}>
              <SelectTrigger className="h-7 text-xs w-32 gap-1">
                <SelectValue>
                  {(v: string) => ({ "__all__": "Todos status", ATIVO: "Ativo", TRIAL: "Trial", SUSPENSO: "Suspenso", CANCELADO: "Cancelado" }[v] ?? v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos status</SelectItem>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPlano || "__all__"} onValueChange={(v) => { setFilterPlano(!v || v === "__all__" ? "" : v); setPageOrgs(1); }}>
              <SelectTrigger className="h-7 text-xs w-36 gap-1">
                <SelectValue>
                  {(v: string) => ({ "__all__": "Todos planos", GRATUITO: "Gratuito", BASICO: "Básico", INTERMEDIARIO: "Intermediário", AVANCADO: "Avançado", PERSONALIZADO: "Personalizado" }[v] ?? v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos planos</SelectItem>
                <SelectItem value="GRATUITO">Gratuito</SelectItem>
                <SelectItem value="BASICO">Básico</SelectItem>
                <SelectItem value="INTERMEDIARIO">Intermediário</SelectItem>
                <SelectItem value="AVANCADO">Avançado</SelectItem>
                <SelectItem value="PERSONALIZADO">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTipo || "__all__"} onValueChange={(v) => { setFilterTipo(!v || v === "__all__" ? "" : v); setPageOrgs(1); }}>
              <SelectTrigger className="h-7 text-xs w-44 gap-1">
                <SelectValue>
                  {(v: string) => TIPO_LABELS[v] ?? (v === "__all__" ? "Todos tipos" : v)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos tipos</SelectItem>
                <SelectItem value="nova_comunidade">Nova Comunidade</SelectItem>
                <SelectItem value="grupo_oracao">Grupo de Oração</SelectItem>
                <SelectItem value="instituto_religioso">Instituto Religioso</SelectItem>
                <SelectItem value="centro_formativo">Centro Formativo</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => { setFilterOnboarding((v) => !v); setPageOrgs(1); }}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterOnboarding
                  ? "bg-orange-100 text-orange-700 border-orange-300"
                  : "bg-background text-muted-foreground border-border hover:border-muted-foreground/50"
              }`}
            >
              <Filter className="h-3 w-3" />Onboarding incompleto
            </button>

            {hasAdvancedFilter && (
              <button onClick={() => { clearAdvancedFilters(); setPageOrgs(1); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />Limpar filtros
              </button>
            )}

            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPageOrgs(1); }}
                className="pl-8 h-7 text-xs"
              />
            </div>
          </div>

          {selectedOrgIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                <CheckSquare2 className="h-3.5 w-3.5" />
                {selectedOrgIds.size} org{selectedOrgIds.size !== 1 ? "s" : ""} selecionada{selectedOrgIds.size !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => void executeBulkAction("suspender")}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors disabled:opacity-60"
                >
                  <AlertTriangle className="h-3 w-3" />Suspender
                </button>
                <button
                  onClick={() => void executeBulkAction("reativar")}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors disabled:opacity-60"
                >
                  <BadgeCheck className="h-3 w-3" />Reativar
                </button>
                <button
                  onClick={() => { setBulkTrialDays("30"); setBulkDialogOpen("trial"); }}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 transition-colors disabled:opacity-60"
                >
                  <CalendarPlus className="h-3 w-3" />Estender trial
                </button>
                <button
                  onClick={() => { setComunicadoScope("selecionadas"); setComunicadoResult(null); setComunicadoOpen(true); }}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-violet-100 text-violet-800 border border-violet-300 hover:bg-violet-200 transition-colors disabled:opacity-60"
                >
                  <MessageSquare className="h-3 w-3" />Comunicado
                </button>
              </div>
              <button onClick={() => setSelectedOrgIds(new Set())} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />Limpar seleção
              </button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 pl-4">
                  {(() => {
                    const pageItems = visibleOrgs.slice((pageOrgs - 1) * PAGE_SIZE, pageOrgs * PAGE_SIZE);
                    const allSelected = pageItems.length > 0 && pageItems.every((o) => selectedOrgIds.has(o.id));
                    return (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => togglePageSelection(pageItems)}
                        className="h-4 w-4 accent-primary cursor-pointer"
                      />
                    );
                  })()}
                </TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Grupos</TableHead>
                <TableHead className="text-center">Formandos</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleOrgs.slice((pageOrgs - 1) * PAGE_SIZE, pageOrgs * PAGE_SIZE).map((org) => {
                const trialExpired = org.trialExpiresAt && new Date(org.trialExpiresAt) < new Date();
                const cortesiaExpired = org.cortesiaExpiresAt && new Date(org.cortesiaExpiresAt) < new Date();
                const isSelected = selectedOrgIds.has(org.id);
                return (
                  <TableRow key={org.id} className={`${org.cortesia ? "bg-violet-50/40 dark:bg-violet-950/10" : ""} ${isSelected ? "bg-primary/5" : ""}`}>
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOrgSelection(org.id)}
                        className="h-4 w-4 accent-primary cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="font-medium hover:underline hover:text-primary text-left"
                            onClick={() => router.push(`/super-admin/organizacoes/${org.id}`)}
                          >
                            {org.nome}
                          </button>
                          {org.cortesia && (
                            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium border border-violet-200">
                              <Gift className="h-3 w-3" />
                              {cortesiaExpired ? "Expirada" : "Cortesia"}
                            </span>
                          )}
                        </div>
                        {org.status === "TRIAL" && trialExpired && (
                          <span className="text-xs text-destructive flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" />Trial expirado
                          </span>
                        )}
                        {org.status === "TRIAL" && !trialExpired && org.trialExpiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Trial até {new Date(org.trialExpiresAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {!org.onboardingConcluido && org.status !== "CANCELADO" && (
                          <span className="text-xs text-orange-600 flex items-center gap-0.5">
                            <CircleAlert className="h-3 w-3" />Onboarding incompleto
                          </span>
                        )}
                        {(() => {
                          if (org.planoAssinatura === "PERSONALIZADO" || org.planoAssinatura === "GRATUITO") return null;
                          const limit = STORAGE_LIMITS[org.planoAssinatura] ?? 0;
                          if (!limit) return null;
                          const pct = Math.round((org.storageBytes / limit) * 100);
                          if (pct < 60) return null;
                          const isHigh = pct >= 80;
                          return (
                            <span className={`text-xs flex items-center gap-0.5 ${isHigh ? "text-red-600" : "text-amber-600"}`}>
                              <AlertTriangle className="h-3 w-3" />
                              Storage {pct}% ({formatBytes(org.storageBytes)} / {formatBytes(limit)})
                            </span>
                          );
                        })()}
                        {org.cortesia && org.cortesiaMotivo && (
                          <span className="text-xs text-muted-foreground truncate max-w-48">{org.cortesiaMotivo}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLANO_COLORS[org.planoAssinatura] ?? ""}`}>
                        {org.planoAssinatura}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[org.status] ?? ""}`}>
                        {org.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm">{org._count.gruposFormacao}</TableCell>
                    <TableCell className="text-center text-sm">{org._count.formandos}</TableCell>
                    <TableCell className="text-center text-sm">{org._count.usuarios}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {activityBadge(org.lastActivityAt)}
                        {engajamentoBadge(org.engajamento7d)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(org.criadoEm).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                          disabled={actionLoading === org.id}
                        >
                          {actionLoading === org.id
                            ? <RefreshCw className="h-4 w-4 animate-spin" />
                            : <MoreHorizontal className="h-4 w-4" />}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => router.push(`/super-admin/organizacoes/${org.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onAction(org, "plano")}>
                            <TrendingUp className="h-4 w-4 mr-2" />Alterar plano
                          </DropdownMenuItem>
                          {(org.status === "TRIAL" || org.trialExpiresAt !== null) && (
                            <DropdownMenuItem onClick={() => onAction(org, "estender-trial")}>
                              <CalendarPlus className="h-4 w-4 mr-2" />Estender trial
                            </DropdownMenuItem>
                          )}
                          {!org.cortesia ? (
                            <DropdownMenuItem className="text-violet-700" onClick={() => onAction(org, "cortesia")}>
                              <Gift className="h-4 w-4 mr-2" />Conceder cortesia
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-amber-600" onClick={() => onAction(org, "revogar-cortesia")}>
                              <Ban className="h-4 w-4 mr-2" />Revogar cortesia
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {org.status === "CANCELADO" ? (
                            <DropdownMenuItem className="text-emerald-600" onClick={() => onAction(org, "reativar")}>
                              <BadgeCheck className="h-4 w-4 mr-2" />Reativar
                            </DropdownMenuItem>
                          ) : org.status === "SUSPENSO" ? (
                            <>
                              <DropdownMenuItem className="text-emerald-600" onClick={() => onAction(org, "reativar")}>
                                <BadgeCheck className="h-4 w-4 mr-2" />Reativar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => onAction(org, "cancelar")}>
                                <Ban className="h-4 w-4 mr-2" />Cancelar contrato
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem className="text-amber-600" onClick={() => onAction(org, "suspender")}>
                              <AlertTriangle className="h-4 w-4 mr-2" />Suspender acesso
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => router.push(`/super-admin/organizacoes/${org.id}/reset-credenciais`)}>
                            <KeyRound className="h-4 w-4 mr-2" />Resetar acesso de admin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => onAction(org, "excluir")}>
                            <Ban className="h-4 w-4 mr-2" />Excluir permanentemente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {visibleOrgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    {search.trim() ? "Nenhuma organização encontrada para a busca." : "Nenhuma organização cadastrada."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {visibleOrgs.length > 0 && (
            <div className="px-4 py-3 border-t">
              <Pagination total={visibleOrgs.length} page={pageOrgs} pageSize={PAGE_SIZE} onPageChange={setPageOrgs} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk — Estender Trial */}
      <Dialog open={bulkDialogOpen === "trial"} onOpenChange={(o) => !o && setBulkDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estender trial — {selectedOrgIds.size} org{selectedOrgIds.size !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>Quantos dias adicionar ao período de experiência?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulkTrialDays">Dias adicionais</Label>
            <Input id="bulkTrialDays" type="number" min={1} max={365} value={bulkTrialDays} onChange={(e) => setBulkTrialDays(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(null)}>Cancelar</Button>
            <Button
              onClick={() => void executeBulkAction("estender_trial")}
              disabled={bulkLoading || !bulkTrialDays || Number(bulkTrialDays) < 1}
            >
              {bulkLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando…</> : "Estender trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comunicado */}
      <Dialog open={comunicadoOpen} onOpenChange={(o) => { if (!o) { setComunicadoOpen(false); setComunicadoResult(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />Comunicado direto
            </DialogTitle>
            <DialogDescription>
              Envia e-mail para os <strong>administradores e formadores gerais</strong> das organizações selecionadas.
            </DialogDescription>
          </DialogHeader>

          {comunicadoResult ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="h-5 w-5" />Comunicado enviado!
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Orgs alcançadas",  value: comunicadoResult.orgs },
                  { label: "Admins notificados",value: comunicadoResult.admins },
                  { label: "Enviados",          value: comunicadoResult.sent },
                  { label: "Falhas",            value: comunicadoResult.failed },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setComunicadoResult(null); setComunicadoAssunto(""); setComunicadoMensagem(""); }}>
                  Novo comunicado
                </Button>
                <Button onClick={() => { setComunicadoOpen(false); setComunicadoResult(null); }}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Destinatários:</span>
                <button
                  onClick={() => setComunicadoScope("filtradas")}
                  className={`px-2.5 py-1 rounded-full border transition-colors ${comunicadoScope === "filtradas" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-muted-foreground/50"}`}
                >
                  Orgs filtradas ({filteredOrgs.length})
                </button>
                {selectedOrgIds.size > 0 && (
                  <button
                    onClick={() => setComunicadoScope("selecionadas")}
                    className={`px-2.5 py-1 rounded-full border transition-colors ${comunicadoScope === "selecionadas" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-muted-foreground/50"}`}
                  >
                    Selecionadas ({selectedOrgIds.size})
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comunicadoAssunto">Assunto</Label>
                <Input id="comunicadoAssunto" placeholder="Ex.: Atualização importante da plataforma" value={comunicadoAssunto} onChange={(e) => setComunicadoAssunto(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comunicadoMensagem">Mensagem</Label>
                <Textarea id="comunicadoMensagem" rows={5} placeholder="Escreva a mensagem…" value={comunicadoMensagem} onChange={(e) => setComunicadoMensagem(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                O e-mail será enviado com a identidade visual Formattio para todos os administradores e formadores gerais das organizações no escopo selecionado.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setComunicadoOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => void sendComunicado()}
                  disabled={comunicadoLoading || !comunicadoAssunto.trim() || !comunicadoMensagem.trim()}
                >
                  {comunicadoLoading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando…</>
                    : <><Send className="h-4 w-4 mr-2" />Enviar comunicado</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
