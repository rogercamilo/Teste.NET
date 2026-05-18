"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePlanos, useGrades } from "@/lib/data-store";
import {
  STATUS_PLANO_LABELS,
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  type StatusPlano,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  FileText,
  Paperclip,
  Pencil,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_STYLES: Record<StatusPlano, string> = {
  rascunho: "bg-slate-100 text-slate-600 border-slate-200",
  "em-revisao": "bg-amber-100 text-amber-700 border-amber-200",
  ativo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  arquivado: "bg-slate-100 text-slate-400 border-slate-200",
};

const AREA_CORES: Record<string, string> = {
  Espiritual: "bg-violet-100 text-violet-700",
  Humana: "bg-blue-100 text-blue-700",
  Apostólica: "bg-emerald-100 text-emerald-700",
  Comunitária: "bg-amber-100 text-amber-700",
};

export default function PlanoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "formador_comunitario";
  const isAdmin = role === "formador_geral" || role === "administrador";

  const [planos, setPlanos] = usePlanos();
  const [, setGrades] = useGrades();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const plano = planos.find((p) => p.id === id);

  if (!plano) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="font-medium text-foreground">Plano não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/planos")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar aos planos
        </Button>
      </div>
    );
  }

  const totalCH = plano.eixos.reduce((acc, e) => acc + e.cargaHoraria, 0);

  function handleDelete() {
    if (plano?.documentoAnexoId) {
      fetch(`/api/arquivos/${plano.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
    }
    setPlanos((prev) => prev.filter((p) => p.id !== id));
    setGrades((prev) =>
      prev.map((g) => (g.planoId === id ? { ...g, planoId: "", planoNome: "" } : g))
    );
    toast.success("Plano excluído.");
    router.push("/planos");
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/planos")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{plano.nome}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className={`text-xs ${NIVEL_CORES[plano.nivelFormativo]}`}>
                  {NIVEL_FORMATIVO_LABELS[plano.nivelFormativo]}
                </Badge>
                <Badge variant="outline" className={`text-xs ${STATUS_STYLES[plano.status]}`}>
                  {STATUS_PLANO_LABELS[plano.status]}
                </Badge>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => router.push(`/planos/${id}/editar`)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Excluir
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Data de cadastro</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {format(parseISO(plano.criadoEm.split("T")[0]), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          {totalCH > 0 && (
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Carga horária total</p>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                {totalCH}h · {plano.eixos.length} {plano.eixos.length === 1 ? "eixo" : "eixos"}
              </p>
            </div>
          )}
        </div>

        {plano.objetivos && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objetivos</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{plano.objetivos}</p>
          </div>
        )}

        {plano.fundamentacao && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fundamentação</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{plano.fundamentacao}</p>
          </div>
        )}

        {plano.eixos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Eixos Formativos ({plano.eixos.length})
            </p>
            <div className="space-y-2">
              {plano.eixos.map((eixo) => (
                <div key={eixo.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{eixo.nome}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {eixo.cargaHoraria > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {eixo.cargaHoraria}h
                        </span>
                      )}
                      {eixo.areaFormacao && (
                        <Badge variant="outline" className={`text-xs ${AREA_CORES[eixo.areaFormacao] ?? "bg-muted text-muted-foreground"}`}>
                          {eixo.areaFormacao}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {eixo.objetivo && <p className="text-xs text-foreground leading-relaxed">{eixo.objetivo}</p>}
                  {eixo.intervaloEncontros && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {eixo.intervaloEncontros}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {plano.documentoAnexo && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate">{plano.documentoAnexo}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 ml-2 h-7 text-xs gap-1 text-primary"
              onClick={() => router.push(`/viewer?arquivoId=${plano.documentoAnexoId}&nome=${encodeURIComponent(plano.documentoAnexo!)}&origem=/planos/${id}`)}
            >
              <Eye className="h-3 w-3" />
              Ver documento
            </Button>
          </div>
        )}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir plano</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{plano.nome}</span>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
