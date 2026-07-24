"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Palette, RotateCcw, Save, Stamp } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ITENS_VITRINE, type ItemVitrine } from "@/lib/vitrine";
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

export default function VitrineClient() {
  const [, setComunidade] = useComunidade();

  // Config COMPLETO da org (via GET) — base para salvar sem perder outros campos.
  // O contexto/layout não carrega documentosTextos nem os termos dos documentos,
  // então buscamos aqui os valores realmente salvos para popular o editor.
  const [base, setBase] = useState<ComunidadeConfig | null>(null);
  const [form, setForm] = useState<DocForm | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selecionado, setSelecionado] = useState<ItemVitrine>(ITENS_VITRINE[0]);
  // Timestamp inicial evita servir uma prévia em cache (max-age=300) de antes da
  // última edição ao recarregar a página.
  const [previewNonce, setPreviewNonce] = useState(() => Date.now());

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

  const previewSrc = `/api/vitrine/${selecionado.tipo}?v=${previewNonce}`;

  function updTermo(field: "termoPromessa" | "termoConsagracao" | "termoConsagrado", value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Stamp className="size-4" />
          Jornada Vocacional
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Documentos Eclesiásticos</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Personalize o vocabulário e os textos dos documentos canônicos da Jornada com as palavras da sua
          comunidade e veja o resultado ao vivo. As alterações valem apenas para{" "}
          <strong>emissões futuras</strong> — documentos já assinados ou arquivados permanecem inalterados.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Editor */}
        <div className="flex flex-col gap-5">
          {!form ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando textos dos documentos…
            </div>
          ) : (
            <>
              {/* Vocabulário */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold">Vocabulário dos documentos</CardTitle>
                  <CardDescription className="text-xs">
                    Palavras da sua comunidade usadas nos termos e títulos. Deixe em branco para o padrão.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3 pb-6">
                  <div className="grid gap-1.5">
                    <Label>
                      Promessa{" "}
                      <span className="text-xs font-normal text-muted-foreground">(padrão: &ldquo;Promessa&rdquo;)</span>
                    </Label>
                    <Input
                      value={form.termoPromessa}
                      onChange={(e) => updTermo("termoPromessa", e.target.value)}
                      placeholder="Promessa"
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Ex.: Promessa, Voto, Aliança.</p>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>
                      Ato de consagração{" "}
                      <span className="text-xs font-normal text-muted-foreground">(padrão: &ldquo;Consagração&rdquo;)</span>
                    </Label>
                    <Input
                      value={form.termoConsagracao}
                      onChange={(e) => updTermo("termoConsagracao", e.target.value)}
                      placeholder="Consagração"
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Ex.: Consagração, Aliança, Compromisso.</p>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>
                      Pessoa consagrada{" "}
                      <span className="text-xs font-normal text-muted-foreground">(padrão: &ldquo;Consagrado(a)&rdquo;)</span>
                    </Label>
                    <Input
                      value={form.termoConsagrado}
                      onChange={(e) => updTermo("termoConsagrado", e.target.value)}
                      placeholder="Consagrado(a)"
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Ex.: Consagrado(a), Membro, Aliançado(a).</p>
                  </div>
                </CardContent>
              </Card>

              {/* Textos */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold">Textos dos documentos</CardTitle>
                  <CardDescription className="text-xs">
                    Reescreva as fórmulas e textos com as palavras da sua comunidade. Use as variáveis entre
                    chaves — elas são substituídas automaticamente na emissão.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pb-6">
                  {BLOCOS.map((b) => (
                    <div key={b.id} className="grid gap-1.5">
                      <Label>{b.label}</Label>
                      <p className="-mt-0.5 text-xs text-muted-foreground">{b.descricao}</p>
                      <Textarea
                        value={form.documentosTextos[b.id] ?? ""}
                        onChange={(e) => updBloco(b.id, e.target.value)}
                        placeholder={b.padrao}
                        rows={b.tipo === "lista" ? 6 : 4}
                        className="text-sm"
                      />
                      {b.variaveis.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Variáveis:</span>
                          {b.variaveis.map((v) => (
                            <code
                              key={v}
                              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                            >
                              {v}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Identidade visual — vive em Configurações (logo/cor são globais do app) */}
              <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Palette className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  A logomarca e a cor que aparecem no cabeçalho destes documentos são as da sua organização.
                  Ajuste-as em{" "}
                  <a
                    href="/configuracoes?tab=comunidade"
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    Configurações → Comunidade
                  </a>
                  .
                </span>
              </p>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border/60 bg-background/80 py-3 backdrop-blur">
                {dirty && (
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={saving} className="gap-1.5">
                    <RotateCcw className="size-3.5" />
                    Descartar
                  </Button>
                )}
                <Button size="sm" onClick={handleSave} disabled={!dirty || saving} className="gap-1.5">
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Salvar alterações
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Prévia ao vivo */}
        <div className="flex flex-col gap-3 self-start lg:sticky lg:top-6">
          <div className="flex flex-wrap gap-1.5">
            {ITENS_VITRINE.map((item) => {
              const ativo = item.tipo === selecionado.tipo;
              return (
                <button
                  key={item.tipo}
                  type="button"
                  onClick={() => setSelecionado(item)}
                  aria-pressed={ativo}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    ativo
                      ? "border-primary/40 bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{selecionado.label}</h2>
              <p className="text-xs text-muted-foreground">Pré-visualização ao vivo</p>
            </div>
            <a
              href={previewSrc}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="size-3.5" />
              Abrir em nova aba
            </a>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
            <iframe
              key={`${selecionado.tipo}-${previewNonce}`}
              src={previewSrc}
              title={`Modelo: ${selecionado.label}`}
              className="h-[70vh] min-h-[480px] w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A prévia usa <strong>dados fictícios</strong> e a marca d&apos;água{" "}
            <strong>&ldquo;MODELO — SEM VALIDADE&rdquo;</strong>, mas já reflete o vocabulário, os textos e a
            identidade visual da sua comunidade.
          </p>
        </div>
      </div>
    </div>
  );
}
