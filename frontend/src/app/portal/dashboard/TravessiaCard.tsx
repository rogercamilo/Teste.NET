"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check, Sprout, Flag, Loader2, MessageSquareText, Heart, Pencil, Trash2, X,
  Share2, Megaphone, Download, Copy,
} from "lucide-react";
import { MARCOS_TRAVESSIA, FRUTOS_POR_ACAO } from "@/types";
import type {
  PortalTravessia, TravessiaLivro, TravessiaPartilha, TravessiaMissao,
} from "@/lib/portal-data";
import { gerarCardTravessia, legendaTravessia } from "./travessia-card-image";

// Glifos de marca (lucide removeu os ícones de Instagram/YouTube).
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  );
}

// Rótulos curtos das etapas da travessia (dão contexto aos marcos %).
const MARCO_CURTO: Record<string, string> = {
  um_quarto: "Primeiro quarto",
  metade: "Metade do caminho",
  tres_quartos: "Três quartos",
  completo: "Concluída",
};

/**
 * Trilha da Travessia — o vocacionado percorre os livros da sua turma marcando
 * capítulos lidos e, se quiser, partilhando uma reflexão sobre cada capítulo.
 * Cada estação acende no clay da marca; leitura e partilha rendem Frutos
 * (gamificação aditiva). Estado otimista local, no mesmo espírito do RSVP do
 * dashboard: o clique reflete na hora e reconcilia com o servidor por baixo.
 */
