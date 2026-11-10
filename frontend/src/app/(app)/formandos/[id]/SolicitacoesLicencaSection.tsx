"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlaneTakeoff, FileText, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NivelFormativo } from "@/types";

export interface SolicitacaoLicencaItem {
  id: string;
  solicitadoEm: string; // ISO
  motivo: string | null;
  arquivo: { id: string; nome: string } | null;
}

const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Pedidos de LICENÇA feitos pelo formando no portal — visão do responsável (ficha).
 *
 * Esta é a outra ponta da PONTE canônica: o portal só registra a MANIFESTAÇÃO DE
 * VONTADE; aqui a autoridade discerne e, decidindo favoravelmente, abre o
 * ProcessoEclesiastico (tipo=licenca) — que corre o rito e lavra o termo no Livro.
 * "Recusar" apenas arquiva o pedido (não é ato canônico): o indeferimento formal,
 * se houver, segue pelos estatutos/diálogo. O ato nunca nasce no portal.
 */
export function SolicitacoesLicencaSection({
  formandoId,
  nivelFormativo,
  termoFormando,
  solicitacoes,
  podeIniciarProcesso,
}: {
  formandoId: string;
  nivelFormativo: NivelFormativo;
  termoFormando: string;
  solicitacoes: SolicitacaoLicencaItem[];
  podeIniciarProcesso: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (solicitacoes.length === 0) return null;

  async function atualizarStatus(id: string, status: "recusada") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/formandos/${formandoId}/solicitacoes-licenca`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitacaoId: id, status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha");
      }
      toast.success("Pedido arquivado.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusyId(null);
    }
  }

  async function iniciarProcesso(id: string) {
    setBusyId(id);
    try {
      // 1) Abre o processo canônico de licença (ato da autoridade).
      const res = await fetch("/api/processos-eclesiasticos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formandoId, tipo: "licenca", nivelFormativo }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha ao abrir o processo");
      }
      const processo = (await res.json()) as { id: string };
      // 2) Marca o pedido como atendido (a autoridade assumiu o encaminhamento).
      await fetch(`/api/formandos/${formandoId}/solicitacoes-licenca`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitacaoId: id, status: "atendida" }),
      }).catch(() => {});
      toast.success("Processo de licença aberto.");
      router.push(`/jornada-vocacional/${processo.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <PlaneTakeoff className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Pedidos de licença</h2>
      </div>

      {solicitacoes.map((s) => (
        <Card key={s.id} className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="space-y-3 py-3">
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {termoFormando} solicitou licença
              </p>
              <p className="text-xs text-muted-foreground">
                Pedido em {fmtData.format(new Date(s.solicitadoEm))}
              </p>
            </div>
            {s.motivo && (
              <p className="whitespace-pre-wrap rounded-md bg-background/60 px-3 py-2 text-sm text-foreground">
                “{s.motivo}”
              </p>
            )}
            {s.arquivo && (
              <a
                href={`/api/arquivos/${s.arquivo.id}?download=1`}
                download={s.arquivo.nome}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                <Download className="h-4 w-4 text-primary" />
                Baixar documento do pedido
              </a>
            )}
            <p className="text-xs text-muted-foreground">
              O pedido é só a manifestação de vontade. Converse com a pessoa; havendo discernimento
              favorável, abra o processo de licença (que registra o termo no Livro). Recusar apenas
              arquiva este pedido.
            </p>
            <div className="flex flex-wrap gap-2">
              {podeIniciarProcesso && (
                <Button size="sm" className="gap-1.5" disabled={busyId === s.id} onClick={() => iniciarProcesso(s.id)}>
                  <FileText className="h-4 w-4" />
                  Iniciar processo de licença
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={busyId === s.id}
                onClick={() => atualizarStatus(s.id, "recusada")}
              >
                <X className="h-4 w-4" />
                Recusar pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
