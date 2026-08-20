import { test, expect } from "@playwright/test";
import {
  createOrgWithAdmin,
  scryptHash,
  uniqueOrgName,
  uniqueEmail,
  TEST_PASSWORD,
  deleteOrgByName,
  disconnect,
  prisma,
} from "./helpers/db";
import { acceptCookies, login } from "./helpers/ui";

const orgNome = uniqueOrgName();
const adminEmail = uniqueEmail("usuarios-admin");
const pedagogicoEmail = uniqueEmail("usuarios-pedagogico");
const fgEmail = uniqueEmail("usuarios-fg");

let orgId = "";
let adminId = "";
let pedagogicoId = "";

test.beforeAll(async () => {
  const created = await createOrgWithAdmin({ orgNome, adminEmail, onboardingConcluido: true });
  orgId = created.orgId;
  adminId = created.adminId;
  // GRATUITO tem limite 0 de usuários; BASICO permite criar.
  await prisma.organizacao.update({
    where: { id: orgId },
    data: { planoAssinatura: "BASICO", status: "ATIVO" },
  });
  // Semeia um Formador Pedagógico (regressão: sua edição já dava "Perfil inválido").
  const pedagogico = await prisma.usuario.create({
    data: {
      organizacaoId: orgId,
      nome: "Pedagógico E2E",
      email: pedagogicoEmail.toLowerCase(),
      passwordHash: scryptHash(TEST_PASSWORD),
      perfil: "formador_pedagogico",
      ativo: true,
      primeiroAcesso: false,
    },
  });
  pedagogicoId = pedagogico.id;
  // Semeia um Formador Geral para exercitar o enforcement por camada de privilégio.
  await prisma.usuario.create({
    data: {
      organizacaoId: orgId,
      nome: "Formador Geral E2E",
      email: fgEmail.toLowerCase(),
      passwordHash: scryptHash(TEST_PASSWORD),
      perfil: "formador_geral",
      ativo: true,
      primeiroAcesso: false,
    },
  });
});

test.afterAll(async () => {
  await deleteOrgByName(orgNome);
  await disconnect();
});

async function entrarComoAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await acceptCookies(page);
  await login(page, adminEmail, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");
  await page.goto("/configuracoes?tab=usuarios");
  await acceptCookies(page);
  await page.getByRole("tab", { name: /Usu/ }).click().catch(() => {});
}

async function entrarComoFormadorGeral(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await acceptCookies(page);
  await login(page, fgEmail, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");
  await page.goto("/configuracoes?tab=usuarios");
  await acceptCookies(page);
  await page.getByRole("tab", { name: /Usu/ }).click().catch(() => {});
}

// Regressão: a rota POST /api/users precisa devolver tempPassword para que o
// admin veja a senha provisória ao criar um usuário com senha automática.
// Antes do fix, o diálogo de senha nunca aparecia (a senha era perdida).
test("criar usuário com senha automática exibe o diálogo de senha provisória", async ({ page }) => {
  await entrarComoAdmin(page);

  const novoEmail = uniqueEmail("novo");
  await page.getByRole("button", { name: /Novo Usuário/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /Novo Usuário/ })).toBeVisible();
  await dialog.getByPlaceholder("Nome Sobrenome").fill("Usuário Novo E2E");
  await dialog.getByPlaceholder(/usuario@/).fill(novoEmail);

  // Perfil Administrador (evita exigência de morada vinculada).
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Administrador" }).click();

  // "Gerar senha automática" já vem ligado por padrão.
  await dialog.getByRole("button", { name: /Criar usuário/ }).click();

  // O diálogo de senha provisória precisa aparecer com uma senha visível.
  await expect(page.getByRole("heading", { name: /criado com sucesso/i })).toBeVisible();
  const entendi = page.getByRole("button", { name: /Entendi/ });
  await expect(entendi).toBeVisible();
  await entendi.click();
  await expect(page.getByRole("heading", { name: /criado com sucesso/i })).toBeHidden();

  // O novo usuário aparece na lista.
  await expect(page.getByText(novoEmail)).toBeVisible();
});

