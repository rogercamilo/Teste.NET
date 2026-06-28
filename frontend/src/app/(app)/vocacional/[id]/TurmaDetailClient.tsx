"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Users, Sprout, FileText, HeartHandshake, Lock,
  CheckCircle2, XCircle, Upload, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { isGestao, temPermissao, CONDICAO_MEMBRO_LABELS, type CondicaoMembro } from "@/types";

interface Option { id: string; nome: string }

interface Participacao {
  id: string;
  formandoId: string;
  formandoNome: string;
  condicaoAtual: CondicaoMembro | null;
  status: string;
  dataIngresso: string;
  dataConclusao: string | null;
  desfechoCarta: "pedido" | "recusa" | null;
  cartaArquivoId: string | null;
  cartaRecebidaEm: string | null;
  acompanhadorId: string | null;
  acompanhadorNome: string | null;
  totalAcompanhamentos: number;
  solicitacoesPendentes: number;
}

interface Turma {
  id: string; nome: string; localReuniao: string | null;
  formadorId: string | null; formadorNome: string | null;
  vigenciaInicio: string | null; vigenciaFim: string | null;
  vocacionalDuracaoMeses: number | null; vocacionalTotalRetiros: number | null;
  vocacionalAcompanhamentoAtivo: boolean;
}

interface Props {
  userRole: string;
  userId: string;
  termoVocacional: string;
  termoAcompanhamento: string;
  turma: Turma;
  formandosDisponiveis: Option[];
  acompanhadores: Option[];
  participacoes: Participacao[];
}

const STATUS_LABELS: Record<string, string> = {
  ativa: "Ativa",
  aguardando_carta: "Aguardando carta",
  em_discernimento: "Em discernimento",
  concluida_deferida: "Concluída — deferida",
  recusada_arquivada: "Recusada — arquivada",
  indeferida_arquivada: "Indeferida — arquivada",
};

const STATUS_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  ativa: "default",
  aguardando_carta: "secondary",
  em_discernimento: "secondary",
  concluida_deferida: "outline",
  recusada_arquivada: "outline",
  indeferida_arquivada: "outline",
};

interface NotaAcompanhamento {
  id: string;
  data: string;
  tipo: string;
  acompanhadorNome: string;
  solicitadoPeloVocacionado: boolean;
  anotacaoEvolucao: string;
}

