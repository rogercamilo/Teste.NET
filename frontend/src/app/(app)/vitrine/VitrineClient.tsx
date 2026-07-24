"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Palette, RotateCcw, Save, Stamp } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ITENS_VITRINE } from "@/lib/vitrine";
import { BLOCOS } from "@/lib/documentos-eclesiasticos/blocos";
import { useComunidade } from "@/lib/data-store";
import type { ComunidadeConfig } from "@/types";

/** Campos editáveis específicos dos documentos eclesiásticos. */
interface DocForm {
  termoPromessa: string;
  termoConsagracao: string;
  termoConsagrado: string;
  documentosTextos: Record<string, string>;
}

/** Um campo de vocabulário (rótulo limpo + exemplo curto; o padrão vive no placeholder). */
const TERMOS: {
  campo: "termoPromessa" | "termoConsagracao" | "termoConsagrado";
  label: string;
  padrao: string;
  exemplos: string;
}[] = [
  { campo: "termoPromessa", label: "Promessa", padrao: "Promessa", exemplos: "Voto, Aliança" },
  { campo: "termoConsagracao", label: "Ato de consagração", padrao: "Consagração", exemplos: "Aliança, Compromisso" },
  { campo: "termoConsagrado", label: "Pessoa consagrada", padrao: "Consagrado(a)", exemplos: "Membro, Aliançado(a)" },
];