// Menu de ações da linha: abrir "Editar", cancelar e reabrir não deve travar a UI.
test("menu de ações abre o diálogo de edição e libera a UI ao fechar", async ({ page }) => {
  await entrarComoAdmin(page);

  await page.locator('[data-slot="dropdown-menu-trigger"]').first().click();
  await page.getByRole("menuitem", { name: /Editar/ }).click();
  await expect(page.getByRole("heading", { name: /Editar Usuário/ })).toBeVisible();
  await page.getByRole("button", { name: /Cancelar/ }).click();
  await expect(page.getByRole("heading", { name: /Editar Usuário/ })).toBeHidden();

  // UI liberada: o menu reabre normalmente após fechar o diálogo.
  await page.locator('[data-slot="dropdown-menu-trigger"]').first().click();
  await expect(page.getByRole("menuitem", { name: /Editar/ })).toBeVisible();
});

// Regressão (commit e8062be): editar um usuário com perfil formador_pedagogico
// batia em "Perfil inválido" porque a rota PUT mantinha uma lista hardcoded
// defasada. Agora valida pelo PerfilEnum canônico.
test("editar usuário Formador Pedagógico não retorna 'Perfil inválido'", async ({ page }) => {
  await entrarComoAdmin(page);
  const res = await page.request.put(`/api/users/${pedagogicoId}`, {
    data: { nome: "Pedagógico Editado E2E", perfil: "formador_pedagogico", ativo: true },
  });
  expect(res.status()).toBe(200);
});

// Paridade de política de senha: a criação exige mín. 8; a edição aceitava
// qualquer tamanho. Agora o PUT rejeita senha curta com 400.
test("edição rejeita senha com menos de 8 caracteres", async ({ page }) => {
  await entrarComoAdmin(page);
  const res = await page.request.put(`/api/users/${pedagogicoId}`, {
    data: { password: "123" },
  });
  expect(res.status()).toBe(400);
});

// Enforcement por camada de privilégio: um Formador Geral não pode criar nem
// editar contas de nível de gestão (administrador/formador_geral) — fecha a
// escalada de privilégio. Gere apenas comunitário/pedagógico.
test("Formador Geral não escala privilégio via API", async ({ page }) => {
  await entrarComoFormadorGeral(page);

  // Não pode criar um administrador.
  const criaAdmin = await page.request.post("/api/users", {
    data: { nome: "Tentativa Admin", email: uniqueEmail("fg-cria-admin"), perfil: "administrador" },
  });
  expect(criaAdmin.status()).toBe(403);

  // Não pode editar o administrador existente (tomada de conta via senha).
  const editaAdmin = await page.request.put(`/api/users/${adminId}`, {
    data: { password: "NovaSenhaForte@2026" },
  });
  expect(editaAdmin.status()).toBe(403);

  // Pode criar um formador comunitário (perfil abaixo da sua camada).
  const criaComunitario = await page.request.post("/api/users", {
    data: { nome: "Comunitário por FG", email: uniqueEmail("fg-cria-fc"), perfil: "formador_comunitario" },
  });
  expect(criaComunitario.status()).toBe(201);
});

// Gate de UI: o seletor de perfil do Formador Geral não oferece perfis de gestão.
test("Formador Geral não vê opções de perfil de gestão no formulário", async ({ page }) => {
  await entrarComoFormadorGeral(page);
  await page.getByRole("button", { name: /Novo Usuário/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /Novo Usuário/ })).toBeVisible();

  // Abre o seletor de "Perfil de acesso".
  await dialog.getByRole("combobox").first().click();
  await expect(page.getByRole("option", { name: "Formador Comunitário" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Formador Pedagógico" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Administrador" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Formador Geral" })).toHaveCount(0);
});
