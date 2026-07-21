"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { ACAO_CLASS, fmtDate } from "../_utils";
import type { SegurancaData } from "../_types";

interface Props {
  seguranca: SegurancaData | null;
}

export function TabSeguranca({ seguranca }: Props) {
  if (!seguranca) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando dados de segurança...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Eventos (24h)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{seguranca.logsCount24h}</div>
            <div className="text-xs text-muted-foreground mt-0.5">ações registradas</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Trash2 className="h-3.5 w-3.5" />Exclusões Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-2xl font-bold ${seguranca.deletionPendentes > 0 ? "text-amber-600" : ""}`}>
              {seguranca.deletionPendentes}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">solicitações LGPD</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Aceites Privacidade (7d)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{seguranca.privacyCount7d}</div>
            <div className="text-xs text-muted-foreground mt-0.5">novos aceites</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ação mais frequente (7d)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-sm font-bold truncate">
              {seguranca.topAcoes7d[0]?.acao?.replace(/_/g, " ") ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {seguranca.topAcoes7d[0]?._count?.id ?? 0} ocorrências
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Top ações — últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            {seguranca.topAcoes7d.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro.</p>
            ) : seguranca.topAcoes7d.map((a) => (
              <div key={a.acao} className="flex items-center gap-2">
                <span className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono flex-1 truncate">{a.acao}</span>
                <span className="text-sm font-semibold tabular-nums w-8 text-right">{a._count.id}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Solicitações de Exclusão (LGPD)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {seguranca.recentDeletions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação registrada.</p>
            ) : (
              <div className="space-y-2">
                {seguranca.recentDeletions.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded-full border font-medium ${
                      d.status === "pendente"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : d.status === "processando"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>{d.status}</span>
                    <span className="text-muted-foreground capitalize">{d.tipo}</span>
                    <span className="text-muted-foreground ml-auto">
                      {new Date(d.solicitadoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Ações do Super Admin — últimos 30 dias ({seguranca.superAdminLogs?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!seguranca.superAdminLogs?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Nenhuma ação de super admin nos últimos 30 dias.
                  </TableCell>
                </TableRow>
              ) : seguranca.superAdminLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium font-mono ${
                      ACAO_CLASS[log.acao] ?? "bg-muted text-muted-foreground border-border"
                    }`}>
                      {log.acao}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.organizacao?.nome ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.usuario?.nome ?? log.usuario?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(log.criadoEm)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Audit Log — Últimas {seguranca.recentLogs.length} entradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seguranca.recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : seguranca.recentLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium font-mono ${
                      ACAO_CLASS[log.acao] ?? "bg-muted text-muted-foreground border-border"
                    }`}>
                      {log.acao}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.organizacao?.nome ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.usuario?.nome ?? log.usuario?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{log.ip ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(log.criadoEm)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