export default function VitrineClient() {
  const [, setComunidade] = useComunidade();

  // Config COMPLETO da org (via GET) — base para salvar sem perder outros campos.
  // O contexto/layout não carrega documentosTextos nem os termos dos documentos,
  // então buscamos aqui os valores realmente salvos para popular o editor.
  const [base, setBase] = useState<ComunidadeConfig | null>(null);
  const [form, setForm] = useState<DocForm | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tipo, setTipo] = useState(ITENS_VITRINE[0].tipo);
  // Timestamp inicial evita servir uma prévia em cache (max-age=300) de antes da
  // última edição ao recarregar a página.
  const [previewNonce, setPreviewNonce] = useState(() => Date.now());

  const modelo = ITENS_VITRINE.find((i) => i.tipo === tipo) ?? ITENS_VITRINE[0];

  useEffect(() => {
    let active = true;
    fetch("/api/organizacao")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("falha"))))
      .then((cfg: ComunidadeConfig) => {
        if (!active) return;
        setBase(cfg);
        setForm({
          termoPromessa: cfg.termoPromessa ?? "",
          termoConsagracao: cfg.termoConsagracao ?? "",
          termoConsagrado: cfg.termoConsagrado ?? "",
          documentosTextos: { ...(cfg.documentosTextos ?? {}) },
        });
      })
      .catch(() => {
        if (active) toast.error("Não foi possível carregar os textos dos documentos.");
      });
    return () => {
      active = false;
    };
  }, []);

  // #toolbar=0 esconde a barra do leitor de PDF do Chrome — a prévia fica com cara
  // de documento, não de visualizador.
  const previewSrc = `/api/vitrine/${tipo}?v=${previewNonce}#toolbar=0&navpanes=0&statusbar=0&view=FitH`;

  function updTermo(campo: "termoPromessa" | "termoConsagracao" | "termoConsagrado", value: string) {
    setForm((prev) => (prev ? { ...prev, [campo]: value } : prev));
    setDirty(true);
  }

  function updBloco(id: string, value: string) {
    setForm((prev) => (prev ? { ...prev, documentosTextos: { ...prev.documentosTextos, [id]: value } } : prev));
    setDirty(true);
  }

  async function handleSave() {
    if (!base || !form) return;
    setSaving(true);
    try {
      // Envia o config COMPLETO (a rota usa `|| null` em descrição/endereço/…,
      // então um PUT parcial apagaria esses campos). Sobrescreve só os do documento.
      await setComunidade({
        ...base,
        termoPromessa: form.termoPromessa,
        termoConsagracao: form.termoConsagracao,
        termoConsagrado: form.termoConsagrado,
        documentosTextos: form.documentosTextos,
      });
      setBase((b) => (b ? { ...b, ...form } : b));
      setDirty(false);
      setPreviewNonce((n) => n + 1); // recarrega a prévia com os novos textos
      toast.success("Documentos atualizados! A prévia já reflete as mudanças.");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!base) return;
    setForm({
      termoPromessa: base.termoPromessa ?? "",
      termoConsagracao: base.termoConsagracao ?? "",
      termoConsagrado: base.termoConsagrado ?? "",
      documentosTextos: { ...(base.documentosTextos ?? {}) },
    });
    setDirty(false);
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Cabeçalho */}
      <header className="mb-8 max-w-2xl">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Stamp className="size-3.5" />
          Jornada Vocacional
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Documentos Eclesiásticos
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Dê às fórmulas e termos canônicos as palavras da sua comunidade e veja o resultado ao vivo.
          As alterações valem para <strong className="font-medium text-foreground">emissões futuras</strong>;
          documentos já assinados permanecem inalterados.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        {/* ── Editor ─────────────────────────────────────────────────── */}
        <div className="min-w-0">
          {!form ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-24 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando…
            </div>
          ) : (
            <div className="space-y-8">
              {/* Vocabulário */}
              <section>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Vocabulário</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Palavras usadas nos títulos e termos. Em branco = padrão.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {TERMOS.map(({ campo, label, padrao, exemplos }) => (
                    <div key={campo} className="min-w-0 space-y-1.5">
                      <Label htmlFor={campo} className="text-xs font-medium leading-tight text-foreground">
                        {label}
                      </Label>
                      <Input
                        id={campo}
                        value={form[campo]}
                        onChange={(e) => updTermo(campo, e.target.value)}
                        placeholder={padrao}
                        className="h-9 text-sm"
                      />
                      <p className="truncate text-[11px] text-muted-foreground" title={exemplos}>
                        {exemplos}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* Textos */}
              <section>
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-foreground">Textos</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Reescreva as fórmulas. As variáveis entre chaves são preenchidas na emissão.
                  </p>
                </div>
                <div className="space-y-6">
                  {BLOCOS.map((b) => (
                    <div key={b.id} className="space-y-2">
                      <div>
                        <Label htmlFor={b.id} className="text-sm font-medium text-foreground">
                          {b.label}
                        </Label>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{b.descricao}</p>
                      </div>
                      <Textarea
                        id={b.id}
                        value={form.documentosTextos[b.id] ?? ""}
                        onChange={(e) => updBloco(b.id, e.target.value)}
                        placeholder={b.padrao}
                        rows={b.tipo === "lista" ? 6 : 4}
                        className="resize-y text-sm leading-relaxed"
                      />
                      {b.variaveis.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {b.variaveis.map((v) => (
                            <code
                              key={v}
                              className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                            >
                              {v}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Identidade visual — vive em Configurações (logo/cor são globais do app) */}
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                <Palette className="mt-px size-3.5 shrink-0" />
                <span>
                  A logomarca e a cor no topo dos documentos são as da sua organização. Ajuste-as em{" "}
                  <a
                    href="/configuracoes?tab=comunidade"
                    className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                  >
                    Configurações
                  </a>
                  .
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Prévia ao vivo ─────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {/* Barra da prévia */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger className="h-9 w-full max-w-[280px] border-0 bg-transparent px-2 text-sm font-medium shadow-none focus:ring-0 focus-visible:ring-0">
                  <span className="truncate">{modelo.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {ITENS_VITRINE.map((item) => (
                    <SelectItem key={item.tipo} value={item.tipo} className="text-sm">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                  </span>
                  ao vivo
                </span>
                <a
                  href={`/api/vitrine/${tipo}?v=${previewNonce}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "ghost", size: "sm" }) + " h-8 gap-1.5 text-muted-foreground"}
                >
                  <ExternalLink className="size-3.5" />
                  <span className="hidden sm:inline">Abrir</span>
                </a>
              </div>
            </div>

            {/* Palco do documento */}
            <div className="bg-muted/40 p-4 sm:p-6">
              <div className="mx-auto max-w-[620px] overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black/5">
                <iframe
                  key={`${tipo}-${previewNonce}`}
                  src={previewSrc}
                  title={`Modelo: ${modelo.label}`}
                  className="h-[calc(100vh-15rem)] min-h-[520px] w-full"
                />
              </div>
            </div>
          </div>
          <p className="mt-2 px-1 text-xs leading-relaxed text-muted-foreground">
            Prévia com <strong className="font-medium text-foreground">dados fictícios</strong> e marca
            d&apos;água &ldquo;MODELO — SEM VALIDADE&rdquo; — já reflete o vocabulário, os textos e a
            identidade visual da sua comunidade.
          </p>
        </div>
      </div>

      {/* Barra de ações fixa — só quando há mudanças pendentes */}
      {dirty && form && (
        <div className="sticky bottom-4 z-10 mt-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <p className="text-sm text-muted-foreground">Você tem alterações não salvas.</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={saving} className="gap-1.5">
              <RotateCcw className="size-3.5" />
              Descartar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
