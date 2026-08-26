"use client";

import { useState } from "react";
import { useTermos } from "@/lib/data-store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, FileText, Lock } from "lucide-react";
import { cn, resolveImageSrc } from "@/lib/utils";
import { toast } from "sonner";
import {
  NIVEL_FORMATIVO_LABELS, NOTA_ADESAO_LABELS, NOTA_ADESAO_CORES,
  RECOMENDACAO_LABELS, RECOMENDACAO_CORES, STATUS_RELATORIO_CORES,
  PERSPECTIVA_LABELS,
  type Formando, type RelatorioEtapa, type NotaAdesao,
  type RecomendacaoEtapa, type NivelFormativo,
} from "@/types";

interface RelatorioDialogProps {
  open: boolean;
  onClose: () => void;
  formando: Formando;
  nivelFormativo: NivelFormativo;
  relatorio: RelatorioEtapa | null;
  onSaved: (r: RelatorioEtapa) => void;
}

type FormState = {
  avaliacaoHumana: NotaAdesao | "";
  avaliacaoEspiritual: NotaAdesao | "";
  avaliacaoComunitaria: NotaAdesao | "";
  textoNarrativo: string;
  pontosForteza: string;
  desafios: string;
  recomendacao: RecomendacaoEtapa | "";
  textoRecomendacao: string;
};

function buildForm(r: RelatorioEtapa | null): FormState {
  return {
    avaliacaoHumana: (r?.avaliacaoHumana ?? "") as NotaAdesao | "",
    avaliacaoEspiritual: (r?.avaliacaoEspiritual ?? "") as NotaAdesao | "",
    avaliacaoComunitaria: (r?.avaliacaoComunitaria ?? "") as NotaAdesao | "",
    textoNarrativo: r?.textoNarrativo ?? "",
    pontosForteza: r?.pontosForteza ?? "",
    desafios: r?.desafios ?? "",
    recomendacao: (r?.recomendacao ?? "") as RecomendacaoEtapa | "",
    textoRecomendacao: r?.textoRecomendacao ?? "",
  };
}

const NOTAS: NotaAdesao[] = ["otima", "boa", "regular", "insuficiente"];
const RECOMENDACOES: RecomendacaoEtapa[] = ["avanca", "repete", "licenca", "desligamento"];

