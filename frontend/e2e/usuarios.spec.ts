import { test, expect } from "@playwright/test";
import {
  createOrgWithAdmin,
  uniqueOrgName,
  uniqueEmail,
  TEST_PASSWORD,
  deleteOrgByName,
  disconnect,
  prisma,
} from "./helpers/db";
import { acceptCookies } from "./helpers/ui";

const orgNome = uniqueOrgName();
const adminEmail = uniqueEmail("usuarios-admin");

test.beforeAll(async () => {
  const { orgId } = await createOrgWithAdmin({ orgNome, adminEmail, onboardingConcluido: true });
  // GRATUITO tem limite 0 de usuários; BASICO permite criar.
  await prisma.organizacao.update({
    where: { id: orgId },
    data: { planoAssinatura: "BASICO", status: "ATIVO" },
  });
});

test.afterAll(async () => {
  await deleteOrgByName(orgNome);
  await disconnect();
});

async function entrarComoAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await acceptCookies(page);
  await page.fill("#email", adminEmail);
  await page.fill("#password", TEST_PASSWORD);
  await page.click("button[type=submit]");
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
