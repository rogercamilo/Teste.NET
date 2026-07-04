/**
 * Gate cruzado de perfil no login do Portal (Formando × Vocacionado).
 *
 * Regra de produto: Formando e Vocacionado são perfis distintos; cada portal só
 * admite o seu público. Credenciais VÁLIDAS mas perfil incompatível com a porta
 * → 403 sem emitir sessão, apontando a porta correta. Exercita o handler real de
 * `/api/portal/login`, mockando apenas I/O (credenciais, rate-limit, sessão,
 * auditoria). O schema (zod) e o `parseJson` permanecem reais.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/portal-formando-auth", () => ({ loginFormando: vi.fn() }));
vi.mock("@/lib/portal-data", () => ({ getPortalAudiencia: vi.fn() }));
vi.mock("@/lib/portal-auth", () => ({
  signPortalToken: vi.fn(async () => "signed.jwt.token"),
  portalCookieOptions: () => ({
    name: "portal_session",
    maxAge: 1000,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
  }),
}));
vi.mock("@/lib/rate-limit", () => ({
  limiters: {
    portalLogin: vi.fn(async () => ({ allowed: true })),
    portalLoginEmail: vi.fn(async () => ({ allowed: true })),
  },
}));
vi.mock("@/lib/audit-log", () => ({
  logAction: vi.fn(),
  logError: vi.fn(),
  getClientIp: vi.fn(() => "10.0.0.1"),
}));

import { loginFormando } from "@/lib/portal-formando-auth";
import { getPortalAudiencia } from "@/lib/portal-data";
import { signPortalToken } from "@/lib/portal-auth";
import { POST } from "@/app/api/portal/login/route";

const ORG = "org_a";

function loginReq(body: unknown) {
  return new Request("http://test/api/portal/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("gate cruzado de perfil — login do portal", () => {
  it("formando entrando no Portal do Vocacionado → 403, sem sessão, aponta formando", async () => {
    vi.mocked(loginFormando).mockResolvedValue({ ok: true, formandoId: "f1", organizacaoId: ORG } as never);
    vi.mocked(getPortalAudiencia).mockResolvedValue("formando");

    const res = await POST(loginReq({ email: "a@b.com", senha: "s3nha!", portal: "vocacional" }));

    expect(res.status).toBe(403);
    expect((await res.json()).portalCorreto).toBe("formando");
    expect(res.cookies.get("portal_session")).toBeUndefined();
    expect(signPortalToken).not.toHaveBeenCalled();
  });

  it("vocacionado entrando no Portal do Formando → 403, sem sessão, aponta vocacional", async () => {
    vi.mocked(loginFormando).mockResolvedValue({ ok: true, formandoId: "f2", organizacaoId: ORG } as never);
    vi.mocked(getPortalAudiencia).mockResolvedValue("vocacional");

    const res = await POST(loginReq({ email: "a@b.com", senha: "s3nha!", portal: "formando" }));

    expect(res.status).toBe(403);
    expect((await res.json()).portalCorreto).toBe("vocacional");
    expect(res.cookies.get("portal_session")).toBeUndefined();
    expect(signPortalToken).not.toHaveBeenCalled();
  });

  it("formando no Portal do Formando → 200 e emite sessão com audiencia=formando", async () => {
    vi.mocked(loginFormando).mockResolvedValue({ ok: true, formandoId: "f1", organizacaoId: ORG } as never);
    vi.mocked(getPortalAudiencia).mockResolvedValue("formando");

    const res = await POST(loginReq({ email: "a@b.com", senha: "s3nha!", portal: "formando" }));

    expect(res.status).toBe(200);
    expect(signPortalToken).toHaveBeenCalledWith(
      expect.objectContaining({ formandoId: "f1", organizacaoId: ORG, audiencia: "formando" })
    );
    expect(res.cookies.get("portal_session")?.value).toBe("signed.jwt.token");
  });

  it("vocacionado no Portal do Vocacionado → 200 e emite sessão com audiencia=vocacional", async () => {
    vi.mocked(loginFormando).mockResolvedValue({ ok: true, formandoId: "f2", organizacaoId: ORG } as never);
    vi.mocked(getPortalAudiencia).mockResolvedValue("vocacional");

    const res = await POST(loginReq({ email: "a@b.com", senha: "s3nha!", portal: "vocacional" }));

    expect(res.status).toBe(200);
    expect(signPortalToken).toHaveBeenCalledWith(expect.objectContaining({ audiencia: "vocacional" }));
    expect(res.cookies.get("portal_session")?.value).toBe("signed.jwt.token");
  });

  it("sem `portal` no corpo assume formando (compat) → vocacionado é barrado", async () => {
    vi.mocked(loginFormando).mockResolvedValue({ ok: true, formandoId: "f2", organizacaoId: ORG } as never);
    vi.mocked(getPortalAudiencia).mockResolvedValue("vocacional");

    const res = await POST(loginReq({ email: "a@b.com", senha: "s3nha!" }));

    expect(res.status).toBe(403);
    expect((await res.json()).portalCorreto).toBe("vocacional");
  });

  it("credencial inválida → 401 genérico, gate nem é avaliado", async () => {
    vi.mocked(loginFormando).mockResolvedValue({ ok: false, code: "invalid" } as never);

    const res = await POST(loginReq({ email: "a@b.com", senha: "errada", portal: "vocacional" }));

    expect(res.status).toBe(401);
    expect(getPortalAudiencia).not.toHaveBeenCalled();
    expect(signPortalToken).not.toHaveBeenCalled();
  });
});
