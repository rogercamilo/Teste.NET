import type { Page } from "@playwright/test";

// Dispensa o banner de cookies (aparece ~800ms após a carga). Idempotente:
// se já foi aceito no contexto, o botão não existe e a chamada é ignorada.
export async function acceptCookies(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /Aceitar todos/ })
    .click({ timeout: 5000 })
    .catch(() => {});
}
