import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import { hasCanonicalAccess } from "@/types";
import JornadaVocacionalClient from "./JornadaVocacionalClient";

export default async function JornadaVocacionalPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.organizacaoId) redirect("/login");

  // Guard: exclusivo para Nova Comunidade
  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { tipoOrganizacao: true, termoPreDiscipulado: true, termoDiscipulado: true, termoPrimeirasPromessas: true, termoFormacaoPermanente: true, termoPromessa: true },
  });

  if (!hasCanonicalAccess(org?.tipoOrganizacao)) redirect("/dashboard");

  const processos = await prisma.processoEclesiastico.findMany({
    where: { organizacaoId: user.organizacaoId },
    include: {
      formando: { select: { id: true, nome: true } },
      criadoPor: { select: { id: true, nome: true } },
      documentos: { select: { id: true, tipo: true, status: true, versao: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const processosSerializados = processos.map((p) => ({
    id: p.id,
    organizacaoId: p.organizacaoId,
    formandoId: p.formandoId,
    formandoNome: p.formando.nome,
    tipo: p.tipo,
    nivelFormativo: p.nivelFormativo,
    status: p.status,
    dadosFormulario: p.dadosFormulario as Record<string, unknown>,
    favoravelRenovacao: p.favoravelRenovacao,
    numeroRenovacao: p.numeroRenovacao,
    criadoPorId: p.criadoPorId,
    criadoPorNome: p.criadoPor.nome,
    criadoEm: p.criadoEm.toISOString(),
    atualizadoEm: p.atualizadoEm.toISOString(),
    documentos: p.documentos.map((d) => ({
      id: d.id,
      processoId: p.id,
      tipo: d.tipo,
      status: d.status,
      versao: d.versao,
      arquivoId: null,
      geradoEm: null,
      criadoEm: p.criadoEm.toISOString(),
    })),
  }));

  return (
    <JornadaVocacionalClient
      initialProcessos={processosSerializados}
      userRole={user.role ?? "formador_comunitario"}
      termos={{
        etapa1: org?.termoPreDiscipulado ?? "Pré-Discipulado",
        etapa2: org?.termoDiscipulado ?? "Discipulado",
        etapa3: org?.termoPrimeirasPromessas ?? "Primeiras Promessas",
        etapa4: org?.termoFormacaoPermanente ?? "Formação Permanente",
        promessa: org?.termoPromessa ?? "Promessa",
      }}
    />
  );
}
