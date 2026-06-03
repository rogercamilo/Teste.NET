"use client";

import { useState } from "react";
import { useMoradas, useFormandos, usePlanos, useGrades, useUsuarios, useComunidade } from "@/lib/data-store";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  type Morada,
  type NivelFormativo,
} from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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

const NIVEL_ICONS: Record<NivelFormativo, string> = {
  "pre-discipulado": "🌱",
  discipulado: "📖",
  "primeiras-promessas": "🌟",
  "formacao-permanente": "🔥",
};

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

export default function MoradasClient() {
  const [moradas, setMoradas] = useMoradas();
  const [allFormandos, setFormandos] = useFormandos();
  const [allPlanos] = usePlanos();
  const [allGrades] = useGrades();
  const [allUsuarios] = useUsuarios();
  const [comunidade] = useComunidade();
  const termoMorada = comunidade.termoMorada?.trim() || "Morada";
  const formadores = allUsuarios.filter((u) => u.perfil === "formador_comunitario" && u.ativo);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Morada | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [page, setPage] = useState(1);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const filtered = moradas.filter((m) =>
    m.nome.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(m: Morada, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(m);
    setForm({
      nome: m.nome,
      nivelFormativo: m.nivelFormativo,
      formadorId: m.formadorId ?? "",
      planoId: m.planoId ?? "",
      gradeId: m.gradeId ?? "",
      vigenciaInicio: m.vigenciaInicio ?? "",
      vigenciaFim: m.vigenciaFim ?? "",
    });
    setDialogOpen(true);
  }

  function openDelete(m: Morada, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(m);
    setDeleteOpen(true);
  }

  const availableGrades = allGrades.filter(
    (g) => g.nivelFormativo === form.nivelFormativo && (form.planoId === "" || g.planoId === form.planoId)
  );

  function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");
    if (form.vigenciaFim && form.vigenciaInicio && form.vigenciaFim <= form.vigenciaInicio)
      return toast.error("Data de término deve ser posterior à data de início.");

    const today = new Date().toISOString().split("T")[0];
    const hasFormador = !!form.formadorId;
    const payload: Morada = {
      id: editing?.id ?? `m${Date.now()}`,
      nome: form.nome.trim(),
      nivelFormativo: form.nivelFormativo,
      formadorId: form.formadorId || undefined,
      planoId: form.planoId || undefined,
      gradeId: form.gradeId || undefined,
      vigenciaInicio: form.vigenciaInicio || undefined,
      vigenciaFim: form.vigenciaFim || undefined,
      // Nova morada sem formador nasce inativa; edição preserva o status atual
      ativo: editing?.ativo ?? hasFormador,
      criadoEm: editing?.criadoEm ?? today,
    };

    if (editing) {
      setMoradas((prev) => prev.map((m) => (m.id === editing.id ? payload : m)));
      toast.success(`${termoMorada} atualizada com sucesso!`);
    } else {
      setMoradas((prev) => [...prev, payload]);
      const msg = hasFormador
        ? `${termoMorada} criada com sucesso!`
        : `${termoMorada} criada como inativa (sem formador responsável).`;
      toast.success(msg);
    }
    setDialogOpen(false);
  }

  function handleDelete() {
    if (!editing) return;
    setMoradas((prev) => prev.filter((m) => m.id !== editing.id));
    setFormandos((prev) =>
      prev.map((f) => (f.moradaId === editing.id ? { ...f, moradaId: undefined } : f))
    );
    setDeleteOpen(false);
    setEditing(null);
    toast.success(`${termoMorada} excluída.`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{termoMorada}s</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {moradas.filter((m) => m.ativo).length} {termoMorada.toLowerCase()}s ativas
          </p>
        </div>
        <Link href="/moradas/nova" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova {termoMorada}
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((nivel) => {
          const count = moradas.filter((m) => m.nivelFormativo === nivel).length;
          return (
            <div key={nivel} className="p-3 rounded-xl border border-border/60 shadow-sm bg-card flex items-center gap-2.5">
              <span className="text-xl">{NIVEL_ICONS[nivel]}</span>
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
          placeholder={`Buscar ${termoMorada.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Home className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">Nenhuma {termoMorada.toLowerCase()} encontrada</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((morada) => {
          const formador = allUsuarios.find((u) => u.id === morada.formadorId);
          const plano = allPlanos.find((p) => p.id === morada.planoId);
          const grade = allGrades.find((g) => g.id === morada.gradeId);
          const totalFormandos = allFormandos.filter((f) => f.moradaId === morada.id).length;

          return (
            <Card key={morada.id} className="border-0 shadow-sm bg-card hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-xl">
                      {NIVEL_ICONS[morada.nivelFormativo]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{morada.nome}</h3>
                        <Badge variant="outline" className={`text-xs ${NIVEL_CORES[morada.nivelFormativo]}`}>
                          {NIVEL_FORMATIVO_LABELS[morada.nivelFormativo]}
                        </Badge>
                        {!morada.ativo && (
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500">
                            Inativa
                          </Badge>
                        )}
                      </div>
                      {morada.localReuniao && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{morada.localReuniao}</p>
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
                      <DropdownMenuItem onClick={(e) => openEdit(morada, e)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={(e) => openDelete(morada, e)}>
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
                  {(morada.vigenciaInicio || morada.vigenciaFim) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="font-medium text-foreground">Vigência:</span>{" "}
                      {morada.vigenciaInicio
                        ? format(parseISO(morada.vigenciaInicio), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}{" "}
                      até{" "}
                      {morada.vigenciaFim
                        ? format(parseISO(morada.vigenciaFim), "dd/MM/yyyy", { locale: ptBR })
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
                    href={`/moradas/${morada.id}`}
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
            <DialogTitle>{editing ? `Editar ${termoMorada}` : `Nova ${termoMorada}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input
                value={form.nome}
                onChange={(e) => set("nome")(e.target.value)}
                placeholder={`Ex.: ${termoMorada} São João Bosco`}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Etapa Formativa <span className="text-destructive">*</span></Label>
              <Select
                value={form.nivelFormativo}
                onValueChange={(v) => {
                  if (v) {
                    const nivel = v as NivelFormativo;
                    const matchingPlano = allPlanos.find(
                      (p) => p.nivelFormativo === nivel && p.status !== "arquivado"
                    );
                    const matchingGrade = matchingPlano
                      ? allGrades.find((g) => g.planoId === matchingPlano.id && g.ativo)
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
                items={Object.fromEntries(formadores.map((u) => [u.id, u.nome]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o formador (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {formadores.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!form.formadorId && !editing && (
                <p className="text-xs text-amber-600">
                  Sem formador, a {termoMorada.toLowerCase()} será criada como inativa.
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
                items={Object.fromEntries(allPlanos.filter((p) => p.status !== "arquivado" && p.nivelFormativo === form.nivelFormativo).map((p) => [p.id, p.nome]))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o plano..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {allPlanos
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar alterações" : `Criar ${termoMorada.toLowerCase()}`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {termoMorada.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir a {termoMorada.toLowerCase()}{" "}
            <span className="font-medium text-foreground">{editing?.nome}</span>? Esta ação não pode ser desfeita.
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
