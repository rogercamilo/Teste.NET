"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, HeartHandshake, PlaneTakeoff, Info, Loader2, Paperclip, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { PublicBranding } from "@/lib/public-branding";
import type { PortalAudiencia } from "@/lib/portal-routes";

const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export default function SolicitacoesClient({
  branding,
  audiencia,
  acompanhamentoPendente,
  licenca,
}: {
  branding: PublicBranding;
  audiencia: PortalAudiencia;
  acompanhamentoPendente: boolean;
  licenca: { motivo: string | null; solicitadoEm: string; temArquivo: boolean } | null;
}) {
  const router = useRouter();
  const communityName = branding.nomePlataforma ?? branding.nome;
  const portalLabel = audiencia === "vocacional" ? "Portal do Vocacionado" : "Portal do Formando";

  // ── Acompanhamento comunitário ──────────────────────────────────────────────
  const [acompSolicitado, setAcompSolicitado] = useState(acompanhamentoPendente);
  const [acompBusy, setAcompBusy] = useState(false);

  async function solicitarAcomp() {
    setAcompBusy(true);
    try {
      const res = await fetch("/api/portal/acompanhamento/solicitar", { method: "POST" });
      if (!res.ok) throw new Error();
      setAcompSolicitado(true);
    } catch {
      // silencioso — botão volta a ficar disponível
    } finally {
      setAcompBusy(false);
    }
  }

  async function cancelarAcomp() {
    setAcompBusy(true);
    try {
      const res = await fetch("/api/portal/acompanhamento/solicitar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAcompSolicitado(false);
    } catch {
      // silencioso
    } finally {
      setAcompBusy(false);
    }
  }

  // ── Licença ─────────────────────────────────────────────────────────────────
  const [licencaPendente, setLicencaPendente] = useState<{ motivo: string | null; solicitadoEm: string; temArquivo: boolean } | null>(licenca);
  const [motivo, setMotivo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [licencaBusy, setLicencaBusy] = useState(false);
  const [licencaErro, setLicencaErro] = useState<string | null>(null);

  const MAX_BYTES = 15 * 1024 * 1024;

  function onPickArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_BYTES) {
      setLicencaErro("Arquivo muito grande (máx. 15 MB).");
      e.target.value = "";
      return;
    }
    setLicencaErro(null);
    setArquivo(f);
  }

  function removerArquivo() {
    setArquivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function solicitarLicenca() {
    const m = motivo.trim();
    if (m.length < 10) {
      setLicencaErro("Descreva o motivo com ao menos 10 caracteres.");
      return;
    }
    setLicencaBusy(true);
    setLicencaErro(null);
    try {
      const fd = new FormData();
      fd.append("motivo", m);
      if (arquivo) fd.append("arquivo", arquivo);
      const res = await fetch("/api/portal/licenca/solicitar", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setLicencaErro(data?.error ?? "Não foi possível enviar. Tente novamente.");
        return;
      }
      setLicencaPendente({ motivo: m, solicitadoEm: new Date().toISOString(), temArquivo: !!arquivo });
      setMotivo("");
      removerArquivo();
    } catch {
      setLicencaErro("Falha de conexão. Tente novamente.");
    } finally {
      setLicencaBusy(false);
    }
  }

  async function cancelarLicenca() {
    setLicencaBusy(true);
    try {
      const res = await fetch("/api/portal/licenca/solicitar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLicencaPendente(null);
    } catch {
      // silencioso
    } finally {
      setLicencaBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header — mesmo padrão do dashboard/perfil */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={communityName} className="h-7 max-w-[120px] object-contain" />
            ) : (
              <img src="/brand/formatio-symbol.svg" alt="Formattio" width={28} height={28} />
            )}
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="truncate text-sm font-semibold text-foreground">{communityName}</span>
              <span className="truncate text-xs text-muted-foreground">{portalLabel}</span>
            </div>
          </div>
          <Link
            href="/portal/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Solicitações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui você pede um acompanhamento ou manifesta a intenção de uma licença. Cada pedido é
            enviado ao responsável pela sua formação, que conversa com você e dá o encaminhamento.
          </p>
        </div>

        {/* Nota de como funciona — honestidade sobre o papel do pedido (direito canônico) */}
        <div className="flex gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p>
            Estes são <span className="font-medium text-foreground">pedidos de diálogo</span>: a
            decisão e o registro oficial cabem ao responsável pela sua comunidade. Você será avisado
            pelo portal quando houver uma resposta.
          </p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* ── Acompanhamento comunitário ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-primary" />
              Solicitar acompanhamento comunitário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Peça um momento de escuta e acompanhamento com o seu formador — para partilhar como está
              a sua caminhada, tirar dúvidas ou pedir orientação.
            </p>
            {acompSolicitado ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Pedido enviado ao seu formador.
                </span>
                <button
                  type="button"
                  onClick={cancelarAcomp}
                  disabled={acompBusy}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-60"
                >
                  {acompBusy ? "Desmarcando…" : "Desmarcar pedido"}
                </button>
              </div>
            ) : (
              <Button onClick={solicitarAcomp} disabled={acompBusy} className="gap-1.5">
                {acompBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                Solicitar acompanhamento
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Licença ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlaneTakeoff className="h-4 w-4 text-primary" />
              Solicitar licença
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A licença é um <span className="font-medium text-foreground">afastamento temporário</span>{" "}
              da vida comunitária. Descreva abaixo o motivo do seu pedido: o responsável conversará com
              você e, após o devido discernimento, poderá abrir o processo de licença.
            </p>

            {licencaPendente ? (
              <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Pedido de licença enviado.
                </span>
                <p className="text-xs text-muted-foreground">
                  Enviado em {fmtData.format(new Date(licencaPendente.solicitadoEm))}
                  {licencaPendente.motivo ? ` · “${licencaPendente.motivo}”` : ""}
                </p>
                {licencaPendente.temArquivo && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" /> Documento anexado.
                  </p>
                )}
                <button
                  type="button"
                  onClick={cancelarLicenca}
                  disabled={licencaBusy}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-60"
                >
                  {licencaBusy ? "Desmarcando…" : "Desmarcar pedido"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="motivo-licenca" className="text-sm">
                  Motivo do pedido
                </Label>
                <Textarea
                  id="motivo-licenca"
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value.slice(0, 2000));
                    if (licencaErro) setLicencaErro(null);
                  }}
                  placeholder="Ex.: Preciso me afastar por alguns meses por motivos de saúde / estudo / trabalho…"
                  rows={4}
                  disabled={licencaBusy}
                />

                {/* Documento opcional que formaliza o pedido (ex.: carta assinada). */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Documento do pedido <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                    onChange={onPickArquivo}
                    disabled={licencaBusy}
                    className="hidden"
                    id="arquivo-licenca"
                  />
                  {arquivo ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                      <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{arquivo.name}</span>
                      <button
                        type="button"
                        onClick={removerArquivo}
                        disabled={licencaBusy}
                        aria-label="Remover arquivo"
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={licencaBusy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                      Anexar documento
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground">PDF ou imagem, até 15 MB.</p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">{motivo.length}/2000</span>
                  <Button onClick={solicitarLicenca} disabled={licencaBusy} className="gap-1.5">
                    {licencaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlaneTakeoff className="h-4 w-4" />}
                    Enviar pedido de licença
                  </Button>
                </div>
                {licencaErro && <p className="text-xs text-destructive">{licencaErro}</p>}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {communityName}
        </p>
      </main>
    </div>
  );
}
