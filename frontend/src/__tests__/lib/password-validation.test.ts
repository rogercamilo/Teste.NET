import { describe, it, expect } from "vitest";
import { validatePassword, passwordErrorMessage } from "@/lib/password-validation";

describe("validatePassword", () => {
  it("accepts a strong password", () => {
    const result = validatePassword("Senha@123");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects empty string", () => {
    const result = validatePassword("");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Mínimo de 8 caracteres");
  });

  it("rejects password shorter than 8 chars", () => {
    const result = validatePassword("Ab1!");
    expect(result.errors).toContain("Mínimo de 8 caracteres");
  });

  it("rejects password without uppercase", () => {
    const result = validatePassword("senha@123");
    expect(result.errors).toContain("Pelo menos uma letra maiúscula");
  });

  it("rejects password without lowercase", () => {
    const result = validatePassword("SENHA@123");
    expect(result.errors).toContain("Pelo menos uma letra minúscula");
  });

  it("rejects password without number", () => {
    const result = validatePassword("Senha@abc");
    expect(result.errors).toContain("Pelo menos um número");
  });

  it("rejects password without special character", () => {
    const result = validatePassword("Senha1234");
    expect(result.errors).toContain("Pelo menos um caractere especial (!@#$%^&* …)");
  });

  it("reports all missing rules at once", () => {
    const result = validatePassword("short");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain("Mínimo de 8 caracteres");
    expect(result.errors).toContain("Pelo menos uma letra maiúscula");
    expect(result.errors).toContain("Pelo menos um número");
    expect(result.errors).toContain("Pelo menos um caractere especial (!@#$%^&* …)");
  });

  it("accepts exactly 8-char password with all rules", () => {
    const result = validatePassword("Senha@1x");
    expect(result.valid).toBe(true);
  });

  it("accepts various special characters", () => {
    expect(validatePassword("Abc12345!").valid).toBe(true);
    expect(validatePassword("Abc12345@").valid).toBe(true);
    expect(validatePassword("Abc12345#").valid).toBe(true);
    expect(validatePassword("Abc12345$").valid).toBe(true);
    expect(validatePassword("Abc12345_").valid).toBe(true);
  });
});

describe("passwordErrorMessage", () => {
  it("returns null for a valid password", () => {
    expect(passwordErrorMessage("Senha@123")).toBeNull();
  });

  it("returns joined error messages for invalid password", () => {
    const msg = passwordErrorMessage("abc");
    expect(msg).not.toBeNull();
    expect(typeof msg).toBe("string");
    expect(msg).toContain("Mínimo de 8 caracteres");
  });

  it("joins multiple errors with semicolons", () => {
    const msg = passwordErrorMessage("abc");
    expect(msg).toContain(";");
  });
});
