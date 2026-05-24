"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Users, Home, UserSquare, MoreHorizontal, RefreshCw, ShieldAlert,
  TrendingUp, AlertTriangle,
} from "lucide-react";

interface OrgRow {
  id: string;
  nome: string;
  planoAssinatura: string;
  status: string;
  trialExpiresAt: string | null;
  criadoEm: string;
  _count: { moradas: number; formandos: number; usuarios: number };
}

interface Metricas {
  totalOrgs: number;
  orgsAtivas: number;
  orgsTrials: number;
  orgsSuspensas: number;
  totalFormandos: number;
  totalMoradas: number;
  totalUsuarios: number;
  planoBreakdown: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  TRIAL: "bg-blue-100 text-blue-700 border-blue-200",
  SUSPENSO: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELADO: "bg-red-100 text-red-700 border-red-200",
};

const PLANO_COLORS: Record<string, string> = {
  GRATUITO: "bg-slate-100 text-slate-700",
  ESSENCIAL: "bg-violet-100 text-violet-700",
  PROFISSIONAL: "bg-amber-100 text-amber-700",
};

export default function SuperAdminClient() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [dialogAcao, setDialogAcao] = useState<"suspender" | "reativar" | "cancelar" | "plano" | "excluir" | null>(null);
  const [novoPlano, setNovoPlano] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const [orgsRes, metRes] = await Promise.all([
      fetch("/api/super-admin/organizacoes").then((r) => r.json() as Promise<OrgRow[]>),
      fetch("/api/super-admin/metricas").then((r) => r.json() as Promise<Metricas>),
    ]);
    setOrgs(orgsRes);
    setMetricas(metRes);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function executeAction(orgId: string, acao: "suspender" | "reativar" | "cancelar", plano?: string) {
    setActionLoading(orgId);
    try {
      const res = await fetch(`/api/super-admin/organizacoes/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, ...(plano ? { plano } : {}) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao executar ação.");
        return;
      }
      const labels: Record<string, string> = { suspender: "suspensa", reativar: "reativada", cancelar: "cancelada" };
      toast.success(`Organização ${labels[acao] ?? "atualizada"} com sucesso.`);
      await load();
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setActionLoading(null);
      setDialogAcao(null);
      setSelectedOrg(null);
    }
  }

  async function deleteOrg() {
    if (!selectedOrg) return;
    setActionLoading(selectedOrg.id);
    try {
      const res = await fetch(`/api/super-admin/organizacoes/${selectedOrg.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao excluir organização.");
        return;
      }
      toast.success(`"${selectedOrg.nome}" excluída permanentemente.`);
      await load();
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setActionLoading(null);
      setDialogAcao(null);
      setSelectedOrg(null);
    }
  }

  async function changePlano() {
    if (!selectedOrg || !novoPlano) return;
    setActionLoading(selectedOrg.id);
    try {
      const res = await fetch(`/api/super-admin/organizacoes/${selectedOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: novoPlano }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao alterar plano.");
        return;
      }
      toast.success(`Plano alterado para ${novoPlano}.`);
      await load();
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setActionLoading(null);
      setDialogAcao(null);
      setSelectedOrg(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Super Admin</h1>
            <p className="text-xs text-muted-foreground">Gestão global da plataforma</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Métricas */}
      {metricas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />Total de organizações
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{metricas.totalOrgs}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {metricas.orgsAtivas} ativas · {metricas.orgsTrials} trial · {metricas.orgsSuspensas} suspensas
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />Total de formandos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{metricas.totalFormandos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" />Total de moradas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{metricas.totalMoradas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <UserSquare className="h-3.5 w-3.5" />Total de usuários
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{metricas.totalUsuarios}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Breakdown por plano */}
      {metricas && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Distribuição por plano
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-4">
              {["GRATUITO", "ESSENCIAL", "PROFISSIONAL"].map((plano) => (
                <div key={plano} className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLANO_COLORS[plano]}`}>{plano}</span>
                  <span className="text-sm font-bold">{metricas.planoBreakdown[plano] ?? 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de organizações */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Organizações ({orgs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Moradas</TableHead>
                <TableHead className="text-center">Formandos</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => {
                const trialExpired = org.trialExpiresAt && new Date(org.trialExpiresAt) < new Date();
                return (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <div>
                        <span>{org.nome}</span>
                        {org.status === "TRIAL" && trialExpired && (
                          <span className="ml-2 text-xs text-destructive flex items-center gap-0.5 inline-flex">
                            <AlertTriangle className="h-3 w-3" />Trial expirado
                          </span>
                        )}
                        {org.trialExpiresAt && !trialExpired && org.status === "TRIAL" && (
                          <div className="text-xs text-muted-foreground">
                            Trial até {new Date(org.trialExpiresAt).toLocaleDateString("pt-PT")}
                          </div>
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
                    <TableCell className="text-center text-sm">{org._count.moradas}</TableCell>
                    <TableCell className="text-center text-sm">{org._count.formandos}</TableCell>
                    <TableCell className="text-center text-sm">{org._count.usuarios}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(org.criadoEm).toLocaleDateString("pt-PT")}
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
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => { setSelectedOrg(org); setNovoPlano(org.planoAssinatura); setDialogAcao("plano"); }}
                          >
                            Alterar plano
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => { setSelectedOrg(org); setDialogAcao("excluir"); }}
                          >
                            Excluir permanentemente
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {org.status === "CANCELADO" ? (
                            <DropdownMenuItem
                              className="text-emerald-600"
                              onClick={() => { setSelectedOrg(org); setDialogAcao("reativar"); }}
                            >
                              Reativar
                            </DropdownMenuItem>
                          ) : org.status === "SUSPENSO" ? (
                            <>
                              <DropdownMenuItem
                                className="text-emerald-600"
                                onClick={() => { setSelectedOrg(org); setDialogAcao("reativar"); }}
                              >
                                Reativar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => { setSelectedOrg(org); setDialogAcao("cancelar"); }}
                              >
                                Cancelar contrato
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              className="text-amber-600"
                              onClick={() => { setSelectedOrg(org); setDialogAcao("suspender"); }}
                            >
                              Suspender
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {orgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma organização cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog — Cancelar contrato */}
      <Dialog open={dialogAcao === "cancelar"} onOpenChange={() => { setDialogAcao(null); setSelectedOrg(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancelar contrato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja cancelar o contrato de{" "}
            <strong>&ldquo;{selectedOrg?.nome}&rdquo;</strong>? O status será alterado para{" "}
            <strong>CANCELADO</strong> e os usuários não terão mais acesso à plataforma.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogAcao(null); setSelectedOrg(null); }}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={actionLoading === selectedOrg?.id}
              onClick={() => selectedOrg && executeAction(selectedOrg.id, "cancelar")}
            >
              Cancelar contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Suspender/Reativar */}
      <Dialog open={dialogAcao === "suspender" || dialogAcao === "reativar"} onOpenChange={() => { setDialogAcao(null); setSelectedOrg(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAcao === "suspender" ? "Suspender organização" : "Reativar organização"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {dialogAcao === "suspender"
              ? `Tem certeza que deseja suspender "${selectedOrg?.nome}"? Os usuários não conseguirão mais acessar a plataforma.`
              : `Deseja reativar "${selectedOrg?.nome}"?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogAcao(null); setSelectedOrg(null); }}>Cancelar</Button>
            <Button
              variant={dialogAcao === "suspender" ? "destructive" : "default"}
              onClick={() => selectedOrg && executeAction(selectedOrg.id, dialogAcao === "suspender" ? "suspender" : "reativar")}
            >
              {dialogAcao === "suspender" ? "Suspender" : "Reativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Excluir organização */}
      <Dialog open={dialogAcao === "excluir"} onOpenChange={() => { setDialogAcao(null); setSelectedOrg(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir organização permanentemente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação é <strong>irreversível</strong>. Todos os dados de{" "}
            <strong>&ldquo;{selectedOrg?.nome}&rdquo;</strong> — usuários, formandos, formações,
            documentos e histórico — serão apagados definitivamente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogAcao(null); setSelectedOrg(null); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading === selectedOrg?.id}
              onClick={deleteOrg}
            >
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Alterar plano */}
      <Dialog open={dialogAcao === "plano"} onOpenChange={() => { setDialogAcao(null); setSelectedOrg(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar plano — {selectedOrg?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Select value={novoPlano} onValueChange={(v) => v && setNovoPlano(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRATUITO">Gratuito (1 morada, 30 formandos)</SelectItem>
                <SelectItem value="ESSENCIAL">Essencial (3 moradas, 150 formandos)</SelectItem>
                <SelectItem value="PROFISSIONAL">Profissional (ilimitado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogAcao(null); setSelectedOrg(null); }}>Cancelar</Button>
            <Button onClick={changePlano} disabled={!novoPlano || actionLoading === selectedOrg?.id}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
