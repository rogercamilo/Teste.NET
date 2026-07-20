"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileJson, Shield } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { downloadJsonExport } from "@/lib/download-export";
import { MeusDadosCard, ExcluirContaCard } from "@/components/DadosPessoaisCard";

/**
 * Aba Privacidade — lar único de tudo que é dados & LGPD. Só é montada para a
 * gestão do tenant (Administrador + Formador Geral) pelo gate `isGestao` em
 * ConfiguracoesClient; por isso não há checagem de perfil aqui. O Formador
 * Comunitário não vê esta aba, e a aba Perfil não expõe mais controles de dados.
 *
 * Ordem (do inócuo ao destrutivo): dados pessoais → dados da organização →
 * zona de perigo → rodapé único de políticas.
 */
export default function PrivacidadeTab({
  userEmail,
  isSuperAdmin = false,
}: {
  userEmail: string;
  isSuperAdmin?: boolean;
}) {
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
    <div className="max-w-2xl space-y-6">
      {/* 1. Dados pessoais do usuário logado */}
      <MeusDadosCard />

      {/* 2. Dados da organização (gestão do tenant) */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Dados da organização</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Em conformidade com a LGPD, a gestão pode baixar uma cópia completa dos dados da organização a qualquer momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Backup completo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Todos os formandos, moradas, formações, presenças e históricos. Disponível para administradores e formadores gerais.
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
        </CardContent>
      </Card>

      {/* 3. Zona de perigo — exclusão da própria conta */}
      <ExcluirContaCard userEmail={userEmail} isSuperAdmin={isSuperAdmin} />

      {/* 4. Rodapé único de políticas (antes duplicado em cada card) */}
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
    </div>
  );
}
