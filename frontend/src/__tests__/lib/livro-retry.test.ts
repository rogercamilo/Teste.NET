import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lavrarComRetry, isP2002, p2002Target } from "@/lib/livro-retry";

const tx = vi.mocked(prisma.$transaction);

function p2002(target: string[] = ["tomo"]) {
  return new Prisma.PrismaClientKnownRequestError("unique violation", {
    code: "P2002",
    clientVersion: "test",
    meta: { target },
  });
}

const txFn = async () => "ok";

beforeEach(() => vi.clearAllMocks());

describe("lavrarComRetry", () => {
  it("retorna o resultado na primeira tentativa quando não há colisão", async () => {
    tx.mockResolvedValueOnce("ok" as never);
    await expect(lavrarComRetry(txFn)).resolves.toBe("ok");
    expect(tx).toHaveBeenCalledTimes(1);
  });

  it("reexecuta em P2002 (numeração do termo) e tem sucesso na 2ª tentativa", async () => {
    tx.mockRejectedValueOnce(p2002()).mockResolvedValueOnce("ok" as never);
    await expect(lavrarComRetry(txFn)).resolves.toBe("ok");
    expect(tx).toHaveBeenCalledTimes(2);
  });

  it("propaga o P2002 após esgotar as tentativas", async () => {
    tx.mockRejectedValue(p2002() as never);
    await expect(lavrarComRetry(txFn, { tentativas: 3 })).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    expect(tx).toHaveBeenCalledTimes(3);
  });

  it("não retenta um P2002 permanente (naoRetentar) — propaga de imediato", async () => {
    tx.mockRejectedValue(p2002(["formandoId"]) as never);
    await expect(
      lavrarComRetry(txFn, { naoRetentar: (e) => p2002Target(e).includes("formandoId") }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(tx).toHaveBeenCalledTimes(1);
  });

  it("não retenta erro que não é P2002", async () => {
    tx.mockRejectedValue(new Error("boom") as never);
    await expect(lavrarComRetry(txFn)).rejects.toThrow("boom");
    expect(tx).toHaveBeenCalledTimes(1);
  });

  it("isP2002 / p2002Target funcionam", () => {
    const e = p2002(["a", "b"]);
    expect(isP2002(e)).toBe(true);
    expect(isP2002(new Error("x"))).toBe(false);
    expect(p2002Target(e)).toEqual(["a", "b"]);
  });
});
