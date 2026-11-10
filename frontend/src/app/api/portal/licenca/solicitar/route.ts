import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logError, logAction, getClientIp } from "@/lib/audit-log";
import { criarNotificacao, formadorDoGrupo, revisoresDaOrg } from "@/lib/notificacoes";
import { uploadFile } from "@/lib/storage";
import { scanUpload } from "@/lib/av-scan";
import { assinaturaConfere } from "@/lib/file-signature";
import { canUpload } from "@/lib/plan-limits";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB (espelha o fluxo das cartas)
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

/**
 * Pedido de LICENÇA (afastamento temporário) pelo FORMANDO no Portal.
 *
 * PONTE CANÔNICA: isto é só a MANIFESTAÇÃO DE VONTADE (requerimento) — nunca o ato.
 * Quem discerne, decide e lavra o termo no Livro é a autoridade (cân. 308; a licença
 * de uma associação de fiéis é regida pelos estatutos). Por isso a rota:
 *   1) registra o pedido (SolicitacaoLicencaFormando, status pendente);
 *   2) NOTIFICA o responsável (formador da morada + revisores/Formadores Gerais),
 *      que então abre o ProcessoEclesiastico (tipo=licenca) na aplicação.
 * Em hipótese alguma cria processo ou termo — a decisão permanece com a autoridade.
 *
 * Identidade vem dos headers injetados pelo proxy após verificar o portal_session
 * (não spoofáveis). Evita duplicação: havendo pedido pendente, retorna o existente.
 */
export async function POST(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const form = await request.formData();
    const motivoRaw = form.get("motivo");
    const motivo = typeof motivoRaw === "string" ? motivoRaw.slice(0, 2000).trim() : "";
    if (motivo.length < 10) {
      return NextResponse.json(
        { error: "Descreva brevemente o motivo do pedido de licença (ao menos 10 caracteres)." },
        { status: 422 }
      );
    }

    // Confere o vínculo e capta a morada para notificar o formador certo.
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId, deletedAt: null },
      select: { id: true, nome: true, grupoFormacaoId: true },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const pendente = await prisma.solicitacaoLicencaFormando.findFirst({
      where: { formandoId, organizacaoId, status: "pendente" },
      select: { id: true },
    });
    if (pendente) return NextResponse.json({ ok: true, jaPendente: true });

    // Documento opcional que formaliza o pedido (PDF/imagem). Mesmo pipeline das
    // cartas: valida extensão/tamanho + assinatura real + varredura de malware
    // antes de persistir no R2 e criar o Arquivo (uploader = o próprio formando).
    let arquivoId: string | null = null;
    const anexo = form.get("arquivo");
    if (anexo instanceof File && anexo.size > 0) {
      const ext = EXT_BY_MIME[anexo.type];
      if (!ext) return NextResponse.json({ error: "Formato não suportado (use PDF ou imagem)." }, { status: 400 });
      if (anexo.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo muito grande (máx. 15 MB)." }, { status: 400 });

      const uploadCheck = await canUpload(organizacaoId, anexo.size);
      if (!uploadCheck.allowed) return NextResponse.json({ error: uploadCheck.reason }, { status: 403 });

      const buffer = Buffer.from(await anexo.arrayBuffer());
      if (!assinaturaConfere(buffer, anexo.type)) {
        return NextResponse.json({ error: "Conteúdo do arquivo não corresponde ao tipo declarado." }, { status: 400 });
      }
      const scan = await scanUpload(buffer, anexo.type);
      if (!scan.clean) {
        logAction("upload_rejected_malware", formandoId, getClientIp(request), { formandoId, motivo: scan.reason }, organizacaoId);
        return NextResponse.json({ error: "Arquivo rejeitado por suspeita de conteúdo malicioso." }, { status: 400 });
      }
      const storageKey = await uploadFile(organizacaoId, "licenca-solicitacoes", buffer, ext, anexo.type);
      const arq = await prisma.arquivo.create({
        data: {
          organizacaoId,
          nome: `Pedido de licença — ${formando.nome}${ext}`,
          tamanho: buffer.length,
          tipo: anexo.type,
          extensao: ext,
          storageKey,
          uploadedByNome: formando.nome,
          formandoId: formando.id,
          formandoNome: formando.nome,
          tipoEvento: "licenca_solicitacao",
        },
      });
      arquivoId = arq.id;
    }

    await prisma.solicitacaoLicencaFormando.create({
      data: { formandoId, organizacaoId, motivo, arquivoId, status: "pendente" },
    });

    // Ponte: o requerimento chega à autoridade. Notifica o formador da morada e os
    // revisores (Formadores Gerais); de-duplicado. Falha de notificação não derruba
    // o pedido (ele fica registrado e visível na ficha do formando de todo modo).
    try {
      const [fcId, revisores] = await Promise.all([
        formando.grupoFormacaoId ? formadorDoGrupo(formando.grupoFormacaoId) : Promise.resolve(null),
        revisoresDaOrg(organizacaoId),
      ]);
      const destinatarios = [...new Set([...(fcId ? [fcId] : []), ...revisores])];
      await Promise.all(
        destinatarios.map((destinatarioId) =>
          criarNotificacao({
            organizacaoId,
            destinatarioId,
            tipo: "licenca_solicitada",
            titulo: `${formando.nome} solicitou licença`,
            corpo: "Pedido de afastamento temporário feito pelo portal. Converse com a pessoa e, havendo discernimento favorável, abra o processo de licença.",
            linkAcao: `/formandos/${formando.id}`,
          })
        )
      );
    } catch (err) {
      logError("portal licenca/solicitar notificacao", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal licenca/solicitar POST", err);
    return NextResponse.json({ error: "Falha ao solicitar licença" }, { status: 500 });
  }
}

/**
 * Cancela (revoga) o próprio pedido de licença enquanto ainda está pendente.
 * Idempotente; escopado à identidade do portal (anti-IDOR). Não toca pedidos já
 * `atendida`/`recusada` (histórico preservado).
 */
export async function DELETE(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    await prisma.solicitacaoLicencaFormando.deleteMany({
      where: { formandoId, organizacaoId, status: "pendente" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal licenca/solicitar DELETE", err);
    return NextResponse.json({ error: "Falha ao cancelar solicitação" }, { status: 500 });
  }
}
