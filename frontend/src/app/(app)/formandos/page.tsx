"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFormandos, useMoradas, useGrades, useComunidade, useTermos, useEtapaLabels } from "@/lib/data-store";
import {
  NIVEL_CORES,
  MODALIDADE_LABELS,
  totalRequerido,
  type Formando,
  type GradeFormativa,
  type Morada,
  type NivelFormativo,
  type Modalidade,
  type ProgressoEtapa,
} from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Filter,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const NIVEL_AVATAR_BG: Record<NivelFormativo, string> = {
  "pre-discipulado": "bg-violet-100 text-violet-700",
  discipulado: "bg-blue-100 text-blue-700",
  "primeiras-promessas": "bg-emerald-100 text-emerald-700",
  "formacao-permanente": "bg-amber-100 text-amber-700",
};

const ESTADO_CIVIL_LABELS = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

type FormState = {
  nome: string;
  dataNascimento: string;
  estadoCivil: "solteiro" | "casado" | "divorciado" | "viuvo";
  modalidade: Modalidade;
  nivelFormativo: NivelFormativo;
  dataIngresso: string;
  telefone: string;
  email: string;
  moradaId: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  dataNascimento: "",
  estadoCivil: "solteiro",
  modalidade: "presencial",
  nivelFormativo: "pre-discipulado",
  dataIngresso: new Date().toISOString().split("T")[0],
  telefone: "",
  email: "",
  moradaId: "",
};

