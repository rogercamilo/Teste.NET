import { test, expect } from "@playwright/test";
import { createOrgWithAdmin, createInvite, uniqueOrgName, uniqueEmail, TEST_PASSWORD, deleteOrgByName, disconnect } from "./helpers/db";
import { acceptCookies } from "./helpers/ui";

const orgNome = uniqueOrgName();
const adminEmail = uniqueEmail("convite-admin");
const conviteEmail = uniqueEmail("convidado");
let token = "";

test.beforeAll(async () => {
  const { orgId, adminId } = await createOrgWithAdmin({ orgNome, adminEmail, onboardingConcluido: true });
  token = await createInvite({ organizacaoId: orgId, criadoPorId: adminId, email: conviteEmail });
});

test.afterAll(async () => {
  await deleteOrgByName(orgNome);
  await disconnect();
});

test("ativação de convite cria conta e entra no dashboard", async ({ page }) => {
  await page.goto(`/convite/${token}`);
  await acceptCookies(page);

  await expect(page.getByRole("heading", { name: "Ativar conta" })).toBeVisible();
  await page.fill("#senha", TEST_PASSWORD);
  await page.fill("#confirmar", TEST_PASSWORD);
  await page.getByRole("button", { name: /Ativar conta e entrar/ }).click();

  await page.waitForURL("**/dashboard");
  expect(page.url()).toContain("/dashboard");
});

test("convite com token inválido mostra mensagem de erro", async ({ page }) => {
  await page.goto(`/convite/${"0".repeat(64)}`);
  await acceptCookies(page);
  await expect(page.getByText("Convite inválido")).toBeVisible();
});
