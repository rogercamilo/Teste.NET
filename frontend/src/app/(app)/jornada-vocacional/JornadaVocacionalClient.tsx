"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, FolderOpen, RefreshCw, ScrollText, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  type ProcessoEclesiastico,
  type TipoProcessoEclesiastico,
  type StatusProcessoEclesiastico,
  TIPO_PROCESSO_LABELS,
  STATUS_PROCESSO_LABELS,
  STATUS_PROCESSO_COLORS,
  temPermissao,
} from "@/types";

const PAGE_SIZE = 15;

interface Termos {
  etapa1: string;
  etapa2: string;
  etapa3: string;
  etapa4: string;
}

interface Props {
  initialProcessos: ProcessoEclesiastico[];
  userRole: string;
  termos: Termos;
}

function getTipoLabel(tipo: TipoProcessoEclesiastico, termos: Termos): string {
  if (tipo === "admissao_etapa1") return `Admissão — ${termos.etapa1}`;
  if (tipo === "admissao_etapa2") return `Admissão — ${termos.etapa2}`;
  if (tipo === "promessas_iniciais") return termos.etapa3;
  return TIPO_PROCESSO_LABELS[tipo];
}

export default function JornadaVocacionalClient({ initialProcessos, userRole, termos }: Props) {
  const router = useRouter();
  const [processos] = useState<ProcessoEclesiastico[]>(initialProcessos);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [page, setPage] = useState(1);

  const isGestao = temPermissao(userRole, "formador_geral");

  const filtered = useMemo(() => {
    return processos.filter((p) => {
      const matchSearch =
        !search ||
        p.formandoNome?.toLowerCase().includes(search.toLowerCase()) ||
        getTipoLabel(p.tipo, termos).toLowerCase().includes(search.toLowerCase());
      const matchTipo = tipoFiltro === "todos" || p.tipo === tipoFiltro;
      const matchStatus = statusFiltro === "todos" || p.status === statusFiltro;
      return matchSearch && matchTipo && matchStatus;
    });
  }, [processos, search, tipoFiltro, statusFiltro, termos]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tiposUnicos = Array.from(new Set(processos.map((p) => p.tipo)));
  const statusUnicos = Array.from(new Set(processos.map((p) => p.status)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" />
            Jornada Vocacional
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Processos eclesiásticos canônicos da organização
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por membro ou tipo de processo..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={tipoFiltro} onValueChange={(v) => { setTipoFiltro(v ?? "todos"); setPage(1); }}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tipo de processo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tiposUnicos.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {getTipoLabel(tipo, termos)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v ?? "todos"); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {statusUnicos.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_PROCESSO_LABELS[s as StatusProcessoEclesiastico]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <FolderOpen className="h-10 w-10 opacity-30" />
              <p className="text-sm">
                {processos.length === 0
                  ? "Nenhum processo eclesiástico registrado."
                  : "Nenhum processo encontrado com os filtros aplicados."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Tipo de processo</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documentos</TableHead>
                  {isGestao && <TableHead>Criado por</TableHead>}
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/jornada-vocacional/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.formandoNome}</TableCell>
                    <TableCell className="text-sm">{getTipoLabel(p.tipo, termos)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.nivelFormativo}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PROCESSO_COLORS[p.status]}`}>
                        {STATUS_PROCESSO_LABELS[p.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.documentos && p.documentos.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {p.documentos.length} doc{p.documentos.length !== 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {isGestao && (
                      <TableCell className="text-sm text-muted-foreground">
                        {p.criadoPorNome}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(p.criadoEm), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filtered.length > PAGE_SIZE && (
        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  );
}
