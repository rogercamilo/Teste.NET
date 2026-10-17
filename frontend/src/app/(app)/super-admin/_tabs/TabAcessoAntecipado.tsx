"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Download,
  Calendar,
  Sparkles,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { fmtDate } from "../_utils";
import type { AcessoAntecipadoData } from "../_types";
import {
  rotuloDe,
  TIPO_ORGANIZACAO_OPCOES,
  NUMERO_MEMBROS_OPCOES,
  INTENCAO_OPCOES,
} from "@/lib/acesso-antecipado-opcoes";

interface Props {
  leads: AcessoAntecipadoData | null;
}

// Cada intenção carrega cor + ícone + palavra (nunca cor sozinha).
const INTENCAO_BADGE: Record<string, { label: string; cls: string; icon: LucideIcon }> = {
  demonstracao: {
    label: "Demonstração",
    cls: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
    icon: Calendar,
  },
  acesso_antecipado: {
    label: "Começar já",
    cls: "bg-primary/15 text-primary",
    icon: Sparkles,
  },
  duvida: {
    label: "Tirar dúvida",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    icon: MessageSquare,
  },
};

export function TabAcessoAntecipado({ leads }: Props) {
  if (!leads) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando pedidos de acesso antecipado...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total de pedidos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{leads.total}</div>
            <div className="text-xs text-muted-foreground mt-0.5">leads de alta intenção</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />Começar já
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-primary">{leads.counts.acesso_antecipado}</div>
            <div className="text-xs text-muted-foreground mt-0.5">quer acesso antecipado</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />Demonstração
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-sky-600">{leads.counts.demonstracao}</div>
            <div className="text-xs text-muted-foreground mt-0.5">quer agendar demo</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />Dúvida
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{leads.counts.duvida}</div>
            <div className="text-xs text-muted-foreground mt-0.5">quer tirar dúvida</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pedidos de acesso antecipado capturados na landing. A equipe também é avisada por e-mail a cada pedido.
        </p>
        <a
          href="/api/super-admin/acesso-antecipado?format=csv"
          download
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Download className="h-4 w-4" />Exportar CSV
        </a>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {leads.leads.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum pedido de acesso antecipado ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Função</TableHead>
                  <TableHead>Comunidade / Instituto</TableHead>
                  <TableHead>Porte</TableHead>
                  <TableHead>Intenção</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Desafio</TableHead>
                  <TableHead>Recebido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.leads.map((l) => {
                  const badge =
                    INTENCAO_BADGE[l.intencao] ?? {
                      label: l.intencao,
                      cls: "bg-muted text-foreground",
                      icon: MessageSquare,
                    };
                  const BadgeIcon = badge.icon;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        {l.nome}
                        {l.papel && (
                          <span className="block text-xs font-normal text-muted-foreground">{l.papel}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {l.comunidade}
                        <span className="block text-xs text-muted-foreground">
                          {rotuloDe(TIPO_ORGANIZACAO_OPCOES, l.tipoOrganizacao)}
                          {l.planoInteresse ? ` · plano ${l.planoInteresse}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {rotuloDe(NUMERO_MEMBROS_OPCOES, l.numeroMembros)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="block">{l.whatsapp}</span>
                        <span className="block">{l.email}</span>
                      </TableCell>
                      <TableCell className="max-w-[16rem] text-xs text-muted-foreground">
                        <span className="block truncate" title={l.desafio ?? undefined}>
                          {l.desafio ?? "—"}
                        </span>
                      </TableCell>
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