export function RelatorioDialog({
  open, onClose, formando, nivelFormativo, relatorio, onSaved,
}: RelatorioDialogProps) {
  const { formando: termoFormando } = useTermos();
  const [form, setForm] = useState<FormState>(() => buildForm(relatorio));
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [confirmFinalizar, setConfirmFinalizar] = useState(false);

  const isFinalizado = relatorio?.status === "finalizado";
  const readonly = isFinalizado;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function salvar() {
    setSaving(true);
    try {
      let res: Response;
      if (!relatorio) {
        res = await fetch("/api/relatorios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formandoId: formando.id,
            nivelFormativo,
            ...buildPayload(form),
          }),
        });
      } else {
        res = await fetch(`/api/relatorios/${relatorio.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(form)),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao salvar");
      }
      const saved: RelatorioEtapa = await res.json();
      onSaved(saved);
      toast.success("Rascunho salvo");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function finalizar() {
    if (!relatorio) {
      // Salva primeiro, depois finaliza
      setSaving(true);
      try {
        const res = await fetch("/api/relatorios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formandoId: formando.id,
            nivelFormativo,
            ...buildPayload(form),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Erro ao salvar");
        }
        const saved: RelatorioEtapa = await res.json();
        onSaved(saved);
        // agora finaliza
        await finalizarById(saved.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao finalizar");
        setSaving(false);
        setFinalizando(false);
        return;
      }
      setSaving(false);
    } else {
      // Salva edições e finaliza
      setFinalizando(true);
      try {
        const putRes = await fetch(`/api/relatorios/${relatorio.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(form)),
        });
        if (!putRes.ok) {
          const err = await putRes.json().catch(() => ({}));
          throw new Error(err.error ?? "Erro ao salvar");
        }
        await finalizarById(relatorio.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao finalizar");
        setFinalizando(false);
        setConfirmFinalizar(false);
        return;
      }
      setFinalizando(false);
    }
    setConfirmFinalizar(false);
    onClose();
  }

  async function finalizarById(id: string) {
    const res = await fetch(`/api/relatorios/${id}/finalizar`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Erro ao finalizar");
    }
    const updated: RelatorioEtapa = await res.json();
    onSaved(updated);
    toast.success("Relatório finalizado");
  }

  function buildPayload(f: FormState) {
    return {
      avaliacaoHumana: f.avaliacaoHumana || null,
      avaliacaoEspiritual: f.avaliacaoEspiritual || null,
      avaliacaoComunitaria: f.avaliacaoComunitaria || null,
      textoNarrativo: f.textoNarrativo || null,
      pontosForteza: f.pontosForteza || null,
      desafios: f.desafios || null,
      recomendacao: f.recomendacao || null,
      textoRecomendacao: f.textoRecomendacao || null,
    };
  }

  const initials = formando.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {resolveImageSrc(formando.foto) && <AvatarImage src={resolveImageSrc(formando.foto)!} alt={formando.nome} />}
              <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">{formando.nome}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {NIVEL_FORMATIVO_LABELS[nivelFormativo]} — Relatório de Etapa
              </p>
            </div>
            {relatorio && (
              <Badge
                variant="outline"
                className={cn("text-xs", STATUS_RELATORIO_CORES[relatorio.status])}
              >
                {isFinalizado ? <Lock className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                {relatorio.status === "rascunho" ? "Rascunho" : "Finalizado"}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Avaliação por perspectiva */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Avaliação por Perspectiva
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["humana", "espiritual", "comunitaria"] as const).map((p) => {
                const field = `avaliacao${p.charAt(0).toUpperCase()}${p.slice(1)}` as keyof FormState;
                const val = form[field] as NotaAdesao | "";
                return (
                  <div key={p} className="space-y-1.5">
                    <Label className="text-xs">{PERSPECTIVA_LABELS[p]}</Label>
                    {readonly ? (
                      val ? (
                        <div className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border", NOTA_ADESAO_CORES[val as NotaAdesao])}>
                          {NOTA_ADESAO_LABELS[val as NotaAdesao]}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )
                    ) : (
                      <Select value={val} onValueChange={(v) => set(field, v as NotaAdesao)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecionar nota">
                            {val ? NOTA_ADESAO_LABELS[val as NotaAdesao] : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {NOTAS.map((n) => (
                            <SelectItem key={n} value={n} className="text-xs">
                              {NOTA_ADESAO_LABELS[n]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Narrativa */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Narrativa
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Texto Narrativo</Label>
              {readonly ? (
                <p className="text-sm min-h-[48px] text-muted-foreground whitespace-pre-wrap">
                  {form.textoNarrativo || "—"}
                </p>
              ) : (
                <Textarea
                  value={form.textoNarrativo}
                  onChange={(e) => set("textoNarrativo", e.target.value)}
                  placeholder={`Descreva a jornada do ${termoFormando.toLowerCase()} nesta etapa...`}
                  className="min-h-[80px] text-sm resize-none"
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pontos de Fortaleza</Label>
                {readonly ? (
                  <p className="text-sm min-h-[48px] text-muted-foreground whitespace-pre-wrap">
                    {form.pontosForteza || "—"}
                  </p>
                ) : (
                  <Textarea
                    value={form.pontosForteza}
                    onChange={(e) => set("pontosForteza", e.target.value)}
                    placeholder={`O que o ${termoFormando.toLowerCase()} demonstrou bem...`}
                    className="min-h-[72px] text-sm resize-none"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Desafios a Trabalhar</Label>
                {readonly ? (
                  <p className="text-sm min-h-[48px] text-muted-foreground whitespace-pre-wrap">
                    {form.desafios || "—"}
                  </p>
                ) : (
                  <Textarea
                    value={form.desafios}
                    onChange={(e) => set("desafios", e.target.value)}
                    placeholder="Pontos a desenvolver na próxima etapa..."
                    className="min-h-[72px] text-sm resize-none"
                  />
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Recomendação */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Recomendação
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Decisão</Label>
              {readonly ? (
                form.recomendacao ? (
                  <div className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium", RECOMENDACAO_CORES[form.recomendacao as RecomendacaoEtapa])}>
                    {RECOMENDACAO_LABELS[form.recomendacao as RecomendacaoEtapa]}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )
              ) : (
                <Select value={form.recomendacao} onValueChange={(v) => set("recomendacao", v as RecomendacaoEtapa)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar recomendação">
                      {form.recomendacao ? RECOMENDACAO_LABELS[form.recomendacao as RecomendacaoEtapa] : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RECOMENDACOES.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {RECOMENDACAO_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações sobre a recomendação</Label>
              {readonly ? (
                <p className="text-sm min-h-[40px] text-muted-foreground whitespace-pre-wrap">
                  {form.textoRecomendacao || "—"}
                </p>
              ) : (
                <Textarea
                  value={form.textoRecomendacao}
                  onChange={(e) => set("textoRecomendacao", e.target.value)}
                  placeholder="Justificativa ou orientações adicionais..."
                  className="min-h-[60px] text-sm resize-none"
                />
              )}
            </div>
          </section>

          {/* Confirmação de finalização */}
          {confirmFinalizar && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="text-xs text-amber-800 font-medium">
                  Finalizar o relatório é irreversível. Após finalizado, não poderá ser editado.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setConfirmFinalizar(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                    onClick={finalizar}
                    disabled={finalizando}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    {finalizando ? "Finalizando..." : "Confirmar e Finalizar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            {readonly ? "Fechar" : "Cancelar"}
          </Button>
          {!readonly && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={salvar}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar Rascunho"}
              </Button>
              {!confirmFinalizar && (
                <Button
                  size="sm"
                  className="text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setConfirmFinalizar(true)}
                  disabled={!form.recomendacao}
                  title={!form.recomendacao ? "Selecione uma recomendação para finalizar" : undefined}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Finalizar Relatório
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
