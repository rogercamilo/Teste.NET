"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check, Sprout, Flag, Loader2, MessageSquareText, Heart, Pencil, Trash2, X,
  BookOpenText, ChevronDown, Target, Tag, MessagesSquare, HelpCircle, Footprints, Share2,
  CalendarClock,
} from "lucide-react";
import { MARCOS_TRAVESSIA, FRUTOS_POR_ACAO } from "@/types";
import type {
  PortalTravessia, TravessiaLivro, TravessiaPartilha, CapituloEvangelizacao, CapituloMaterial,
} from "@/lib/portal-data";
import { leituraTermos, type LeituraContexto } from "@/lib/leituras-termos";
import { MuralOptInToggle } from "./TravessiaMural";

interface MuralOptInControle {
  exibir: boolean;
  salvando: boolean;
  onToggle: () => void;
}

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
export function TravessiaCard({
  travessia,
  muralOptIn,
  contexto = "vocacional",
}: {
  travessia: PortalTravessia;
  muralOptIn?: MuralOptInControle | null;
  contexto?: LeituraContexto;
}) {
  const t = leituraTermos(contexto);
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

  // Evangelização POR CAPÍTULO (Instagram/YouTube) — estado otimista por capítulo,
  // semeado do servidor. Cada rede rende Frutos uma vez em cada capítulo.
  const [evangelizacoes, setEvangelizacoes] = useState<Map<string, CapituloEvangelizacao>>(
    () =>
      new Map(
        travessia.livros.flatMap((l) => l.capitulos.map((c) => [c.id, c.evangelizacao] as const))
      )
  );

  const totalCapitulos = travessia.totalCapitulos;
  const capitulosLidos = lidos.size;
  const fracao = totalCapitulos > 0 ? capitulosLidos / totalCapitulos : 0;
  const completo = totalCapitulos > 0 && capitulosLidos === totalCapitulos;
  // "100%" só quando TUDO foi lido — arredondar mostraria 100% em 199/200
  // (Math.round(99.5)), contradizendo o marco de conclusão.
  const percentualGeral = completo ? 100 : Math.min(99, Math.round(fracao * 100));
  // Frutos de evangelização: soma por capítulo das redes registradas (2/rede).
  let evangelizacaoFrutos = 0;
  for (const e of evangelizacoes.values()) {
    if (e.instagramFeito) evangelizacaoFrutos += FRUTOS_POR_ACAO.evangelizacao_instagram;
    if (e.youtubeFeito) evangelizacaoFrutos += FRUTOS_POR_ACAO.evangelizacao_youtube;
  }
  // Frutos = leitura (1/capítulo) + partilha (3/capítulo) + evangelização (2/rede/capítulo).
  const frutosTotal =
    capitulosLidos * FRUTOS_POR_ACAO.leitura +
    partilhas.size * FRUTOS_POR_ACAO.partilha +
    evangelizacaoFrutos;
  // Próximo marco ainda não atingido (para dar direção — "o que falta").
  const proximoMarco = MARCOS_TRAVESSIA.find((m) => !(totalCapitulos > 0 && fracao >= m.fracao));
  const capitulosParaProximo = proximoMarco
    ? Math.max(1, Math.ceil(proximoMarco.fracao * totalCapitulos) - capitulosLidos)
    : 0;

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

  // Registra a divulgação de um capítulo numa rede. Só atualiza o estado no
  // sucesso — o filho mostra o spinner enquanto aguarda e captura o erro.
  async function registrarEvangelizacao(
    capituloId: string,
    rede: "instagram" | "youtube",
    url: string | null
  ) {
    const res = await fetch(`/api/portal/travessia/capitulos/${capituloId}/evangelizacao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Link opcional (Instagram): só envia quando há algo.
      body: JSON.stringify(url ? { rede, url } : { rede }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "Falha ao registrar");
    }
    setEvangelizacoes((prev) => {
      const next = new Map(prev);
      const cur =
        next.get(capituloId) ??
        { instagramFeito: false, instagramUrl: null, youtubeFeito: false, youtubeUrl: null };
      const upd = { ...cur };
      if (rede === "instagram") {
        upd.instagramFeito = true;
        upd.instagramUrl = url;
      } else {
        upd.youtubeFeito = true;
        upd.youtubeUrl = url;
      }
      next.set(capituloId, upd);
      return next;
    });
  }

  async function removerEvangelizacao(capituloId: string, rede: "instagram" | "youtube") {
    const anterior = evangelizacoes.get(capituloId);
    // Otimista.
    setEvangelizacoes((prev) => {
      const next = new Map(prev);
      const cur = next.get(capituloId);
      if (!cur) return prev;
      const upd = { ...cur };
      if (rede === "instagram") {
        upd.instagramFeito = false;
        upd.instagramUrl = null;
      } else {
        upd.youtubeFeito = false;
        upd.youtubeUrl = null;
      }
      next.set(capituloId, upd);
      return next;
    });
    try {
      const res = await fetch(
        `/api/portal/travessia/capitulos/${capituloId}/evangelizacao?rede=${rede}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
    } catch {
      if (anterior) setEvangelizacoes((prev) => new Map(prev).set(capituloId, anterior));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-primary" />
          {t.cardTitulo}
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
                {frutosTotal === 1 ? t.frutoSingular : t.frutoPlural}
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

        {/* Marcos da leitura — barra de progresso + etapas rotuladas, com contexto
            do que cada uma significa e do que falta para a próxima. */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">Marcos da leitura</span>
            <span className="text-xs text-muted-foreground">
              {proximoMarco ? (
                <>
                  Faltam{" "}
                  <strong className="font-semibold text-primary">
                    {capitulosParaProximo} {capitulosParaProximo === 1 ? "capítulo" : "capítulos"}
                  </strong>{" "}
                  para “{MARCO_CURTO[proximoMarco.chave]}”
                </>
              ) : (
                <span className="font-medium text-primary">{t.concluido}</span>
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada etapa acende conforme você lê os capítulos dos livros da sua turma.
          </p>
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
              evangelizacoes={evangelizacoes}
              orgInstagram={travessia.orgInstagram}
              mostrarEvangelizacao={t.mostrarEvangelizacao}
              onToggle={toggle}
              onSalvarPartilha={salvarPartilha}
              onRemoverPartilha={removerPartilha}
              onRegistrarEvangelizacao={registrarEvangelizacao}
              onRemoverEvangelizacao={removerEvangelizacao}
            />
          ))}
        </div>

        {/* Controle do Mural — logo abaixo da trilha (o Mural em si fica no topo) */}
        {muralOptIn && (
          <MuralOptInToggle
            exibir={muralOptIn.exibir}
            salvando={muralOptIn.salvando}
            onToggle={muralOptIn.onToggle}
          />
        )}
      </CardContent>
    </Card>
  );
}

function LivroTrilha({
  livro,
  lidos,
  pendentes,
  partilhas,
  evangelizacoes,
  orgInstagram,
  mostrarEvangelizacao,
  onToggle,
  onSalvarPartilha,
  onRemoverPartilha,
  onRegistrarEvangelizacao,
  onRemoverEvangelizacao,
}: {
  livro: TravessiaLivro;
  lidos: Set<string>;
  pendentes: Set<string>;
  partilhas: Map<string, TravessiaPartilha>;
  evangelizacoes: Map<string, CapituloEvangelizacao>;
  orgInstagram: string | null;
  mostrarEvangelizacao: boolean;
  onToggle: (capituloId: string, estaLido: boolean) => void;
  onSalvarPartilha: (capituloId: string, texto: string) => Promise<void>;
  onRemoverPartilha: (capituloId: string) => void;
  onRegistrarEvangelizacao: (
    capituloId: string,
    rede: "instagram" | "youtube",
    url: string | null
  ) => Promise<void>;
  onRemoverEvangelizacao: (capituloId: string, rede: "instagram" | "youtube") => void;
}) {
  const lidosNoLivro = livro.capitulos.filter((c) => lidos.has(c.id)).length;
  const completoLivro = livro.totalCapitulos > 0 && lidosNoLivro === livro.totalCapitulos;

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* Capa do livro (retrato) como identificador visual. */}
          {livro.capaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={livro.capaUrl}
              alt={`Capa de ${livro.titulo}`}
              className="h-16 w-11 shrink-0 rounded border border-border object-cover shadow-sm"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{livro.titulo}</p>
            {livro.autor && <p className="truncate text-xs text-muted-foreground">{livro.autor}</p>}
          </div>
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
                {cap.metaConclusao && <MetaConclusao meta={cap.metaConclusao} lido={estaLido} />}
                {cap.material && <CapituloMaterialView material={cap.material} />}
                <CapituloPartilha
                  capituloId={cap.id}
                  partilha={partilhas.get(cap.id) ?? null}
                  onSalvar={onSalvarPartilha}
                  onRemover={onRemoverPartilha}
                />
                {mostrarEvangelizacao && (
                  <CapituloEvangelizacao
                    capituloId={cap.id}
                    evangelizacao={
                      evangelizacoes.get(cap.id) ?? {
                        instagramFeito: false,
                        instagramUrl: null,
                        youtubeFeito: false,
                        youtubeUrl: null,
                      }
                    }
                    orgInstagram={orgInstagram}
                    onRegistrar={onRegistrarEvangelizacao}
                    onRemover={onRemoverEvangelizacao}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Formata YYYY-MM-DD → "27 de jul. de 2026" (ancorado ao meio-dia, sem fuso). */
function formatarMetaData(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Data de hoje (fuso local do navegador) como YYYY-MM-DD, para comparar metas. */
function hojeIso(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

/**
 * Selo da meta de conclusão do capítulo (cadência definida pelo formador). Fica
 * discreto quando lido ou no prazo; vira alerta quando a data passou e o
 * capítulo ainda não foi lido.
 */
function MetaConclusao({ meta, lido }: { meta: string; lido: boolean }) {
  const atrasado = !lido && meta < hojeIso(); // comparação lexicográfica de YYYY-MM-DD
  return (
    <span
      className={
        "mt-1.5 flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] " +
        (atrasado ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground")
      }
    >
      <CalendarClock className="h-3 w-3" />
      Meta: {formatarMetaData(meta)}
      {atrasado ? " · atrasado" : ""}
    </span>
  );
}

// Campos do material formativo, na ordem de exibição, com ícone e rótulo. O
// campo é omitido quando vazio; `chips` renderiza palavras-chave como etiquetas.
const CAMPOS_MATERIAL: {
  chave: keyof CapituloMaterial;
  label: string;
  Icone: typeof Target;
  chips?: boolean;
  lista?: boolean;
}[] = [
  { chave: "objetivo", label: "Objetivo da leitura", Icone: Target },
  { chave: "palavrasChave", label: "Palavras-chave", Icone: Tag, chips: true },
  { chave: "comentarios", label: "Comentários formativos", Icone: MessagesSquare },
  { chave: "perguntas", label: "Perguntas", Icone: HelpCircle, lista: true },
  { chave: "acaoPratica", label: "Ação prática", Icone: Footprints },
  { chave: "partilha", label: "Partilha sobre a leitura", Icone: Share2 },
];

/**
 * Material formativo do capítulo (objetivo, perguntas, ação prática…), definido
 * pelo formador no cadastro do livro. Read-only e recolhível para não competir
 * com a marcação de leitura; só aparece quando há algum campo preenchido.
 */
function CapituloMaterialView({ material }: { material: CapituloMaterial }) {
  const [aberto, setAberto] = useState(false);
  const campos = CAMPOS_MATERIAL.filter(({ chave }) => material[chave]);
  if (campos.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="inline-flex items-center gap-1.5 rounded-md text-xs text-muted-foreground hover:text-primary"
      >
        <BookOpenText className="h-3.5 w-3.5" />
        Material da leitura
        <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (aberto ? "rotate-180" : "")} />
      </button>

      {aberto && (
        <div className="mt-2 grid gap-3 rounded-md border border-primary/15 bg-primary/5 px-3 py-2.5">
          {campos.map(({ chave, label, Icone, chips, lista }) => {
            const valor = material[chave] as string;
            return (
              <div key={chave} className="grid gap-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Icone className="h-3.5 w-3.5 text-primary" />
                  {label}
                </p>
                {chips ? (
                  <div className="flex flex-wrap gap-1.5">
                    {valor
                      .split(/[,\n]/)
                      .map((p) => p.trim())
                      .filter(Boolean)
                      .map((p, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-primary/30 bg-background px-2 py-0.5 text-[11px] text-foreground"
                        >
                          {p}
                        </span>
                      ))}
                  </div>
                ) : lista ? (
                  // Perguntas: uma por linha → lista numerada.
                  <ol className="ml-4 list-decimal space-y-0.5 text-sm text-muted-foreground marker:text-primary/70">
                    {valor
                      .split(/\r?\n/)
                      .map((q) => q.trim())
                      .filter(Boolean)
                      .map((q, i) => (
                        <li key={i} className="pl-1">{q}</li>
                      ))}
                  </ol>
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{valor}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
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
 * Evangelização de UM capítulo pelas redes (Instagram/YouTube). A prova flui da
 * rede social PARA o portal: o vocacionado registra que divulgou aquele capítulo
 * e, se quiser, cola o link (Instagram opcional; YouTube exige o link do vídeo).
 * Cada rede rende Frutos uma vez por capítulo (crédito na confiança — sem prova).
 * O @ da comunidade é reforçado pelo formador no dia a dia; aqui é só lembrete.
 */
function CapituloEvangelizacao({
  capituloId,
  evangelizacao,
  orgInstagram,
  onRegistrar,
  onRemover,
}: {
  capituloId: string;
  evangelizacao: CapituloEvangelizacao;
  orgInstagram: string | null;
  onRegistrar: (
    capituloId: string,
    rede: "instagram" | "youtube",
    url: string | null
  ) => Promise<void>;
  onRemover: (capituloId: string, rede: "instagram" | "youtube") => void;
}) {
  const [aberto, setAberto] = useState<null | "instagram" | "youtube">(null);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrir(rede: "instagram" | "youtube") {
    setRascunho("");
    setErro(null);
    setAberto((atual) => (atual === rede ? null : rede));
  }

  async function salvar() {
    if (!aberto || salvando) return;
    const url = rascunho.trim();
    // YouTube exige o link; Instagram é opcional.
    if (aberto === "youtube" && !url) {
      setErro("Cole o link do vídeo");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await onRegistrar(capituloId, aberto, url || null);
      setAberto(null);
      setRascunho("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao registrar");
    } finally {
      setSalvando(false);
    }
  }

  const igFeito = evangelizacao.instagramFeito;
  const ytFeito = evangelizacao.youtubeFeito;

  const pill =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors";
  const pillOcioso = "text-muted-foreground hover:border-primary/50 hover:text-primary";
  const pillAtivo = "border-primary/60 text-primary";

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {igFeito ? (
          <RedeFeitaChip
            rede="instagram"
            url={evangelizacao.instagramUrl}
            onRemover={() => onRemover(capituloId, "instagram")}
          />
        ) : (
          <button
            type="button"
            onClick={() => abrir("instagram")}
            aria-pressed={aberto === "instagram"}
            className={pill + " " + (aberto === "instagram" ? pillAtivo : pillOcioso)}
          >
            <InstagramIcon className="h-3 w-3" /> Instagram
          </button>
        )}

        {ytFeito ? (
          <RedeFeitaChip
            rede="youtube"
            url={evangelizacao.youtubeUrl}
            onRemover={() => onRemover(capituloId, "youtube")}
          />
        ) : (
          <button
            type="button"
            onClick={() => abrir("youtube")}
            aria-pressed={aberto === "youtube"}
            className={pill + " " + (aberto === "youtube" ? pillAtivo : pillOcioso)}
          >
            <YoutubeIcon className="h-3 w-3" /> YouTube
          </button>
        )}

        {(!igFeito || !ytFeito) && !aberto && (
          <span className="text-[11px] text-muted-foreground">
            · divulgue este capítulo (+2 Frutos por rede)
          </span>
        )}
      </div>

      {aberto && (
        <div className="mt-1.5">
          <input
            type="url"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            placeholder={
              aberto === "instagram"
                ? "https://instagram.com/p/… (opcional)"
                : "https://youtube.com/watch?v=…"
            }
            autoFocus
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {aberto === "instagram" ? (
              <>
                O link é opcional
                {orgInstagram ? ` — lembre de marcar @${orgInstagram} na postagem` : ""}.
              </>
            ) : (
              "Cole o link do vídeo sobre este capítulo."
            )}
          </p>
          {erro && <p className="mt-1 text-xs text-destructive">{erro}</p>}
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setAberto(null)}
              disabled={salvando}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Chip compacto de uma rede já registrada num capítulo: ícone + rótulo (link
 * quando informado) + selo de concluído + ação de remover.
 */
function RedeFeitaChip({
  rede,
  url,
  onRemover,
}: {
  rede: "instagram" | "youtube";
  url: string | null;
  onRemover: () => void;
}) {
  const label = rede === "instagram" ? "Instagram" : "YouTube";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5 text-xs text-primary">
      {rede === "instagram" ? (
        <InstagramIcon className="h-3 w-3" />
      ) : (
        <YoutubeIcon className="h-3 w-3" />
      )}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {label}
        </a>
      ) : (
        <span>{label}</span>
      )}
      <Check className="h-3 w-3" />
      <button
        type="button"
        onClick={onRemover}
        aria-label={`Remover registro no ${label}`}
        title="Remover"
        className="ml-0.5 text-primary/70 hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}