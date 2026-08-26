"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTermos } from "@/lib/data-store";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  type GrupoFormacao,
  type NivelFormativo,
  type PlanoFormativo,
  type GradeFormativa,
  type Usuario,
} from "@/types";
import { NivelFormativoIcon } from "@/components/nivel-formativo-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  ChevronRight,
  Home,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";

type FormState = {
  nome: string;
  nivelFormativo: NivelFormativo;
  formadorId: string;
  planoId: string;
  gradeId: string;
  vigenciaInicio: string;
  vigenciaFim: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  nivelFormativo: "pre-discipulado",
  formadorId: "",
  planoId: "",
  gradeId: "",
  vigenciaInicio: "",
  vigenciaFim: "",
};

const PAGE_SIZE = 10;
const JSON_HEADERS = { "Content-Type": "application/json" };

interface GruposFormacaoClientProps {
  initialGruposFormacao: GrupoFormacao[];
  initialPlanos: PlanoFormativo[];
  initialGrades: GradeFormativa[];
  initialFormadores: Usuario[];
  formandoCounts: Record<string, number>;
}

export default function GruposFormacaoClient({
  initialGruposFormacao,
  initialPlanos,
  initialGrades,
  initialFormadores,
  formandoCounts,
}: GruposFormacaoClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const { grupoFormacao: termoGrupoFormacao } = useTermos();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<GrupoFormacao | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [page, setPage] = useState(1);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const filtered = initialGruposFormacao.filter((m) =>
    m.nome.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(m: GrupoFormacao, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(m);
    setForm({
      nome: m.nome,
      nivelFormativo: m.nivelFormativo ?? "pre-discipulado",
      formadorId: m.formadorId ?? "",
      planoId: m.planoId ?? "",
      gradeId: m.gradeId ?? "",
      vigenciaInicio: m.vigenciaInicio ?? "",
      vigenciaFim: m.vigenciaFim ?? "",
    });
    setDialogOpen(true);
  }

  function openDelete(m: GrupoFormacao, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(m);
    setDeleteOpen(true);
  }

  const availableGrades = initialGrades.filter(
    (g) => g.nivelFormativo === form.nivelFormativo && (form.planoId === "" || g.planoId === form.planoId)
  );

  async function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");
    if (form.vigenciaFim && form.vigenciaInicio && form.vigenciaFim <= form.vigenciaInicio)
      return toast.error("Data de término deve ser posterior à data de início.");

    if (!editing) return; // criar usa /grupos-formacao/nova

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        nivelFormativo: form.nivelFormativo,
        formadorId: form.formadorId || undefined,
        planoId: form.planoId || undefined,
        gradeId: form.gradeId || undefined,
        vigenciaInicio: form.vigenciaInicio || undefined,
        vigenciaFim: form.vigenciaFim || undefined,
      };
      const res = await fetch(`/api/grupos-formacao/${editing.id}`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return toast.error((err as { error?: string }).error ?? "Erro ao salvar.");
      }
      toast.success(`${termoGrupoFormacao} atualizada com sucesso!`);
      setDialogOpen(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/grupos-formacao/${editing.id}`, { method: "DELETE" });
      if (!res.ok) return toast.error("Erro ao excluir.");
      toast.success(`${termoGrupoFormacao} excluída.`);
      setDeleteOpen(false);
      setEditing(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{termoGrupoFormacao}s</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {initialGruposFormacao.filter((m) => m.ativo).length} {termoGrupoFormacao.toLowerCase()}s ativas
          </p>
        </div>
        <Link href="/grupos-formacao/nova" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova {termoGrupoFormacao}
        </Link>
      </div>

      {/* Nota: objetivo e ganho da tela de grupos de formação para o formador comunitário */}
      <div className="flex gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-foreground font-medium">
            Para que servem as {termoGrupoFormacao.toLowerCase()}s?
          </p>
          <p>
            Cada {termoGrupoFormacao.toLowerCase()} reúne os formandos que caminham juntos numa mesma etapa formativa,
            com um formador responsável, período de vigência e — nos grupos estruturados — plano e grade vinculados. É a
            unidade viva do acompanhamento: onde as pessoas efetivamente se formam.
          </p>
          <p>
            Para o formador comunitário, é o ponto de partida do dia a dia: abrir uma {termoGrupoFormacao.toLowerCase()}{" "}
            dá acesso a presença, jornada, comentários, relatórios e leituras do grupo num só lugar. Crie novas, mantenha
            as ativas em ordem e acompanhe a saúde de cada uma pelos indicadores dos cartões.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((nivel) => {
          const count = initialGruposFormacao.filter((m) => m.nivelFormativo === nivel).length;
          return (
            <div key={nivel} className="p-3 rounded-xl border border-border/60 shadow-sm bg-card flex items-center gap-2.5">
              <NivelFormativoIcon nivel={nivel} className="size-6 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  {NIVEL_FORMATIVO_LABELS[nivel]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={`Buscar ${termoGrupoFormacao.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {filtered.length === 0 && (
        initialGruposFormacao.length === 0 ? (
          <EmptyState
            icon={Home}
            title={`Nenhuma ${termoGrupoFormacao.toLowerCase()} criada`}
            description={`Crie a primeira ${termoGrupoFormacao.toLowerCase()} para organizar seus ${termoGrupoFormacao.toLowerCase() === "morada" ? "membros" : "formandos"} e vincular plano e grade.`}
            action={
              <Link href="/grupos-formacao/nova" className={buttonVariants({ size: "sm" })}>
                <Plus className="h-4 w-4 mr-1.5" />
                Criar {termoGrupoFormacao.toLowerCase()}
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="Nenhum resultado"
            description="Nenhum registro corresponde à busca atual."
            secondaryAction={
              <Button size="sm" variant="outline" onClick={() => setSearch("")}>
                Limpar busca
              </Button>
            }
          />
        )
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((grupoFormacao) => {
          const formador = initialFormadores.find((u) => u.id === grupoFormacao.formadorId);
          const plano = initialPlanos.find((p) => p.id === grupoFormacao.planoId);
          const grade = initialGrades.find((g) => g.id === grupoFormacao.gradeId);
          const totalFormandos = formandoCounts[grupoFormacao.id] ?? 0;

          return (
            <Card key={grupoFormacao.id} className="border-0 shadow-sm bg-card hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                      <NivelFormativoIcon nivel={grupoFormacao.nivelFormativo} className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/grupos-formacao/${grupoFormacao.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {grupoFormacao.nome}
                        </Link>
                        {grupoFormacao.nivelFormativo ? (
                          <Badge variant="outline" className={`text-xs ${NIVEL_CORES[grupoFormacao.nivelFormativo]}`}>
                            {NIVEL_FORMATIVO_LABELS[grupoFormacao.nivelFormativo]}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-200">
                            Livre
                          </Badge>
                        )}
                        {!grupoFormacao.ativo && (
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500">
                            Inativa
                          </Badge>
                        )}
                      </div>
                      {grupoFormacao.localReuniao && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{grupoFormacao.localReuniao}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => openEdit(grupoFormacao, e)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={(e) => openDelete(grupoFormacao, e)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
                  {formador ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Formador:</span> {formador.nome}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">
                      Sem formador responsável
                    </p>
                  )}
                  {(grupoFormacao.vigenciaInicio || grupoFormacao.vigenciaFim) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="font-medium text-foreground">Vigência:</span>{" "}
                      {grupoFormacao.vigenciaInicio
                        ? format(parseISO(grupoFormacao.vigenciaInicio), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}{" "}
                      até{" "}
                      {grupoFormacao.vigenciaFim
                        ? format(parseISO(grupoFormacao.vigenciaFim), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </p>
                  )}
                  {plano && (
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-medium text-foreground">Plano:</span> {plano.nome}
                    </p>
                  )}
                  {grade && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Grade:</span> {grade.nome} v{grade.versao}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{totalFormandos} formandos</span>
                  </div>
                  <Link
                    href={`/grupos-formacao/${grupoFormacao.id}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver detalhes
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${termoGrupoFormacao}` : `Nova ${termoGrupoFormacao}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input
                value={form.nome}
                onChange={(e) => set("nome")(e.target.value)}
                placeholder={`Ex.: ${termoGrupoFormacao} São João Bosco`}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Etapa Formativa <span className="text-destructive">*</span></Label>
              <Select
                value={form.nivelFormativo}
                onValueChange={(v) => {
                  if (v) {
                    const nivel = v as NivelFormativo;
                    const matchingPlano = initialPlanos.find(
                      (p) => p.nivelFormativo === nivel && p.status !== "arquivado"
                    );
                    const matchingGrade = matchingPlano
                      ? initialGrades.find((g) => g.planoId === matchingPlano.id && g.ativo)
                      : undefined;
                    setForm((prev) => ({
                      ...prev,
                      nivelFormativo: nivel,
                      planoId: matchingPlano?.id ?? "",
                      gradeId: matchingGrade?.id ?? "",
                    }));
                  }
                }}
                items={NIVEL_FORMATIVO_LABELS}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((n) => (
                    <SelectItem key={n} value={n}>{NIVEL_FORMATIVO_LABELS[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Início da Vigência</Label>
                <Input
                  type="date"
                  value={form.vigenciaInicio}
                  onChange={(e) => set("vigenciaInicio")(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Término da Vigência</Label>
                <Input
                  type="date"
                  value={form.vigenciaFim}
                  onChange={(e) => set("vigenciaFim")(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Formador Responsável</Label>
              <Select
                value={form.formadorId}
                onValueChange={(v) => set("formadorId")(v ?? "")}
                items={Object.fromEntries(initialFormadores.map((u) => [u.id, u.nome]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o formador (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {initialFormadores.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!form.formadorId && !editing && (
                <p className="text-xs text-amber-600">
                  Sem formador, a {termoGrupoFormacao.toLowerCase()} será criada como inativa.
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Plano Formativo</Label>
              <Select
                value={form.planoId}
                onValueChange={(v) => {
                  set("planoId")(v ?? "");
                  set("gradeId")("");
                }}
                items={Object.fromEntries(initialPlanos.filter((p) => p.status !== "arquivado" && p.nivelFormativo === form.nivelFormativo).map((p) => [p.id, p.nome]))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o plano..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {initialPlanos
                    .filter((p) =>
                      p.status !== "arquivado" &&
                      p.nivelFormativo === form.nivelFormativo
                    )
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Grade Formativa</Label>
              <Select
                value={form.gradeId}
                onValueChange={(v) => v && set("gradeId")(v)}
                items={Object.fromEntries(availableGrades.map((g) => [g.id, `${g.nome} v${g.versao}`]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a grade..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {availableGrades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nome} v{g.versao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.nivelFormativo && availableGrades.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma grade disponível para esta etapa formativa.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : `Criar ${termoGrupoFormacao.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {termoGrupoFormacao.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a {termoGrupoFormacao.toLowerCase()}{" "}
            <span className="font-medium text-foreground">{editing?.nome}</span>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
