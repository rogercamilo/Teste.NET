"use client";

import { use, useState } from "react";
import { useSession } from "next-auth/react";
import {
  useFormandos,
  useAgendamentos,
  useHistorico,
  useComentarios,
  useEventosFormando,
  useComunidade,
} from "@/lib/data-store";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  MODALIDADE_LABELS,
  TIPO_COMENTARIO_LABELS,
  TIPO_COMENTARIO_CORES,
  STATUS_FORMACAO_LABELS,
  REQUISITOS_ETAPAS,
  SEQUENCIA_ETAPAS,
  TIPO_EVENTO_LABELS,
  TIPO_EVENTO_CORES,
  NOTA_ADESAO_LABELS,
  NOTA_ADESAO_CORES,
  getProximaEtapa,
  podeAvancarEtapa,
  totalRequerido,
  type StatusFormacao,
  type TipoComentario,
  type HistoricoFormando,
  type ComentarioFormando,
  type Agendamento,
  type EventoFormando,
  type DocumentoAnexo,
  type NotaAdesao,
  type TipoDesligamento,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  UserMinus,
  UserX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, differenceInYears, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_COLORS: Record<StatusFormacao, string> = {
  agendada: "bg-blue-100 text-blue-700 border-blue-200",
  confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  realizada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada: "bg-red-100 text-red-600 border-red-200",
  reagendada: "bg-amber-100 text-amber-700 border-amber-200",
};

const ESTADO_CIVIL_LABELS = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

