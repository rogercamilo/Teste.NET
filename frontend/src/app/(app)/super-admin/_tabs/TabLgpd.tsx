"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import {
  ShieldAlert, AlertTriangle, Scale, FileText, CheckCircle2, Clock, RefreshCw, Send, Loader2,
} from "lucide-react";
import { PAGE_SIZE } from "../_utils";
import type { LgpdData, OrgRow } from "../_types";
import { toast } from "sonner";

interface Props {
  lgpd: LgpdData | null;
  orgs: OrgRow[];
  onReload: () => void;
}

export function TabLgpd({ lgpd, orgs, onReload }: Props) {
  const [pageLgpd, setPageLgpd] = useState(1);
  const [lgpdActionLoading, setLgpdActionLoading] = useState<string | null>(null);

  // Incidente form state
  const [incidenteOrgId, setIncidenteOrgId] = useState("");
  const [incidenteDescricao, setIncidenteDescricao] = useState("");
  const [incidenteDataEvento, setIncidenteDataEvento] = useState("");
  const [incidenteMedidas, setIncidenteMedidas] = useState("");
  const [incidenteSending, setIncidenteSending] = useState(false);
  const [incidenteResult, setIncidenteResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [incidenteError, setIncidenteError] = useState("");

  async function updateDeletion(id: string, status: string) {
    setLgpdActionLoading(id);
    try {
      const res = await fetch("/api/super-admin/lgpd", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) { toast.error("Falha ao atualizar solicitação."); return; }
      toast.success("Solicitação atualizada.");
      onReload();
    } catch {
      toast.error("Erro de rede.");
    } finally {
      setLgpdActionLoading(null);
    }
  }

  async function submitIncidente(e: React.FormEvent) {
    e.preventDefault();
    setIncidenteError("");
    setIncidenteResult(null);
    if (!incidenteDescricao.trim() || !incidenteDataEvento || !incidenteMedidas.trim()) {
      setIncidenteError("Preencha todos os campos obrigatórios.");
      return;
    }
    setIncidenteSending(true);
    try {
      const res = await fetch("/api/super-admin/lgpd/incidente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizacaoId: incidenteOrgId || null,
          descricao: incidenteDescricao,
          dataIncidente: incidenteDataEvento,
          medidas: incidenteMedidas,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setIncidenteError(json.error ?? "Erro ao enviar notificações."); return; }
      setIncidenteResult(json);
      setIncidenteDescricao(""); setIncidenteDataEvento(""); setIncidenteMedidas(""); setIncidenteOrgId("");
    } catch {
      setIncidenteError("Erro de conexão. Tente novamente.");
    } finally {
      setIncidenteSending(false);
    }
  }

  if (!lgpd) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            Notificação de Incidente de Segurança — LGPD Art. 48
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Notifica titulares de dados pessoais sobre incidentes que possam acarretar risco ou dano relevante.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-5">
          {incidenteResult ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="h-5 w-5" />Notificações enviadas
              </div>
              <p className="text-sm text-emerald-800">
                {incidenteResult.sent} de {incidenteResult.total} e-mails enviados com sucesso.
                {incidenteResult.failed > 0 && ` ${incidenteResult.failed} falhou(aram).`}
              </p>
              <button className="text-xs text-emerald-700 underline mt-1" onClick={() => setIncidenteResult(null)}>
                Enviar outra notificação
              </button>
            </div>
          ) : (
            <form onSubmit={submitIncidente} className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <Label>Organização afetada</Label>
                <Select value={incidenteOrgId || "__all__"} onValueChange={(v) => setIncidenteOrgId(!v || v === "__all__" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as organizações</SelectItem>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Deixe em branco para notificar todos os usuários da plataforma.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="incidenteData">Data do incidente <span className="text-destructive">*</span></Label>
                <Input id="incidenteData" type="date" value={incidenteDataEvento} onChange={(e) => setIncidenteDataEvento(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="incidenteDescricao">Descrição do incidente <span className="text-destructive">*</span></Label>
                <Textarea
                  id="incidenteDescricao"
                  rows={4}
                  placeholder="Descreva o que ocorreu, quais dados podem ter sido afetados e o possível impacto."
                  value={incidenteDescricao}
                  onChange={(e) => setIncidenteDescricao(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="incidenteMedidas">Medidas adotadas <span className="text-destructive">*</span></Label>
                <Textarea
                  id="incidenteMedidas"
                  rows={3}
                  placeholder="Descreva as ações tomadas para conter o incidente e proteger os titulares."
                  value={incidenteMedidas}
                  onChange={(e) => setIncidenteMedidas(e.target.value)}
                  required
                />
              </div>

              {incidenteError && <p className="text-sm text-destructive">{incidenteError}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={incidenteSending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-60 transition-colors"
                >
                  {incidenteSending
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                    : <><Send className="h-4 w-4" />Enviar notificação</>}
                </button>
                <p className="text-xs text-muted-foreground">Esta ação envia e-mails imediatamente aos titulares.</p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />Exclusões Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-2xl font-bold ${lgpd.deletionStats.pendentes > 0 ? "text-amber-600" : ""}`}>
              {lgpd.deletionStats.pendentes}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">aguardando processamento</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" />Aceites de Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">
              {lgpd.privacyByTipo.reduce((s, p) => s + p._count.id, 0).toLocaleString("pt-BR")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">registros de consentimento</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />Consentimentos de Cookies
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{lgpd.cookieTotal.toLocaleString("pt-BR")}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {lgpd.cookieAnaliticos} aceitaram analytics
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Solicitações de Exclusão (Art. 18 LGPD)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead>Processado em</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lgpd.deletionRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma solicitação registrada.
                  </TableCell>
                </TableRow>
              ) : lgpd.deletionRequests.slice((pageLgpd - 1) * PAGE_SIZE, pageLgpd * PAGE_SIZE).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium capitalize">{d.tipo}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
                      d.status === "pendente"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : d.status === "processando"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {d.status === "pendente" && <Clock className="h-3 w-3" />}
                      {d.status === "processando" && <RefreshCw className="h-3 w-3" />}
                      {d.status === "concluido" && <CheckCircle2 className="h-3 w-3" />}
                      {d.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(d.solicitadoEm).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.processadoEm ? new Date(d.processadoEm).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>
                    {d.status !== "concluido" && (
                      <div className="flex gap-1.5">
                        {d.status === "pendente" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            disabled={lgpdActionLoading === d.id}
                            onClick={() => updateDeletion(d.id, "processando")}
                          >
                            Processar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs text-emerald-700 border-emerald-200"
                          disabled={lgpdActionLoading === d.id}
                          onClick={() => updateDeletion(d.id, "concluido")}
                        >
                          Concluir
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {lgpd.deletionRequests.length > 0 && (
            <div className="px-4 py-3 border-t">
              <Pagination total={lgpd.deletionRequests.length} page={pageLgpd} pageSize={PAGE_SIZE} onPageChange={setPageLgpd} />
            </div>
          )}
        </CardContent>
      </Card>

      {lgpd.privacyByTipo.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Aceites por Documento e Versão</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {lgpd.privacyByTipo.map((p) => (
                <div key={`${p.tipo}-${p.versao}`} className="flex items-center gap-3">
                  <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{p.tipo}</span>
                  <span className="text-xs text-muted-foreground">v{p.versao}</span>
                  <span className="flex-1 border-b border-dashed border-border/50" />
                  <span className="text-sm font-semibold tabular-nums">{p._count.id.toLocaleString("pt-BR")}</span>
                  <span className="text-xs text-muted-foreground">aceites</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
