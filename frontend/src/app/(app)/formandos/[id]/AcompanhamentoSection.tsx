"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Plus, Bell, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface AcompanhamentoFormandoItem {
  id: string;
  data: string; // ISO
  nota: string | null;
  formadorNome: string;
  solicitadoPeloFormando: boolean;
  criadoEm: string;
}

export interface SolicitacaoAcompanhamentoItem {
  id: string;
  solicitadoEm: string; // ISO
  mensagem: string | null;
}

const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
function formatar(iso: string): string {
  return fmtData.format(new Date(iso));
}

/**
 * Acompanhamento formativo do formando (jornada comunitária) — visão do formador.
 * O formador MARCA encontros (data + nota privada) e vê os PEDIDOS que o formando
 * fez pelo portal. A nota nunca sai por rota de portal — é observação formativa do
 * formador, não foro íntimo. Segue o padrão server+refresh (sem estado global).
 */
export function AcompanhamentoSection({
  formandoId,
  termoFormando,
  acompanhamentos,
  solicitacoes,
  podeGerir,
}: {
  formandoId: string;
  termoFormando: string;
  acompanhamentos: AcompanhamentoFormandoItem[];
  solicitacoes: SolicitacaoAcompanhamentoItem[];
  podeGerir: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [data, setData] = useState("");
  const [nota, setNota] = useState("");
  const [atendeId, setAtendeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function abrir(solicitacaoId?: string) {
    setAtendeId(solicitacaoId ?? null);
    setData("");
    setNota("");
    setFormOpen(true);
  }

  async function salvar() {
    if (!data) return toast.error("Informe a data do acompanhamento.");
    setBusy(true);
    try {
      const res = await fetch(`/api/formandos/${formandoId}/acompanhamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, nota: nota.trim() || null, atendeSolicitacaoId: atendeId ?? undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha");
      }
      toast.success("Acompanhamento marcado.");
      setFormOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h2 className="flex-1 text-sm font-semibold">Acompanhamento formativo</h2>
        {podeGerir && !formOpen && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => abrir()}>
            <Plus className="h-4 w-4" /> Marcar acompanhamento
          </Button>
        )}
      </div>

      {/* Pedidos do formando (via portal) ainda não atendidos. */}
      {solicitacoes.length > 0 && (
        <div className="space-y-2">
          {solicitacoes.map((s) => (
            <Card key={s.id} className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-wrap items-center gap-3 py-3">
                <Bell className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-[12rem] flex-1">
                  <p className="text-sm font-medium">
                    {termoFormando} solicitou acompanhamento
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pedido em {formatar(s.solicitadoEm)}
                    {s.mensagem ? ` · “${s.mensagem}”` : ""}
                  </p>
                </div>
                {podeGerir && (
                  <Button size="sm" variant="outline" onClick={() => abrir(s.id)}>
                    Marcar acompanhamento
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Formulário de marcação (inline). */}
      {formOpen && (
        <Card>
          <CardContent className="grid gap-3 py-4">
            {atendeId && (
              <p className="text-xs text-primary">Atendendo a um pedido do {termoFormando.toLowerCase()}.</p>
            )}
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label>Data do acompanhamento *</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Nota (visível só para formadores)</Label>
              <Textarea
                rows={3}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder={`Observações formativas do encontro (não aparecem para o ${termoFormando.toLowerCase()}).`}
                maxLength={4000}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setFormOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button size="sm" onClick={salvar} disabled={busy}>
                {busy ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de acompanhamentos. */}
      {acompanhamentos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <CalendarClock className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Nenhum acompanhamento marcado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {acompanhamentos.map((a) => (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="space-y-1.5 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm font-medium">{formatar(a.data)}</p>
                  {a.solicitadoPeloFormando && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                      <Bell className="h-3 w-3" /> a pedido do {termoFormando.toLowerCase()}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <UserRound className="h-3 w-3" /> {a.formadorNome}
                  </span>
                </div>
                {a.nota && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.nota}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
