"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  LogOut,
  TrendingUp,
  History,
  Check,
  X,
  BookOpen,
  Paperclip,
  ChevronDown,
  Eye,
  Cake,
} from "lucide-react";
import Link from "next/link";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_FORMATIVO_ICONS,
  TIPO_FORMACAO_LABELS,
} from "@/types";
import type { PublicBranding } from "@/lib/public-branding";
import { portalHomeFor } from "@/lib/portal-routes";
import type {
  PortalDashboardData,
  PortalProximoEncontro,
  PortalMaterialItem,
  PortalTravessia,
  PortalAniversariante,
} from "@/lib/portal-data";
import { AdicionarAoCalendario } from "@/components/AdicionarAoCalendario";
import { PortalNotificacoesCard } from "./PortalNotificacoesCard";
import { TravessiaCard } from "./TravessiaCard";
import { MuralSection } from "./TravessiaMural";

function ProgressoBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});
const fmtHora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});
const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "long" });

function formatEncontro(iso: string): string {
  const d = new Date(iso);
  return `${fmtData.format(d)} · ${fmtHora.format(d)}`;
}

export default function DashboardClient({
  data,
  materiais,
  travessia,
  aniversariantes,
  branding,
}: {
  data: PortalDashboardData;
  materiais: PortalMaterialItem[];
  travessia: PortalTravessia | null;
  aniversariantes: PortalAniversariante[];
  branding: PublicBranding;
}) {
  const router = useRouter();
  const { formando, presenca, proximosEncontros, progresso, vocacional } = data;
  const [loggingOut, setLoggingOut] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [solicitado, setSolicitado] = useState(vocacional?.solicitacaoPendente ?? false);

  // Opt-in do Mural: estado ELEVADO aqui porque o controle vive junto da Missão
  // (na Travessia, embaixo) e o display vive no Mural (topo) — os dois reagem
  // juntos ao alternar. Otimista com reversão.
  const [muralExibir, setMuralExibir] = useState(travessia?.mural?.minhaExibicao ?? false);
  const [muralSalvando, setMuralSalvando] = useState(false);
  async function alternarMural() {
    if (muralSalvando) return;
    const novo = !muralExibir;
    setMuralExibir(novo);
    setMuralSalvando(true);
    try {
      const res = await fetch("/api/portal/travessia/mural", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: novo }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMuralExibir(!novo);
    } finally {
      setMuralSalvando(false);
    }
  }

  async function solicitarAcompanhamento() {
    setSolicitando(true);
    try {
      const res = await fetch("/api/portal/vocacional/solicitar-acompanhamento", { method: "POST" });
      if (!res.ok) throw new Error();
      setSolicitado(true);
    } catch {
      // silencioso — botão volta a ficar disponível
    } finally {
      setSolicitando(false);
    }
  }

  const communityName = branding.nomePlataforma ?? branding.nome;
  const primeiroNome = formando.nome.split(" ")[0];
  // Identidade do portal por público (dado vivo): rótulo e porta de retorno.
  const isVocacionado = !!vocacional;
  const portalLabel = isVocacionado ? "Portal do Vocacionado" : "Portal do Formando";
  const portalHome = portalHomeFor(isVocacionado ? "vocacional" : "formando");

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/portal/logout", { method: "POST" });
    } finally {
      router.push(portalHome);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={communityName}
                className="h-7 max-w-[120px] object-contain"
              />
            ) : (
              <img src="/brand/formatio-symbol.svg" alt="Formattio" width={28} height={28} />
            )}
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="truncate text-sm font-semibold text-foreground">
                {communityName}
              </span>
              <span className="truncate text-xs text-muted-foreground">{portalLabel}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Sair"
            className="gap-1.5 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        {/* Saudação */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Olá, {primeiroNome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="mr-1">{NIVEL_FORMATIVO_ICONS[formando.nivelFormativo]}</span>
            {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
            {formando.grupoFormacao && (
              <> · Grupo {formando.grupoFormacao.nome}</>
            )}
          </p>
        </div>

        {/* Faixa de status (cards compactos lado a lado, mesma altura no desktop) */}
        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Presença */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Minha presença
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-center gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold tabular-nums text-foreground">
                  {presenca.percentual}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {presenca.presentes} de {presenca.total}{" "}
                  {presenca.total === 1 ? "encontro" : "encontros"}
                </span>
              </div>
              <ProgressoBar value={presenca.presentes} max={presenca.total} />
            </CardContent>
          </Card>

          {/* Período Vocacional */}
          {vocacional && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Minha jornada vocacional
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {vocacional.status === "aguardando_carta"
                    ? "É hora de entregar sua carta de discernimento ao formador."
                    : vocacional.status === "em_discernimento"
                    ? "Sua carta está em discernimento pelas autoridades da comunidade."
                    : "Você está em período vocacional. Acompanhe sua agenda de encontros e retiros."}
                </p>
                {vocacional.acompanhamentoOferecido && (
                  <div className="mt-auto">
                    {solicitado ? (
                      <p className="inline-flex items-center gap-1.5 text-sm text-primary">
                        <CheckCircle2 className="h-4 w-4" /> Solicitação de acompanhamento enviada.
                      </p>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full" onClick={solicitarAcompanhamento} disabled={solicitando}>
                        {solicitando ? "Enviando…" : "Solicitar acompanhamento"}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progresso da etapa (formando; não se aplica ao período vocacional) */}
          {progresso && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Minha etapa
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-center gap-4">
                <ProgressoLinha
                  label="Formações comunitárias"
                  value={progresso.formacoesComunitariasRealizadas}
                  max={progresso.requisitos.formacoesComunitarias}
                />
                <ProgressoLinha
                  label="Retiros comunitários"
                  value={progresso.retirosComunitariosRealizados}
                  max={progresso.requisitos.retirosComunitarios}
                />
                <ProgressoLinha
                  label="Retiros pessoais"
                  value={progresso.retirosPessoaisRealizados}
                  max={progresso.requisitos.retirosPessoais}
                />
              </CardContent>
            </Card>
          )}

          {/* Notificações push — ativar/desativar neste aparelho */}
          <PortalNotificacoesCard />
        </div>

        {/* Faixa comunitária — o que vem aí + quem celebrar (sentido de família) */}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* Próximos encontros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Próximos encontros
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proximosEncontros.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Nenhum encontro agendado no momento.
                </p>
              ) : (
                <ul className="space-y-3">
                  {proximosEncontros.map((enc) => (
                    <ProximoEncontroItem key={enc.id} encontro={enc} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Aniversariantes do mês — sentido de família da turma */}
          <AniversariantesCard aniversariantes={aniversariantes} />
        </div>

        {/* Mural de Frutos da turma — informação geral coletiva, no topo */}
        {travessia?.mural && (
          <MuralSection
            muralInicial={travessia.mural}
            meusFrutos={travessia.frutosTotal}
            exibir={muralExibir}
          />
        )}

        {/* Trilha da Travessia (leitura) — herói, ocupa a largura toda. O controle
            "Aparecer no mural" é renderizado abaixo da Missão, dentro do card. */}
        {travessia && (
          <TravessiaCard
            travessia={travessia}
            muralOptIn={
              travessia.mural
                ? { exibir: muralExibir, salvando: muralSalvando, onToggle: alternarMural }
                : null
            }
          />
        )}

        {/* Materiais + Histórico lado a lado no desktop */}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* Materiais das formações já realizadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Materiais das formações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {materiais.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Os materiais das suas formações aparecem aqui a partir do dia de
                  cada encontro.
                </p>
              ) : (
                <ul className="space-y-2">
                  {materiais.map((m) => (
                    <MaterialItem key={m.agendamentoId} material={m} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {presenca.historico.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Ainda não há registros de presença nesta etapa.
                </p>
              ) : (
                <ul>
                  {presenca.historico.map((item) => (
                    <HistoricoItem key={item.id} item={item} />
                  ))}
                </ul>
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

/**
 * Aniversariantes do mês no grupo/turma — toque de comunidade ("família"). Lista
 * nome + dia (sem ano), com destaque para quem faz aniversário HOJE e para "você".
 */
function AniversariantesCard({ aniversariantes }: { aniversariantes: PortalAniversariante[] }) {
  const mes = fmtMes.format(new Date());
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-4 w-4 text-primary" />
          Aniversariantes de {mes}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aniversariantes.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Ninguém da sua turma faz aniversário neste mês.
          </p>
        ) : (
          <ul className="space-y-1">
            {aniversariantes.map((a, i) => (
              <li
                key={`${a.nome}-${a.dia}-${i}`}
                className={
                  "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 " +
                  (a.hoje ? "bg-primary/5" : "")
                }
              >
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  {a.hoje && <span className="shrink-0 text-base leading-none">🎉</span>}
                  <span className="truncate font-medium text-foreground">
                    {a.nome}
                    {a.ehVoce && <span className="text-xs font-normal text-muted-foreground"> · você</span>}
                  </span>
                </span>
                <span
                  className={
                    "shrink-0 text-xs tabular-nums " +
                    (a.hoje ? "font-semibold text-primary" : "text-muted-foreground")
                  }
                >
                  {a.hoje ? "hoje! 🎂" : `dia ${a.dia}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressoLinha({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <ProgressoBar value={value} max={max} />
    </div>
  );
}

function ProximoEncontroItem({ encontro }: { encontro: PortalProximoEncontro }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [justificando, setJustificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tipoLabel = encontro.tipoFormacao
    ? TIPO_FORMACAO_LABELS[encontro.tipoFormacao]
    : null;

  async function confirmar() {
    setBusy(true);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/presenca/${encontro.id}/confirmar`, {
        method: "POST",
      });
      if (!res.ok) {
        setErro("Não foi possível confirmar. Tente novamente.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {encontro.tema || tipoLabel || "Encontro"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatEncontro(encontro.dataInicio)}
            </span>
            {encontro.local && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {encontro.local}
              </span>
            )}
          </div>
        </div>
        {tipoLabel && encontro.tema && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {tipoLabel}
          </span>
        )}
      </div>

      <div className="flex">
        <AdicionarAoCalendario
          event={{
            id: encontro.id,
            title: encontro.tema || tipoLabel || "Encontro",
            start: encontro.dataInicio,
            end: encontro.dataFim,
            description: tipoLabel ?? undefined,
            location: encontro.local ?? undefined,
          }}
        />
      </div>

      {/* RSVP — só quando há registro de presença (podeResponder) */}
      {encontro.podeResponder && (
        <div className="border-t border-border/60 pt-2">
          {encontro.confirmacaoFormando === true ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Presença confirmada
              </span>
              <button
                type="button"
                onClick={() => setJustificando(true)}
                disabled={busy}
                className="text-xs text-muted-foreground hover:underline"
              >
                Não poderei ir
              </button>
            </div>
          ) : encontro.confirmacaoFormando === false ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <XCircle className="h-4 w-4" />
                Ausência avisada
              </span>
              <button
                type="button"
                onClick={confirmar}
                disabled={busy}
                className="text-xs text-primary hover:underline"
              >
                Confirmar presença
              </button>
            </div>
          ) : justificando ? null : (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={confirmar} disabled={busy} className="h-8 gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Confirmar presença
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setJustificando(true)}
                disabled={busy}
                className="h-8 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Não poderei ir
              </Button>
            </div>
          )}

          {justificando && (
            <JustificarInline
              agendamentoId={encontro.id}
              onDone={() => {
                setJustificando(false);
                router.refresh();
              }}
              onCancel={() => setJustificando(false)}
            />
          )}

          {erro && <p className="mt-1 text-xs text-destructive">{erro}</p>}
        </div>
      )}
    </li>
  );
}

function JustificarInline({
  agendamentoId,
  onDone,
  onCancel,
}: {
  agendamentoId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    const t = texto.trim();
    if (t.length < 3) {
      setErro("Escreva ao menos 3 caracteres.");
      return;
    }
    setBusy(true);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/presenca/${agendamentoId}/justificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa: t }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErro(data?.error ?? "Não foi possível enviar. Tente novamente.");
        return;
      }
      onDone();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, 500))}
        placeholder="Avise o motivo da ausência (será enviado ao seu formador)."
        rows={2}
        autoFocus
        disabled={busy}
      />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-[11px] text-muted-foreground">{texto.length}/500</span>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy} className="h-8">
          Cancelar
        </Button>
        <Button size="sm" onClick={enviar} disabled={busy} className="h-8">
          {busy ? "Enviando..." : "Enviar aviso"}
        </Button>
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}

function MaterialItem({ material }: { material: PortalMaterialItem }) {
  const [aberto, setAberto] = useState(false);
  const tipoLabel = material.tipoFormacao
    ? TIPO_FORMACAO_LABELS[material.tipoFormacao]
    : null;
  const d = new Date(material.data);

  return (
    <li className="rounded-lg border border-border/60">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {material.tema || tipoLabel || "Formação"}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>{fmtData.format(d)}</span>
            {tipoLabel && material.tema && <span>· {tipoLabel}</span>}
            {material.anexoNome && (
              <span className="flex items-center gap-1 text-primary">
                <Paperclip className="h-3 w-3" />
                Anexo
              </span>
            )}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            aberto ? "rotate-180" : ""
          }`}
        />
      </button>

      {aberto && (
        <div className="space-y-3 border-t border-border/60 p-3 text-sm">
          {!material.temMaterial ? (
            <p className="text-muted-foreground">
              Sem material disponível para esta formação.
            </p>
          ) : (
            <>
              {material.objetivo && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Objetivo
                  </p>
                  <p className="mt-0.5 text-foreground">{material.objetivo}</p>
                </div>
              )}
              {material.descricao && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Descrição
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-foreground">
                    {material.descricao}
                  </p>
                </div>
              )}
              {material.materialApoio && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Material de apoio
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-foreground">
                    {material.materialApoio}
                  </p>
                </div>
              )}
              {material.anexoNome && (
                <Link
                  href={`/portal/dashboard/material/${material.agendamentoId}?nome=${encodeURIComponent(material.anexoNome)}`}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="truncate">Visualizar material</span>
                </Link>
              )}
            </>
          )}
          {material.formadorNome && (
            <p className="text-xs text-muted-foreground">
              Formador: {material.formadorNome}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function HistoricoItem({
  item,
}: {
  item: PortalDashboardData["presenca"]["historico"][number];
}) {
  const tipoLabel = item.tipoFormacao ? TIPO_FORMACAO_LABELS[item.tipoFormacao] : null;
  const d = new Date(item.data);

  return (
    <li className="flex items-center justify-between gap-3 border-b border-border/50 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">
          {item.tema || tipoLabel || "Encontro"}
        </p>
        <p className="text-xs text-muted-foreground">
          {fmtData.format(d)}
          {tipoLabel && item.tema ? ` · ${tipoLabel}` : ""}
          {item.justificativaFormando ? " · Ausência avisada" : ""}
        </p>
      </div>
      {item.presente ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Presente
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <XCircle className="h-4 w-4" />
          {item.justificativa || item.justificativaFormando ? "Justificado" : "Ausente"}
        </span>
      )}
    </li>
  );
}
