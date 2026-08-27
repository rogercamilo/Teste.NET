"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookMarked, Download, FileSignature, Info, Lock, Plus, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONDICAO_MEMBRO_LABELS,
  TIPO_TERMO_LABELS,
  TIPO_TERMO_TAGS,
  TIPOS_TERMO_MANUAIS,
  temPermissao,
  type CondicaoMembro,
  type TipoTermoRegistro,
} from "@/types";

interface Tomo {
  id: string;
  numero: number;
  totalFolhas: number;
  status: string;
  aberturaData: string;
  aberturaModerador: string;
  aberturaSecretario: string;
  aberturaTexto: string;
  aberturaArquivoId?: string | null;
  encerramentoData?: string | null;
  encerramentoTexto?: string | null;
  encerramentoArquivoId?: string | null;
  totalTermos: number;
}

interface Termo {
  id: string;
  tomoId: string;
  tomoNumero: number;
  numero: number;
  tipo: TipoTermoRegistro;
  formandoId?: string | null;
  formandoNome?: string | null;
  dataEvento: string;
  dataLavratura: string;
  corpoTexto: string;
  condicaoResultante?: CondicaoMembro | null;
  retificaTermoId?: string | null;
  lavradoAutomaticamente: boolean;
}

interface Props {
  userRole: string;
  orgNome: string;
  etapas: string[];
  formandos: { id: string; nome: string }[];
  tomos: Tomo[];
  termos: Termo[];
}

const ROMANOS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const romano = (n: number) => ROMANOS[n] ?? String(n);
const num4 = (n: number) => String(n).padStart(4, "0");

