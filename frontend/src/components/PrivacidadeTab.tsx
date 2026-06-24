"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileJson, Shield } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { downloadJsonExport } from "@/lib/download-export";

/**
 * Aba Privacidade — exclusiva do Administrador (responsável comercial).
 * Trata apenas dos dados da organização. A própria aba só é montada para
 * admin/super_admin (gate isAdmin em ConfiguracoesClient), então não há
 * verificação de perfil aqui. Os controles pessoais (exportar os próprios
 * dados, excluir a própria conta) ficam na aba Perfil, em DadosPessoaisCard.
 */
export default function PrivacidadeTab() {
  const [downloadingOrg, setDownloadingOrg] = useState(false);

  async function handleDownloadOrg() {
    setDownloadingOrg(true);
    try {
      const ok = await downloadJsonExport(
        "/api/export/organizacao",
        `dados-organizacao-${new Date().toISOString().slice(0, 10)}.json`,
      );
      toast[ok ? "success" : "error"](ok ? "Dados da organização exportados" : "Erro ao exportar dados da organização");
    } catch {
      toast.error("Falha ao exportar dados da organização");
    } finally {
      setDownloadingOrg(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Dados da organização */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Dados da organização</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Em conformidade com a LGPD, você pode baixar uma cópia completa dos dados da sua organização a qualquer momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Dados da organização</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Todos os formandos, moradas, formações, presenças e históricos. Somente administradores.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5 h-8 text-xs"
              onClick={handleDownloadOrg}
              disabled={downloadingOrg}
            >
              {downloadingOrg
                ? <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
                : <FileJson className="h-3.5 w-3.5" />
              }
              Baixar JSON
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Acesse nossa{" "}
            <Link href="/privacidade" target="_blank" className="text-primary hover:underline">
              Política de Privacidade
            </Link>{" "}
            e os{" "}
            <Link href="/termos" target="_blank" className="text-primary hover:underline">
              Termos de Uso
            </Link>{" "}
            para mais informações sobre como tratamos os dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
