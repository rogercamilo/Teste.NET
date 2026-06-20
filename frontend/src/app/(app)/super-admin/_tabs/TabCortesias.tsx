"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import { Gift, Ban, RefreshCw, MoreHorizontal } from "lucide-react";
import { PLANO_COLORS, STATUS_COLORS, PAGE_SIZE } from "../_utils";
import type { OrgRow, DialogAcao } from "../_types";

interface Props {
  orgs: OrgRow[];
  actionLoading: string | null;
  onAction: (org: OrgRow, acao: DialogAcao) => void;
}

export function TabCortesias({ orgs, actionLoading, onAction }: Props) {
  const [pageCortesias, setPageCortesias] = useState(1);
  const cortesiasOrgs = orgs.filter((o) => o.cortesia);

  if (cortesiasOrgs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma organização com cortesia ativa.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Gift className="h-4 w-4 text-violet-600" />
          Organizações com Cortesia ({cortesiasOrgs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organização</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cortesiasOrgs.slice((pageCortesias - 1) * PAGE_SIZE, pageCortesias * PAGE_SIZE).map((org) => {
              const expired = org.cortesiaExpiresAt && new Date(org.cortesiaExpiresAt) < new Date();
              return (
                <TableRow key={org.id} className="bg-violet-50/40">
                  <TableCell className="font-medium">{org.nome}</TableCell>
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
                  <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                    {org.cortesiaMotivo ?? "—"}
                  </TableCell>
                  <TableCell>
                    {org.cortesiaExpiresAt ? (
                      <span className={`text-xs font-medium ${expired ? "text-red-600" : "text-emerald-600"}`}>
                        {expired ? "Expirada — " : ""}
                        {new Date(org.cortesiaExpiresAt).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Indefinida</span>
                    )}
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
                          className="text-amber-600"
                          onClick={() => onAction(org, "revogar-cortesia")}
                        >
                          <Ban className="h-4 w-4 mr-2" />Revogar cortesia
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction(org, "cortesia")}>
                          <Gift className="h-4 w-4 mr-2" />Editar cortesia
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {cortesiasOrgs.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t">
            <Pagination total={cortesiasOrgs.length} page={pageCortesias} pageSize={PAGE_SIZE} onPageChange={setPageCortesias} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
