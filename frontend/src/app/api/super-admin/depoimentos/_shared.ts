import type { NextResponse } from "next/server";
import { z } from "zod";

/** Schema compartilhado de criação/edição de depoimento (super-admin). */
export const DepoimentoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  papel: z.string().trim().max(120).optional().or(z.literal("")),
  comunidade: z.string().trim().max(160).optional().or(z.literal("")),
  texto: z.string().trim().min(10, "Depoimento muito curto").max(2000),
  nota: z.number().int().min(1).max(5),
  // Foto do autor: aceita uma imagem embutida (data URL base64, produzida pelo
  // upload+crop do cockpit) OU uma URL http(s) (compatibilidade com cadastros
  // antigos). O teto acomoda um avatar ~256px JPEG (~40 KB → ~55 mil chars);
  // 700 mil chars (~500 KB) é folga generosa sem virar vetor de payload.
  foto: z
    .string()
    .trim()
    .max(700_000, "Imagem muito grande")
    .refine(
      (v) => v === "" || v.startsWith("data:image/") || /^https?:\/\//.test(v),
      "Foto inválida: envie uma imagem ou informe uma URL http(s).",
    )
    .optional()
    .or(z.literal("")),
  status: z.enum(["rascunho", "publicado", "arquivado"]).optional(),
  destaque: z.boolean().optional(),
  ordem: z.number().int().min(0).max(9999).optional(),
  consentimento: z.boolean().optional(),
});

/** União discriminada do guard de autorização (o guard é inline em cada rota
 *  para manter o literal `super_admin` visível à matriz de authz do CI). */
export type Gate = { ok: false; res: NextResponse } | { ok: true; userId: string };
