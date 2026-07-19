"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen, Plus, Pencil, Trash2, ChevronDown, ArrowUp, ArrowDown, ListPlus,
  ArrowLeft, ImagePlus, X, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { resolveImageSrc } from "@/lib/utils";
import { leituraTermos, type LeituraContexto } from "@/lib/leituras-termos";

// Proporção de capa de livro (retrato) — usada no recorte e na exibição.
const CAPA_ASPECT = 2 / 3;

export interface CapituloLeitura {
  id: string;
  numero: number;
  titulo: string;
  // Meta de conclusão da leitura do capítulo (YYYY-MM-DD) — cadência do livro.
  metaConclusao: string | null;
  // Material formativo opcional (definido no cadastro do livro).
  objetivo: string | null;
  palavrasChave: string | null;
  comentarios: string | null;
  perguntas: string | null;
  acaoPratica: string | null;
  partilha: string | null;
}

export interface Leitura {
  id: string;
  titulo: string;
  autor: string | null;
  // Capa: storageKey (R2/local) — resolvida para exibição com resolveImageSrc.
  capaUrl: string | null;
  ordem: number;
  ativo: boolean;
  capitulos: CapituloLeitura[];
}

// Campos de material formativo, na ordem de exibição. Um só lugar governa
// rótulos, dicas e tipo de entrada — reusado no editor e (por rótulo) no portal.
// "Perguntas" é do tipo LISTA: perguntas individuais (como os capítulos), mas
// persistidas na coluna `perguntas` como texto, uma por linha.
type CampoDef =
  | { tipo: "texto"; chave: CampoTexto; label: string; placeholder: string; rows: number }
  | { tipo: "lista"; chave: "perguntas"; label: string; placeholder: string };

type CampoTexto = "objetivo" | "palavrasChave" | "comentarios" | "acaoPratica" | "partilha";

const CAMPOS_FORMATIVOS: CampoDef[] = [
  { tipo: "texto", chave: "objetivo", label: "Objetivo da leitura", placeholder: "O que se espera que o capítulo desperte no leitor.", rows: 2 },
  { tipo: "texto", chave: "palavrasChave", label: "Palavras-chave", placeholder: "Ex.: humildade, verdade, silêncio", rows: 1 },
  { tipo: "texto", chave: "comentarios", label: "Comentários formativos", placeholder: "Notas do formador para iluminar a leitura.", rows: 3 },
  { tipo: "lista", chave: "perguntas", label: "Perguntas", placeholder: "Uma pergunta para reflexão" },
  { tipo: "texto", chave: "acaoPratica", label: "Ação prática", placeholder: "Um gesto concreto a viver a partir da leitura.", rows: 2 },
  { tipo: "texto", chave: "partilha", label: "Partilha sobre a leitura", placeholder: "Convite/roteiro para a partilha em grupo.", rows: 2 },
];

// Estado de edição de um capítulo: título + os campos de texto (nunca null no
// formulário) + as perguntas como lista individual + chave local para o React.
interface CapituloDraft {
  key: string;
  titulo: string;
  metaConclusao: string; // YYYY-MM-DD ou "" (input date)
  objetivo: string;
  palavrasChave: string;
  comentarios: string;
  perguntas: string[];
  acaoPratica: string;
  partilha: string;
}

