import { describe, it, expect } from "vitest";
import { parsePagination, paginationHeaders } from "@/lib/pagination";

describe("parsePagination", () => {
  it("returns null when no params", () => {
    expect(parsePagination(new URLSearchParams())).toBeNull();
  });

  it("returns null when params are empty strings", () => {
    expect(parsePagination(new URLSearchParams(""))).toBeNull();
  });

  it("parses page and pageSize", () => {
    const result = parsePagination(new URLSearchParams("page=2&pageSize=20"));
    expect(result).toEqual({ page: 2, pageSize: 20, skip: 20, take: 20 });
  });

  it("defaults pageSize to 50 when only page is given", () => {
    const result = parsePagination(new URLSearchParams("page=3"));
    expect(result?.pageSize).toBe(50);
    expect(result?.skip).toBe(100);
    expect(result?.take).toBe(50);
  });

  it("defaults page to 1 when only pageSize is given", () => {
    const result = parsePagination(new URLSearchParams("pageSize=10"));
    expect(result?.page).toBe(1);
    expect(result?.skip).toBe(0);
  });

  it("clamps pageSize to MAX_PAGE_SIZE (200)", () => {
    const result = parsePagination(new URLSearchParams("page=1&pageSize=9999"));
    expect(result?.pageSize).toBe(200);
    expect(result?.take).toBe(200);
  });

  it("floors page=0 to 1", () => {
    const result = parsePagination(new URLSearchParams("page=0&pageSize=10"));
    expect(result?.page).toBe(1);
    expect(result?.skip).toBe(0);
  });

  it("floors negative page to 1", () => {
    const result = parsePagination(new URLSearchParams("page=-5&pageSize=10"));
    expect(result?.page).toBe(1);
    expect(result?.skip).toBe(0);
  });

  it("floors pageSize=0 to 1", () => {
    const result = parsePagination(new URLSearchParams("pageSize=0&page=1"));
    expect(result?.pageSize).toBe(1);
  });

  it("computes skip correctly for page 5 pageSize 25", () => {
    const result = parsePagination(new URLSearchParams("page=5&pageSize=25"));
    expect(result?.skip).toBe(100);
    expect(result?.take).toBe(25);
  });
});

describe("paginationHeaders", () => {
  it("returns correct headers", () => {
    const params = { page: 2, pageSize: 10, skip: 10, take: 10 };
    const headers = paginationHeaders(95, params);
    expect(headers["X-Total-Count"]).toBe("95");
    expect(headers["X-Page"]).toBe("2");
    expect(headers["X-Page-Size"]).toBe("10");
    expect(headers["X-Page-Count"]).toBe("10"); // ceil(95/10) = 10
  });

  it("calculates page count with ceiling", () => {
    const params = { page: 1, pageSize: 3, skip: 0, take: 3 };
    const headers = paginationHeaders(7, params);
    expect(headers["X-Page-Count"]).toBe("3"); // ceil(7/3) = 3
  });

  it("handles zero total", () => {
    const params = { page: 1, pageSize: 10, skip: 0, take: 10 };
    const headers = paginationHeaders(0, params);
    expect(headers["X-Total-Count"]).toBe("0");
    expect(headers["X-Page-Count"]).toBe("0");
  });

  it("handles exact division", () => {
    const params = { page: 1, pageSize: 5, skip: 0, take: 5 };
    const headers = paginationHeaders(20, params);
    expect(headers["X-Page-Count"]).toBe("4");
  });
});
