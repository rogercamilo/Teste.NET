import { test, expect } from "@playwright/test";
import { uniqueOrgName, uniqueEmail, TEST_PASSWORD, deleteOrgByName, disconnect } from "./helpers/db";
import { acceptCookies } from "./helpers/ui";

const orgNome = uniqueOrgName();
const adminEmail = uniqueEmail("admin");

test.afterAll(async () => {
  await deleteOrgByName(orgNome);
  await disconnect();
});

// Jornada completa: registro -> auto-login -> wizard de onboarding -> dashboard.
// Cobre a regressão do passo 4 (terminologia deixada EM BRANCO deve ser aceita;
// antes resultava em 400 e travava a conclusão do onboarding).
test("registro + onboarding com terminologia em branco conclui no dashboard", async ({ page }) => {
  await page.goto("/registro");
  await acceptCookies(page);

  await page.fill("#orgNome", orgNome);
  await page.fill("#adminNome", "Admin E2E");
  await page.fill("#adminEmail", adminEmail);
  await page.fill("#senha", TEST_PASSWORD);
  await page.fill("#confirmarSenha", TEST_PASSWORD);
  await page.check("#privacidade");
  await page.click("button[type=submit]");

  await page.waitForURL("**/onboarding");
  await expect(page.getByText("Sobre a organização")).toBeVisible();

  // Passo 1 -> 2
  await page.getByRole("button", { name: /Próximo/ }).click();
  await expect(page.getByText("Identidade visual")).toBeVisible();

  // Passo 2 -> 3
  await page.getByRole("button", { name: /Próximo/ }).click();
  await expect(page.getByText("Escolha seu plano")).toBeVisible();

  // Passo 3 -> 4 (segue no período de experiência, sem Stripe)
  await page.getByRole("button", { name: /período de experiência/ }).click();
  await expect(page.getByText("Terminologia da comunidade")).toBeVisible();

  // Passo 4 -> 5 — NÃO preenche nenhum termo (caso padrão "usar termos padrão")
  await page.getByRole("button", { name: /Próximo/ }).click();
  await expect(page.getByText("primeiro grupo de formação")).toBeVisible();

  // Passo 5 -> conclui
  await page.fill("#grupoFormacaoNome", "Grupo E2E");
  await page.getByRole("button", { name: /Concluir/ }).click();

  await page.waitForURL("**/dashboard");
  expect(page.url()).toContain("/dashboard");
});
