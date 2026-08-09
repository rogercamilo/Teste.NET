"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  NIVEIS_FORMATIVOS_SELECIONAVEIS,
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
  NOTA_ADESAO_DOT,
  PERSPECTIVA_LABELS,
  TIPO_PROCESSO_LABELS,
  STATUS_PROCESSO_LABELS,
  STATUS_PROCESSO_COLORS,
  getProximaEtapa,
  podeAvancarEtapa,
  totalRequerido,
  type StatusFormacao,
  type TipoComentario,
  type Formando,
  type ComentarioFormando,
  type Agendamento,
  type EventoFormando,
  type PresencaFormacao,
  type DocumentoAnexo,
  type NotaAdesao,
  type TipoDesligamento,
  type PerspectivaFormativa,
  type GrupoFormacao,
  type ProcessoEclesiastico,
  type TipoProcessoEclesiastico,
  type NivelFormativo,
  type Modalidade,
  type EstadoCivil,
  type TipoOrganizacao,
  hasCanonicalAccess,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatPhone, applyPhoneMask, stripPhone, resolveImageSrc, idadeEmAnos } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AcompanhamentoSection,
  type AcompanhamentoFormandoItem,
  type SolicitacaoAcompanhamentoItem,
} from "./AcompanhamentoSection";
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
  Camera,
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
  ScrollText,
  TrendingUp,
  Upload,
  UserCheck,
  UserMinus,
  UserX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const PERSPECTIVAS_INFO: Record<PerspectivaFormativa, { desc: string; cor: string; bg: string }> = {
  humana: {
    desc: "Autoconhecimento, maturidade afetiva, vida equilibrada e crescimento integral.",
    cor: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
  },
  espiritual: {
    desc: "Intimidade com Deus, vida de oração, vida sacramental e devoção.",
    cor: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  comunitaria: {
    desc: "Vivência fraterna, comunhão de bens, partilha e vivência apostólica.",
    cor: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
};

const PERSPECTIVAS: PerspectivaFormativa[] = ["humana", "espiritual", "comunitaria"];

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

interface Props {
  id: string;
  formando: Formando;
  comentarios: ComentarioFormando[];
  eventos: EventoFormando[];
  presencas: PresencaFormacao[];
  agendamentos: Agendamento[];
  morada: GrupoFormacao | null;
  todasMoradas: { id: string; nome: string; nivelFormativo: string | null }[];
  userId: string;
  userName: string;
  userRole: string;
  userGrupoFormacaoId: string | null;
  termoFormando: string;
  termoFormador: string;
  tipoOrganizacao: string | null;
  processosEclesiasticos: ProcessoEclesiastico[];
  vocacionalHabilitado: boolean;
  cartasEtapa: CartaEtapa[];
  acompanhamentos: AcompanhamentoFormandoItem[];
  solicitacoesAcompanhamento: SolicitacaoAcompanhamentoItem[];
}

export interface CartaEtapa {
  id: string;
  nome: string;
  nivel: NivelFormativo;
  extensao: string;
  tamanho: number;
  dataEvento: string | null;
  criadoEm: string;
}

export default function FormandoDetailClient({
  id,
  formando,
  comentarios,
  eventos,
  presencas,
  agendamentos,
  morada,
  todasMoradas,
  userId,
  userName,
  userGrupoFormacaoId,
  termoFormando,
  termoFormador,
  tipoOrganizacao,
  processosEclesiasticos,
  vocacionalHabilitado,
  cartasEtapa,
  acompanhamentos,
  solicitacoesAcompanhamento,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [registroOpen, setRegistroOpen] = useState(false);
  const [selectedAg, setSelectedAg] = useState<Agendamento | null>(null);
  const [registroForm, setRegistroForm] = useState({ presente: "true", observacao: "" });

  // Cartas de etapa (P1.1)
  const [cartaOpen, setCartaOpen] = useState(false);
  const [cartaNivel, setCartaNivel] = useState<NivelFormativo>("vocacional");
  const [cartaFile, setCartaFile] = useState<File | null>(null);
  const [cartaData, setCartaData] = useState("");
  const [cartaSubmitting, setCartaSubmitting] = useState(false);
  const mostraDocumentos =
    hasCanonicalAccess(tipoOrganizacao as TipoOrganizacao | null) || vocacionalHabilitado;

  const [comentarioOpen, setComentarioOpen] = useState(false);
  const [comentarioForm, setComentarioForm] = useState<{ tipo: TipoComentario; texto: string }>({
    tipo: "adesao",
    texto: "",
  });

  const [avancarOpen, setAvancarOpen] = useState(false);
  const [fotoDialogOpen, setFotoDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: "",
    dataNascimento: "",
    estadoCivil: "solteiro" as EstadoCivil,
    modalidade: "presencial" as Modalidade,
    nivelFormativo: "pre-discipulado" as NivelFormativo,
    dataIngresso: "",
    telefone: "",
    email: "",
    grupoFormacaoId: "",
    nomeSocial: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    paisResidencia: "",
    nacionalidade: "",
    rg: "",
    orgaoEmissor: "",
    cep: "",
    paroquiaReferencia: "",
    numFilhos: "",
  });


  const [avaliacaoOpen, setAvaliacaoOpen] = useState(false);
  const [avaliacaoForm, setAvaliacaoForm] = useState<{
    periodoInicio: string;
    periodoFim: string;
    notaAdesao: NotaAdesao;
    textoAvaliacao: string;
  }>({ periodoInicio: "", periodoFim: "", notaAdesao: "boa", textoAvaliacao: "" });

  const [perspectivaOpen, setPerspectivaOpen] = useState<PerspectivaFormativa | null>(null);
  const [perspectivaForm, setPerspectivaForm] = useState<{ nota: NotaAdesao; texto: string }>({
    nota: "boa",
    texto: "",
  });

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

  const [novoProcessoOpen, setNovoProcessoOpen] = useState(false);
  const [novoProcessoTipo, setNovoProcessoTipo] = useState<TipoProcessoEclesiastico>("inicio_vocacional");

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

  async function handleUploadCarta() {
    if (!cartaFile) {
      toast.error("Selecione o arquivo da carta.");
      return;
    }
    setCartaSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", cartaFile);
      fd.append("nivelFormativo", cartaNivel);
      if (cartaData) fd.append("dataEvento", cartaData);
      const res = await fetch(`/api/formandos/${id}/cartas`, { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Falha ao registrar carta." }));
        throw new Error(data.error ?? "Falha ao registrar carta.");
      }
      toast.success("Carta de etapa registrada.");
      setCartaOpen(false);
      setCartaFile(null);
      setCartaData("");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao registrar carta.");
    } finally {
      setCartaSubmitting(false);
    }
  }

  async function handleDeleteCarta(arquivoId: string) {
    try {
      const res = await fetch(`/api/arquivos/${arquivoId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Falha ao excluir." }));
        throw new Error(data.error ?? "Falha ao excluir.");
      }
      toast.success("Carta removida.");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir.");
    }
  }

  async function uploadDocumentosParaServidor(
    files: File[],
    eventoId: string,
    formandoId: string,
    formandoNome: string,
    tipoEvento: string
  ): Promise<DocumentoAnexo[]> {
    const results: DocumentoAnexo[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("eventoId", eventoId);
      fd.append("formandoId", formandoId);
      fd.append("formandoNome", formandoNome);
      fd.append("tipoEvento", tipoEvento);
      if (userGrupoFormacaoId) fd.append("grupoFormacaoId", userGrupoFormacaoId);
      const res = await fetch("/api/documentos", { method: "POST", body: fd });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`"${file.name}": ${msg}`);
      }
      results.push((await res.json()) as DocumentoAnexo);
    }
    return results;
  }

  const initials = formando.nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const idade = idadeEmAnos(formando.dataNascimento);

  const progAtual = (formando.progressoEtapas ?? []).find(
    (p) => p.nivel === formando.nivelFormativo
  );
  const totalAtual = formando.totalFormacoes > 0 ? formando.totalFormacoes : totalRequerido(formando.nivelFormativo);
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
    .slice()
    .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));

  function getRegistro(agId: string) {
    return presencas.find((h) => h.agendamentoId === agId);
  }

  const formandoComentarios = comentarios
    .slice()
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  function openRegistro(ag: Agendamento) {
    setSelectedAg(ag);
    setRegistroForm({ presente: "true", observacao: "" });
    setRegistroOpen(true);
  }

  async function handleSaveRegistro() {
    if (!selectedAg) return;
    try {
      const res = await fetch("/api/presencas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agendamentoId: selectedAg.id,
          formandoId: id,
          presente: registroForm.presente === "true",
          justificativa: registroForm.observacao.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      setRegistroOpen(false);
      toast.success("Participação registrada.");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar participação.");
    }
  }

  async function handleSaveComentario() {
    if (!comentarioForm.texto.trim()) return toast.error("O texto do comentário é obrigatório.");
    try {
      const res = await fetch("/api/comentarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formandoId: id, texto: comentarioForm.texto.trim(), tipo: comentarioForm.tipo }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      setComentarioOpen(false);
      setComentarioForm({ tipo: "adesao", texto: "" });
      toast.success("Comentário salvo.");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar comentário.");
    }
  }

  const formandoEventos = eventos
    .slice()
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  const avaliacoesRealizadas = formandoEventos.filter((e) => e.tipo === "avaliacao-adesao");
  const ultimaAvaliacao = avaliacoesRealizadas[0];

  const presencaPorEtapa = (nivel: string) => {
    const regs = presencas.filter((h) => h.nivelFormativo === nivel);
    return { total: regs.length, presentes: regs.filter((h) => h.presente).length };
  };
  const presencaAtual = presencaPorEtapa(formando.nivelFormativo);
  const taxaPresencaAtual =
    presencaAtual.total > 0
      ? Math.round((presencaAtual.presentes / presencaAtual.total) * 100)
      : null;
  const taxaPresencaGeral =
    presencas.length > 0
      ? Math.round(
          (presencas.filter((h) => h.presente).length / presencas.length) * 100
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
  const primeiraEtapa = [...(formando.progressoEtapas ?? [])]
    .filter((p) => p.iniciouEm || p.dataMissaCompromisso)
    .sort((a, b) => (a.iniciouEm ?? a.dataMissaCompromisso ?? "").localeCompare(b.iniciouEm ?? b.dataMissaCompromisso ?? ""))[0];
  const inicioJornada = primeiraEtapa?.dataMissaCompromisso ?? primeiraEtapa?.iniciouEm;

  async function handleSaveAvaliacao() {
    if (!avaliacaoForm.periodoInicio || !avaliacaoForm.periodoFim)
      return toast.error("Informe o período da avaliação.");
    if (!avaliacaoForm.textoAvaliacao.trim())
      return toast.error("O texto da avaliação é obrigatório.");
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formandoId: id,
          tipo: "avaliacao-adesao",
          periodoInicio: avaliacaoForm.periodoInicio,
          periodoFim: avaliacaoForm.periodoFim,
          notaAdesao: avaliacaoForm.notaAdesao,
          textoAvaliacao: avaliacaoForm.textoAvaliacao.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      setAvaliacaoOpen(false);
      setAvaliacaoForm({ periodoInicio: "", periodoFim: "", notaAdesao: "boa", textoAvaliacao: "" });
      toast.success("Avaliação de adesão registrada.");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar avaliação.");
    }
  }

  async function handleSavePerspectiva() {
    if (!perspectivaOpen) return;
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formandoId: id,
          tipo: "avaliacao-adesao",
          perspectiva: perspectivaOpen,
          notaAdesao: perspectivaForm.nota,
          textoAvaliacao: perspectivaForm.texto.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      setPerspectivaOpen(null);
      setPerspectivaForm({ nota: "boa", texto: "" });
      toast.success(`Avaliação da perspectiva ${PERSPECTIVA_LABELS[perspectivaOpen]} registrada.`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar perspectiva.");
    }
  }


  async function handleSaveSolicitacao() {
    if (!solicitacaoForm.motivo.trim()) return toast.error("O motivo é obrigatório.");
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formandoId: id, tipo: "solicitacao-desligamento",
          motivo: solicitacaoForm.motivo.trim(),
          checklistDevolveuEstatuto: solicitacaoForm.checklistDevolveuEstatuto,
          checklistDevolveuSacramental: solicitacaoForm.checklistDevolveuSacramental,
          checklistApresentouCarta: solicitacaoForm.checklistApresentouCarta,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      const evento = await res.json();
      if (solicitacaoFiles.length > 0) {
        await uploadDocumentosParaServidor(solicitacaoFiles, evento.id, id, formando.nome, "solicitacao-desligamento");
      }
      setSolicitacaoOpen(false);
      setSolicitacaoForm({ motivo: "", checklistDevolveuEstatuto: false, checklistDevolveuSacramental: false, checklistApresentouCarta: false });
      setSolicitacaoFiles([]);
      toast.success("Solicitação de desligamento registrada.");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar solicitação.");
    }
  }

  async function handleSaveDesligamento() {
    if (!desligamentoForm.motivo.trim()) return toast.error("O motivo é obrigatório.");
    if (!desligamentoForm.dataEfetiva) return toast.error("A data efetiva é obrigatória.");
    const motivoInatividade = desligamentoForm.tipoDesligamento === "voluntario" ? "desligamento-voluntario" : "desligamento-compulsorio";
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formandoId: id, tipo: "desligamento",
          tipoDesligamento: desligamentoForm.tipoDesligamento,
          motivo: desligamentoForm.motivo.trim(),
          dataEfetiva: desligamentoForm.dataEfetiva,
          checklistDevolveuEstatuto: desligamentoForm.checklistDevolveuEstatuto,
          checklistDevolveuSacramental: desligamentoForm.checklistDevolveuSacramental,
          checklistAcompanhadoModerador: desligamentoForm.checklistAcompanhadoModerador,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      const evento = await res.json();
      if (desligamentoFiles.length > 0) {
        await uploadDocumentosParaServidor(desligamentoFiles, evento.id, id, formando.nome, "desligamento");
      }
      await fetch(`/api/formandos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: false, motivoInatividade }),
      });
      setDesligamentoOpen(false);
      setDesligamentoForm({ tipoDesligamento: "voluntario", motivo: "", dataEfetiva: "", checklistDevolveuEstatuto: false, checklistDevolveuSacramental: false, checklistAcompanhadoModerador: false });
      setDesligamentoFiles([]);
      toast.success("Desligamento registrado.");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar desligamento.");
    }
  }

  async function handleSaveLicenca() {
    if (!licencaForm.motivo.trim()) return toast.error("O motivo é obrigatório.");
    if (!licencaForm.dataInicioLicenca) return toast.error("A data de início é obrigatória.");
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formandoId: id, tipo: "licenca",
          motivo: licencaForm.motivo.trim(),
          dataInicioLicenca: licencaForm.dataInicioLicenca,
          dataFimLicenca: licencaForm.dataFimLicenca || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      const evento = await res.json();
      if (licencaFiles.length > 0) {
        await uploadDocumentosParaServidor(licencaFiles, evento.id, id, formando.nome, "licenca");
      }
      await fetch(`/api/formandos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: false, motivoInatividade: "licenca" }),
      });
      setLicencaOpen(false);
      setLicencaForm({ motivo: "", dataInicioLicenca: "", dataFimLicenca: "" });
      setLicencaFiles([]);
      toast.success("Licença registrada.");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar licença.");
    }
  }

  async function handleCriarProcesso() {
    try {
      const res = await fetch("/api/processos-eclesiasticos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formandoId: id,
          tipo: novoProcessoTipo,
          nivelFormativo: formando.nivelFormativo,
          dadosFormulario: {},
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      const novo = await res.json();
      setNovoProcessoOpen(false);
      router.push(`/jornada-vocacional/${novo.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar processo.");
    }
  }

  async function handleAvancarEtapa() {
    if (!proximaEtapa) return;
    const agora = new Date().toISOString();
    const etapas = [...(formando.progressoEtapas ?? [])];
    const atualIdx = etapas.findIndex((p) => p.nivel === formando.nivelFormativo);
    if (atualIdx >= 0) etapas[atualIdx] = { ...etapas[atualIdx], concluiuEm: agora };
    etapas.push({ nivel: proximaEtapa, formacoesComunitariasRealizadas: 0, retirosComunitariosRealizados: 0, retirosPessoaisRealizados: 0, iniciouEm: agora });
    const req = REQUISITOS_ETAPAS[proximaEtapa];
    try {
      const res = await fetch(`/api/formandos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nivelFormativo: proximaEtapa, totalFormacoes: req.formacoesComunitarias + req.retirosComunitarios + req.retirosPessoais, formacoesRealizadas: 0, progressoEtapas: etapas }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      setAvancarOpen(false);
      toast.success(`${formando.nome} avançou para ${NIVEL_FORMATIVO_LABELS[proximaEtapa]}.`);
      startTransition(() => router.refresh());
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao avançar etapa."); }
  }

  async function handleEditSave() {
    if (!editForm.nome.trim()) return toast.error("Nome é obrigatório.");
    if (!editForm.email.trim()) return toast.error("E-mail é obrigatório.");
    if (!editForm.dataNascimento) return toast.error("Data de nascimento é obrigatória.");
    const moradaSelecionada = todasMoradas.find((m) => m.id === editForm.grupoFormacaoId);
    const nivelFormativo = moradaSelecionada
      ? (moradaSelecionada.nivelFormativo as typeof editForm.nivelFormativo)
      : editForm.nivelFormativo;
    try {
      const res = await fetch(`/api/formandos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editForm.nome.trim(), dataNascimento: editForm.dataNascimento,
          estadoCivil: editForm.estadoCivil, modalidade: editForm.modalidade,
          nivelFormativo, dataIngresso: editForm.dataIngresso,
          telefone: stripPhone(editForm.telefone), email: editForm.email.trim(),
          grupoFormacaoId: editForm.grupoFormacaoId || null,
          nomeSocial: editForm.nomeSocial.trim() || null,
          endereco: editForm.endereco.trim() || null,
          numero: editForm.numero.trim() || null,
          complemento: editForm.complemento.trim() || null,
          bairro: editForm.bairro.trim() || null,
          cidade: editForm.cidade.trim() || null,
          estado: editForm.estado.trim() || null,
          paisResidencia: editForm.paisResidencia.trim() || null,
          nacionalidade: editForm.nacionalidade.trim() || null,
          rg: editForm.rg.trim() || null,
          orgaoEmissor: editForm.orgaoEmissor.trim() || null,
          cep: editForm.cep.trim() || null,
          paroquiaReferencia: editForm.paroquiaReferencia.trim() || null,
          numFilhos: editForm.numFilhos ? parseInt(editForm.numFilhos, 10) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro");
      toast.success("Dados atualizados com sucesso!");
      setEditOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar dados.");
    }
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
          <button
            type="button"
            onClick={() => setFotoDialogOpen(true)}
            className="relative h-16 w-16 shrink-0 group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Alterar foto"
          >
            <Avatar className="h-16 w-16">
              {resolveImageSrc(formando.foto) && <AvatarImage src={resolveImageSrc(formando.foto)!} alt={formando.nome} />}
              <AvatarFallback className={`text-lg font-bold ${NIVEL_CORES[formando.nivelFormativo]}`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </span>
          </button>
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
                <Phone className="h-3.5 w-3.5" /> {formatPhone(formando.telefone)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {formando.email && (
              <Button
                variant="outline"
                size="sm"
                title="Reenviar e-mail de acesso ao Portal do Formando"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/formandos/${formando.id}/reenviar-acesso`, { method: "POST" });
                    if (res.ok) toast.success("Acesso ao portal enviado para " + formando.email);
                    else {
                      const { error } = await res.json();
                      toast.error(error ?? "Falha ao reenviar o acesso.");
                    }
                  } catch {
                    toast.error("Falha ao reenviar o acesso.");
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-1.5" />
                Reenviar acesso
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditForm({
                  nome: formando.nome,
                  dataNascimento: formando.dataNascimento ?? "",
                  estadoCivil: formando.estadoCivil,
                  modalidade: formando.modalidade,
                  nivelFormativo: formando.nivelFormativo,
                  dataIngresso: formando.dataIngresso,
                  telefone: applyPhoneMask(formando.telefone),
                  email: formando.email,
                  grupoFormacaoId: formando.grupoFormacaoId ?? "",
                  nomeSocial: formando.nomeSocial ?? "",
                  endereco: formando.endereco ?? "",
                  numero: formando.numero ?? "",
                  complemento: formando.complemento ?? "",
                  bairro: formando.bairro ?? "",
                  cidade: formando.cidade ?? "",
                  estado: formando.estado ?? "",
                  paisResidencia: formando.paisResidencia ?? "",
                  nacionalidade: formando.nacionalidade ?? "",
                  rg: formando.rg ?? "",
                  orgaoEmissor: formando.orgaoEmissor ?? "",
                  cep: formando.cep ?? "",
                  paroquiaReferencia: formando.paroquiaReferencia ?? "",
                  numFilhos: formando.numFilhos?.toString() ?? "",
                });
                setEditOpen(true);
              }}
            >
              Editar
            </Button>
            <Button size="sm" onClick={() => router.push("/agenda")}>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{realizadosAtual}</p>
              <p className="text-sm text-muted-foreground mt-0.5">de {totalAtual} encontros</p>
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
              <p className="text-sm text-muted-foreground mt-0.5">progresso</p>
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
                  <p className="text-sm text-muted-foreground mt-0.5">frequência</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-muted-foreground/40">—</p>
                  <p className="text-sm text-muted-foreground mt-0.5">frequência</p>
                </>
              )}
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{avaliacoesRealizadas.length}</p>
              <p className="text-sm text-muted-foreground mt-0.5">pareceres</p>
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

      <Tabs defaultValue="visao-geral">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList className="bg-muted/50 h-9 min-w-max">
          <TabsTrigger value="visao-geral" className="text-xs h-7">
            Visão geral
          </TabsTrigger>
          <TabsTrigger value="jornada" className="text-xs h-7">
            Jornada Formativa
          </TabsTrigger>
          {mostraDocumentos && (
            <TabsTrigger value="documentos" className="text-xs h-7">
              Documentos
            </TabsTrigger>
          )}
          <TabsTrigger value="perspectivas" className="text-xs h-7">
            Perspectivas
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs h-7">
            Histórico de evolução
          </TabsTrigger>
          <TabsTrigger value="comentarios" className="text-xs h-7">
            Comentários do formador
          </TabsTrigger>
          <TabsTrigger value="acompanhamento" className="text-xs h-7">
            Acompanhamento
          </TabsTrigger>
          <TabsTrigger value="dados" className="text-xs h-7">
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="registros" className="text-xs h-7">
            Registro de solicitações
          </TabsTrigger>
        </TabsList>
        </div>

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

                      {/* Datas formativas da etapa */}
                      {!isLocked && (prog?.dataMissaCompromisso || prog?.iniciouEm || prog?.concluiuEm) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                          {prog?.dataMissaCompromisso && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span className="font-medium">Missa:</span>{" "}
                              {format(parseISO(prog.dataMissaCompromisso), "dd/MM/yyyy")}
                            </span>
                          )}
                          {prog?.iniciouEm && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span className="font-medium">Início:</span>{" "}
                              {format(parseISO(prog.iniciouEm), "dd/MM/yyyy")}
                            </span>
                          )}
                          {prog?.concluiuEm && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span className="font-medium">Conclusão:</span>{" "}
                              {format(parseISO(prog.concluiuEm), "dd/MM/yyyy")}
                            </span>
                          )}
                        </div>
                      )}

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

        {mostraDocumentos && (
          <TabsContent value="documentos" className="mt-4 space-y-4">
            {/* Cartas de etapa (P1.1) — recorrentes, reaproveitam o modelo Arquivo */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Cartas de etapa</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Carta de discernimento ao fim de cada etapa formativa
                  </p>
                </div>
                <Button size="sm" onClick={() => setCartaOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar carta
                </Button>
              </CardHeader>
              <CardContent>
                {cartasEtapa.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-foreground text-sm">Nenhuma carta registrada</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Anexe a carta recebida ao fim de uma etapa.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cartasEtapa.map((carta) => (
                      <div
                        key={carta.id}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                            <Mail className="h-4 w-4 text-rose-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${NIVEL_CORES[carta.nivel]}`}>
                                {NIVEL_FORMATIVO_LABELS[carta.nivel]}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(carta.dataEvento ?? carta.criadoEm), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <a
                            href={`/api/arquivos/${carta.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}
                            title="Abrir carta"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteCarta(carta.id)}
                            title="Excluir carta"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processos Eclesiásticos — visível apenas para orgs com acesso canônico */}
            {hasCanonicalAccess(tipoOrganizacao as TipoOrganizacao | null) && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Processos Eclesiásticos</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Documentos canônicos da jornada vocacional
                  </p>
                </div>
                <Button size="sm" onClick={() => setNovoProcessoOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Novo processo
                </Button>
              </CardHeader>
              <CardContent>
                {processosEclesiasticos.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <ScrollText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-foreground text-sm">
                      Nenhum processo eclesiástico
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inicie um novo processo para gerar documentos canônicos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {processosEclesiasticos.map((proc) => (
                      <Link
                        key={proc.id}
                        href={`/jornada-vocacional/${proc.id}`}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <ScrollText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {TIPO_PROCESSO_LABELS[proc.tipo]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(proc.criadoEm), "d 'de' MMM 'de' yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_PROCESSO_COLORS[proc.status]}`}
                          >
                            {STATUS_PROCESSO_LABELS[proc.status]}
                          </Badge>
                          {proc.documentos && proc.documentos.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {proc.documentos.length} doc
                              {proc.documentos.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </TabsContent>
        )}

        {/* Perspectivas Formativas */}
        <TabsContent value="perspectivas" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Avalie a adesão de {formando.nome} em cada perspectiva formativa.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {PERSPECTIVAS.map((persp) => {
                    const avaliacoesPersp = formandoEventos
                      .filter((e) => e.tipo === "avaliacao-adesao" && e.perspectiva === persp)
                      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
                    const ultimaNota = avaliacoesPersp[0]?.notaAdesao;
                    const info = PERSPECTIVAS_INFO[persp];

                    return (
                      <Card key={persp} className="border shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <CardTitle className={`text-sm font-semibold ${info.cor}`}>
                                  Perspectiva {PERSPECTIVA_LABELS[persp]}
                                </CardTitle>
                                {ultimaNota ? (
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${NOTA_ADESAO_CORES[ultimaNota]}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${NOTA_ADESAO_DOT[ultimaNota]}`} />
                                    {NOTA_ADESAO_LABELS[ultimaNota]}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/60 italic">Sem avaliação</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{info.desc}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 h-8 text-xs"
                              onClick={() => {
                                setPerspectivaOpen(persp);
                                setPerspectivaForm({ nota: "boa", texto: "" });
                              }}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Avaliar
                            </Button>
                          </div>
                        </CardHeader>
                        {avaliacoesPersp.length > 0 && (
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              {avaliacoesPersp.slice(0, 3).map((ev) => (
                                <div key={ev.id} className={`rounded-lg border px-3 py-2 ${info.bg}`}>
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      {ev.notaAdesao && (
                                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${NOTA_ADESAO_CORES[ev.notaAdesao]}`}>
                                          {NOTA_ADESAO_LABELS[ev.notaAdesao]}
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      {format(parseISO(ev.criadoEm), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                                    </span>
                                  </div>
                                  {ev.textoAvaliacao && (
                                    <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                                      {ev.textoAvaliacao}
                                    </p>
                                  )}
                                </div>
                              ))}
                              {avaliacoesPersp.length > 3 && (
                                <p className="text-xs text-muted-foreground text-center pt-1">
                                  + {avaliacoesPersp.length - 3} avaliação{avaliacoesPersp.length - 3 !== 1 ? "ões" : ""} anterior{avaliacoesPersp.length - 3 !== 1 ? "es" : ""}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        )}
                        {avaliacoesPersp.length === 0 && (
                          <CardContent className="pt-0">
                            <div className={`rounded-lg border border-dashed px-3 py-4 text-center ${info.bg}`}>
                              <p className="text-xs text-muted-foreground">
                                Nenhuma avaliação registrada para esta perspectiva.
                              </p>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
          </div>
        </TabsContent>

        {/* Visão geral da jornada formativa */}
        <TabsContent value="visao-geral" className="mt-4 space-y-4">
          {/* Painel de indicadores globais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                      {presencas.filter((h) => h.presente).length} de{" "}
                      {presencas.length} presenças
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
                              <p className="text-[13px] text-muted-foreground">{desc}</p>
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
            presencas.length === 0 && (
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
                  Formações da etapa formativa - {" "}
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
                                  {registro.justificativa && (
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                      {registro.justificativa}
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
                          {format(parseISO(comentario.criadoEm), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
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

        {/* Acompanhamento formativo (jornada comunitária) — o formador marca
            encontros e vê os pedidos que o formando fez pelo portal. */}
        <TabsContent value="acompanhamento" className="mt-4">
          <AcompanhamentoSection
            formandoId={id}
            termoFormando={termoFormando}
            acompanhamentos={acompanhamentos}
            solicitacoes={solicitacoesAcompanhamento}
            podeGerir
          />
        </TabsContent>

        {/* Dados Pessoais */}
        <TabsContent value="dados" className="mt-4 space-y-4">
          {/* Identificação */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificação</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Nome completo</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{formando.nome}</p>
                </div>
                {formando.nomeSocial && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Nome social</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{formando.nomeSocial}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Data de nascimento</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {formando.dataNascimento ? (
                      <>
                        {format(parseISO(formando.dataNascimento), "dd/MM/yyyy")}
                        <span className="text-muted-foreground font-normal ml-1.5">({idade} anos)</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground font-normal">Não informada</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado civil</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {ESTADO_CIVIL_LABELS[formando.estadoCivil]}
                    {formando.estadoCivil === "casado" && formando.numFilhos != null && (
                      <span className="text-muted-foreground font-normal ml-1.5">
                        · {formando.numFilhos} filho{formando.numFilhos !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                {formando.nacionalidade && (
                  <div>
                    <p className="text-xs text-muted-foreground">Nacionalidade</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{formando.nacionalidade}</p>
                  </div>
                )}
                {(formando.rg || formando.orgaoEmissor) && (
                  <div>
                    <p className="text-xs text-muted-foreground">RG</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {formando.rg || "—"}
                      {formando.orgaoEmissor && (
                        <span className="text-muted-foreground font-normal ml-1.5">/ {formando.orgaoEmissor}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Formativo */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Formativo</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Modalidade</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{MODALIDADE_LABELS[formando.modalidade]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data de ingresso</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{format(parseISO(formando.dataIngresso), "dd/MM/yyyy")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contato</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <a
                    href={`tel:${formando.telefone}`}
                    className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatPhone(formando.telefone)}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <a
                    href={`mailto:${formando.email}`}
                    className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1.5 hover:text-primary transition-colors truncate"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {formando.email}
                  </a>
                </div>
                {formando.cep && (
                  <div>
                    <p className="text-xs text-muted-foreground">CEP</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{formando.cep}</p>
                  </div>
                )}
                {formando.paroquiaReferencia && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Paróquia de referência</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{formando.paroquiaReferencia}</p>
                  </div>
                )}
              </div>
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
                          {format(parseISO(ev.criadoEm), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
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
                              href={`/api/documentos/${doc.id}`}
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
      {/* Adicionar carta de etapa (P1.1) */}
      <Dialog open={cartaOpen} onOpenChange={setCartaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar carta de etapa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Etapa formativa</Label>
              <Select
                value={cartaNivel}
                onValueChange={(v) => v && setCartaNivel(v as NivelFormativo)}
              >
                <SelectTrigger>
                  <SelectValue>{NIVEL_FORMATIVO_LABELS[cartaNivel]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {NIVEIS_FORMATIVOS_SELECIONAVEIS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {NIVEL_FORMATIVO_LABELS[n]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Data de realização do evento</Label>
              <Input
                type="date"
                value={cartaData}
                onChange={(e) => setCartaData(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Opcional — se em branco, usamos a data do registro.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>
                Arquivo da carta <span className="text-destructive">*</span>
              </Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                onChange={(e) => setCartaFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">PDF ou imagem, até 15 MB.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartaOpen(false)} disabled={cartaSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleUploadCarta} disabled={cartaSubmitting || !cartaFile}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {cartaSubmitting ? "Enviando…" : "Registrar carta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Dialog: Foto do Formando */}
      <ImageCropDialog
        open={fotoDialogOpen}
        onOpenChange={setFotoDialogOpen}
        title={`Foto de ${formando.nome}`}
        hasImage={!!formando.foto}
        uploadEndpoint="/api/imagens"
        onSave={async (imageData) => {
          const res = await fetch(`/api/formandos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foto: imageData }) });
          if (!res.ok) { toast.error("Erro ao salvar foto."); return; }
          toast.success("Foto atualizada.");
          startTransition(() => router.refresh());
        }}
        onRemove={async () => {
          const res = await fetch(`/api/formandos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ foto: null }) });
          if (!res.ok) { toast.error("Erro ao remover foto."); return; }
          toast.success("Foto removida.");
          startTransition(() => router.refresh());
        }}
      />

      {/* Dialog: Avaliação de Perspectiva */}
      <Dialog open={!!perspectivaOpen} onOpenChange={(open) => !open && setPerspectivaOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {perspectivaOpen ? `Perspectiva ${PERSPECTIVA_LABELS[perspectivaOpen]}` : "Avaliação de Perspectiva"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <span className="text-xs font-medium text-foreground">Nota de adesão</span>
              <div className="grid grid-cols-2 gap-2">
                {(["otima", "boa", "regular", "insuficiente"] as NotaAdesao[]).map((nota) => (
                  <button
                    key={nota}
                    type="button"
                    onClick={() => setPerspectivaForm((p) => ({ ...p, nota }))}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                      perspectivaForm.nota === nota
                        ? `${NOTA_ADESAO_CORES[nota]} border-current ring-2 ring-offset-1 ring-current/30`
                        : "border-border/60 bg-card text-muted-foreground hover:border-border"
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", NOTA_ADESAO_DOT[nota])} />
                    {NOTA_ADESAO_LABELS[nota]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea
                placeholder="Descreva suas percepções sobre esta perspectiva..."
                value={perspectivaForm.texto}
                onChange={(e) => setPerspectivaForm((p) => ({ ...p, texto: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPerspectivaOpen(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePerspectiva}>Salvar avaliação</Button>
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

      {/* Dialog: Novo Processo Eclesiástico */}
      {hasCanonicalAccess(tipoOrganizacao as TipoOrganizacao | null) && (
        <Dialog open={novoProcessoOpen} onOpenChange={setNovoProcessoOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Novo Processo Eclesiástico</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid gap-1.5">
                <Label>Tipo de processo</Label>
                <Select
                  value={novoProcessoTipo}
                  onValueChange={(v) => v && setNovoProcessoTipo(v as TipoProcessoEclesiastico)}
                >
                  <SelectTrigger>
                    <SelectValue>{TIPO_PROCESSO_LABELS[novoProcessoTipo]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPO_PROCESSO_LABELS) as [TipoProcessoEclesiastico, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setNovoProcessoOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCriarProcesso}>
                <ScrollText className="h-3.5 w-3.5 mr-1.5" />
                Criar processo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Editar Formando */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar {termoFormando}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome completo <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Nome Sobrenome"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Data de nascimento <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={editForm.dataNascimento}
                  onChange={(e) => setEditForm((p) => ({ ...p, dataNascimento: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Estado civil</Label>
                <Select
                  value={editForm.estadoCivil}
                  onValueChange={(v) => v && setEditForm((p) => ({ ...p, estadoCivil: v as typeof editForm.estadoCivil }))}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {({ solteiro: "Solteiro(a)", casado: "Casado(a)", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)" })[editForm.estadoCivil]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>E-mail <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm((p) => ({ ...p, telefone: applyPhoneMask(e.target.value) }))}
                  placeholder="(xx) xxxxx-xxxx"
                  maxLength={15}
                />
              </div>
            </div>
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Dados canônicos
              </p>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5 col-span-2">
                    <Label>Nome social</Label>
                    <Input
                      value={editForm.nomeSocial}
                      onChange={(e) => setEditForm((p) => ({ ...p, nomeSocial: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Nacionalidade</Label>
                    <Input
                      value={editForm.nacionalidade}
                      onChange={(e) => setEditForm((p) => ({ ...p, nacionalidade: e.target.value }))}
                      placeholder="brasileiro(a)"
                    />
                  </div>
                  {editForm.estadoCivil === "casado" && (
                    <div className="grid gap-1.5">
                      <Label>Nº de filhos</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={editForm.numFilhos}
                        onChange={(e) => setEditForm((p) => ({ ...p, numFilhos: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>RG</Label>
                    <Input
                      value={editForm.rg}
                      onChange={(e) => setEditForm((p) => ({ ...p, rg: e.target.value }))}
                      placeholder="000.000.000-0"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Órgão emissor</Label>
                    <Input
                      value={editForm.orgaoEmissor}
                      onChange={(e) => setEditForm((p) => ({ ...p, orgaoEmissor: e.target.value }))}
                      placeholder="SSP/CE"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>CEP</Label>
                    <Input
                      value={editForm.cep}
                      onChange={(e) => setEditForm((p) => ({ ...p, cep: e.target.value }))}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div className="grid gap-1.5 col-span-1">
                    <Label>Paróquia de referência</Label>
                    <Input
                      value={editForm.paroquiaReferencia}
                      onChange={(e) => setEditForm((p) => ({ ...p, paroquiaReferencia: e.target.value }))}
                      placeholder="Nome da paróquia"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <div className="grid gap-1.5">
                    <Label>Endereço</Label>
                    <Input
                      value={editForm.endereco}
                      onChange={(e) => setEditForm((p) => ({ ...p, endereco: e.target.value }))}
                      placeholder="Rua, avenida…"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Número</Label>
                    <Input
                      value={editForm.numero}
                      onChange={(e) => setEditForm((p) => ({ ...p, numero: e.target.value }))}
                      placeholder="Nº"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Complemento</Label>
                    <Input
                      value={editForm.complemento}
                      onChange={(e) => setEditForm((p) => ({ ...p, complemento: e.target.value }))}
                      placeholder="Apto, bloco…"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Bairro</Label>
                    <Input
                      value={editForm.bairro}
                      onChange={(e) => setEditForm((p) => ({ ...p, bairro: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Cidade</Label>
                    <Input
                      value={editForm.cidade}
                      onChange={(e) => setEditForm((p) => ({ ...p, cidade: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Estado (UF)</Label>
                    <Input
                      value={editForm.estado}
                      onChange={(e) => setEditForm((p) => ({ ...p, estado: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>País de residência</Label>
                    <Input
                      value={editForm.paisResidencia}
                      onChange={(e) => setEditForm((p) => ({ ...p, paisResidencia: e.target.value }))}
                      placeholder="Brasil"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Modalidade</Label>
                <Select
                  value={editForm.modalidade}
                  onValueChange={(v) => v && setEditForm((p) => ({ ...p, modalidade: v as typeof editForm.modalidade }))}
                >
                  <SelectTrigger>
                    <SelectValue>{MODALIDADE_LABELS[editForm.modalidade]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hibrida">Híbrida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Data de ingresso <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={editForm.dataIngresso}
                  onChange={(e) => setEditForm((p) => ({ ...p, dataIngresso: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Morada</Label>
              <Select
                value={editForm.grupoFormacaoId}
                onValueChange={(v) => {
                  const m = todasMoradas.find((x) => x.id === v);
                  setEditForm((p) => ({
                    ...p,
                    grupoFormacaoId: v ?? "",
                    ...(m ? { nivelFormativo: m.nivelFormativo as NivelFormativo } : {}),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {editForm.grupoFormacaoId
                      ? (() => {
                          const m = todasMoradas.find((x) => x.id === editForm.grupoFormacaoId);
                          return m ? `${m.nome} — ${NIVEL_FORMATIVO_LABELS[m.nivelFormativo as NivelFormativo]}` : "Selecione a morada...";
                        })()
                      : "Nenhuma"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {todasMoradas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome} — {NIVEL_FORMATIVO_LABELS[m.nivelFormativo as NivelFormativo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Etapa Formativa</Label>
              <Select
                value={editForm.nivelFormativo}
                onValueChange={(v) => v && setEditForm((p) => ({ ...p, nivelFormativo: v as typeof editForm.nivelFormativo }))}
                disabled={!!todasMoradas.find((m) => m.id === editForm.grupoFormacaoId)}
              >
                <SelectTrigger>
                  <SelectValue>{NIVEL_FORMATIVO_LABELS[editForm.nivelFormativo]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as const).map((n) => (
                    <SelectItem key={n} value={n}>{NIVEL_FORMATIVO_LABELS[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {todasMoradas.find((m) => m.id === editForm.grupoFormacaoId) && (
                <p className="text-xs text-muted-foreground">Definido automaticamente pela morada selecionada.</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditSave}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
