import { describe, it, expect } from "vitest";
import { PerfilPortalSchema } from "@/lib/schemas";

/**
 * PerfilPortalSchema é a FRONTEIRA de responsabilidade formador×pessoa no portal:
 * a própria pessoa edita só seus dados pessoais e o `.strict()` REJEITA qualquer
 * campo formativo. Este teste trava esse contrato de segurança.
 */
describe("PerfilPortalSchema", () => {
  it("aceita atualização parcial de dados pessoais", () => {
    const r = PerfilPortalSchema.safeParse({
      telefone: "(11) 99999-8888",
      estadoCivil: "casado",
      nomeSocial: "Zé",
    });
    expect(r.success).toBe(true);
  });

  it("aceita o nome completo (editável pela própria pessoa)", () => {
    expect(PerfilPortalSchema.safeParse({ nome: "Maria Silva" }).success).toBe(true);
    // Nome presente não pode ser vazio.
    expect(PerfilPortalSchema.safeParse({ nome: "" }).success).toBe(false);
  });

  it("aceita os campos de endereço residencial", () => {
    const r = PerfilPortalSchema.safeParse({
      endereco: "Rua das Flores", numero: "123", complemento: "Apto 4",
      bairro: "Centro", cidade: "Fortaleza", estado: "CE",
      paisResidencia: "Brasil", cep: "60000-000",
    });
    expect(r.success).toBe(true);
  });

  it("aceita os campos canônicos (documentos eclesiásticos)", () => {
    const r = PerfilPortalSchema.safeParse({
      nacionalidade: "Brasileira", rg: "123", orgaoEmissor: "SSP/CE",
      paroquiaReferencia: "N. Sra.", numFilhos: 2,
    });
    expect(r.success).toBe(true);
  });

  it("aceita objeto vazio (nada a alterar)", () => {
    expect(PerfilPortalSchema.safeParse({}).success).toBe(true);
  });

  it("permite limpar a data de nascimento (null)", () => {
    const r = PerfilPortalSchema.safeParse({ dataNascimento: null });
    expect(r.success).toBe(true);
  });

  it("aceita foto como key ou base64 e como null (remover)", () => {
    expect(PerfilPortalSchema.safeParse({ foto: "imagens/org/abc.jpg" }).success).toBe(true);
    expect(PerfilPortalSchema.safeParse({ foto: null }).success).toBe(true);
  });

  it.each([
    ["nivelFormativo", "discipulado"],
    ["grupoFormacaoId", "grp_1"],
    ["modalidade", "online"],
    ["dataIngresso", "2026-01-01"],
    ["ativo", false],
    ["totalFormacoes", 10],
    ["email", "novo@exemplo.com"], // e-mail é o login: só o responsável altera no app
  ])("REJEITA o campo formativo/gerido pelo formador: %s", (campo, valor) => {
    const r = PerfilPortalSchema.safeParse({ [campo]: valor });
    expect(r.success).toBe(false);
  });

  it("rejeita estado civil inválido", () => {
    expect(PerfilPortalSchema.safeParse({ estadoCivil: "namorando" }).success).toBe(false);
  });

  it("rejeita data de nascimento em formato inválido", () => {
    expect(PerfilPortalSchema.safeParse({ dataNascimento: "10/07/2026" }).success).toBe(false);
  });

  it("rejeita número de filhos negativo", () => {
    expect(PerfilPortalSchema.safeParse({ numFilhos: -1 }).success).toBe(false);
  });
});