export default function FormandoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [allFormandos, setFormandos] = useFormandos();
  const [agendamentos] = useAgendamentos();
  const [historico, setHistorico] = useHistorico();
  const [comentarios, setComentarios] = useComentarios();
  const [eventos, setEventos] = useEventosFormando();
  const [comunidade] = useComunidade();

  const userId = (session?.user as { id?: string })?.id ?? "u0";
  const userName = session?.user?.name ?? "Formador";

  const termoFormando = comunidade.termoFormando?.trim() || "Formando";
  const termoFormador = comunidade.termoFormador?.trim() || "Formador Comunitário";

  const [registroOpen, setRegistroOpen] = useState(false);
  const [selectedAg, setSelectedAg] = useState<Agendamento | null>(null);
  const [registroForm, setRegistroForm] = useState({ presente: "true", observacao: "" });

  const [comentarioOpen, setComentarioOpen] = useState(false);
  const [comentarioForm, setComentarioForm] = useState<{ tipo: TipoComentario; texto: string }>({
    tipo: "adesao",
    texto: "",
  });

  const [avancarOpen, setAvancarOpen] = useState(false);

  const [avaliacaoOpen, setAvaliacaoOpen] = useState(false);
  const [avaliacaoForm, setAvaliacaoForm] = useState<{
    periodoInicio: string;
    periodoFim: string;
    notaAdesao: NotaAdesao;
    textoAvaliacao: string;
  }>({ periodoInicio: "", periodoFim: "", notaAdesao: "boa", textoAvaliacao: "" });

  const [solicitacaoOpen, setSolicitacaoOpen] = useState(false);
  const [solicitacaoForm, setSolicitacaoForm] = useState({
    motivo: "",
    checklistDevolveuEstatuto: false,
    checklistDevolveuSacramental: false,
    checklistApresentouCarta: false,
  });

  const [desligamentoOpen, setDesligamentoOpen] = useState(false);
  const [desligamentoForm, setDesligamentoForm] = useState<{
    tipoDesligamento: TipoDesligamento;
    motivo: string;
    dataEfetiva: string;
    checklistDevolveuEstatuto: boolean;
    checklistDevolveuSacramental: boolean;
    checklistAcompanhadoModerador: boolean;
  }>({
    tipoDesligamento: "voluntario",
    motivo: "",
    dataEfetiva: "",
    checklistDevolveuEstatuto: false,
    checklistDevolveuSacramental: false,
    checklistAcompanhadoModerador: false,
  });

  const [licencaOpen, setLicencaOpen] = useState(false);
  const [licencaForm, setLicencaForm] = useState({
    motivo: "",
    dataInicioLicenca: "",
    dataFimLicenca: "",
  });

  const [solicitacaoFiles, setSolicitacaoFiles] = useState<File[]>([]);
  const [desligamentoFiles, setDesligamentoFiles] = useState<File[]>([]);
  const [licencaFiles, setLicencaFiles] = useState<File[]>([]);

  const ACCEPTED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  function handleFileSelect(
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<File[]>>
  ) {
    if (!files) return;
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`"${f.name}": apenas PDF e DOCX são aceitos.`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}": tamanho máximo é 5 MB.`);
        continue;
      }
      valid.push(f);
    }
    setter((prev) => [...prev, ...valid]);
  }

  function removeFile(
    index: number,
    setter: React.Dispatch<React.SetStateAction<File[]>>
  ) {
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  async function filesToDocumentos(files: File[]): Promise<DocumentoAnexo[]> {
    return Promise.all(
      files.map(
        (f) =>
          new Promise<DocumentoAnexo>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                nome: f.name,
                tamanho: f.size,
                tipo: f.type,
                dados: reader.result as string,
              });
            reader.onerror = reject;
            reader.readAsDataURL(f);
          })
      )
    );
  }

  const formando = allFormandos.find((f) => f.id === id);

  if (!formando) {
    return (
      <div className="flex flex-col items-center py-20">
        <p className="text-muted-foreground">{termoFormando} não encontrado</p>
        <Link
          href="/formandos"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
        >
          Voltar
        </Link>
      </div>
    );
  }

  const initials = formando.nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const idade = differenceInYears(new Date(), parseISO(formando.dataNascimento));

  const progAtual = (formando.progressoEtapas ?? []).find(
    (p) => p.nivel === formando.nivelFormativo
  );
  const totalAtual = totalRequerido(formando.nivelFormativo);
  const realizadosAtual = progAtual
    ? progAtual.formacoesComunitariasRealizadas +
      progAtual.retirosComunitariosRealizados +
      progAtual.retirosPessoaisRealizados
    : 0;
  const progressoPct = totalAtual > 0 ? Math.round((realizadosAtual / totalAtual) * 100) : 0;
  const proximaEtapa = getProximaEtapa(formando.nivelFormativo);
  const podeAvancar = podeAvancarEtapa(formando);
  const etapaAtualIdx = SEQUENCIA_ETAPAS.indexOf(formando.nivelFormativo);

  const reqAtual = REQUISITOS_ETAPAS[formando.nivelFormativo];
  const comPctAtual = progAtual
    ? Math.min(100, Math.round((progAtual.formacoesComunitariasRealizadas / reqAtual.formacoesComunitarias) * 100))
    : 0;
  const retComPctAtual = progAtual
    ? Math.min(100, Math.round((progAtual.retirosComunitariosRealizados / reqAtual.retirosComunitarios) * 100))
    : 0;
  const retPesPctAtual = progAtual
    ? Math.min(100, Math.round((progAtual.retirosPessoaisRealizados / reqAtual.retirosPessoais) * 100))
    : 0;
  const diasNaEtapa = progAtual?.iniciouEm
    ? differenceInDays(new Date(), parseISO(progAtual.iniciouEm))
    : null;

  const formandoAgendamentos = agendamentos
    .filter((ag) => ag.nivelFormativo === formando.nivelFormativo)
    .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));

  const formandoHistorico = historico.filter((h) => h.formandoId === id);

  function getRegistro(agId: string): HistoricoFormando | undefined {
    return formandoHistorico.find((h) => h.agendamentoId === agId);
  }

  const formandoComentarios = comentarios
    .filter((c) => c.formandoId === id)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  function openRegistro(ag: Agendamento) {
    setSelectedAg(ag);
    setRegistroForm({ presente: "true", observacao: "" });
    setRegistroOpen(true);
  }

  function handleSaveRegistro() {
    if (!selectedAg) return;
    const novo: HistoricoFormando = {
      id: `h${Date.now()}`,
      formandoId: id,
      agendamentoId: selectedAg.id,
      formacaoTema: selectedAg.formacaoTema,
      data: selectedAg.dataInicio.split("T")[0],
      status: selectedAg.status,
      presente: registroForm.presente === "true",
      observacao: registroForm.observacao.trim() || undefined,
    };
    setHistorico((prev) => [...prev, novo]);

    if (registroForm.presente === "true") {
      setFormandos((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          const etapas = [...(f.progressoEtapas ?? [])];
          const idx = etapas.findIndex((p) => p.nivel === f.nivelFormativo);
          if (idx >= 0) {
            const e = { ...etapas[idx] };
            if (selectedAg.tipoFormacao === "comunitaria") e.formacoesComunitariasRealizadas++;
            else if (selectedAg.tipoFormacao === "retiro-comunitario") e.retirosComunitariosRealizados++;
            else if (selectedAg.tipoFormacao === "retiro-pessoal") e.retirosPessoaisRealizados++;
            etapas[idx] = e;
          }
          const prog = etapas.find((p) => p.nivel === f.nivelFormativo);
          const novoTotal = prog
            ? prog.formacoesComunitariasRealizadas +
              prog.retirosComunitariosRealizados +
              prog.retirosPessoaisRealizados
            : f.formacoesRealizadas;
          const req = REQUISITOS_ETAPAS[f.nivelFormativo];
          return {
            ...f,
            progressoEtapas: etapas,
            formacoesRealizadas: novoTotal,
            totalFormacoes: req.formacoesComunitarias + req.retirosComunitarios + req.retirosPessoais,
          };
        })
      );
    }

    setRegistroOpen(false);
    toast.success("Participação registrada.");
  }

  function handleSaveComentario() {
    if (!comentarioForm.texto.trim()) return toast.error("O texto do comentário é obrigatório.");
    const novo: ComentarioFormando = {
      id: `c${Date.now()}`,
      formandoId: id,
      formandoNome: formando!.nome,
      formadorId: userId,
      formadorNome: userName,
      texto: comentarioForm.texto.trim(),
      tipo: comentarioForm.tipo,
      criadoEm: new Date().toISOString(),
    };
    setComentarios((prev) => [...prev, novo]);
    setComentarioOpen(false);
    setComentarioForm({ tipo: "adesao", texto: "" });
    toast.success("Comentário salvo.");
  }

  const formandoEventos = eventos
    .filter((e) => e.formandoId === id)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  const avaliacoesRealizadas = formandoEventos.filter((e) => e.tipo === "avaliacao-adesao");
  const ultimaAvaliacao = avaliacoesRealizadas[0];

  const historicoComNivel = formandoHistorico.map((h) => ({
    ...h,
    nivelFormativo: agendamentos.find((a) => a.id === h.agendamentoId)?.nivelFormativo,
  }));
  const presencaPorEtapa = (nivel: string) => {
    const regs = historicoComNivel.filter((h) => h.nivelFormativo === nivel);
    return { total: regs.length, presentes: regs.filter((h) => h.presente).length };
  };
  const presencaAtual = presencaPorEtapa(formando.nivelFormativo);
  const taxaPresencaAtual =
    presencaAtual.total > 0
      ? Math.round((presencaAtual.presentes / presencaAtual.total) * 100)
      : null;
  const taxaPresencaGeral =
    formandoHistorico.length > 0
      ? Math.round(
          (formandoHistorico.filter((h) => h.presente).length / formandoHistorico.length) * 100
        )
      : null;
  const totalFormacoesGeral = (formando.progressoEtapas ?? []).reduce(
    (sum, p) =>
      sum +
      p.formacoesComunitariasRealizadas +
      p.retirosComunitariosRealizados +
      p.retirosPessoaisRealizados,
    0
  );
  const etapasConcluidas = (formando.progressoEtapas ?? []).filter((p) => !!p.concluiuEm).length;
  const inicioJornada = [...(formando.progressoEtapas ?? [])]
    .sort((a, b) => (a.iniciouEm ?? "").localeCompare(b.iniciouEm ?? ""))
    .find((p) => p.iniciouEm)?.iniciouEm;

  function handleSaveAvaliacao() {
    if (!avaliacaoForm.periodoInicio || !avaliacaoForm.periodoFim)
      return toast.error("Informe o período da avaliação.");
    if (!avaliacaoForm.textoAvaliacao.trim())
      return toast.error("O texto da avaliação é obrigatório.");
    const novo: EventoFormando = {
      id: `ev${Date.now()}`,
      formandoId: id,
      formadorId: userId,
      tipo: "avaliacao-adesao",
      criadoEm: new Date().toISOString(),
      periodoInicio: avaliacaoForm.periodoInicio,
      periodoFim: avaliacaoForm.periodoFim,
      notaAdesao: avaliacaoForm.notaAdesao,
      textoAvaliacao: avaliacaoForm.textoAvaliacao.trim(),
    };
    setEventos((prev) => [...prev, novo]);
    setAvaliacaoOpen(false);
    setAvaliacaoForm({ periodoInicio: "", periodoFim: "", notaAdesao: "boa", textoAvaliacao: "" });
    toast.success("Avaliação de adesão registrada.");
  }

  async function handleSaveSolicitacao() {
    if (!solicitacaoForm.motivo.trim()) return toast.error("O motivo é obrigatório.");
    const documentos = await filesToDocumentos(solicitacaoFiles);
    const novo: EventoFormando = {
      id: `ev${Date.now()}`,
      formandoId: id,
      formadorId: userId,
      tipo: "solicitacao-desligamento",
      criadoEm: new Date().toISOString(),
      motivo: solicitacaoForm.motivo.trim(),
      checklistDevolveuEstatuto: solicitacaoForm.checklistDevolveuEstatuto,
      checklistDevolveuSacramental: solicitacaoForm.checklistDevolveuSacramental,
      checklistApresentouCarta: solicitacaoForm.checklistApresentouCarta,
      documentos: documentos.length > 0 ? documentos : undefined,
    };
    setEventos((prev) => [...prev, novo]);
    setSolicitacaoOpen(false);
    setSolicitacaoForm({
      motivo: "",
      checklistDevolveuEstatuto: false,
      checklistDevolveuSacramental: false,
      checklistApresentouCarta: false,
    });
    setSolicitacaoFiles([]);
    toast.success("Solicitação de desligamento registrada.");
  }

  async function handleSaveDesligamento() {
    if (!desligamentoForm.motivo.trim()) return toast.error("O motivo é obrigatório.");
    if (!desligamentoForm.dataEfetiva) return toast.error("A data efetiva é obrigatória.");
    const motivoInatividade =
      desligamentoForm.tipoDesligamento === "voluntario"
        ? "desligamento-voluntario"
        : "desligamento-compulsorio";
    const documentos = await filesToDocumentos(desligamentoFiles);
    const novo: EventoFormando = {
      id: `ev${Date.now()}`,
      formandoId: id,
      formadorId: userId,
      tipo: "desligamento",
      criadoEm: new Date().toISOString(),
      tipoDesligamento: desligamentoForm.tipoDesligamento,
      motivo: desligamentoForm.motivo.trim(),
      dataEfetiva: desligamentoForm.dataEfetiva,
      checklistDevolveuEstatuto: desligamentoForm.checklistDevolveuEstatuto,
      checklistDevolveuSacramental: desligamentoForm.checklistDevolveuSacramental,
      checklistAcompanhadoModerador: desligamentoForm.checklistAcompanhadoModerador,
      documentos: documentos.length > 0 ? documentos : undefined,
    };
    setEventos((prev) => [...prev, novo]);
    setFormandos((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, ativo: false, motivoInatividade: motivoInatividade } : f
      )
    );
    setDesligamentoOpen(false);
    setDesligamentoForm({
      tipoDesligamento: "voluntario",
      motivo: "",
      dataEfetiva: "",
      checklistDevolveuEstatuto: false,
      checklistDevolveuSacramental: false,
      checklistAcompanhadoModerador: false,
    });
    setDesligamentoFiles([]);
    toast.success("Desligamento registrado.");
  }

  async function handleSaveLicenca() {
    if (!licencaForm.motivo.trim()) return toast.error("O motivo é obrigatório.");
    if (!licencaForm.dataInicioLicenca) return toast.error("A data de início é obrigatória.");
    const documentos = await filesToDocumentos(licencaFiles);
    const novo: EventoFormando = {
      id: `ev${Date.now()}`,
      formandoId: id,
      formadorId: userId,
      tipo: "licenca",
      criadoEm: new Date().toISOString(),
      motivo: licencaForm.motivo.trim(),
      dataInicioLicenca: licencaForm.dataInicioLicenca,
      dataFimLicenca: licencaForm.dataFimLicenca || undefined,
      documentos: documentos.length > 0 ? documentos : undefined,
    };
    setEventos((prev) => [...prev, novo]);
    setFormandos((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ativo: false, motivoInatividade: "licenca" } : f))
    );
    setLicencaOpen(false);
    setLicencaForm({ motivo: "", dataInicioLicenca: "", dataFimLicenca: "" });
    setLicencaFiles([]);
    toast.success("Licença registrada.");
  }

  function handleAvancarEtapa() {
    if (!proximaEtapa) return;
    const agora = new Date().toISOString();
    setFormandos((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const etapas = [...(f.progressoEtapas ?? [])];
        const atualIdx = etapas.findIndex((p) => p.nivel === f.nivelFormativo);
        if (atualIdx >= 0) {
          etapas[atualIdx] = { ...etapas[atualIdx], concluiuEm: agora };
        }
        etapas.push({
          nivel: proximaEtapa,
          formacoesComunitariasRealizadas: 0,
          retirosComunitariosRealizados: 0,
          retirosPessoaisRealizados: 0,
          iniciouEm: agora,
        });
        const req = REQUISITOS_ETAPAS[proximaEtapa];
        return {
          ...f,
          nivelFormativo: proximaEtapa,
          totalFormacoes: req.formacoesComunitarias + req.retirosComunitarios + req.retirosPessoais,
          formacoesRealizadas: 0,
          progressoEtapas: etapas,
        };
      })
    );
    setAvancarOpen(false);
    toast.success(`${formando!.nome} avançou para ${NIVEL_FORMATIVO_LABELS[proximaEtapa]}.`);
  }

  return (
    <div className="space-y-6 animate-in-fast">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/formandos"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-1 text-muted-foreground"
          )}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {termoFormando}s
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback
              className={`text-lg font-bold ${NIVEL_CORES[formando.nivelFormativo]}`}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{formando.nome}</h1>
              <Badge variant="outline" className={NIVEL_CORES[formando.nivelFormativo]}>
                {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
              </Badge>
              {formando.ativo ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Ativo
                </Badge>
              ) : formando.motivoInatividade === "licenca" ? (
                <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-200">
                  Em Licença
                </Badge>
              ) : formando.motivoInatividade === "desligamento-voluntario" ? (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                  Desligado
                </Badge>
              ) : formando.motivoInatividade === "desligamento-compulsorio" ? (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                  Demitido
                </Badge>
              ) : (
                <Badge variant="outline">Inativo</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {formando.email}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {formando.telefone}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm">
              Editar
            </Button>
            <Button size="sm">
              <Calendar className="h-4 w-4 mr-1.5" />
              Agendar
            </Button>
          </div>
        </div>
      </div>

      {/* Bloco da etapa atual */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* Cabeçalho: nome da etapa + tempo */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
              </span>
              <Badge className="text-xs h-5 bg-primary/10 text-primary border-0 px-1.5">
                Etapa atual
              </Badge>
            </div>
            {diasNaEtapa !== null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {diasNaEtapa < 30
                  ? `${diasNaEtapa} dia${diasNaEtapa !== 1 ? "s" : ""}`
                  : diasNaEtapa < 365
                  ? `${Math.round(diasNaEtapa / 30)} meses`
                  : `${Math.floor(diasNaEtapa / 365)} ano${Math.floor(diasNaEtapa / 365) !== 1 ? "s" : ""}`}{" "}
                na etapa
              </span>
            )}
          </div>

          {/* Métricas principais */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{realizadosAtual}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">de {totalAtual} formações</p>
            </div>
            <div className="text-center">
              <p
                className={cn(
                  "text-2xl font-bold",
                  progressoPct >= 100
                    ? "text-emerald-600"
                    : progressoPct >= 60
                    ? "text-primary"
                    : "text-amber-600"
                )}
              >
                {progressoPct}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">progresso</p>
            </div>
            <div className="text-center">
              {taxaPresencaAtual !== null ? (
                <>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      taxaPresencaAtual >= 80
                        ? "text-emerald-600"
                        : taxaPresencaAtual >= 60
                        ? "text-amber-600"
                        : "text-red-600"
                    )}
                  >
                    {taxaPresencaAtual}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">frequência</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-muted-foreground/40">—</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">frequência</p>
                </>
              )}
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{avaliacoesRealizadas.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">pareceres</p>
            </div>
          </div>

          {/* Barras de progresso por tipo */}
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                <span>Formações comunitárias</span>
                <span>
                  {progAtual?.formacoesComunitariasRealizadas ?? 0}/{reqAtual.formacoesComunitarias}
                </span>
              </div>
              <Progress value={comPctAtual} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                <span>Retiros comunitários</span>
                <span>
                  {progAtual?.retirosComunitariosRealizados ?? 0}/{reqAtual.retirosComunitarios}
                </span>
              </div>
              <Progress value={retComPctAtual} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                <span>Retiros pessoais</span>
                <span>
                  {progAtual?.retirosPessoaisRealizados ?? 0}/{reqAtual.retirosPessoais}
                </span>
              </div>
              <Progress value={retPesPctAtual} className="h-1.5" />
            </div>
          </div>

          {/* Rodapé: indicador de prontidão ou último parecer */}
          {podeAvancar && proximaEtapa ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pronto para avançar para {NIVEL_FORMATIVO_LABELS[proximaEtapa]}
            </div>
          ) : ultimaAvaliacao?.notaAdesao ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              Último parecer:
              <Badge
                variant="outline"
                className={cn("text-[10px] h-4 px-1.5", NOTA_ADESAO_CORES[ultimaAvaliacao.notaAdesao])}
              >
                {NOTA_ADESAO_LABELS[ultimaAvaliacao.notaAdesao]}
              </Badge>
              <span>
                em{" "}
                {format(parseISO(ultimaAvaliacao.criadoEm), "d 'de' MMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="jornada">
        <TabsList className="bg-muted/50 h-9">
          <TabsTrigger value="jornada" className="text-xs h-7">
            Jornada Formativa
          </TabsTrigger>
          <TabsTrigger value="visao-geral" className="text-xs h-7">
            Visão geral
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs h-7">
            Histórico de evolução
          </TabsTrigger>
          <TabsTrigger value="comentarios" className="text-xs h-7">
            Comentários do formador
          </TabsTrigger>
          <TabsTrigger value="dados" className="text-xs h-7">
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="registros" className="text-xs h-7">
            Registro de solicitações
          </TabsTrigger>
        </TabsList>

        {/* Jornada Formativa */}
        <TabsContent value="jornada" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Trilha Formativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {SEQUENCIA_ETAPAS.map((nivel, idx) => {
                const req = REQUISITOS_ETAPAS[nivel];
                const prog = (formando.progressoEtapas ?? []).find((p) => p.nivel === nivel);
                const isAtual = nivel === formando.nivelFormativo;
                const isConcluida = !!prog?.concluiuEm;
                const isLocked = idx > etapaAtualIdx;
                const isLast = idx === SEQUENCIA_ETAPAS.length - 1;

                const comPct = prog
                  ? Math.min(100, Math.round((prog.formacoesComunitariasRealizadas / req.formacoesComunitarias) * 100))
                  : 0;
                const retComPct = prog
                  ? Math.min(100, Math.round((prog.retirosComunitariosRealizados / req.retirosComunitarios) * 100))
                  : 0;
                const retPesPct = prog
                  ? Math.min(100, Math.round((prog.retirosPessoaisRealizados / req.retirosPessoais) * 100))
                  : 0;

                const missingItems: string[] = [];
                if (isAtual && prog) {
                  const fC = req.formacoesComunitarias - prog.formacoesComunitariasRealizadas;
                  const fRC = req.retirosComunitarios - prog.retirosComunitariosRealizados;
                  const fRP = req.retirosPessoais - prog.retirosPessoaisRealizados;
                  if (fC > 0) missingItems.push(`${fC} formação${fC > 1 ? "ões" : ""} comunitária${fC > 1 ? "s" : ""}`);
                  if (fRC > 0) missingItems.push(`${fRC} retiro${fRC > 1 ? "s" : ""} comunitário${fRC > 1 ? "s" : ""}`);
                  if (fRP > 0) missingItems.push(`${fRP} retiro${fRP > 1 ? "s" : ""} pessoal${fRP > 1 ? "is" : ""}`);
                }

                return (
                  <div key={nivel} className="flex gap-4">
                    {/* Ícone da timeline */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center",
                          isConcluida && "bg-emerald-100",
                          isAtual && !isConcluida && "bg-primary/15 ring-2 ring-primary/30",
                          isLocked && "bg-muted"
                        )}
                      >
                        {isConcluida ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground/50" />
                        ) : (
                          <span className="text-sm font-bold text-primary">{idx + 1}</span>
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            "flex-1 w-0.5 mt-1 min-h-[20px]",
                            isConcluida ? "bg-emerald-200" : "bg-border"
                          )}
                        />
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 pb-5">
                      {/* Cabeçalho da etapa */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            isAtual && "text-primary",
                            isConcluida && "text-foreground",
                            isLocked && "text-muted-foreground"
                          )}
                        >
                          {NIVEL_FORMATIVO_LABELS[nivel]}
                        </span>
                        {isAtual && (
                          <Badge className="text-xs h-4 bg-primary/10 text-primary border-0 px-1.5">
                            Atual
                          </Badge>
                        )}
                        {isConcluida && prog?.concluiuEm && (
                          <span className="text-xs text-muted-foreground">
                            · Concluída em{" "}
                            {format(parseISO(prog.concluiuEm), "MMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-xs text-muted-foreground/60">· Bloqueada</span>
                        )}
                      </div>

                      {/* Requisitos resumidos para etapas bloqueadas */}
                      {isLocked && (
                        <p className="text-xs text-muted-foreground/50">
                          {req.formacoesComunitarias} formações comunitárias
                          {" · "}{req.retirosComunitarios} retiro{req.retirosComunitarios > 1 ? "s" : ""} comunitário{req.retirosComunitarios > 1 ? "s" : ""}
                          {" · "}{req.retirosPessoais} retiros pessoais
                          {" · "}{req.duracaoAnos} ano{req.duracaoAnos > 1 ? "s" : ""}
                        </p>
                      )}

                      {/* Barras de progresso para etapas actuais e concluídas */}
                      {!isLocked && (
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs text-muted-foreground">Formações comunitárias</span>
                              <span className="text-xs text-muted-foreground">
                                {prog?.formacoesComunitariasRealizadas ?? 0}/{req.formacoesComunitarias}
                              </span>
                            </div>
                            <Progress value={comPct} className="h-1.5" />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs text-muted-foreground">Retiros comunitários</span>
                              <span className="text-xs text-muted-foreground">
                                {prog?.retirosComunitariosRealizados ?? 0}/{req.retirosComunitarios}
                              </span>
                            </div>
                            <Progress value={retComPct} className="h-1.5" />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs text-muted-foreground">Retiros pessoais</span>
                              <span className="text-xs text-muted-foreground">
                                {prog?.retirosPessoaisRealizados ?? 0}/{req.retirosPessoais}
                              </span>
                            </div>
                            <Progress value={retPesPct} className="h-1.5" />
                          </div>

                          {/* Secção de avanço (apenas para etapa actual) */}
                          {isAtual && (
                            <div className="pt-2">
                              {podeAvancar && proximaEtapa ? (
                                <Button
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => setAvancarOpen(true)}
                                >
                                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                                  Avançar para {NIVEL_FORMATIVO_LABELS[proximaEtapa]}
                                </Button>
                              ) : missingItems.length > 0 ? (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                                  <span>Faltam: {missingItems.join(", ")}</span>
                                </div>
                              ) : nivel === "formacao-permanente" ? (
                                <p className="text-xs text-muted-foreground">
                                  Etapa em curso — formação contínua.
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visão geral da jornada formativa */}
        <TabsContent value="visao-geral" className="mt-4 space-y-4">
          {/* Painel de indicadores globais */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Início da jornada</span>
                </div>
                <p className="text-sm font-semibold">
                  {inicioJornada
                    ? format(parseISO(inicioJornada), "MMM 'de' yyyy", { locale: ptBR })
                    : "—"}
                </p>
                {inicioJornada && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    há {differenceInDays(new Date(), parseISO(inicioJornada))} dias
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Award className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Etapas concluídas</span>
                </div>
                <p className="text-sm font-semibold">
                  {etapasConcluidas} de {SEQUENCIA_ETAPAS.length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Em curso: {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Total de formações</span>
                </div>
                <p className="text-sm font-semibold">{totalFormacoesGeral} realizadas</p>
                <p className="text-xs text-muted-foreground mt-0.5">em todas as etapas</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Frequência geral</span>
                </div>
                {taxaPresencaGeral !== null ? (
                  <>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        taxaPresencaGeral >= 80
                          ? "text-emerald-600"
                          : taxaPresencaGeral >= 60
                          ? "text-amber-600"
                          : "text-red-600"
                      )}
                    >
                      {taxaPresencaGeral}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formandoHistorico.filter((h) => h.presente).length} de{" "}
                      {formandoHistorico.length} presenças
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground/50">—</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Pareceres do formador</span>
                </div>
                <p className="text-sm font-semibold">{avaliacoesRealizadas.length}</p>
                {ultimaAvaliacao?.notaAdesao && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs text-muted-foreground">Último:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-4 px-1",
                        NOTA_ADESAO_CORES[ultimaAvaliacao.notaAdesao]
                      )}
                    >
                      {NOTA_ADESAO_LABELS[ultimaAvaliacao.notaAdesao]}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Eventos registrados</span>
                </div>
                <p className="text-sm font-semibold">{formandoEventos.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formandoEventos.filter((e) => e.tipo !== "avaliacao-adesao").length} marcos ·{" "}
                  {avaliacoesRealizadas.length} pareceres
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Linha do tempo das etapas */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Histórico de etapas formativas
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Progresso e frequência por etapa ao longo da jornada
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {SEQUENCIA_ETAPAS.map((nivel) => {
                const prog = (formando.progressoEtapas ?? []).find((p) => p.nivel === nivel);
                const req = REQUISITOS_ETAPAS[nivel];
                const isAtual = nivel === formando.nivelFormativo;
                const isConcluida = !!prog?.concluiuEm;
                const naoIniciada = !prog?.iniciouEm && !isAtual;

                const fcPct = prog
                  ? Math.min(
                      100,
                      Math.round(
                        (prog.formacoesComunitariasRealizadas / req.formacoesComunitarias) * 100
                      )
                    )
                  : 0;
                const rcPct = prog
                  ? Math.min(
                      100,
                      Math.round(
                        (prog.retirosComunitariosRealizados / req.retirosComunitarios) * 100
                      )
                    )
                  : 0;
                const rpPct = prog
                  ? Math.min(
                      100,
                      Math.round((prog.retirosPessoaisRealizados / req.retirosPessoais) * 100)
                    )
                  : 0;

                const pe = presencaPorEtapa(nivel);
                const taxaEtapa =
                  pe.total > 0 ? Math.round((pe.presentes / pe.total) * 100) : null;

                return (
                  <div
                    key={nivel}
                    className={cn(
                      "rounded-lg border p-4 space-y-3",
                      isAtual && "border-primary/30 bg-primary/5",
                      isConcluida && "border-emerald-200 bg-emerald-50/50",
                      naoIniciada && "border-border/40 bg-muted/20 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {NIVEL_FORMATIVO_LABELS[nivel]}
                        </span>
                        {isConcluida && (
                          <Badge className="text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-700 border-0">
                            Concluída
                          </Badge>
                        )}
                        {isAtual && !isConcluida && (
                          <Badge className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-0">
                            Em curso
                          </Badge>
                        )}
                        {naoIniciada && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            Não iniciada
                          </Badge>
                        )}
                      </div>
                      {prog?.iniciouEm && (
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(prog.iniciouEm), "MMM yyyy", { locale: ptBR })}
                          {prog.concluiuEm
                            ? ` → ${format(parseISO(prog.concluiuEm), "MMM yyyy", { locale: ptBR })}`
                            : " → em curso"}
                        </span>
                      )}
                    </div>

                    {!naoIniciada && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: "FC",
                              desc: "Formações comunitárias",
                              valor: prog?.formacoesComunitariasRealizadas ?? 0,
                              total: req.formacoesComunitarias,
                              pct: fcPct,
                            },
                            {
                              label: "RC",
                              desc: "Retiros comunitários",
                              valor: prog?.retirosComunitariosRealizados ?? 0,
                              total: req.retirosComunitarios,
                              pct: rcPct,
                            },
                            {
                              label: "RP",
                              desc: "Retiros pessoais",
                              valor: prog?.retirosPessoaisRealizados ?? 0,
                              total: req.retirosPessoais,
                              pct: rpPct,
                            },
                          ].map(({ label, desc, valor, total, pct }) => (
                            <div
                              key={label}
                              className="rounded-lg bg-background/70 p-2.5 space-y-1"
                            >
                              <div className="flex items-end justify-between">
                                <span className="text-base font-bold">{valor}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  de {total} {label}
                                </span>
                              </div>
                              <Progress value={pct} className="h-1" />
                              <p className="text-[10px] text-muted-foreground">{desc}</p>
                            </div>
                          ))}
                        </div>

                        {taxaEtapa !== null && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Activity className="h-3.5 w-3.5 shrink-0" />
                            <span>Frequência:</span>
                            <span
                              className={cn(
                                "font-semibold",
                                taxaEtapa >= 80
                                  ? "text-emerald-600"
                                  : taxaEtapa >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                              )}
                            >
                              {taxaEtapa}%
                            </span>
                            <span>
                              ({pe.presentes} de {pe.total} registros)
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Histórico de pareceres */}
          {avaliacoesRealizadas.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Histórico de pareceres do formador
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {avaliacoesRealizadas.length} parecer
                  {avaliacoesRealizadas.length !== 1 ? "es" : ""} registrado
                  {avaliacoesRealizadas.length !== 1 ? "s" : ""} em ordem cronológica
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...avaliacoesRealizadas].reverse().map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-border/50 bg-card p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {ev.notaAdesao && (
                          <Badge
                            variant="outline"
                            className={cn("text-xs", NOTA_ADESAO_CORES[ev.notaAdesao])}
                          >
                            {NOTA_ADESAO_LABELS[ev.notaAdesao]}
                          </Badge>
                        )}
                        {ev.periodoInicio && ev.periodoFim && (
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(ev.periodoInicio), "MMM yyyy", { locale: ptBR })} —{" "}
                            {format(parseISO(ev.periodoFim), "MMM yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(ev.criadoEm), "d/MM/yyyy")}
                      </span>
                    </div>
                    {ev.textoAvaliacao && (
                      <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                        {ev.textoAvaliacao}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Eventos e marcos */}
          {formandoEventos.filter((e) => e.tipo !== "avaliacao-adesao").length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Eventos e marcos</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registros significativos ao longo da jornada formativa
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...formandoEventos]
                  .filter((e) => e.tipo !== "avaliacao-adesao")
                  .reverse()
                  .map((ev) => (
                    <div key={ev.id} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full mt-1.5 shrink-0",
                          ev.tipo === "licenca"
                            ? "bg-violet-500"
                            : ev.tipo === "solicitacao-desligamento"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs", TIPO_EVENTO_CORES[ev.tipo])}
                          >
                            {TIPO_EVENTO_LABELS[ev.tipo]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(ev.criadoEm), "d 'de' MMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        {ev.motivo && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {ev.motivo}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Comentários do formador */}
          {formandoComentarios.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Comentários do formador</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formandoComentarios.length} comentário
                  {formandoComentarios.length !== 1 ? "s" : ""} registrado
                  {formandoComentarios.length !== 1 ? "s" : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    ["adesao", "progresso", "dificuldade", "observacao"] as TipoComentario[]
                  ).map((tipo) => {
                    const count = formandoComentarios.filter((c) => c.tipo === tipo).length;
                    if (count === 0) return null;
                    return (
                      <div
                        key={tipo}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <span className="text-xs text-muted-foreground">
                          {TIPO_COMENTARIO_LABELS[tipo]}
                        </span>
                        <span className="text-sm font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2.5">
                  {formandoComentarios.slice(0, 5).map((c) => (
                    <div key={c.id} className="border-l-2 border-border pl-3">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] h-4 px-1",
                            TIPO_COMENTARIO_CORES[c.tipo]
                          )}
                        >
                          {TIPO_COMENTARIO_LABELS[c.tipo]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(c.criadoEm), "d/MM/yyyy")}
                        </span>
                      </div>
                      <p className="text-xs text-foreground line-clamp-2">{c.texto}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado vazio */}
          {formandoEventos.length === 0 &&
            formandoComentarios.length === 0 &&
            formandoHistorico.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-foreground text-sm">Histórico ainda vazio</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registre avaliações, frequências e comentários para acompanhar a jornada
                    formativa.
                  </p>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {/* Histórico de evolução */}
        <TabsContent value="historico" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Histórico de evolução</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Formações do nível{" "}
                  <span className="font-medium">
                    {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
                  </span>{" "}
                  · {formandoAgendamentos.length} agendamento
                  {formandoAgendamentos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {formandoAgendamentos.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-foreground text-sm">
                    Nenhuma formação agendada para este nível
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acesse a seção Formações para criar agendamentos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formandoAgendamentos.map((ag) => {
                    const registro = getRegistro(ag.id);
                    const isCancelada = ag.status === "cancelada";
                    const dataFormatada = format(
                      parseISO(ag.dataInicio),
                      "d 'de' MMMM 'de' yyyy",
                      { locale: ptBR }
                    );
                    const horaInicio = format(parseISO(ag.dataInicio), "HH:mm");
                    const horaFim = format(parseISO(ag.dataFim), "HH:mm");

                    return (
                      <div
                        key={ag.id}
                        className={`rounded-xl border p-4 transition-colors ${
                          isCancelada
                            ? "bg-muted/20 border-border/30 opacity-60"
                            : "bg-card border-border/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                              ag.status === "realizada"
                                ? "bg-slate-100"
                                : ag.status === "cancelada"
                                ? "bg-red-50"
                                : "bg-primary/10"
                            }`}
                          >
                            {ag.status === "cancelada" ? (
                              <XCircle className="h-4 w-4 text-red-400" />
                            ) : ag.status === "realizada" ? (
                              <CheckCircle2 className="h-4 w-4 text-slate-500" />
                            ) : (
                              <Calendar className="h-4 w-4 text-primary" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground leading-tight">
                                  {ag.formacaoTema}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {dataFormatada} · {horaInicio}–{horaFim}
                                </p>
                                {ag.local && (
                                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {ag.local}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${STATUS_COLORS[ag.status]}`}
                                >
                                  {STATUS_FORMACAO_LABELS[ag.status]}
                                </Badge>
                                {!registro && !isCancelada && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => openRegistro(ag)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Registrar participação
                                  </Button>
                                )}
                              </div>
                            </div>

                            {registro && (
                              <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-muted/40 p-2.5">
                                <div
                                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                                    registro.presente ? "bg-emerald-100" : "bg-red-100"
                                  }`}
                                >
                                  {registro.presente ? (
                                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <UserX className="h-3.5 w-3.5 text-red-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={`text-xs h-5 ${
                                        registro.presente
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-red-50 text-red-600 border-red-200"
                                      }`}
                                    >
                                      {registro.presente ? "Presente" : "Ausente"}
                                    </Badge>
                                  </div>
                                  {registro.observacao && (
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                      {registro.observacao}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comentários do formador */}
        <TabsContent value="comentarios" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Comentários do {termoFormador}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pareceres sobre a adesão ao plano formativo
                </p>
              </div>
              <Button size="sm" onClick={() => setComentarioOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Novo comentário
              </Button>
            </CardHeader>
            <CardContent>
              {formandoComentarios.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-foreground text-sm">Nenhum comentário registrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em &quot;Novo comentário&quot; para registrar seu parecer.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formandoComentarios.map((comentario) => (
                    <div
                      key={comentario.id}
                      className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs ${TIPO_COMENTARIO_CORES[comentario.tipo]}`}
                        >
                          {TIPO_COMENTARIO_LABELS[comentario.tipo]}
                        </Badge>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(comentario.criadoEm),
                            "d 'de' MMM 'de' yyyy",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{comentario.texto}</p>
                      {comentario.formadorNome && (
                        <p className="text-xs text-muted-foreground">
                          — {comentario.formadorNome}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dados Pessoais */}
        <TabsContent value="dados" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 space-y-4">
              {[
                { icon: User, label: "Nome completo", value: formando.nome },
                {
                  icon: Calendar,
                  label: "Data de nascimento",
                  value: `${format(parseISO(formando.dataNascimento), "dd/MM/yyyy")} (${idade} anos)`,
                },
                {
                  icon: User,
                  label: "Estado civil",
                  value: ESTADO_CIVIL_LABELS[formando.estadoCivil],
                },
                {
                  icon: MapPin,
                  label: "Modalidade",
                  value: MODALIDADE_LABELS[formando.modalidade],
                },
                {
                  icon: Calendar,
                  label: "Data de ingresso",
                  value: format(parseISO(formando.dataIngresso), "dd/MM/yyyy"),
                },
                { icon: Mail, label: "E-mail", value: formando.email },
                { icon: Phone, label: "Telefone", value: formando.telefone },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registros */}
        <TabsContent value="registros" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Marcos da caminhada formativa</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Avaliações, solicitações de desligamento, desligamentos e licenças
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-5">
                <Button size="sm" variant="outline" onClick={() => setAvaliacaoOpen(true)}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Parecer do formador
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSolicitacaoOpen(true)}>
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                  Solicitação de Desligamento
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDesligamentoOpen(true)}>
                  <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                  Desligamento compulsório
                </Button>
                <Button size="sm" variant="outline" onClick={() => setLicencaOpen(true)}>
                  <LogOut className="h-3.5 w-3.5 mr-1.5" />
                  Registro de licença
                </Button>
              </div>

              {formandoEventos.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-foreground text-sm">Nenhum registro encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use os botões acima para registrar marcos na jornada formativa.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formandoEventos.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-xl border border-border/50 bg-card p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs ${TIPO_EVENTO_CORES[ev.tipo]}`}
                        >
                          {TIPO_EVENTO_LABELS[ev.tipo]}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(ev.criadoEm), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>

                      {ev.tipo === "avaliacao-adesao" && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Nota:</span>
                            {ev.notaAdesao && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${NOTA_ADESAO_CORES[ev.notaAdesao]}`}
                              >
                                {NOTA_ADESAO_LABELS[ev.notaAdesao]}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              · Período:{" "}
                              {ev.periodoInicio &&
                                format(parseISO(ev.periodoInicio), "dd/MM/yyyy")}{" "}
                              —{" "}
                              {ev.periodoFim && format(parseISO(ev.periodoFim), "dd/MM/yyyy")}
                            </span>
                          </div>
                          {ev.textoAvaliacao && (
                            <p className="text-sm text-foreground leading-relaxed">
                              {ev.textoAvaliacao}
                            </p>
                          )}
                        </div>
                      )}

                      {ev.tipo === "solicitacao-desligamento" && (
                        <div className="space-y-1.5">
                          {ev.motivo && (
                            <p className="text-sm text-foreground leading-relaxed">{ev.motivo}</p>
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {ev.checklistDevolveuEstatuto ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                              Devolveu Estatuto
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {ev.checklistDevolveuSacramental ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                              Devolveu Sacramental
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {ev.checklistApresentouCarta ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                              Apresentou carta de solicitação de desligamento
                            </span>
                          </div>
                        </div>
                      )}

                      {ev.tipo === "desligamento" && (
                        <div className="space-y-1.5">
                          <span className="text-xs text-muted-foreground">
                            Tipo:{" "}
                            {ev.tipoDesligamento === "voluntario" ? "Voluntário" : "Compulsório"}
                            {ev.dataEfetiva &&
                              ` · Data efetiva: ${format(parseISO(ev.dataEfetiva), "dd/MM/yyyy")}`}
                          </span>
                          {ev.motivo && (
                            <p className="text-sm text-foreground leading-relaxed">{ev.motivo}</p>
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {ev.checklistDevolveuEstatuto ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                              Devolveu Estatuto
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {ev.checklistDevolveuSacramental ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                              Devolveu Sacramental
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {ev.checklistAcompanhadoModerador ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                              )}
                              Foi acompanhado do moderador geral/responsável local
                            </span>
                          </div>
                        </div>
                      )}

                      {ev.tipo === "licenca" && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">
                            Início:{" "}
                            {ev.dataInicioLicenca &&
                              format(parseISO(ev.dataInicioLicenca), "dd/MM/yyyy")}
                            {ev.dataFimLicenca &&
                              ` · Prev. retorno: ${format(parseISO(ev.dataFimLicenca), "dd/MM/yyyy")}`}
                          </span>
                          {ev.motivo && (
                            <p className="text-sm text-foreground leading-relaxed">{ev.motivo}</p>
                          )}
                        </div>
                      )}

                      {ev.documentos && ev.documentos.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {ev.documentos.length} documento
                            {ev.documentos.length !== 1 ? "s" : ""} anexado
                            {ev.documentos.length !== 1 ? "s" : ""}
                          </p>
                          {ev.documentos.map((doc, i) => (
                            <a
                              key={i}
                              href={doc.dados}
                              download={doc.nome}
                              className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
                            >
                              <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="flex-1 min-w-0 truncate">{doc.nome}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {(doc.tamanho / 1024).toFixed(0)} KB
                              </span>
                              <Download className="h-3 w-3 text-muted-foreground shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Registrar Participação */}
      <Dialog open={registroOpen} onOpenChange={setRegistroOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar participação</DialogTitle>
          </DialogHeader>
          {selectedAg && (
            <div className="grid gap-4 py-2">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">{selectedAg.formacaoTema}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(selectedAg.dataInicio), "d 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}{" "}
                  · {format(parseISO(selectedAg.dataInicio), "HH:mm")}–
                  {format(parseISO(selectedAg.dataFim), "HH:mm")}
                </p>
                {selectedAg.local && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedAg.local}
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label>Presença</Label>
                <Select
                  value={registroForm.presente}
                  onValueChange={(v) =>
                    v && setRegistroForm((prev) => ({ ...prev, presente: v }))
                  }
                  items={{ true: "Presente", false: "Ausente" }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Presente</SelectItem>
                    <SelectItem value="false">Ausente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Observação sobre a participação neste encontro</Label>
                <Textarea
                  placeholder="Descreva como foi a adesão e participação do formando neste dia..."
                  value={registroForm.observacao}
                  onChange={(e) =>
                    setRegistroForm((prev) => ({ ...prev, observacao: e.target.value }))
                  }
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRegistroOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRegistro}>Salvar registro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Comentário */}
      <Dialog open={comentarioOpen} onOpenChange={setComentarioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo comentário do {termoFormador}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Tipo de comentário</Label>
              <Select
                value={comentarioForm.tipo}
                onValueChange={(v) =>
                  v && setComentarioForm((prev) => ({ ...prev, tipo: v as TipoComentario }))
                }
                items={TIPO_COMENTARIO_LABELS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adesao">Adesão</SelectItem>
                  <SelectItem value="progresso">Progresso</SelectItem>
                  <SelectItem value="dificuldade">Dificuldade</SelectItem>
                  <SelectItem value="observacao">Observação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>
                Comentário <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Descreva suas percepções sobre a adesão do formando ao plano formativo..."
                value={comentarioForm.texto}
                onChange={(e) =>
                  setComentarioForm((prev) => ({ ...prev, texto: e.target.value }))
                }
                rows={5}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComentarioOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveComentario}>Salvar comentário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Avaliação de Adesão */}
      <Dialog open={avaliacaoOpen} onOpenChange={setAvaliacaoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Parecer do formador</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>
                  Período — início <span className="text-destructive">*</span>
                </Label>
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={avaliacaoForm.periodoInicio}
                  onChange={(e) =>
                    setAvaliacaoForm((p) => ({ ...p, periodoInicio: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  Período — fim <span className="text-destructive">*</span>
                </Label>
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={avaliacaoForm.periodoFim}
                  onChange={(e) =>
                    setAvaliacaoForm((p) => ({ ...p, periodoFim: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Nota de adesão</Label>
              <Select
                value={avaliacaoForm.notaAdesao}
                onValueChange={(v) =>
                  v && setAvaliacaoForm((p) => ({ ...p, notaAdesao: v as NotaAdesao }))
                }
                items={NOTA_ADESAO_LABELS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="otima">Ótima</SelectItem>
                  <SelectItem value="boa">Boa</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="insuficiente">Insuficiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>
                Texto da avaliação <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Descreva a adesão do formando ao plano formativo no período avaliado..."
                value={avaliacaoForm.textoAvaliacao}
                onChange={(e) =>
                  setAvaliacaoForm((p) => ({ ...p, textoAvaliacao: e.target.value }))
                }
                rows={5}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAvaliacaoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAvaliacao}>Salvar avaliação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Solicitação de Desligamento */}
      <Dialog open={solicitacaoOpen} onOpenChange={setSolicitacaoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitação de Desligamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-700">
                Registra a solicitação formal de desligamento do formando. Para efetivar o
                desligamento, utilize &quot;Registrar Desligamento&quot;.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>
                Motivo da solicitação <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Descreva o motivo da solicitação de desligamento..."
                value={solicitacaoForm.motivo}
                onChange={(e) => setSolicitacaoForm((p) => ({ ...p, motivo: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label>Checklist</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={solicitacaoForm.checklistDevolveuEstatuto}
                    onChange={(e) =>
                      setSolicitacaoForm((p) => ({
                        ...p,
                        checklistDevolveuEstatuto: e.target.checked,
                      }))
                    }
                  />
                  Devolveu Estatuto
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={solicitacaoForm.checklistDevolveuSacramental}
                    onChange={(e) =>
                      setSolicitacaoForm((p) => ({
                        ...p,
                        checklistDevolveuSacramental: e.target.checked,
                      }))
                    }
                  />
                  Devolveu Sacramental
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={solicitacaoForm.checklistApresentouCarta}
                    onChange={(e) =>
                      setSolicitacaoForm((p) => ({
                        ...p,
                        checklistApresentouCarta: e.target.checked,
                      }))
                    }
                  />
                  Apresentou carta de solicitação de desligamento
                </label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Documentos anexados
              </Label>
              <label className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground text-center">
                  Clique para selecionar ou arraste arquivos
                  <br />
                  <span className="text-[10px] text-muted-foreground/70">
                    PDF ou DOCX · máx. 5 MB por arquivo
                  </span>
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files, setSolicitacaoFiles)}
                />
              </label>
              {solicitacaoFiles.length > 0 && (
                <div className="space-y-1">
                  {solicitacaoFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs flex-1 min-w-0 truncate">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i, setSolicitacaoFiles)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSolicitacaoOpen(false); setSolicitacaoFiles([]); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSolicitacao}>Registrar solicitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Desligamento */}
      <Dialog open={desligamentoOpen} onOpenChange={setDesligamentoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desligamento compulsório</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-700">
                Esta ação marcará o formando como inativo. O registro ficará disponível para
                relatórios anuais e sob demanda.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo de desligamento</Label>
              <Select
                value={desligamentoForm.tipoDesligamento}
                onValueChange={(v) =>
                  v &&
                  setDesligamentoForm((p) => ({
                    ...p,
                    tipoDesligamento: v as TipoDesligamento,
                  }))
                }
                items={{ voluntario: "Voluntário", compulsorio: "Compulsório (Demissão)" }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voluntario">Voluntário</SelectItem>
                  <SelectItem value="compulsorio">Compulsório (Demissão)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>
                Data efetiva <span className="text-destructive">*</span>
              </Label>
              <input
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={desligamentoForm.dataEfetiva}
                onChange={(e) =>
                  setDesligamentoForm((p) => ({ ...p, dataEfetiva: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Descreva o motivo do desligamento..."
                value={desligamentoForm.motivo}
                onChange={(e) => setDesligamentoForm((p) => ({ ...p, motivo: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label>Checklist</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={desligamentoForm.checklistDevolveuEstatuto}
                    onChange={(e) =>
                      setDesligamentoForm((p) => ({
                        ...p,
                        checklistDevolveuEstatuto: e.target.checked,
                      }))
                    }
                  />
                  Devolveu Estatuto
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={desligamentoForm.checklistDevolveuSacramental}
                    onChange={(e) =>
                      setDesligamentoForm((p) => ({
                        ...p,
                        checklistDevolveuSacramental: e.target.checked,
                      }))
                    }
                  />
                  Devolveu Sacramental
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={desligamentoForm.checklistAcompanhadoModerador}
                    onChange={(e) =>
                      setDesligamentoForm((p) => ({
                        ...p,
                        checklistAcompanhadoModerador: e.target.checked,
                      }))
                    }
                  />
                  Foi acompanhado do moderador geral/responsável local
                </label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Documentos anexados
              </Label>
              <label className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground text-center">
                  Clique para selecionar ou arraste arquivos
                  <br />
                  <span className="text-[10px] text-muted-foreground/70">
                    PDF ou DOCX · máx. 5 MB por arquivo
                  </span>
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files, setDesligamentoFiles)}
                />
              </label>
              {desligamentoFiles.length > 0 && (
                <div className="space-y-1">
                  {desligamentoFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs flex-1 min-w-0 truncate">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i, setDesligamentoFiles)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDesligamentoOpen(false); setDesligamentoFiles([]); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSaveDesligamento}>
              Confirmar desligamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Licença */}
      <Dialog open={licencaOpen} onOpenChange={setLicencaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registro de licença</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>
                  Data de início <span className="text-destructive">*</span>
                </Label>
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={licencaForm.dataInicioLicenca}
                  onChange={(e) =>
                    setLicencaForm((p) => ({ ...p, dataInicioLicenca: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Prev. retorno</Label>
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={licencaForm.dataFimLicenca}
                  onChange={(e) =>
                    setLicencaForm((p) => ({ ...p, dataFimLicenca: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>
                Motivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Descreva o motivo da licença..."
                value={licencaForm.motivo}
                onChange={(e) => setLicencaForm((p) => ({ ...p, motivo: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Documentos anexados
              </Label>
              <label className="flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground text-center">
                  Clique para selecionar ou arraste arquivos
                  <br />
                  <span className="text-[10px] text-muted-foreground/70">
                    PDF ou DOCX · máx. 5 MB por arquivo
                  </span>
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files, setLicencaFiles)}
                />
              </label>
              {licencaFiles.length > 0 && (
                <div className="space-y-1">
                  {licencaFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs flex-1 min-w-0 truncate">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i, setLicencaFiles)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setLicencaOpen(false); setLicencaFiles([]); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLicenca}>Registrar licença</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Avançar Etapa */}
      {proximaEtapa && (
        <Dialog open={avancarOpen} onOpenChange={setAvancarOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar avanço de etapa</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                Você está prestes a avançar{" "}
                <span className="font-semibold text-foreground">{formando.nome}</span> da etapa{" "}
                <span className="font-medium">{NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}</span>{" "}
                para{" "}
                <span className="font-medium">{NIVEL_FORMATIVO_LABELS[proximaEtapa]}</span>.
              </p>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-700">
                  Esta ação registrará a conclusão da etapa actual e não pode ser desfeita.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAvancarOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAvancarEtapa}>
                <ArrowRight className="h-4 w-4 mr-1.5" />
                Confirmar avanço
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
