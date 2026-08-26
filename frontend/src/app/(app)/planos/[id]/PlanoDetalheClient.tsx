"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTermos } from "@/lib/data-store";
import type { PlanoFormativo } from "@/types";
import {
  STATUS_PLANO_LABELS,
  STATUS_PLANO_STYLES,
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  Info,
  Paperclip,
  Pencil,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";


export default function PlanoDetalheClient({
  plano,
  isAdmin,
}: {
  plano: PlanoFormativo;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { formador: termoFormador, formando: termoFormando } = useTermos();
  const id = plano.id;
  const [deleteOpen, setDeleteOpen] = useState(false);

  const retirosComunitarios = (plano.retiros ?? []).filter((r) => r.tipo === "comunitario");
  const retirosPessoais = (plano.retiros ?? []).filter((r) => r.tipo === "pessoal");
  const chEixos = plano.eixos.reduce((s, e) => s + e.cargaHoraria, 0);
  const chRetirosC = retirosComunitarios.reduce((s, r) => s + r.cargaHoraria, 0);
  const chRetirosP = retirosPessoais.reduce((s, r) => s + r.cargaHoraria, 0);
  const chTotal = chEixos + chRetirosC + chRetirosP;

  async function handleDelete() {
    if (plano.documentoAnexoId) {
      fetch(`/api/arquivos/${plano.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
    }
    const res = await fetch(`/api/planos/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro ao excluir plano. Tente novamente."); return; }
    toast.success("Plano excluído.");
    router.replace("/planos");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/planos")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{plano.nome}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className={`text-xs ${NIVEL_CORES[plano.nivelFormativo]}`}>
                  {NIVEL_FORMATIVO_LABELS[plano.nivelFormativo]}
                </Badge>
                <Badge variant="outline" className={`text-xs ${STATUS_PLANO_STYLES[plano.status]}`}>
                  {STATUS_PLANO_LABELS[plano.status]}
                </Badge>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => router.push(`/planos/${id}/editar`)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Excluir
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={<Calendar className="h-3.5 w-3.5" />} label="Cadastrado em">
            {format(parseISO(plano.criadoEm.split("T")[0]), "dd/MM/yyyy", { locale: ptBR })}
          </Stat>
          {chTotal > 0 && (
            <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Carga horária total">
              {chTotal}h
            </Stat>
          )}
          {plano.eixos.length > 0 && (
            <Stat icon={<BookOpen className="h-3.5 w-3.5" />} label="Encontros semanais">
              {plano.eixos.length} eixo{plano.eixos.length !== 1 ? "s" : ""} · {chEixos}h
            </Stat>
          )}
          {(retirosComunitarios.length > 0 || retirosPessoais.length > 0) && (
            <Stat icon={<Calendar className="h-3.5 w-3.5" />} label="Retiros previstos">
              {retirosComunitarios.length} com. · {retirosPessoais.length} pes.
            </Stat>
          )}
        </div>

        {plano.objetivos && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objetivos</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{plano.objetivos}</p>
          </div>
        )}
        {plano.fundamentacao && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fundamentação</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{plano.fundamentacao}</p>
          </div>
        )}

        {plano.documentoAnexo && plano.documentoAnexoId && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate">{plano.documentoAnexo}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 ml-2 h-7 text-xs gap-1 text-primary"
              onClick={() =>
                router.push(
                  `/viewer?arquivoId=${plano.documentoAnexoId}&nome=${encodeURIComponent(plano.documentoAnexo!)}&origem=/planos/${id}`
                )
              }
            >
              <Eye className="h-3 w-3" />
              Ver documento
            </Button>
          </div>
        )}
      </div>

      {/* ── Nota: objetivo e ganho da estrutura para o formador ─────────── */}
      <div className="flex gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Por que estruturar o plano formativo?
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Esta tela reúne toda a caminhada de uma etapa num só lugar — encontros
            semanais, retiros comunitários e retiros pessoais. Para o {termoFormador.toLowerCase()}, isso
            significa clareza sobre o que trabalhar e quando, continuidade quando muda
            quem conduz a formação (o plano não se perde ao trocar o {termoFormador.toLowerCase()}) e
            materiais de direcionamento sempre à mão. Menos improviso, mais
            intencionalidade na formação da comunidade.
          </p>
        </div>
      </div>

      {/* ── Seção 1: Encontros Semanais ─────────────────────────────────── */}
      {plano.eixos.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h2 className="text-sm font-semibold text-foreground">
              1. Plano Formativo — Encontros Semanais
            </h2>
            {chEixos > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Carga horária: <span className="font-medium">{chEixos}h</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground/90 mt-1.5 leading-relaxed">
              Define os eixos e a progressão dos encontros ao longo da etapa. O ganho
              para o {termoFormador.toLowerCase()}: um roteiro claro de temas e carga horária, que evita
              lacunas ou repetições e garante que cada área da formação seja contemplada.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-primary/8 border-b border-border/60">
                  <Th>Eixo Formativo</Th>
                  <Th>Etapa</Th>
                  <Th className="w-[35%]">Objetivo</Th>
                  <Th>Intervalo de Encontros</Th>
                  <Th className="text-center">CH</Th>
                  <Th>Área de Formação</Th>
                </tr>
              </thead>
              <tbody>
                {plano.eixos.map((eixo, idx) => (
                  <tr
                    key={eixo.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <Td className="font-medium">{eixo.nome || "—"}</Td>
                    <Td>
                      {eixo.nomeEtapa ? (
                        <span className="font-semibold text-primary">{eixo.nomeEtapa}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className="leading-relaxed text-muted-foreground">{eixo.objetivo || "—"}</Td>
                    <Td>{eixo.intervaloEncontros || "—"}</Td>
                    <Td className="text-center font-medium">{eixo.cargaHoraria > 0 ? `${eixo.cargaHoraria}h` : "—"}</Td>
                    <Td>
                      {eixo.areaFormacao ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                          {eixo.areaFormacao}
                        </span>
                      ) : "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Seção 2: Retiros Comunitários ───────────────────────────────── */}
      {retirosComunitarios.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h2 className="text-sm font-semibold text-foreground">
              2. Plano Formativo — Retiros Comunitários
            </h2>
            {chRetirosC > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Carga horária: <span className="font-medium">{chRetirosC}h</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground/90 mt-1.5 leading-relaxed">
              Momentos-marco vividos em comunidade. Reunidos aqui com tema, base bíblica,
              objetivo e material de direcionamento, o {termoFormador.toLowerCase()} conduz cada retiro com
              preparo — sem reconstruir tudo a cada edição.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-rose-50 border-b border-border/60 dark:bg-rose-950/20">
                  <Th>Retiro</Th>
                  <Th>Tema do Retiro</Th>
                  <Th>Trecho Bíblico</Th>
                  <Th className="w-[30%]">Objetivo</Th>
                  <Th>Quando Realizar</Th>
                  <Th className="text-center">CH</Th>
                  <Th className="text-center">Mat. {termoFormador.toLowerCase()}</Th>
                  <Th className="text-center">Mat. {termoFormando.toLowerCase()}</Th>
                </tr>
              </thead>
              <tbody>
                {retirosComunitarios.map((retiro, idx) => (
                  <tr
                    key={retiro.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-rose-50/40 dark:bg-rose-950/10"}
                  >
                    <Td className="font-medium whitespace-nowrap">{retiro.numero}º Retiro</Td>
                    <Td className="font-medium">{retiro.tema || "—"}</Td>
                    <Td className="italic text-muted-foreground">{retiro.trechoBiblico || "—"}</Td>
                    <Td className="leading-relaxed text-muted-foreground">{retiro.objetivo || "—"}</Td>
                    <Td>{retiro.quandoRealizar || "—"}</Td>
                    <Td className="text-center font-medium">{retiro.cargaHoraria > 0 ? `${retiro.cargaHoraria}h` : "—"}</Td>
                    <Td className="text-center whitespace-nowrap">
                      <MaterialLink nome={retiro.materialAnexo} arquivoId={retiro.materialAnexoId} origem={`/planos/${id}`} router={router} />
                    </Td>
                    <Td className="text-center whitespace-nowrap">
                      <MaterialLink nome={retiro.materialFormandoAnexo} arquivoId={retiro.materialFormandoAnexoId} origem={`/planos/${id}`} router={router} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Seção 3: Retiros Pessoais ────────────────────────────────────── */}
      {retirosPessoais.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h2 className="text-sm font-semibold text-foreground">
              3. Plano Formativo — Retiros Pessoais
            </h2>
            {chRetirosP > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Carga horária: <span className="font-medium">{chRetirosP}h</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground/90 mt-1.5 leading-relaxed">
              Retiros feitos individualmente pelo {termoFormando.toLowerCase()}. O plano registra o
              direcionamento e o material previstos, dando ao {termoFormador.toLowerCase()} uma base para
              orientar e acompanhar essa vivência mais reservada.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-emerald-50 border-b border-border/60 dark:bg-emerald-950/20">
                  <Th>Retiro</Th>
                  <Th>Tema do Retiro</Th>
                  <Th>Trecho Bíblico</Th>
                  <Th className="w-[30%]">Objetivo</Th>
                  <Th>Quando Realizar</Th>
                  <Th className="text-center">CH</Th>
                  <Th className="text-center">Mat. {termoFormador.toLowerCase()}</Th>
                  <Th className="text-center">Mat. {termoFormando.toLowerCase()}</Th>
                </tr>
              </thead>
              <tbody>
                {retirosPessoais.map((retiro, idx) => (
                  <tr
                    key={retiro.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-emerald-50/40 dark:bg-emerald-950/10"}
                  >
                    <Td className="font-medium whitespace-nowrap">{retiro.numero}º Retiro Pessoal</Td>
                    <Td className="font-medium">{retiro.tema || "—"}</Td>
                    <Td className="italic text-muted-foreground">{retiro.trechoBiblico || "—"}</Td>
                    <Td className="leading-relaxed text-muted-foreground">{retiro.objetivo || "—"}</Td>
                    <Td>{retiro.quandoRealizar || "—"}</Td>
                    <Td className="text-center font-medium">{retiro.cargaHoraria > 0 ? `${retiro.cargaHoraria}h` : "—"}</Td>
                    <Td className="text-center whitespace-nowrap">
                      <MaterialLink nome={retiro.materialAnexo} arquivoId={retiro.materialAnexoId} origem={`/planos/${id}`} router={router} />
                    </Td>
                    <Td className="text-center whitespace-nowrap">
                      <MaterialLink nome={retiro.materialFormandoAnexo} arquivoId={retiro.materialFormandoAnexoId} origem={`/planos/${id}`} router={router} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Dialog de exclusão ───────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir plano</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{plano.nome}</span>?{" "}
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Link "Ver" para um anexo de retiro (ou "—" quando ausente) ──────────────
function MaterialLink({
  nome,
  arquivoId,
  origem,
  router,
}: {
  nome?: string;
  arquivoId?: string;
  origem: string;
  router: ReturnType<typeof useRouter>;
}) {
  if (!nome || !arquivoId) return <span className="text-muted-foreground">—</span>;
  return (
    <button
      type="button"
      onClick={() => router.push(`/viewer?arquivoId=${arquivoId}&nome=${encodeURIComponent(nome)}&origem=${origem}`)}
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      <Eye className="h-3 w-3" /> Ver
    </button>
  );
}

// ── Primitivos de tabela ────────────────────────────────────────────────────
function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-left text-xs font-semibold text-foreground/80 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 align-top border-b border-border/40 last:border-b-0 ${className}`}>
      {children}
    </td>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium flex items-center gap-1.5 text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </p>
    </div>
  );
}
