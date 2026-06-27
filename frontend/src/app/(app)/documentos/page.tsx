"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Download,
  Eye,
  FileText,
  Search,
  Trash2,
  RefreshCw,
  Filter,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { SessionUser } from "@/lib/auth-helpers";

type DocumentoMeta = {
  id: string;
  nome: string;
  tamanho: number;
  tipo: string;
  extensao: string;
  eventoId: string | null;
  formandoId: string | null;
  formandoNome: string | null;
  tipoEvento: string | null;
  uploadadoPor: string | null;
  uploadadoPorNome: string | null;
  grupoFormacaoId: string | null;
  criadoEm: string;
};
import { Pagination } from "@/components/ui/pagination";
import { DocumentoViewer } from "@/components/documentos/DocumentoViewer";

const TIPO_EVENTO_LABELS: Record<string, string> = {
  "solicitacao-desligamento": "Solicitação de Desligamento",
  desligamento: "Desligamento Compulsório",
  licenca: "Registro de Licença",
};


const PAGE_SIZE = 10;

export default function DocumentosPage() {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const isGestao =
    user?.role === "administrador" || user?.role === "formador_geral";

  const [documentos, setDocumentos] = useState<DocumentoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [viewer, setViewer] = useState<{ open: boolean; doc: DocumentoMeta | null }>({ open: false, doc: null });

  const loadDocumentos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documentos");
      if (!res.ok) throw new Error("Erro ao carregar documentos");
      setDocumentos(await res.json());
    } catch {
      toast.error("Não foi possível carregar os documentos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocumentos();
  }, [loadDocumentos]);

  async function handleDelete(doc: DocumentoMeta) {
    if (!confirm(`Excluir "${doc.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/documentos/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      setDocumentos((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Documento excluído.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir documento.");
    }
  }

  const filtered = documentos.filter((d) => {
    const matchSearch =
      !search ||
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      (d.formandoNome ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFiltro === "todos" || d.tipoEvento === tipoFiltro;
    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria Documental</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Arquivos anexados a eventos dos formandos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDocumentos} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou formando..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v ?? "todos")}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_EVENTO_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <FolderOpen className="h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhum documento encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Formando</TableHead>
                  <TableHead>Tipo de evento</TableHead>
                  {isGestao && <TableHead>Enviado por</TableHead>}
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate max-w-48">{doc.nome}</span>
                        <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                          {doc.extensao.replace(".", "")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{doc.formandoNome}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {doc.tipoEvento ? (TIPO_EVENTO_LABELS[doc.tipoEvento] ?? doc.tipoEvento) : "—"}
                      </span>
                    </TableCell>
                    {isGestao && (
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.uploadadoPorNome || doc.uploadadoPor}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">
                      {(doc.tamanho / 1024).toFixed(0)} KB
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(doc.criadoEm), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.tipo === "application/pdf" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Visualizar"
                            onClick={() => setViewer({ open: true, doc })}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        <a
                          href={`/api/documentos/${doc.id}`}
                          download={doc.nome}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
                          title="Baixar"
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && filtered.length > 0 && (
        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}

      <DocumentoViewer
        open={viewer.open}
        onOpenChange={(open) => setViewer((v) => ({ ...v, open }))}
        nome={viewer.doc?.nome ?? ""}
        arquivoUrl={viewer.doc ? `/api/documentos/${viewer.doc.id}` : ""}
      />
    </div>
  );
}