export default function TurmaDetailClient(props: Props) {
  const { userRole, userId, termoVocacional, termoAcompanhamento, turma, formandosDisponiveis, acompanhadores, participacoes } = props;
  const router = useRouter();
  const gestao = isGestao(userRole);
  const ehFormadorTurma = turma.formadorId === userId;
  const podeAcompanhar = gestao || ehFormadorTurma || temPermissao(userRole, "formador_geral");

  const [addOpen, setAddOpen] = useState(false);
  const [novoFormando, setNovoFormando] = useState("");
  const [novoAcompanhador, setNovoAcompanhador] = useState("");
  const [saving, setSaving] = useState(false);

  const [gerir, setGerir] = useState<Participacao | null>(null);

  const formandosNaTurma = new Set(participacoes.map((p) => p.formandoId));
  const disponiveis = formandosDisponiveis.filter((f) => !formandosNaTurma.has(f.id));

  async function addParticipante() {
    if (!novoFormando) return toast.error("Selecione um vocacionado.");
    setSaving(true);
    try {
      const res = await fetch("/api/vocacional/participacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turmaId: turma.id, formandoId: novoFormando, acompanhadorId: novoAcompanhador || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha ao inscrever");
      }
      toast.success("Vocacionado inscrito! Termo de ingresso lavrado no Livro.");
      setAddOpen(false);
      setNovoFormando("");
      setNovoAcompanhador("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/vocacional")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Sprout className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold leading-tight">{turma.nome}</h1>
          <p className="text-xs text-muted-foreground">
            {termoVocacional}
            {turma.formadorNome ? ` · Formador: ${turma.formadorNome}` : ""}
            {turma.vocacionalTotalRetiros != null ? ` · ${turma.vocacionalTotalRetiros} retiro(s)` : ""}
          </p>
        </div>
        {gestao && (
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Inscrever vocacionado
          </Button>
        )}
      </div>

      {participacoes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Nenhum vocacionado inscrito ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2.5">
          {participacoes.map((p) => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm font-medium">{p.formandoNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.condicaoAtual ? CONDICAO_MEMBRO_LABELS[p.condicaoAtual] : "—"}
                    {p.acompanhadorNome ? ` · Acompanhante: ${p.acompanhadorNome}` : ""}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[p.status] ?? "outline"} className="text-[10px]">
                  {STATUS_LABELS[p.status] ?? p.status}
                </Badge>
                {p.cartaArquivoId && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <FileText className="h-3 w-3" />
                    Carta · {p.desfechoCarta === "pedido" ? "Pedido" : "Recusa"}
                  </Badge>
                )}
                {turma.vocacionalAcompanhamentoAtivo && p.totalAcompanhamentos > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <HeartHandshake className="h-3 w-3" /> {p.totalAcompanhamentos}
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={() => setGerir(p)}>Gerir</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inscrever */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inscrever vocacionado</DialogTitle>
            <DialogDescription>
              O termo de ingresso é lavrado automaticamente no Livro de Registro.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Vocacionado *</Label>
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={novoFormando}
                onChange={(e) => setNovoFormando(e.target.value)}
              >
                <option value="">— Selecionar —</option>
                {disponiveis.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            {turma.vocacionalAcompanhamentoAtivo && (
              <div className="grid gap-1.5">
                <Label>Acompanhante (opcional)</Label>
                <select
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                  value={novoAcompanhador}
                  onChange={(e) => setNovoAcompanhador(e.target.value)}
                >
                  <option value="">— Formador da turma —</option>
                  {acompanhadores.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={addParticipante} disabled={saving}>{saving ? "Inscrevendo…" : "Inscrever"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {gerir && (
        <GerirDialog
          key={gerir.id}
          participacao={gerir}
          turma={turma}
          gestao={gestao}
          podeAcompanhar={podeAcompanhar}
          termoAcompanhamento={termoAcompanhamento}
          onClose={() => setGerir(null)}
          onChanged={() => { setGerir(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function GerirDialog({
  participacao, turma, gestao, podeAcompanhar, termoAcompanhamento, onClose, onChanged,
}: {
  participacao: Participacao;
  turma: Turma;
  gestao: boolean;
  podeAcompanhar: boolean;
  termoAcompanhamento: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const p = participacao;
  const [busy, setBusy] = useState(false);
  const encerrada = ["concluida_deferida", "recusada_arquivada", "indeferida_arquivada"].includes(p.status);

  // Carta
  const [cartaFile, setCartaFile] = useState<File | null>(null);
  const [desfecho, setDesfecho] = useState<"pedido" | "recusa">("pedido");

  // Acompanhamento
  const [notas, setNotas] = useState<NotaAcompanhamento[] | null>(null);
  const [notasOpen, setNotasOpen] = useState(false);
  const [novaNota, setNovaNota] = useState("");
  const [tipoNota, setTipoNota] = useState<"mensal" | "extra">("mensal");

  async function concluir(status: string) {
    if (!confirm(`Confirmar: ${STATUS_LABELS[status]}? Esta ação lavra o termo de término no Livro.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/vocacional/participacoes/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Falha"); }
      toast.success("Participação encerrada e termo lavrado.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  async function enviarCarta() {
    if (!cartaFile) return toast.error("Selecione o arquivo digitalizado da carta.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", cartaFile);
      fd.append("desfecho", desfecho);
      const res = await fetch(`/api/vocacional/participacoes/${p.id}/carta`, { method: "POST", body: fd });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Falha"); }
      toast.success("Carta registrada no rol de documentos.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  async function carregarNotas() {
    setNotasOpen(true);
    try {
      const res = await fetch(`/api/vocacional/participacoes/${p.id}/acompanhamento`);
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Falha"); }
      setNotas(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
      setNotas([]);
    }
  }

  async function salvarNota() {
    if (!novaNota.trim()) return toast.error("Escreva a anotação de evolução.");
    setBusy(true);
    try {
      const res = await fetch(`/api/vocacional/participacoes/${p.id}/acompanhamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anotacaoEvolucao: novaNota.trim(), tipo: tipoNota }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Falha"); }
      toast.success("Anotação registrada (confidencial).");
      setNovaNota("");
      await carregarNotas();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{p.formandoNome}</DialogTitle>
          <DialogDescription>
            {STATUS_LABELS[p.status]} · ingresso {new Date(p.dataIngresso).toLocaleDateString("pt-BR")}
          </DialogDescription>
        </DialogHeader>

        {/* Carta */}
        {!encerrada && (
          <section className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Carta de discernimento</p>
            {p.cartaArquivoId ? (
              <p className="text-xs text-muted-foreground">
                Recebida {p.cartaRecebidaEm ? new Date(p.cartaRecebidaEm).toLocaleDateString("pt-BR") : ""} ·
                desfecho: {p.desfechoCarta === "pedido" ? "Pedido de ingresso" : "Recusa"}.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Faça upload da carta manuscrita digitalizada e informe o desfecho.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="file" accept="application/pdf,image/*" onChange={(e) => setCartaFile(e.target.files?.[0] ?? null)} className="text-xs" />
                  <select className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={desfecho} onChange={(e) => setDesfecho(e.target.value as "pedido" | "recusa")}>
                    <option value="pedido">Pedido de ingresso</option>
                    <option value="recusa">Recusa</option>
                  </select>
                  <Button size="sm" className="gap-1.5" onClick={enviarCarta} disabled={busy}>
                    <Upload className="h-3.5 w-3.5" /> Registrar
                  </Button>
                </div>
              </>
            )}
          </section>
        )}

        {/* Acompanhamento individual — confidencial */}
        {turma.vocacionalAcompanhamentoAtivo && podeAcompanhar && (
          <section className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> {termoAcompanhamento}
              <span className="font-normal text-muted-foreground">(foro íntimo — o vocacionado não vê)</span>
            </p>
            {!notasOpen ? (
              <Button size="sm" variant="outline" onClick={carregarNotas} className="gap-1.5">
                <HeartHandshake className="h-3.5 w-3.5" /> Abrir anotações ({p.totalAcompanhamentos})
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {notas === null ? (
                    <p className="text-xs text-muted-foreground">Carregando…</p>
                  ) : notas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem anotações ainda.</p>
                  ) : (
                    notas.map((n) => (
                      <div key={n.id} className="rounded border border-border/60 bg-muted/30 p-2">
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(n.data).toLocaleDateString("pt-BR")} · {n.tipo === "extra" ? "Extra" : "Mensal"} · {n.acompanhadorNome}
                        </p>
                        <p className="text-xs whitespace-pre-wrap">{n.anotacaoEvolucao}</p>
                      </div>
                    ))
                  )}
                </div>
                {!encerrada && (
                  <div className="space-y-1.5">
                    <Textarea rows={3} placeholder="Anotação da evolução do acompanhamento…" value={novaNota} onChange={(e) => setNovaNota(e.target.value)} />
                    <div className="flex items-center gap-2">
                      <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={tipoNota} onChange={(e) => setTipoNota(e.target.value as "mensal" | "extra")}>
                        <option value="mensal">Mensal</option>
                        <option value="extra">Extra (a pedido)</option>
                      </select>
                      <Button size="sm" onClick={salvarNota} disabled={busy}>Registrar anotação</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Desfecho / encerramento */}
        {gestao && !encerrada && (
          <section className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Encerramento</p>
            <p className="text-xs text-muted-foreground">
              Após o discernimento da carta pelas autoridades, registre o desfecho. Lavra o termo de término.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-1.5" onClick={() => concluir("concluida_deferida")} disabled={busy}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Deferir ingresso
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => concluir("recusada_arquivada")} disabled={busy}>
                <XCircle className="h-3.5 w-3.5" /> Recusa do candidato
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => concluir("indeferida_arquivada")} disabled={busy}>
                <XCircle className="h-3.5 w-3.5" /> Indeferir
              </Button>
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
