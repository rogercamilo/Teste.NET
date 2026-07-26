import type { NextResponse } from "next/server";
import { z } from "zod";

/** Schema compartilhado de criação/edição de depoimento (super-admin). */
export const DepoimentoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  papel: z.string().trim().max(120).optional().or(z.literal("")),
  comunidade: z.string().trim().max(160).optional().or(z.literal("")),
  texto: z.string().trim().min(10, "Depoimento muito curto").max(2000),
  nota: z.number().int().min(1).max(5),
  foto: z.string().trim().url("URL inválida").max(500).optional().or(z.literal("")),
  status: z.enum(["rascunho", "publicado", "arquivado"]).optional(),
  destaque: z.boolean().optional(),
  ordem: z.number().int().min(0).max(9999).optional(),
  consentimento: z.boolean().optional(),
});

/** União discriminada do guard de autorização (o guard é inline em cada rota
 *  para manter o literal `super_admin` visível à matriz de authz do CI). */
export type Gate = { ok: false; res: NextResponse } | { ok: true; userId: string };
