"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HardDrive, Database, Cloud, CloudOff, Mail, Bell, Loader2 } from "lucide-react";
import { formatBytes, StorageSparkline } from "../_utils";
import type { ServicosData } from "../_types";

interface Props {
  servicos: ServicosData | null;
}

export function TabInfraestrutura({ servicos }: Props) {
  if (!servicos) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando dados de infraestrutura...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              Armazenamento
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                servicos.storage.provider === "r2"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {servicos.storage.provider === "r2"
                  ? <span className="flex items-center gap-1"><Cloud className="h-3 w-3 inline" /> Cloudflare R2</span>
                  : <span className="flex items-center gap-1"><CloudOff className="h-3 w-3 inline" /> Disco Local</span>}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total de arquivos</span>
              <span className="font-semibold text-sm">{servicos.storage.totalArquivos.toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Espaço utilizado</span>
              <span className="font-semibold text-sm">{formatBytes(servicos.storage.totalBytes)}</span>
            </div>
            {servicos.storageTrend && servicos.storageTrend.length > 1 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Crescimento acumulado (4 semanas)</p>
                <StorageSparkline data={servicos.storageTrend} />
              </div>
            )}
            {servicos.topOrgsStorage.length > 0 && (
              <div className="pt-2 border-t space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Top por armazenamento</p>
                {servicos.topOrgsStorage.map((org) => (
                  <div key={org.organizacaoId} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate">{org.nome}</span>
                    <span className="text-muted-foreground">{org.arquivos} arqs</span>
                    <span className="font-medium w-16 text-right">{formatBytes(org.bytes)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              Banco de Dados
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                PostgreSQL
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { label: "Formandos",    value: servicos.db.formandos },
                { label: "Grupos",       value: servicos.db.gruposFormacao },
                { label: "Usuários",     value: servicos.db.usuarios },
                { label: "Agendamentos", value: servicos.db.agendamentos },
                { label: "Presenças",    value: servicos.db.presencas },
                { label: "Formações",    value: servicos.db.formacoes },
                { label: "Arquivos",     value: servicos.db.arquivos },
                { label: "Audit Logs",   value: servicos.db.auditLogs },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-0.5 border-b border-dashed border-border/50">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {servicos.comunicacao && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />Comunicação
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-3">
              <div className="flex justify-between items-center py-0.5 border-b border-dashed border-border/50">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" />SMTP próprio</span>
                <span className="text-xs font-semibold tabular-nums">
                  {servicos.comunicacao.smtpOwnCount} / {servicos.comunicacao.totalOrgs} orgs
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-dashed border-border/50">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Bell className="h-3 w-3" />Push subs</span>
                <span className="text-xs font-semibold tabular-nums">{servicos.comunicacao.pushTotal}</span>
              </div>
            </div>
            {servicos.comunicacao.topOrgsPush.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Top por push</p>
                {servicos.comunicacao.topOrgsPush.map((o) => (
                  <div key={o.organizacaoId} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate">{o.nome}</span>
                    <span className="font-medium tabular-nums">{o.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {servicos.recentUploads.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Uploads Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Enviado por</TableHead>
                  <TableHead className="text-right">Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicos.recentUploads.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-sm max-w-56 truncate">{u.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.orgNome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.uploadedByNome ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatBytes(u.tamanho)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