// Perguntas são guardadas na coluna como texto (uma por linha); aqui viram lista
// e vice-versa. Linhas vazias são descartadas nas duas direções.
function perguntasParaLista(texto: string | null): string[] {
  return (texto ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}
function perguntasParaTexto(lista: string[]): string | null {
  const limpo = lista.map((p) => p.trim()).filter(Boolean);
  return limpo.length > 0 ? limpo.join("\n") : null;
}

let draftSeq = 0;
function novoDraft(titulo = ""): CapituloDraft {
  return {
    key: `d${draftSeq++}`,
    titulo,
    metaConclusao: "",
    objetivo: "", palavrasChave: "", comentarios: "",
    perguntas: [], acaoPratica: "", partilha: "",
  };
}

function draftDeCapitulo(c: CapituloLeitura): CapituloDraft {
  return {
    key: `d${draftSeq++}`,
    titulo: c.titulo,
    metaConclusao: c.metaConclusao ?? "",
    objetivo: c.objetivo ?? "",
    palavrasChave: c.palavrasChave ?? "",
    comentarios: c.comentarios ?? "",
    perguntas: perguntasParaLista(c.perguntas),
    acaoPratica: c.acaoPratica ?? "",
    partilha: c.partilha ?? "",
  };
}

// Payload de um capítulo (título + campos trimados, vazio → null). Serve tanto
// para o corpo da requisição quanto para detectar mudanças na edição.
function draftParaPayload(d: CapituloDraft) {
  const norm = (s: string) => s.trim() || null;
  return {
    titulo: d.titulo.trim(),
    metaConclusao: norm(d.metaConclusao),
    objetivo: norm(d.objetivo),
    palavrasChave: norm(d.palavrasChave),
    comentarios: norm(d.comentarios),
    perguntas: perguntasParaTexto(d.perguntas),
    acaoPratica: norm(d.acaoPratica),
    partilha: norm(d.partilha),
  };
}

/** Divide texto colado em títulos de capítulo (um por linha, sem vazias). */
function parseLinhas(texto: string): string[] {
  return texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/**
 * Gestão de leituras (livros + capítulos) de um grupo, reutilizada em dois
 * contextos: turma vocacional (Travessia) e grupo de formação. `apiBase` é a URL
 * base do recurso (já com o id do grupo/turma); `contexto` escolhe a
 * terminologia. A mecânica é idêntica — a leitura vive no grupo.
 */
export function LeiturasManager({
  apiBase, leituras, podeGerir, contexto,
}: {
  apiBase: string;
  leituras: Leitura[];
  podeGerir: boolean;
  contexto: LeituraContexto;
}) {
  const router = useRouter();
  const t = leituraTermos(contexto);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Leitura | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  function abrirNova() { setEditando(null); setFormOpen(true); }
  function abrirEdicao(l: Leitura) { setEditando(l); setFormOpen(true); }

  async function remover(l: Leitura) {
    if (!confirm(`Remover a leitura "${l.titulo}" e seus capítulos?`)) return;
    setRemovendo(l.id);
    try {
      const res = await fetch(`${apiBase}/${l.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "Falha"); }
      toast.success("Leitura removida.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setRemovendo(null); }
  }

  // Formulário INLINE: quando aberto, substitui a lista na própria aba (sem modal).
  if (formOpen) {
    return (
      <LeituraForm
        key={editando?.id ?? "nova"}
        apiBase={apiBase}
        leitura={editando}
        contexto={contexto}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); router.refresh(); }}
      />
    );
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold flex-1">{t.secaoTitulo}</h2>
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
            {t.vazioTexto}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {leituras.map((l) => (
            <Card key={l.id} className="border-0 shadow-sm">
              <CardContent className="flex flex-wrap items-center gap-3 py-3">
                <CapaMiniatura capaUrl={l.capaUrl} titulo={l.titulo} />
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
    </section>
  );
}

/** Miniatura da capa (retrato) na lista; placeholder quando não há capa. */
function CapaMiniatura({ capaUrl, titulo }: { capaUrl: string | null; titulo: string }) {
  const src = resolveImageSrc(capaUrl);
  return (
    <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md border bg-muted shadow-sm">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Capa de ${titulo}`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
          <BookOpen className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

function LeituraForm({
  apiBase, leitura, contexto, onClose, onSaved,
}: {
  apiBase: string;
  leitura: Leitura | null;
  contexto: LeituraContexto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const edicao = !!leitura;
  const [titulo, setTitulo] = useState(leitura?.titulo ?? "");
  const [autor, setAutor] = useState(leitura?.autor ?? "");
  const [capaUrl, setCapaUrl] = useState<string | null>(leitura?.capaUrl ?? null);
  const [cropOpen, setCropOpen] = useState(false);
  const [caps, setCaps] = useState<CapituloDraft[]>(() =>
    leitura && leitura.capitulos.length > 0
      ? leitura.capitulos.map(draftDeCapitulo)
      : [novoDraft()]
  );
  const [colarAberto, setColarAberto] = useState(false);
  const [colarTexto, setColarTexto] = useState("");
  const [busy, setBusy] = useState(false);

  // Retrato dos capítulos originais para detectar mudança na edição — evita
  // apagar/recriar as linhas (e regenerar IDs, o que zeraria o progresso de
  // leitura via cascade) quando o usuário só mexeu no título/autor do livro.
  const capitulosOriginais = leitura
    ? JSON.stringify(leitura.capitulos.map(draftDeCapitulo).map(draftParaPayload))
    : "";

  function patch(key: string, campo: CampoTexto | "titulo" | "metaConclusao", valor: string) {
    setCaps((prev) => prev.map((c) => (c.key === key ? { ...c, [campo]: valor } : c)));
  }
  function patchPerguntas(key: string, perguntas: string[]) {
    setCaps((prev) => prev.map((c) => (c.key === key ? { ...c, perguntas } : c)));
  }
  function adicionar() { setCaps((prev) => [...prev, novoDraft()]); }
  function remover(key: string) {
    setCaps((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.key !== key)));
  }
  function mover(key: string, dir: -1 | 1) {
    setCaps((prev) => {
      const i = prev.findIndex((c) => c.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function colarVarios() {
    const titulos = parseLinhas(colarTexto);
    if (titulos.length === 0) return;
    setCaps((prev) => {
      // Aproveita a primeira linha só de título se ainda estiver vazia.
      const base = prev.length === 1 && !prev[0].titulo.trim() && !temMaterial(prev[0]) ? [] : prev;
      return [...base, ...titulos.map((tt) => novoDraft(tt))];
    });
    setColarTexto("");
    setColarAberto(false);
  }

  const preenchidos = caps.filter((c) => c.titulo.trim() || temMaterial(c));

  async function salvar() {
    if (!titulo.trim()) return toast.error("Informe o título do livro.");
    if (preenchidos.length === 0) return toast.error("Informe ao menos um capítulo.");
    if (preenchidos.some((c) => !c.titulo.trim()))
      return toast.error("Todo capítulo precisa de um título.");

    setBusy(true);
    try {
      const url = edicao ? `${apiBase}/${leitura!.id}` : apiBase;
      const capitulosPayload = preenchidos.map(draftParaPayload);
      const capitulosMudaram = JSON.stringify(capitulosPayload) !== capitulosOriginais;
      const body: Record<string, unknown> = { titulo: titulo.trim(), autor: autor.trim() || null, capaUrl };
      if (!edicao || capitulosMudaram) body.capitulos = capitulosPayload;
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

  const capaPreview = resolveImageSrc(capaUrl);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={onClose} disabled={busy}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <h2 className="flex-1 text-sm font-semibold">{edicao ? "Editar leitura" : "Nova leitura"}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Cadastre os capítulos um a um. Além do título, cada capítulo pode ter
        material formativo (opcional) que aparece na estrutura do livro no
        portal do {contexto === "vocacional" ? "vocacionado" : "formando"}.
      </p>

      <div className="grid gap-4">
        <div className="flex flex-wrap gap-4 rounded-lg border bg-card p-4">
          {/* Capa do livro — retrato 2:3, identificador visual na app e no portal. */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-36 w-24 overflow-hidden rounded-lg border bg-card">
              {capaPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capaPreview} alt="Capa do livro" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                  <BookOpen className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setCropOpen(true)}>
                <ImagePlus className="h-3.5 w-3.5" /> {capaUrl ? "Trocar" : "Capa"}
              </Button>
              {capaUrl && (
                <Button
                  type="button" variant="ghost" size="icon-sm" aria-label="Remover capa"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setCapaUrl(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid flex-1 content-start gap-3 min-w-[12rem]">
            <div className="grid gap-1.5">
              <Label>Título do livro *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: A Imitação de Cristo" maxLength={200} />
            </div>
            <div className="grid gap-1.5">
              <Label>Autor (opcional)</Label>
              <Input value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Ex.: Tomás de Kempis" maxLength={120} />
            </div>
          </div>
        </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <Label>Capítulos</Label>
              <span className="text-[11px] text-muted-foreground">
                {preenchidos.length} {preenchidos.length === 1 ? "capítulo" : "capítulos"}
              </span>
            </div>

            <div className="grid gap-2">
              {caps.map((c, i) => (
                <CapituloEditor
                  key={c.key}
                  cap={c}
                  numero={i + 1}
                  primeiro={i === 0}
                  ultimo={i === caps.length - 1}
                  podeRemover={caps.length > 1}
                  onCampo={(campo, valor) => patch(c.key, campo, valor)}
                  onPerguntas={(perguntas) => patchPerguntas(c.key, perguntas)}
                  onRemover={() => remover(c.key)}
                  onMover={(dir) => mover(c.key, dir)}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={adicionar}>
                <Plus className="h-4 w-4" /> Adicionar capítulo
              </Button>
              <Button
                type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                onClick={() => setColarAberto((v) => !v)}
              >
                <ListPlus className="h-4 w-4" /> Colar vários títulos
              </Button>
            </div>

            {colarAberto && (
              <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Um título por linha. Serão acrescentados como novos capítulos (o
                  material formativo você preenche depois, se quiser).
                </p>
                <Textarea
                  rows={5}
                  value={colarTexto}
                  onChange={(e) => setColarTexto(e.target.value)}
                  placeholder={"1. O menosprezo das vaidades\n2. Humilde sentir de si\n3. A doutrina da verdade"}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setColarAberto(false); setColarTexto(""); }}>
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={colarVarios} disabled={parseLinhas(colarTexto).length === 0}>
                    Acrescentar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button size="sm" onClick={salvar} disabled={busy}>
            {busy ? "Salvando…" : edicao ? "Salvar" : "Cadastrar"}
          </Button>
        </div>

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        title="Capa do livro"
        aspect={CAPA_ASPECT}
        outputWidth={400}
        outputHeight={600}
        uploadEndpoint="/api/imagens"
        hasImage={!!capaUrl}
        onSave={(key) => setCapaUrl(key)}
        onRemove={() => setCapaUrl(null)}
      />
    </section>
  );
}

/** Quantos campos de material formativo estão preenchidos neste capítulo. */
function contarMaterial(c: CapituloDraft): number {
  return CAMPOS_FORMATIVOS.filter((campo) =>
    campo.tipo === "lista"
      ? c.perguntas.some((p) => p.trim() !== "")
      : c[campo.chave].trim() !== ""
  ).length;
}

/** Um capítulo tem material formativo se algum campo está preenchido. */
function temMaterial(c: CapituloDraft): boolean {
  return contarMaterial(c) > 0;
}

function CapituloEditor({
  cap, numero, primeiro, ultimo, podeRemover, onCampo, onPerguntas, onRemover, onMover,
}: {
  cap: CapituloDraft;
  numero: number;
  primeiro: boolean;
  ultimo: boolean;
  podeRemover: boolean;
  onCampo: (campo: CampoTexto | "titulo" | "metaConclusao", valor: string) => void;
  onPerguntas: (perguntas: string[]) => void;
  onRemover: () => void;
  onMover: (dir: -1 | 1) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const preenchidos = contarMaterial(cap);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 p-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
          {numero}
        </span>
        <Input
          value={cap.titulo}
          onChange={(e) => onCampo("titulo", e.target.value)}
          placeholder="Título do capítulo"
          maxLength={200}
          className="flex-1"
        />
        <div className="flex items-center">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Mover para cima" disabled={primeiro} onClick={() => onMover(-1)}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Mover para baixo" disabled={ultimo} onClick={() => onMover(1)}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button" variant="ghost" size="icon-sm" aria-label="Remover capítulo"
            className="text-destructive hover:text-destructive"
            disabled={!podeRemover} onClick={onRemover}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Meta de conclusão — cadência da leitura definida pelo formador. */}
      <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
        <Label className="text-xs text-muted-foreground">Meta de conclusão</Label>
        <Input
          type="date"
          value={cap.metaConclusao}
          onChange={(e) => onCampo("metaConclusao", e.target.value)}
          className="h-8 w-auto text-sm"
          aria-label={`Meta de conclusão do capítulo ${numero}`}
        />
        {cap.metaConclusao && (
          <Button
            type="button" variant="ghost" size="icon-sm" aria-label="Limpar meta"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onCampo("metaConclusao", "")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 pb-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (expandido ? "rotate-180" : "")} />
        Material formativo (opcional)
        {preenchidos > 0 && (
          <Badge variant="secondary" className="ml-1 text-[10px]">{preenchidos}</Badge>
        )}
      </button>

      {expandido && (
        <div className="grid gap-3 border-t px-3 py-3">
          {CAMPOS_FORMATIVOS.map((campo) => (
            <div key={campo.chave} className="grid gap-1.5">
              <Label className="text-xs">{campo.label}</Label>
              {campo.tipo === "lista" ? (
                <PerguntasEditor
                  perguntas={cap.perguntas}
                  placeholder={campo.placeholder}
                  onChange={onPerguntas}
                />
              ) : (
                <Textarea
                  rows={campo.rows}
                  value={cap[campo.chave]}
                  onChange={(e) => onCampo(campo.chave, e.target.value)}
                  placeholder={campo.placeholder}
                  className="text-sm"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Editor de perguntas individuais de um capítulo — cada pergunta é um campo
 * próprio (como os capítulos), com adicionar/remover. A ordem é a de digitação.
 */
function PerguntasEditor({
  perguntas, placeholder, onChange,
}: {
  perguntas: string[];
  placeholder: string;
  onChange: (perguntas: string[]) => void;
}) {
  function definir(i: number, valor: string) {
    onChange(perguntas.map((p, idx) => (idx === i ? valor : p)));
  }
  function remover(i: number) {
    onChange(perguntas.filter((_, idx) => idx !== i));
  }
  function adicionar() {
    onChange([...perguntas, ""]);
  }

  return (
    <div className="grid gap-1.5">
      {perguntas.map((p, i) => (
        // Índice como key: a lista é curta e editada em posição; o valor vem do
        // estado do pai, então não há perda de conteúdo ao remover.
        <div key={i} className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
          <Input
            value={p}
            onChange={(e) => definir(i, e.target.value)}
            placeholder={placeholder}
            maxLength={500}
            className="flex-1"
          />
          <Button
            type="button" variant="ghost" size="icon-sm" aria-label="Remover pergunta"
            className="text-destructive hover:text-destructive"
            onClick={() => remover(i)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="justify-self-start gap-1.5" onClick={adicionar}>
        <Plus className="h-4 w-4" /> Adicionar pergunta
      </Button>
    </div>
  );
}
