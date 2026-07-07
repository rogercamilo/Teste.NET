import { describe, it, expect, vi, afterEach } from "vitest";
import { idadeEmAnos } from "@/lib/utils";

describe("idadeEmAnos", () => {
  afterEach(() => vi.useRealTimers());

  it("retorna null quando a data não foi informada", () => {
    expect(idadeEmAnos(undefined)).toBeNull();
    expect(idadeEmAnos(null)).toBeNull();
    expect(idadeEmAnos("")).toBeNull();
  });

  it("calcula a idade em anos completos a partir de YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 7, 12, 0, 0)); // 07/07/2026

    expect(idadeEmAnos("2000-01-01")).toBe(26);
    // Aniversário ainda não chegou neste ano → conta um a menos.
    expect(idadeEmAnos("2000-12-31")).toBe(25);
  });
});
