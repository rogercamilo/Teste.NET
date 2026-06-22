import { test, expect } from "@playwright/test";
import { createOrgWithAdmin, uniqueOrgName, uniqueEmail, TEST_PASSWORD, deleteOrgByName, disconnect } from "./helpers/db";
import { acceptCookies } from "./helpers/ui";

const orgNome = uniqueOrgName();
const adminEmail = uniqueEmail("login");

test.beforeAll(async () => {
  await createOrgWithAdmin({ orgNome, adminEmail, onboardingConcluido: true });
});

test.afterAll(async () => {
  await deleteOrgByName(orgNome);
  await disconnect();
});

test("login com credenciais válidas redireciona ao dashboard", async ({ page }) => {
  await page.goto("/login");
  await acceptCookies(page);
  await page.fill("#email", adminEmail);
  await page.fill("#password", TEST_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");
  expect(page.url()).toContain("/dashboard");
});

test("login com senha errada mostra erro e permanece em /login", async ({ page }) => {
  await page.goto("/login");
  await acceptCookies(page);
  await page.fill("#email", adminEmail);
  await page.fill("#password", "SenhaErrada1@");
  await page.click("button[type=submit]");
  await expect(page.getByText(/inválid/i)).toBeVisible();
  expect(page.url()).toContain("/login");
});