export default function FormandosPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? "formador_comunitario";
  const userMoradaId = (session?.user as { moradaId?: string | null })?.moradaId ?? null;
  const isFC = userRole === "formador_comunitario";
  const router = useRouter();
  const [formandos, setFormandos] = useFormandos();
  const [comunidade] = useComunidade();
  const termoFormando = comunidade.termoFormando?.trim() || "Formando";
  const termoMorada = comunidade.termoMorada?.trim() || "Morada";
  const etapaLabels = useEtapaLabels();
  const [allMoradas, setAllMoradas] = useMoradas();
  const [allGrades] = useGrades();
  const PAGE_SIZE = 10;
  const [search, setSearch] = useState("");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Formando | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [linkGradeState, setLinkGradeState] = useState<{ moradaId: string; nivelFormativo: NivelFormativo } | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [linkGradeSaving, setLinkGradeSaving] = useState(false);

  useEffect(() => {
    if (isFC && userMoradaId) {
      router.replace(`/moradas/${userMoradaId}`);
    }
  }, [isFC, userMoradaId, router]);

  if (isFC && userMoradaId) return null;

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // FC só vê formandos da sua morada
  const scopedFormandos = isFC && userMoradaId
    ? formandos.filter((f) => f.moradaId === userMoradaId)
    : formandos;

  const filtered = scopedFormandos.filter((f) => {
    const matchSearch =
      f.nome.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase());
    const matchNivel = nivelFilter === "todos" || f.nivelFormativo === nivelFilter;
    return matchSearch && matchNivel;
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, moradaId: isFC && userMoradaId ? userMoradaId : "" });
    setDialogOpen(true);
  }

  function openEdit(f: Formando, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setEditing(f);
    setForm({
      nome: f.nome,
      dataNascimento: f.dataNascimento,
      estadoCivil: f.estadoCivil,
      modalidade: f.modalidade,
      nivelFormativo: f.nivelFormativo,
      dataIngresso: f.dataIngresso,
      telefone: f.telefone,
      email: f.email,
      moradaId: f.moradaId ?? "",
    });
    setDialogOpen(true);
  }

  function openDelete(f: Formando, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setEditing(f);
    setDeleteOpen(true);
  }

  function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");
    if (!form.email.trim()) return toast.error("E-mail é obrigatório.");
    if (!form.dataNascimento) return toast.error("Data de nascimento é obrigatória.");
    if (!form.dataIngresso) return toast.error("Data de ingresso é obrigatória.");

    const morada = allMoradas.find((m) => m.id === form.moradaId);
    const nivelFormativo = morada ? morada.nivelFormativo : form.nivelFormativo;

    const progressoEtapas: ProgressoEtapa[] = editing?.progressoEtapas ?? [
      {
        nivel: nivelFormativo,
        formacoesComunitariasRealizadas: 0,
        retirosComunitariosRealizados: 0,
        retirosPessoaisRealizados: 0,
        iniciouEm: form.dataIngresso,
      },
    ];

    const payload: Formando = {
      id: editing?.id ?? `f${Date.now()}`,
      nome: form.nome.trim(),
      dataNascimento: form.dataNascimento,
      estadoCivil: form.estadoCivil,
      modalidade: form.modalidade,
      nivelFormativo,
      dataIngresso: form.dataIngresso,
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      ativo: editing?.ativo ?? true,
      moradaId: form.moradaId || undefined,
      totalFormacoes: editing?.totalFormacoes ?? totalRequerido(nivelFormativo),
      formacoesRealizadas: editing?.formacoesRealizadas ?? 0,
      progressoEtapas,
    };

    if (editing) {
      setFormandos((prev) => prev.map((f) => (f.id === editing.id ? payload : f)));
      toast.success(`${termoFormando} atualizado com sucesso!`);
    } else {
      setFormandos((prev) => [...prev, payload]);
      toast.success(`${termoFormando} criado com sucesso!`);
    }
    setDialogOpen(false);
  }

  function handleDelete() {
    if (!editing) return;
    setFormandos((prev) => prev.filter((f) => f.id !== editing.id));
    setDeleteOpen(false);
    setEditing(null);
    toast.success(`${termoFormando} excluído.`);
  }

  async function handleVincularGrade() {
    if (!linkGradeState || !selectedGradeId) return;
    setLinkGradeSaving(true);
    try {
      const morada = allMoradas.find((m) => m.id === linkGradeState.moradaId);
      if (!morada) return;
      const res = await fetch(`/api/moradas/${linkGradeState.moradaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...morada, gradeId: selectedGradeId }),
      });
      if (!res.ok) throw new Error();
      const updated: Morada = await res.json();
      const updatedMoradas = allMoradas.map((m) => (m.id === updated.id ? updated : m));
      setAllMoradas(updatedMoradas);
      // Refresh formandos so totalFormacoes reflects the newly linked grade
      setFormandos((prev) => [...prev]);
      setLinkGradeState(null);
      setSelectedGradeId("");
      toast.success("Grade vinculada com sucesso!");
    } catch {
      toast.error("Falha ao vincular grade.");
    } finally {
      setLinkGradeSaving(false);
    }
  }

  const selectedMorada = allMoradas.find((m) => m.id === form.moradaId);

  return (
    <div className="space-y-5 animate-in-fast">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{termoFormando}s</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {scopedFormandos.filter((f) => f.ativo).length} {termoFormando.toLowerCase()}s ativos
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo {termoFormando}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={nivelFilter} onValueChange={(v) => setNivelFilter(v ?? "todos")} items={{ todos: "Todos os níveis", ...etapaLabels }}>
          <SelectTrigger className="h-9 w-full sm:w-52 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Etapa formativa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os níveis</SelectItem>
            <SelectItem value="pre-discipulado">Pré-Discipulado</SelectItem>
            <SelectItem value="discipulado">Discipulado</SelectItem>
            <SelectItem value="primeiras-promessas">Primeiras Promessas</SelectItem>
            <SelectItem value="formacao-permanente">Formação Permanente</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-md border border-border overflow-hidden h-9">
          <button
            onClick={() => setView("grid")}
            className={`px-2.5 flex items-center transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-2.5 flex items-center border-l border-border transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">Nenhum formando encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros de busca</p>
        </div>
      )}

      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((formando) => {
            const morada = formando.moradaId ? allMoradas.find((m) => m.id === formando.moradaId) : null;
            const semGrade = !!formando.moradaId && !morada?.gradeId;
            return (
              <FormandoCard
                key={formando.id}
                formando={formando}
                semGrade={semGrade}
                onEdit={openEdit}
                onDelete={openDelete}
                onVincularGrade={!isFC ? (moradaId, nivel) => {
                  setSelectedGradeId("");
                  setLinkGradeState({ moradaId, nivelFormativo: nivel });
                } : undefined}
              />
            );
          })}
          <div className="col-span-full">
            <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </div>
      )}

      {view === "list" && filtered.length > 0 && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold text-muted-foreground">Formando</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Nível</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Ingresso</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Progresso</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((formando) => {
                const progresso = Math.round(
                  (formando.formacoesRealizadas / formando.totalFormacoes) * 100
                );
                return (
                  <TableRow key={formando.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <Link href={`/formandos/${formando.id}`} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={`text-xs font-semibold ${NIVEL_AVATAR_BG[formando.nivelFormativo]}`}>
                            {getInitials(formando.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight hover:text-primary transition-colors">
                            {formando.nome}
                          </p>
                          <p className="text-xs text-muted-foreground">{formando.email}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={`text-xs ${NIVEL_CORES[formando.nivelFormativo]}`}>
                        {etapaLabels[formando.nivelFormativo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {format(parseISO(formando.dataIngresso), "MMM yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {(() => {
                        const morada = formando.moradaId ? allMoradas.find((m) => m.id === formando.moradaId) : null;
                        const semGrade = !!formando.moradaId && !morada?.gradeId;
                        return (
                          <div className="flex items-center gap-2">
                            <Progress value={progresso} className="h-1.5 w-20" />
                            <span className="text-xs text-muted-foreground">
                              {formando.formacoesRealizadas}/{formando.totalFormacoes}
                            </span>
                            {semGrade && (
                              <span title={`${termoMorada} sem grade vinculada`}>
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${formando.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}`}
                      >
                        {formando.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => openEdit(formando, e)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={(e) => openDelete(formando, e)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="p-3">
            <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${termoFormando}` : `Novo ${termoFormando}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome completo <span className="text-destructive">*</span></Label>
              <Input value={form.nome} onChange={(e) => set("nome")(e.target.value)} placeholder="Nome Sobrenome" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Data de nascimento <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.dataNascimento} onChange={(e) => set("dataNascimento")(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Estado civil</Label>
                <Select value={form.estadoCivil} onValueChange={(v) => v && set("estadoCivil")(v)} items={ESTADO_CIVIL_LABELS}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADO_CIVIL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>E-mail <span className="text-destructive">*</span></Label>
                <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => set("telefone")(e.target.value)} placeholder="(85) 99999-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Modalidade</Label>
                <Select value={form.modalidade} onValueChange={(v) => v && set("modalidade")(v)} items={MODALIDADE_LABELS}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hibrida">Híbrida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Data de ingresso <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.dataIngresso} onChange={(e) => set("dataIngresso")(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Morada</Label>
              <Select
                value={form.moradaId}
                onValueChange={(v) => {
                  set("moradaId")(v ?? "");
                  const morada = allMoradas.find((m) => m.id === v);
                  if (morada) set("nivelFormativo")(morada.nivelFormativo);
                }}
                items={Object.fromEntries(allMoradas.filter((m) => m.ativo).map((m) => [m.id, `${m.nome} — ${etapaLabels[m.nivelFormativo]}`]))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a morada..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {allMoradas.filter((m) => m.ativo).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome} — {etapaLabels[m.nivelFormativo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Etapa Formativa <span className="text-destructive">*</span></Label>
              <Select
                value={selectedMorada ? selectedMorada.nivelFormativo : form.nivelFormativo}
                onValueChange={(v) => !selectedMorada && v && set("nivelFormativo")(v)}
                disabled={!!selectedMorada}
                items={etapaLabels}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((n) => (
                    <SelectItem key={n} value={n}>{etapaLabels[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMorada && (
                <p className="text-xs text-muted-foreground">
                  Definido automaticamente pela morada selecionada.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar alterações" : "Criar formando"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {termoFormando.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{editing?.nome}</span>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Grade Dialog */}
      <Dialog open={!!linkGradeState} onOpenChange={(open) => { if (!open) { setLinkGradeState(null); setSelectedGradeId(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Vincular grade à morada</DialogTitle>
          </DialogHeader>
          {linkGradeState && (() => {
            const grades = allGrades.filter(
              (g) => g.nivelFormativo === linkGradeState.nivelFormativo && g.ativo
            );
            return (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Selecione a grade formativa para{" "}
                  <span className="font-medium text-foreground">
                    {etapaLabels[linkGradeState.nivelFormativo]}
                  </span>
                  .
                </p>
                {grades.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Nenhuma grade ativa encontrada para este nível.
                  </p>
                ) : (
                  <Select value={selectedGradeId} onValueChange={(v) => v && setSelectedGradeId(v)} items={Object.fromEntries(grades.map((g) => [g.id, g.nome || g.planoNome]))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a grade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <span>{g.nome || g.planoNome}</span>
                          {g.totalFormacoes > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              · {g.totalFormacoes} formações
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setLinkGradeState(null); setSelectedGradeId(""); }}>Cancelar</Button>
            <Button onClick={handleVincularGrade} disabled={!selectedGradeId || linkGradeSaving}>
              {linkGradeSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormandoCard({
  formando,
  semGrade,
  onEdit,
  onDelete,
  onVincularGrade,
}: {
  formando: Formando;
  semGrade: boolean;
  onEdit: (f: Formando, e: React.MouseEvent) => void;
  onDelete: (f: Formando, e: React.MouseEvent) => void;
  onVincularGrade?: (moradaId: string, nivelFormativo: NivelFormativo) => void;
}) {
  const etapaLabels = useEtapaLabels();
  const { morada: termoMoradaCard } = useTermos();
  const progresso = Math.round(
    (formando.formacoesRealizadas / formando.totalFormacoes) * 100
  );
  const idade = differenceInYears(new Date(), parseISO(formando.dataNascimento));

  return (
    <Card className="border-0 shadow-sm bg-card hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className={`font-semibold text-sm ${NIVEL_AVATAR_BG[formando.nivelFormativo]}`}>
                {getInitials(formando.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Link href={`/formandos/${formando.id}`}>
                <p className="font-semibold text-sm text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                  {formando.nome}
                </p>
              </Link>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {idade} anos · {MODALIDADE_LABELS[formando.modalidade]}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => onEdit(formando, e)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={(e) => onDelete(formando, e)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Badge variant="outline" className={`text-xs mb-3 ${NIVEL_CORES[formando.nivelFormativo]}`}>
          {etapaLabels[formando.nivelFormativo]}
        </Badge>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-foreground">
              {formando.formacoesRealizadas}/{formando.totalFormacoes} formações
            </span>
          </div>
          <Progress value={progresso} className="h-1.5" />
          {semGrade && (
            <div className="flex items-center justify-between gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-700 mt-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{termoMoradaCard} sem grade vinculada</span>
              </div>
              {onVincularGrade && formando.moradaId && (
                <button
                  onClick={(e) => { e.preventDefault(); onVincularGrade(formando.moradaId!, formando.nivelFormativo); }}
                  className="flex items-center gap-1 font-medium underline underline-offset-2 hover:text-amber-900 transition-colors whitespace-nowrap"
                >
                  <Link2 className="h-3 w-3" />
                  Vincular
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
          <span className="text-xs text-muted-foreground">
            Desde {format(parseISO(formando.dataIngresso), "MMM yyyy", { locale: ptBR })}
          </span>
          <Badge
            variant="outline"
            className={`text-xs ${formando.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}`}
          >
            {formando.ativo ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
