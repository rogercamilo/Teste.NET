"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Users, Sprout, FileText, HeartHandshake, Lock,
  CheckCircle2, XCircle, Upload, Calendar, BookOpen, Pencil, Trash2,
  Heart, MessageSquareText, ChevronDown, Send,
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
import type { TurmaTravessiaProgresso, ProgressoParticipante, ProgressoPartilha } from "@/lib/vocacional-travessia";

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

interface CapituloLeitura {
  id: string;
  numero: number;
  titulo: string;
}

interface Leitura {
  id: string;
  titulo: string;
  autor: string | null;
  ordem: number;
  ativo: boolean;
  capitulos: CapituloLeitura[];
}

interface Props {
  userRole: string;
  userId: string;
  termoVocacional: string;
  termoAcompanhamento: string;
  turma: Turma;
  formandosDisponiveis: Option[];
  acompanhadores: Option[];
  leituras: Leitura[];
  travessiaProgresso: TurmaTravessiaProgresso | null;
  participacoes: Participacao[];
}

const STATUS_LABELS: Record<string, string> = {
  ativa: "Ativa",
  aguardando_carta: "Aguardando carta",
  em_discernimento: "Em discernimento",
  concluida_deferida: "Concluída — deferida",
  recusada_arquivada: "Recusada — arquivada",
  indeferida_arquivada: "Indeferida — arquivada",
  cancelada: "Cancelada",
};

const STATUS_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  ativa: "default",
  aguardando_carta: "secondary",
  em_discernimento: "secondary",
  concluida_deferida: "outline",
  recusada_arquivada: "outline",
  indeferida_arquivada: "outline",
  cancelada: "outline",
};

const STATUS_ENCERRADOS = ["concluida_deferida", "recusada_arquivada", "indeferida_arquivada", "cancelada"];

interface NotaAcompanhamento {
  id: string;
  data: string;
  tipo: string;
  acompanhadorNome: string;
  solicitadoPeloVocacionado: boolean;
  anotacaoEvolucao: string;
}

