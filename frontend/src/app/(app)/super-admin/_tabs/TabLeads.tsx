"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Download, MailCheck, Clock, MailX, MessageCircle } from "lucide-react";
import { fmtDate } from "../_utils";
import type { LeadsData } from "../_types";

interface Props {
  leads: LeadsData | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" },
  confirmado: { label: "Confirmado", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" },
  descadastrado: { label: "Descadastrado", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

export function TabLeads({ leads }: Props) {
  if (!leads) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando leads...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total de leads</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{leads.total}</div>
            <div className="text-xs text-muted-foreground mt-0.5">na base</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MailCheck className="h-3.5 w-3.5" />Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{leads.counts.confirmado}</div>
            <div className="text-xs text-muted-foreground mt-0.5">opt-in concluído</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{leads.counts.pendente}</div>
            <div className="text-xs text-muted-foreground mt-0.5">aguardando confirmação</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MailX className="h-3.5 w-3.5" />Descadastrados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{leads.counts.descadastrado}</div>
            <div className="text-xs text-muted-foreground mt-0.5">opt-out</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Leads capturados pelo ímã de conteúdo na landing page.
        </p>
        <a
          href="/api/super-admin/leads?format=csv"
          download
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Download className="h-4 w-4" />Exportar CSV
        </a>
      </div>

      <Card>
        <CardContent className="p-0">
          {leads.leads.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum lead capturado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.leads.map((l) => {
                  const badge = STATUS_BADGE[l.status] ?? { label: l.status, cls: "bg-muted text-foreground" };
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          {l.nome}
                          {l.whatsappOptIn && (
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-500" aria-label="Optou pelo WhatsApp" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{l.email}</TableCell>
                      <TableCell className="text-muted-foreground">{l.telefone ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{l.origem}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDate(l.criadoEm)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