export function TravessiaCard({ travessia }: { travessia: PortalTravessia }) {
  // Fonte da verdade da UI: capítulos lidos (otimista).
  const [lidos, setLidos] = useState<Set<string>>(
    () => new Set(travessia.livros.flatMap((l) => l.capitulos.filter((c) => c.lido).map((c) => c.id)))
  );
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());
  // Partilhas por capítulo (otimista), semeadas do servidor.
  const [partilhas, setPartilhas] = useState<Map<string, TravessiaPartilha>>(
    () =>
      new Map(
        travessia.livros.flatMap((l) =>
          l.capitulos.filter((c) => c.partilha).map((c) => [c.id, c.partilha as TravessiaPartilha])
        )
      )
  );

  // Estado otimista da "Missão" (evangelização por rede).
  const [instagramFeito, setInstagramFeito] = useState(travessia.missao.instagramFeito);
  const [youtubeFeito, setYoutubeFeito] = useState(travessia.missao.youtubeFeito);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(travessia.missao.youtubeUrl);

  const totalCapitulos = travessia.totalCapitulos;
  const capitulosLidos = lidos.size;
  const fracao = totalCapitulos > 0 ? capitulosLidos / totalCapitulos : 0;
  const completo = totalCapitulos > 0 && capitulosLidos === totalCapitulos;
  // "100%" só quando TUDO foi lido — arredondar mostraria 100% em 199/200
  // (Math.round(99.5)), contradizendo o marco de conclusão.
  const percentualGeral = completo ? 100 : Math.min(99, Math.round(fracao * 100));
  // Frutos = leitura (1/capítulo) + partilha (3/capítulo) + evangelização (5/rede).
  const frutosTotal =
    capitulosLidos * FRUTOS_POR_ACAO.leitura +
    partilhas.size * FRUTOS_POR_ACAO.partilha +
    (instagramFeito ? FRUTOS_POR_ACAO.evangelizacao_instagram : 0) +
    (youtubeFeito ? FRUTOS_POR_ACAO.evangelizacao_youtube : 0);

  async function toggle(capituloId: string, estaLido: boolean) {
    if (pendentes.has(capituloId)) return;
    // Otimista: aplica já e marca pendente.
    setPendentes((p) => new Set(p).add(capituloId));
    setLidos((prev) => {
      const next = new Set(prev);
      if (estaLido) next.delete(capituloId);
      else next.add(capituloId);
      return next;
    });
    try {
      const res = await fetch(`/api/portal/travessia/capitulos/${capituloId}`, {
        method: estaLido ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error();
    } catch {
      // Reverte em caso de falha.
      setLidos((prev) => {
        const next = new Set(prev);
        if (estaLido) next.add(capituloId);
        else next.delete(capituloId);
        return next;
      });
    } finally {
      setPendentes((p) => {
        const next = new Set(p);
        next.delete(capituloId);
        return next;
      });
    }
  }

  // Salva (cria/edita) a partilha do capítulo. Reconciliamos pelo servidor: a
  // reação do formador vem de lá, então não a inventamos localmente.
  async function salvarPartilha(capituloId: string, texto: string) {
    const anterior = partilhas.get(capituloId) ?? null;
    const res = await fetch(`/api/portal/travessia/capitulos/${capituloId}/partilha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    if (!res.ok) throw new Error();
    // Edição preserva a reação existente; criação começa sem reação.
    setPartilhas((prev) => {
      const next = new Map(prev);
      next.set(capituloId, {
        texto,
        formadorCurtiu: anterior?.formadorCurtiu ?? false,
        formadorNota: anterior?.formadorNota ?? null,
      });
      return next;
    });
  }

  async function removerPartilha(capituloId: string) {
    const anterior = partilhas.get(capituloId);
    // Otimista.
    setPartilhas((prev) => {
      const next = new Map(prev);
      next.delete(capituloId);
      return next;
    });
    try {
      const res = await fetch(`/api/portal/travessia/capitulos/${capituloId}/partilha`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      if (anterior) {
        setPartilhas((prev) => new Map(prev).set(capituloId, anterior));
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-primary" />
          Minha Travessia literária
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Frutos + progresso geral */}
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Sprout className="h-6 w-6 text-primary" />
            <div className="leading-tight">
              <div className="text-2xl font-bold tabular-nums text-foreground">{frutosTotal}</div>
              <div className="text-xs text-muted-foreground">
                {frutosTotal === 1 ? "Fruto da Travessia" : "Frutos da Travessia"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium tabular-nums text-foreground">{percentualGeral}%</div>
            <div className="text-xs text-muted-foreground">
              {capitulosLidos} de {totalCapitulos}{" "}
              {totalCapitulos === 1 ? "capítulo" : "capítulos"}
            </div>
          </div>
        </div>

        {/* Marcos da travessia — barra de progresso + etapas rotuladas, para os
            números terem contexto (não ficarem soltos). */}
        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percentualGeral}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MARCOS_TRAVESSIA.map((m) => {
              const atingido = totalCapitulos > 0 && fracao >= m.fracao;
              return (
                <div
                  key={m.chave}
                  title={m.label}
                  className={
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors " +
                    (atingido ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30")
                  }
                >
                  <span
                    className={
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full " +
                      (atingido ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
                    }
                  >
                    {atingido ? <Check className="h-4 w-4" /> : <Flag className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <div
                      className={
                        "text-sm font-semibold tabular-nums " +
                        (atingido ? "text-foreground" : "text-muted-foreground")
                      }
                    >
                      {Math.round(m.fracao * 100)}%
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">{MARCO_CURTO[m.chave]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trilha por livro — largura toda (capítulos + comentários) */}
        <div className="space-y-6">
          {travessia.livros.map((livro) => (
            <LivroTrilha
              key={livro.id}
              livro={livro}
              lidos={lidos}
              pendentes={pendentes}
              partilhas={partilhas}
              onToggle={toggle}
              onSalvarPartilha={salvarPartilha}
              onRemoverPartilha={removerPartilha}
            />
          ))}
        </div>

        {/* Missão — abaixo da trilha, ocupando a largura toda */}
        <MissaoSection
          missao={travessia.missao}
          frutos={frutosTotal}
          capitulosLidos={capitulosLidos}
          totalCapitulos={totalCapitulos}
          instagramFeito={instagramFeito}
          youtubeFeito={youtubeFeito}
          youtubeUrl={youtubeUrl}
          onInstagram={setInstagramFeito}
          onYoutube={(feito, url) => {
            setYoutubeFeito(feito);
            setYoutubeUrl(url);
          }}
        />
      </CardContent>
    </Card>
  );
}

function LivroTrilha({
  livro,
  lidos,
  pendentes,
  partilhas,
  onToggle,
  onSalvarPartilha,
  onRemoverPartilha,
}: {
  livro: TravessiaLivro;
  lidos: Set<string>;
  pendentes: Set<string>;
  partilhas: Map<string, TravessiaPartilha>;
  onToggle: (capituloId: string, estaLido: boolean) => void;
  onSalvarPartilha: (capituloId: string, texto: string) => Promise<void>;
  onRemoverPartilha: (capituloId: string) => void;
}) {
  const lidosNoLivro = livro.capitulos.filter((c) => lidos.has(c.id)).length;
  const completoLivro = livro.totalCapitulos > 0 && lidosNoLivro === livro.totalCapitulos;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{livro.titulo}</p>
          {livro.autor && <p className="truncate text-xs text-muted-foreground">{livro.autor}</p>}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {lidosNoLivro}/{livro.totalCapitulos}
          {completoLivro ? " · concluído" : ""}
        </span>
      </div>

      {/* Estações verticais: círculo numerado + título; acende ao ler. */}
      <ol className="relative space-y-0">
        {livro.capitulos.map((cap, i) => {
          const estaLido = lidos.has(cap.id);
          const pendente = pendentes.has(cap.id);
          const ultimo = i === livro.capitulos.length - 1;
          return (
            <li key={cap.id} className="relative flex gap-3 pb-3 last:pb-0">
              {/* Linha conectora entre estações */}
              {!ultimo && (
                <span
                  aria-hidden
                  className={
                    "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 " +
                    (estaLido ? "bg-primary/40" : "bg-muted")
                  }
                />
              )}
              <button
                type="button"
                onClick={() => onToggle(cap.id, estaLido)}
                disabled={pendente}
                aria-pressed={estaLido}
                aria-label={`${estaLido ? "Desmarcar" : "Marcar como lido"}: capítulo ${cap.numero}`}
                className={
                  "relative z-10 flex h-8 w-8 shrink-0 cursor-pointer select-none items-center justify-center rounded-full border-2 text-xs font-semibold caret-transparent transition-colors disabled:cursor-default " +
                  (estaLido
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-card text-muted-foreground hover:border-primary/60")
                }
              >
                {pendente ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : estaLido ? (
                  <Check className="h-4 w-4" />
                ) : (
                  cap.numero
                )}
              </button>
              <div className="flex-1 pt-1.5">
                <button
                  type="button"
                  onClick={() => onToggle(cap.id, estaLido)}
                  disabled={pendente}
                  className="cursor-pointer select-none text-left text-sm caret-transparent disabled:cursor-default"
                >
                  <span className={estaLido ? "text-foreground" : "text-muted-foreground"}>
                    <span className="text-muted-foreground/70">Cap. {cap.numero} · </span>
                    {cap.titulo}
                  </span>
                </button>
                <CapituloPartilha
                  capituloId={cap.id}
                  partilha={partilhas.get(cap.id) ?? null}
                  onSalvar={onSalvarPartilha}
                  onRemover={onRemoverPartilha}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Partilha de um capítulo: mostra a reflexão já escrita (com a reação do
 * formador, se houver) ou um convite discreto para partilhar. Editar abre uma
 * caixa inline. A reação do formador é read-only aqui — vem de quem acompanha.
 */
function CapituloPartilha({
  capituloId,
  partilha,
  onSalvar,
  onRemover,
}: {
  capituloId: string;
  partilha: TravessiaPartilha | null;
  onSalvar: (capituloId: string, texto: string) => Promise<void>;
  onRemover: (capituloId: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);

  function abrir() {
    setRascunho(partilha?.texto ?? "");
    setEditando(true);
  }

  async function salvar() {
    const texto = rascunho.trim();
    if (!texto || salvando) return;
    setSalvando(true);
    try {
      await onSalvar(capituloId, texto);
      setEditando(false);
    } catch {
      // Mantém a caixa aberta para nova tentativa.
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <div className="mt-2">
        <textarea
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          maxLength={2000}
          rows={3}
          autoFocus
          placeholder="O que este capítulo tocou em você?"
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || !rascunho.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Salvar partilha
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            disabled={salvando}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (partilha) {
    return (
      <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
        <p className="whitespace-pre-wrap text-sm text-foreground">{partilha.texto}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={abrir}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onRemover(capituloId)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Remover
          </button>
        </div>
        {(partilha.formadorCurtiu || partilha.formadorNota) && (
          <div className="mt-2 border-t border-primary/15 pt-2">
            {partilha.formadorCurtiu && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Heart className="h-3.5 w-3.5 fill-current" />
                O formador curtiu sua partilha
              </p>
            )}
            {partilha.formadorNota && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Formador: </span>
                {partilha.formadorNota}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    // block-level (flex) para cair na linha ABAIXO do título do capítulo — como
    // inline-flex ficava colado ao título na mesma linha (o mt-1.5 não quebra o
    // fluxo inline). `w-fit` mantém a área de clique restrita ao texto do convite.
    <button
      type="button"
      onClick={abrir}
      className="mt-1.5 flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-primary"
    >
      <MessageSquareText className="h-3.5 w-3.5" />
      Partilhar reflexão
    </button>


);
}

/**
 * Missão: leva a Travessia para fora. O vocacionado compartilha sua leitura no
 * Instagram (card on-brand + share nativo, sugerindo o @ da comunidade) ou cola o
 * link de um vídeo no YouTube. Cada rede rende 5 Frutos uma vez (crédito na
 * confiança — o app não verifica a postagem).
 */
function MissaoSection({
  missao,
  frutos,
  capitulosLidos,
  totalCapitulos,
  instagramFeito,
  youtubeFeito,
  youtubeUrl,
  onInstagram,
  onYoutube,
}: {
  missao: TravessiaMissao;
  frutos: number;
  capitulosLidos: number;
  totalCapitulos: number;
  instagramFeito: boolean;
  youtubeFeito: boolean;
  youtubeUrl: string | null;
  onInstagram: (feito: boolean) => void;
  onYoutube: (feito: boolean, url: string | null) => void;
}) {
  const [compartilhando, setCompartilhando] = useState(false);
  const [fallback, setFallback] = useState<{ url: string; legenda: string } | null>(null);
  const [ytAberto, setYtAberto] = useState(false);
  const [ytRascunho, setYtRascunho] = useState("");
  const [ytSalvando, setYtSalvando] = useState(false);
  const [ytErro, setYtErro] = useState<string | null>(null);

  const dadosCard = {
    orgNome: missao.orgNome,
    instagramHandle: missao.orgInstagram,
    frutos,
    capitulosLidos,
    totalCapitulos,
  };

  async function registrarInstagram() {
    const res = await fetch("/api/portal/travessia/evangelizacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rede: "instagram" }),
    });
    if (res.ok) onInstagram(true);
  }

  async function compartilharInstagram() {
    if (compartilhando) return;
    setCompartilhando(true);
    try {
      const blob = await gerarCardTravessia(dadosCard);
      const legenda = legendaTravessia(dadosCard);
      if (!blob) throw new Error("card");
      const file = new File([blob], "minha-travessia.png", { type: "image/png" });

      // Caminho feliz: share nativo com o arquivo (mobile). Ao concluir, credita.
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], text: legenda });
        await registrarInstagram();
      } else {
        // Fallback (desktop): mostra o card para baixar + legenda para copiar.
        // Revoga um object URL anterior antes de trocar (evita vazamento).
        setFallback((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return { url: URL.createObjectURL(blob), legenda };
        });
      }
    } catch {
      // AbortError (usuário cancelou o share) cai aqui silenciosamente.
    } finally {
      setCompartilhando(false);
    }
  }

  async function removerInstagram() {
    onInstagram(false); // otimista
    try {
      const res = await fetch("/api/portal/travessia/evangelizacao?rede=instagram", { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      onInstagram(true); // reverte se o servidor recusou
    }
  }

  async function salvarYoutube() {
    const url = ytRascunho.trim();
    if (!url || ytSalvando) return;
    setYtSalvando(true);
    setYtErro(null);
    try {
      const res = await fetch("/api/portal/travessia/evangelizacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rede: "youtube", url }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha ao salvar");
      }
      onYoutube(true, url);
      setYtAberto(false);
      setYtRascunho("");
    } catch (e) {
      setYtErro(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setYtSalvando(false);
    }
  }

  async function removerYoutube() {
    const anterior = youtubeUrl;
    onYoutube(false, null); // otimista
    try {
      const res = await fetch("/api/portal/travessia/evangelizacao?rede=youtube", { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      onYoutube(true, anterior); // reverte se o servidor recusou
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Missão — leve sua Travessia adiante</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Compartilhe sua leitura e some <strong>5 Frutos</strong> por rede. Cada rede conta uma vez.
      </p>

      {/* Instagram + YouTube lado a lado (a Missão agora ocupa a largura toda) */}
      <div className="grid gap-3 md:grid-cols-2 md:items-start">
        {/* Instagram */}
        <div className="flex flex-wrap items-center gap-2.5 rounded-md border bg-card px-3 py-2.5">
          <InstagramIcon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Instagram</p>
            <p className="text-xs text-muted-foreground">
              {instagramFeito
                ? "Card compartilhado · +5 Frutos"
                : missao.orgInstagram
                  ? `Gere um card e marque @${missao.orgInstagram}`
                  : "Gere um card da sua Travessia"}
            </p>
          </div>
          {instagramFeito ? (
            <button
              type="button"
              onClick={removerInstagram}
              title="Desfazer"
              aria-label="Desfazer compartilhamento no Instagram"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Check className="h-3.5 w-3.5 text-primary" /> Feito
            </button>
          ) : (
            <button
              type="button"
              onClick={compartilharInstagram}
              disabled={compartilhando}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {compartilhando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
              Compartilhar
            </button>
          )}
        </div>

        {/* YouTube */}
        <div className="rounded-md border bg-card px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <YoutubeIcon className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">YouTube</p>
              <p className="text-xs text-muted-foreground">
                {youtubeFeito ? "Vídeo registrado · +5 Frutos" : "Cole o link de um vídeo sobre sua leitura"}
              </p>
            </div>
            {youtubeFeito ? (
              <button
                type="button"
                onClick={removerYoutube}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setYtAberto((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                <Share2 className="h-3.5 w-3.5" /> Registrar vídeo
              </button>
            )}
          </div>

          {youtubeFeito && youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block truncate text-xs text-primary underline underline-offset-2"
            >
              {youtubeUrl}
            </a>
          )}

          {ytAberto && !youtubeFeito && (
            <div className="mt-2.5">
              <input
                type="url"
                value={ytRascunho}
                onChange={(e) => setYtRascunho(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                autoFocus
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              {ytErro && <p className="mt-1 text-xs text-destructive">{ytErro}</p>}
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={salvarYoutube}
                  disabled={ytSalvando || !ytRascunho.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  {ytSalvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Salvar link
                </button>
                <button
                  type="button"
                  onClick={() => setYtAberto(false)}
                  disabled={ytSalvando}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fallback desktop: baixar card + copiar legenda (largura toda) */}
      {fallback && !instagramFeito && (
        <div className="space-y-2 rounded-md border border-primary/30 bg-card p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fallback.url} alt="Card da sua Travessia" className="mx-auto w-40 rounded-md" />
          <p className="text-xs text-muted-foreground">
            Baixe o card e publique no seu Instagram
            {missao.orgInstagram ? `, marcando @${missao.orgInstagram}` : ""}. Depois, confirme abaixo.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={fallback.url}
              download="minha-travessia.png"
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" /> Baixar card
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(fallback.legenda).catch(() => {})}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar legenda
            </button>
            <button
              type="button"
              onClick={async () => {
                await registrarInstagram();
                setFallback((prev) => {
                  if (prev) URL.revokeObjectURL(prev.url);
                  return null;
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              <Check className="h-3.5 w-3.5" /> Já compartilhei
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