export default function TurmaDetailClient(props: Props) {
  const { userRole, userId, termoVocacional, termoAcompanhamento, turma, formandosDisponiveis, acompanhadores, leituras, travessiaProgresso, participacoes } = props;
  const router = useRouter();
  const gestao = isGestao(userRole);
  const ehFormadorTurma = turma.formadorId === userId;
  const podeAcompanhar = gestao || ehFormadorTurma || temPermissao(userRole, "formador_geral");
  const podeGerirLeituras = gestao || ehFormadorTurma;

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

      {/* Leituras da turma */}
      <LeiturasSection turmaId={turma.id} leituras={leituras} podeGerir={podeGerirLeituras} />

      {/* Progresso da Travessia (leitura + partilhas dos vocacionados) */}
      {travessiaProgresso && (
        <TravessiaProgressoSection
          turmaId={turma.id}
          progresso={travessiaProgresso}
          podeReagir={podeGerirLeituras}
        />
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
          isAdmin={userRole === "administrador"}
          // O acompanhador designado também acessa o painel, mesmo sem ser
          // formador da turma nem gestão (espelha o gate da API).
          podeAcompanhar={podeAcompanhar || gerir.acompanhadorId === userId}
          termoAcompanhamento={termoAcompanhamento}
          onClose={() => setGerir(null)}
          onChanged={() => { setGerir(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function GerirDialog({
  participacao, turma, gestao, isAdmin, podeAcompanhar, termoAcompanhamento, onClose, onChanged,
}: {
  participacao: Participacao;
  turma: Turma;
  gestao: boolean;
  isAdmin: boolean;
  podeAcompanhar: boolean;
  termoAcompanhamento: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const p = participacao;
  const [busy, setBusy] = useState(false);
  const encerrada = STATUS_ENCERRADOS.includes(p.status);

  // Carta
  const [cartaFile, setCartaFile] = useState<File | null>(null);
  const [desfecho, setDesfecho] = useState<"pedido" | "recusa">("pedido");

  // Acompanhamento
  const [notas, setNotas] = useState<NotaAcompanhamento[] | null>(null);
  const [notasOpen, setNotasOpen] = useState(false);
  const [novaNota, setNovaNota] = useState("");
  const [tipoNota, setTipoNota] = useState<"mensal" | "extra">("mensal");

  async function concluir(status: string) {
    const acao = status === "cancelada"
      ? "Cancelar a inscrição? Isto lavra uma retificação no Livro e restaura o vocacionado ao estado anterior."
      : `Confirmar: ${STATUS_LABELS[status]}? Esta ação lavra o termo de término no Livro.`;
    if (!confirm(acao)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/vocacional/participacoes/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Falha"); }
      toast.success(status === "cancelada" ? "Inscrição cancelada e retificação lavrada." : "Participação encerrada e termo lavrado.");
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
            {isAdmin && (
              <div className="border-t border-border/60 pt-2">
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  Inscrição lavrada por equívoco? O cancelamento lavra uma retificação no Livro e
                  restaura o vocacionado ao estado anterior.
                </p>
                <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => concluir("cancelada")} disabled={busy}>
                  <XCircle className="h-3.5 w-3.5" /> Cancelar inscrição (equívoco)
                </Button>
              </div>
            )}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Divide o texto colado em títulos de capítulo (um por linha, sem vazias). */
function parseCapitulos(texto: string): string[] {
  return texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function LeiturasSection({
  turmaId, leituras, podeGerir,
}: {
  turmaId: string;
  leituras: Leitura[];
  podeGerir: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Leitura | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  function abrirNova() { setEditando(null); setFormOpen(true); }
  function abrirEdicao(l: Leitura) { setEditando(l); setFormOpen(true); }

  async function remover(l: Leitura) {
    if (!confirm(`Remover a leitura "${l.titulo}" e seus capítulos?`)) return;
    setRemovendo(l.id);
    try {
      const res = await fetch(`/api/vocacional/turmas/${turmaId}/leituras/${l.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Falha"); }
      toast.success("Leitura removida.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setRemovendo(null); }
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold flex-1">Leituras da turma</h2>
        {podeGerir && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={abrirNova}>
            <Plus className="h-4 w-4" /> Adicionar leitura
          </Button>
        )}
      </div>

      {leituras.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Nenhuma leitura cadastrada. As indicações de leitura da turma aparecem aqui.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {leituras.map((l) => (
            <Card key={l.id} className="border-0 shadow-sm">
              <CardContent className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm font-medium">
                    {l.titulo}
                    {!l.ativo && (
                      <Badge variant="outline" className="ml-2 text-[10px]">Inativa</Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {l.autor ? `${l.autor} · ` : ""}
                    {l.capitulos.length} {l.capitulos.length === 1 ? "capítulo" : "capítulos"}
                  </p>
                </div>
                {podeGerir && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label="Editar leitura" onClick={() => abrirEdicao(l)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm" aria-label="Remover leitura"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remover(l)} disabled={removendo === l.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {formOpen && (
        <LeituraFormDialog
          key={editando?.id ?? "nova"}
          turmaId={turmaId}
          leitura={editando}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); router.refresh(); }}
        />
      )}
    </section>
  );
}

function LeituraFormDialog({
  turmaId, leitura, onClose, onSaved,
}: {
  turmaId: string;
  leitura: Leitura | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const edicao = !!leitura;
  const capitulosOriginais = leitura ? leitura.capitulos.map((c) => c.titulo).join("\n") : "";
  const [titulo, setTitulo] = useState(leitura?.titulo ?? "");
  const [autor, setAutor] = useState(leitura?.autor ?? "");
  const [capitulosTexto, setCapitulosTexto] = useState(capitulosOriginais);
  const [busy, setBusy] = useState(false);

  const capitulos = parseCapitulos(capitulosTexto);

  async function salvar() {
    if (!titulo.trim()) return toast.error("Informe o título do livro.");
    if (capitulos.length === 0) return toast.error("Informe ao menos um capítulo (um por linha).");
    setBusy(true);
    try {
      const url = edicao
        ? `/api/vocacional/turmas/${turmaId}/leituras/${leitura!.id}`
        : `/api/vocacional/turmas/${turmaId}/leituras`;
      // Na edição, só reenvia os capítulos quando o texto mudou — evita apagar e
      // recriar as linhas (e regenerar seus IDs) numa edição só de título.
      const capitulosMudaram = capitulosTexto.trim() !== capitulosOriginais.trim();
      const body: Record<string, unknown> = { titulo: titulo.trim(), autor: autor.trim() || null };
      if (!edicao || capitulosMudaram) body.capitulos = capitulos;
      const res = await fetch(url, {
        method: edicao ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Falha"); }
      toast.success(edicao ? "Leitura atualizada." : "Leitura cadastrada.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar leitura" : "Nova leitura"}</DialogTitle>
          <DialogDescription>
            Cole os títulos dos capítulos — um por linha. Eles são numerados automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Título do livro *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: A Imitação de Cristo" maxLength={200} />
          </div>
          <div className="grid gap-1.5">
            <Label>Autor (opcional)</Label>
            <Input value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Ex.: Tomás de Kempis" maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label>Capítulos — um por linha</Label>
              <span className="text-[11px] text-muted-foreground">
                {capitulos.length} {capitulos.length === 1 ? "capítulo" : "capítulos"}
              </span>
            </div>
            <Textarea
              rows={8}
              value={capitulosTexto}
              onChange={(e) => setCapitulosTexto(e.target.value)}
              placeholder={"1. O menosprezo das vaidades\n2. Humilde sentir de si\n3. A doutrina da verdade"}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button size="sm" onClick={salvar} disabled={busy}>
            {busy ? "Salvando…" : edicao ? "Salvar" : "Cadastrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Painel de progresso da Trilha da Travessia: por vocacionado ativo, quanto leu,
 * Frutos somados e as partilhas textuais. O formador pode reagir a cada partilha
 * (curtida + nota curta de incentivo) — read-only para quem não gere a turma.
 */
function TravessiaProgressoSection({
  turmaId, progresso, podeReagir,
}: {
  turmaId: string;
  progresso: TurmaTravessiaProgresso;
  podeReagir: boolean;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Sprout className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold flex-1">Progresso da Travessia</h2>
        <span className="text-xs text-muted-foreground">
          {progresso.totalCapitulos} {progresso.totalCapitulos === 1 ? "capítulo" : "capítulos"} na trilha
        </span>
      </div>

      {progresso.participantes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Nenhum vocacionado ativo na turma para acompanhar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {progresso.participantes.map((p) => (
            <ParticipanteProgressoCard
              key={p.formandoId}
              turmaId={turmaId}
              participante={p}
              totalCapitulos={progresso.totalCapitulos}
              podeReagir={podeReagir}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ParticipanteProgressoCard({
  turmaId, participante, totalCapitulos, podeReagir,
}: {
  turmaId: string;
  participante: ProgressoParticipante;
  totalCapitulos: number;
  podeReagir: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const temPartilhas = participante.partilhas.length > 0;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[10rem]">
            <p className="text-sm font-medium">{participante.nome}</p>
            <p className="text-xs text-muted-foreground">
              {participante.capitulosLidos}/{totalCapitulos} lidos · {participante.percentual}%
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sprout className="h-3 w-3" />
            {participante.frutos} {participante.frutos === 1 ? "Fruto" : "Frutos"}
          </Badge>
          {temPartilhas && (
            <Button
              size="sm" variant="ghost" className="gap-1.5"
              onClick={() => setAberto((v) => !v)}
              aria-expanded={aberto}
            >
              <MessageSquareText className="h-4 w-4" />
              {participante.partilhas.length}{" "}
              {participante.partilhas.length === 1 ? "partilha" : "partilhas"}
              <ChevronDown className={"h-4 w-4 transition-transform " + (aberto ? "rotate-180" : "")} />
            </Button>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${participante.percentual}%` }} />
        </div>

        {aberto && temPartilhas && (
          <div className="mt-3 space-y-2.5 border-t pt-3">
            {participante.partilhas.map((pt) => (
              <PartilhaReacaoItem
                key={pt.acaoId}
                turmaId={turmaId}
                partilha={pt}
                podeReagir={podeReagir}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Uma partilha no painel do formador: mostra livro/capítulo, o texto e — para
 * quem gere a turma — controles de reação (curtida + nota curta). Otimista com
 * reversão, no espírito das demais ações do app.
 */
function PartilhaReacaoItem({
  turmaId, partilha, podeReagir,
}: {
  turmaId: string;
  partilha: ProgressoPartilha;
  podeReagir: boolean;
}) {
  const [curtiu, setCurtiu] = useState(partilha.formadorCurtiu);
  const [nota, setNota] = useState(partilha.formadorNota ?? "");
  const [editandoNota, setEditandoNota] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);

  async function reagir(payload: { curtiu?: boolean; nota?: string | null }) {
    const res = await fetch(`/api/vocacional/turmas/${turmaId}/travessia/partilhas/${partilha.acaoId}/reacao`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Falha"); }
  }

  async function toggleCurtida() {
    const anterior = curtiu;
    setCurtiu(!anterior); // otimista
    try {
      await reagir({ curtiu: !anterior });
    } catch (e) {
      setCurtiu(anterior);
      toast.error(e instanceof Error ? e.message : "Erro ao curtir");
    }
  }

  async function salvarNota() {
    setSalvandoNota(true);
    try {
      const limpa = nota.trim();
      await reagir({ nota: limpa || null });
      setNota(limpa);
      setEditandoNota(false);
      toast.success("Nota enviada ao vocacionado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar nota");
    } finally {
      setSalvandoNota(false);
    }
  }

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {partilha.livroTitulo} · Cap. {partilha.capituloNumero}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{partilha.texto}</p>

      {podeReagir ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm" variant={curtiu ? "default" : "outline"} className="h-7 gap-1.5 px-2.5"
            onClick={toggleCurtida}
          >
            <Heart className={"h-3.5 w-3.5 " + (curtiu ? "fill-current" : "")} />
            {curtiu ? "Curtido" : "Curtir"}
          </Button>
          {!editandoNota && (
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2" onClick={() => setEditandoNota(true)}>
              <Pencil className="h-3.5 w-3.5" />
              {nota ? "Editar nota" : "Adicionar nota"}
            </Button>
          )}
        </div>
      ) : (
        curtiu && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Heart className="h-3.5 w-3.5 fill-current" /> Curtida
          </p>
        )
      )}

      {editandoNota ? (
        <div className="mt-2">
          <Textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Uma palavra de incentivo ao vocacionado…"
            className="text-sm"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <Button size="sm" className="h-7 gap-1.5 px-2.5" onClick={salvarNota} disabled={salvandoNota}>
              <Send className="h-3.5 w-3.5" />
              {salvandoNota ? "Enviando…" : "Enviar nota"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setNota(partilha.formadorNota ?? ""); setEditandoNota(false); }} disabled={salvandoNota}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        nota && (
          <p className="mt-2 rounded bg-primary/5 px-2 py-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Sua nota: </span>{nota}
          </p>
        )
      )}
    </div>
  );
}