export default function LivroRegistroClient({
  userRole,
  etapas,
  formandos,
  tomos,
  termos,
}: Props) {
  const router = useRouter();
  const isAdmin = userRole === "administrador";
  const podeVer = temPermissao(userRole, "formador_geral");

  const tomoAberto = tomos.find((t) => t.status === "aberto");
  const [tomoSelId, setTomoSelId] = useState<string>(tomoAberto?.id ?? tomos[0]?.id ?? "");
  const tomoSel = tomos.find((t) => t.id === tomoSelId);

  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [busy, setBusy] = useState(false);

  const [abrirOpen, setAbrirOpen] = useState(false);
  const [lavrarOpen, setLavrarOpen] = useState(false);

  const termosTomo = useMemo(
    () =>
      termos
        .filter((t) => t.tomoId === tomoSelId)
        .filter((t) => tipoFiltro === "todos" || t.tipo === tipoFiltro),
    [termos, tomoSelId, tipoFiltro]
  );

  const tiposPresentes = useMemo(
    () => Array.from(new Set(termos.filter((t) => t.tomoId === tomoSelId).map((t) => t.tipo))),
    [termos, tomoSelId]
  );

  async function api(url: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Operação falhou");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      toast.error("Erro de rede");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function encerrarTomo() {
    if (!tomoSel || tomoSel.status !== "aberto") return;
    if (!confirm(`Encerrar o Tomo ${romano(tomoSel.numero)}? Esta ação não pode ser desfeita.`)) return;
    const ok = await api(`/api/livro-registro/tomos/${tomoSel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "encerrar" }),
    });
    if (ok) toast.success("Tomo encerrado.");
  }

  async function anexarAssinado(alvo: "abertura" | "encerramento", file: File) {
    if (!tomoSel) return;
    const fd = new FormData();
    fd.append("alvo", alvo);
    fd.append("arquivo", file);
    const ok = await api(`/api/livro-registro/tomos/${tomoSel.id}`, { method: "PATCH", body: fd });
    if (ok) toast.success("PDF assinado anexado.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-primary" />
            Livro de Registro Geral
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Assentos cronológicos e imutáveis da jornada vocacional
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tomoSel && (
            <a
              href={`/api/livro-registro/pdf?tomoId=${tomoSel.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Download className="h-4 w-4" /> Exportar PDF
            </a>
          )}
          {isAdmin && !tomoAberto && (
            <Button size="sm" onClick={() => setAbrirOpen(true)}>
              <Plus className="h-4 w-4" /> Abrir Tomo
            </Button>
          )}
          {isAdmin && tomoAberto && (
            <Button size="sm" onClick={() => setLavrarOpen(true)}>
              <Plus className="h-4 w-4" /> Lavrar termo
            </Button>
          )}
        </div>
      </div>

      {/* Nota: o que é o Livro e como os termos chegam aqui */}
      <div className="flex gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-foreground font-medium">O Livro de Registro Geral</p>
          <p>
            É o livro cartorial da comunidade: reúne os assentos cronológicos e imutáveis (append-only) da jornada
            vocacional, organizados em Tomos — cada um com termo de abertura e de encerramento — e Termos numerados.
            Nada é apagado: uma correção entra como um novo <span className="font-medium">termo de retificação</span>,
            preservando o histórico.
          </p>
          <p>
            A maior parte dos termos é lavrada <span className="font-medium">automaticamente</span> quando os atos
            acontecem nas outras telas (ingresso e término no Período Vocacional, promessas no Livro de Promessas,
            conclusões na Jornada Vocacional). Aqui o administrador abre e encerra tomos, exporta o PDF e lavra
            manualmente os poucos termos sem processo de origem (falecimento, dispensa, término de licença,
            retificação).
          </p>
        </div>
      </div>

      {!podeVer ? null : tomos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <BookMarked className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum tomo aberto. {isAdmin ? "Abra o Tomo I para começar." : "Aguarde o administrador abrir o livro."}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Seletor de tomo + filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={tomoSelId} onValueChange={(v) => setTomoSelId(v ?? "")}>
              <SelectTrigger className="w-56">
                <SelectValue>
                  {tomoSel ? `Tomo ${romano(tomoSel.numero)} · ${tomoSel.status === "aberto" ? "aberto" : "encerrado"}` : "Selecione o tomo"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tomos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    Tomo {romano(t.numero)} — {t.totalTermos} termo{t.totalTermos !== 1 ? "s" : ""} ({t.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v ?? "todos")}>
              <SelectTrigger className="w-52">
                <SelectValue>
                  {tipoFiltro === "todos" ? "Todos os tipos" : TIPO_TERMO_LABELS[tipoFiltro as TipoTermoRegistro]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tiposPresentes.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {TIPO_TERMO_LABELS[tipo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isAdmin && tomoSel?.status === "aberto" && (
              <Button variant="outline" size="sm" onClick={encerrarTomo} disabled={busy}>
                <Lock className="h-4 w-4" /> Encerrar Tomo
              </Button>
            )}
          </div>

          {/* Cabeçalho do tomo (abertura) */}
          {tomoSel && (
            <Card>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <ScrollText className="h-4 w-4 text-primary" /> Termo de Abertura — Tomo {romano(tomoSel.numero)}
                  </h2>
                  <Badge variant={tomoSel.status === "aberto" ? "default" : "secondary"}>
                    {tomoSel.status === "aberto" ? "Aberto" : "Encerrado"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed text-justify">{tomoSel.aberturaTexto}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(tomoSel.aberturaData), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} · Moderador(a): {tomoSel.aberturaModerador} · Secretário(a): {tomoSel.aberturaSecretario}
                </p>
                {isAdmin && (
                  <div className="flex flex-wrap gap-4 pt-1 text-xs">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-primary hover:underline">
                      <FileSignature className="h-3.5 w-3.5" />
                      {tomoSel.aberturaArquivoId ? "Substituir abertura assinada" : "Anexar abertura assinada"}
                      <input type="file" accept="application/pdf" className="hidden"
                        onChange={(e) => e.target.files?.[0] && anexarAssinado("abertura", e.target.files[0])} />
                    </label>
                    {tomoSel.status === "encerrado" && (
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-primary hover:underline">
                        <FileSignature className="h-3.5 w-3.5" />
                        {tomoSel.encerramentoArquivoId ? "Substituir encerramento assinado" : "Anexar encerramento assinado"}
                        <input type="file" accept="application/pdf" className="hidden"
                          onChange={(e) => e.target.files?.[0] && anexarAssinado("encerramento", e.target.files[0])} />
                      </label>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Termos */}
          {termosTomo.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhum termo lavrado neste tomo.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {termosTomo.map((t) => (
                <Card key={t.id}>
                  <CardContent className="py-3.5">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-primary">Termo nº {num4(t.numero)}</span>
                      <span className="font-medium">— {TIPO_TERMO_LABELS[t.tipo]}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] tracking-wide">{TIPO_TERMO_TAGS[t.tipo]}</Badge>
                    </div>
                    {t.formandoNome && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.formandoNome}</p>
                    )}
                    <p className="text-sm mt-2 leading-relaxed text-justify">{t.corpoTexto}</p>
                    <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                      <p className="text-xs italic text-muted-foreground">
                        {t.lavradoAutomaticamente
                          ? `Lavrado automaticamente em ${format(parseISO(t.dataLavratura), "dd/MM/yyyy", { locale: ptBR })}.`
                          : `Lavrado pelo administrador em ${format(parseISO(t.dataLavratura), "dd/MM/yyyy", { locale: ptBR })}, com registro em auditoria.`}
                      </p>
                      {t.condicaoResultante && (
                        <Badge variant="secondary" className="text-[10px]">{CONDICAO_MEMBRO_LABELS[t.condicaoResultante]}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <AbrirTomoDialog open={abrirOpen} onOpenChange={setAbrirOpen} busy={busy} api={api} />
      {tomoAberto && (
        <LavrarTermoDialog
          open={lavrarOpen}
          onOpenChange={setLavrarOpen}
          busy={busy}
          api={api}
          etapas={etapas}
          formandos={formandos}
          termosTomo={termos.filter((t) => t.tomoId === tomoAberto.id)}
        />
      )}
    </div>
  );
}

// ── Diálogo: abrir tomo ───────────────────────────────────────────────────────

function AbrirTomoDialog({
  open, onOpenChange, busy, api,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  api: (url: string, init: RequestInit) => Promise<boolean>;
}) {
  const [moderador, setModerador] = useState("");
  const [secretario, setSecretario] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [folhas, setFolhas] = useState("200");

  async function submit() {
    if (!moderador.trim() || !secretario.trim()) {
      toast.error("Informe Moderador e Secretário.");
      return;
    }
    const ok = await api("/api/livro-registro/tomos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aberturaModerador: moderador,
        aberturaSecretario: secretario,
        aberturaData: data,
        totalFolhas: Number(folhas) || 200,
      }),
    });
    if (ok) {
      toast.success("Tomo aberto.");
      onOpenChange(false);
      setModerador(""); setSecretario("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir novo tomo</DialogTitle>
          <DialogDescription>O termo de abertura é gerado automaticamente. Assine e anexe o PDF depois.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Moderador(a) Geral</Label>
            <Input value={moderador} onChange={(e) => setModerador(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1.5">
            <Label>Secretário(a)</Label>
            <Input value={secretario} onChange={(e) => setSecretario(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data de abertura</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total de folhas</Label>
              <Input type="number" min={1} value={folhas} onChange={(e) => setFolhas(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>Abrir tomo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Diálogo: lavrar termo manual ──────────────────────────────────────────────

function LavrarTermoDialog({
  open, onOpenChange, busy, api, etapas, formandos, termosTomo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  api: (url: string, init: RequestInit) => Promise<boolean>;
  etapas: string[];
  formandos: { id: string; nome: string }[];
  termosTomo: Termo[];
}) {
  const [tipo, setTipo] = useState<TipoTermoRegistro>("falecimento");
  const [formandoId, setFormandoId] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [etapaNome, setEtapaNome] = useState(etapas[0] ?? "");
  const [autoridade, setAutoridade] = useState("");
  const [localFalecimento, setLocalFalecimento] = useState("");
  const [motivo, setMotivo] = useState("");
  const [retificaTermoId, setRetificaTermoId] = useState("");
  const [retificaDescricao, setRetificaDescricao] = useState("");

  const isRetificacao = tipo === "retificacao";

  async function submit() {
    if (isRetificacao) {
      if (!retificaTermoId || !retificaDescricao.trim()) {
        toast.error("Selecione o termo e descreva a correção.");
        return;
      }
    } else if (!formandoId) {
      toast.error("Selecione o membro.");
      return;
    }
    const ok = await api("/api/livro-registro/termos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        dataEvento: data,
        ...(isRetificacao
          ? { retificaTermoId, retificaDescricao }
          : { formandoId, etapaNome: tipo === "conclusao_etapa" ? etapaNome : undefined, autoridade, localFalecimento, motivo }),
      }),
    });
    if (ok) {
      toast.success("Termo lavrado.");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lavrar termo</DialogTitle>
          <DialogDescription>Termos manuais para eventos sem processo de origem. O texto segue fórmula canônica fixa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo de termo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo((v ?? "falecimento") as TipoTermoRegistro)}>
              <SelectTrigger>
                <SelectValue>{TIPO_TERMO_LABELS[tipo]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIPOS_TERMO_MANUAIS.map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_TERMO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isRetificacao ? (
            <>
              <div className="space-y-1.5">
                <Label>Termo a retificar</Label>
                <Select value={retificaTermoId} onValueChange={(v) => setRetificaTermoId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>
                      {retificaTermoId
                        ? (() => { const t = termosTomo.find((x) => x.id === retificaTermoId); return t ? `Termo nº ${num4(t.numero)} — ${TIPO_TERMO_LABELS[t.tipo]}` : "Selecione"; })()
                        : "Selecione o termo"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {termosTomo.filter((t) => t.tipo !== "retificacao").map((t) => (
                      <SelectItem key={t.id} value={t.id}>Termo nº {num4(t.numero)} — {TIPO_TERMO_LABELS[t.tipo]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição da correção</Label>
                <Textarea value={retificaDescricao} onChange={(e) => setRetificaDescricao(e.target.value)}
                  placeholder='ex.: no qual constou indevidamente "Lisboa/Portugal", para que conste corretamente "Porto/Portugal"' />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Membro</Label>
                <Select value={formandoId} onValueChange={(v) => setFormandoId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>
                      {formandoId ? (formandos.find((f) => f.id === formandoId)?.nome ?? "Selecione") : "Selecione o membro"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {formandos.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tipo === "conclusao_etapa" && (
                <div className="space-y-1.5">
                  <Label>Etapa concluída</Label>
                  <Select value={etapaNome} onValueChange={(v) => setEtapaNome(v ?? "")}>
                    <SelectTrigger><SelectValue>{etapaNome || "Selecione"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {etapas.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {tipo === "dispensa" && (
                <div className="space-y-1.5">
                  <Label>Autoridade competente</Label>
                  <Input value={autoridade} onChange={(e) => setAutoridade(e.target.value)} placeholder="ex.: Bispo Diocesano" />
                </div>
              )}
              {tipo === "falecimento" && (
                <div className="space-y-1.5">
                  <Label>Local do falecimento</Label>
                  <Input value={localFalecimento} onChange={(e) => setLocalFalecimento(e.target.value)} placeholder="ex.: Fortaleza/CE" />
                </div>
              )}
              {tipo === "licenca_termino" && (
                <div className="space-y-1.5">
                  <Label>Observação (opcional)</Label>
                  <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="motivo, se aplicável" />
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label>Data do ato</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>Lavrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
