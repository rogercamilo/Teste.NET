import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import { hasCanonicalAccess, temPermissao } from "@/types";
import LivroRegistroClient from "./LivroRegistroClient";

export const dynamic = "force-dynamic";

export default async function LivroRegistroPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.organizacaoId) redirect("/login");

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: {
      nome: true,
      tipoOrganizacao: true,
      termoPreDiscipulado: true,
      termoDiscipulado: true,
      termoPrimeirasPromessas: true,
      termoFormacaoPermanente: true,
    },
  });

  if (!hasCanonicalAccess(org?.tipoOrganizacao)) redirect("/dashboard");
  if (!temPermissao(user.role, "formador_geral")) redirect("/dashboard");

  const [tomos, termos, formandos] = await Promise.all([
    prisma.livroRegistroTomo.findMany({
      where: { organizacaoId: user.organizacaoId },
      orderBy: { numero: "desc" },
      include: { _count: { select: { termos: true } } },
    }),
    prisma.termoRegistro.findMany({
      where: { organizacaoId: user.organizacaoId },
      include: { formando: { select: { nome: true } }, tomo: { select: { numero: true } } },
      orderBy: [{ tomo: { numero: "asc" } }, { numero: "asc" }],
    }),
    prisma.formando.findMany({
      where: { organizacaoId: user.organizacaoId, deletedAt: null, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <LivroRegistroClient
      userRole={user.role ?? "formador_comunitario"}
      orgNome={org?.nome ?? ""}
      etapas={[
        org?.termoPreDiscipulado ?? "Pré-Discipulado",
        org?.termoDiscipulado ?? "Discipulado",
        org?.termoPrimeirasPromessas ?? "Primeiras Promessas",
        org?.termoFormacaoPermanente ?? "Formação Permanente",
      ]}
      formandos={formandos}
      tomos={tomos.map((t) => ({
        id: t.id,
        numero: t.numero,
        totalFolhas: t.totalFolhas,
        status: t.status,
        aberturaData: t.aberturaData.toISOString(),
        aberturaModerador: t.aberturaModerador,
        aberturaSecretario: t.aberturaSecretario,
        aberturaTexto: t.aberturaTexto,
        aberturaArquivoId: t.aberturaArquivoId,
        encerramentoData: t.encerramentoData?.toISOString() ?? null,
        encerramentoTexto: t.encerramentoTexto,
        encerramentoArquivoId: t.encerramentoArquivoId,
        totalTermos: t._count.termos,
      }))}
      termos={termos.map((t) => ({
        id: t.id,
        tomoId: t.tomoId,
        tomoNumero: t.tomo.numero,
        numero: t.numero,
        tipo: t.tipo,
        formandoId: t.formandoId,
        formandoNome: t.formando?.nome ?? null,
        dataEvento: t.dataEvento.toISOString(),
        dataLavratura: t.dataLavratura.toISOString(),
        corpoTexto: t.corpoTexto,
        condicaoResultante: t.condicaoResultante,
        retificaTermoId: t.retificaTermoId,
        lavradoAutomaticamente: t.lavradoAutomaticamente,
      }))}
    />
  );
}
