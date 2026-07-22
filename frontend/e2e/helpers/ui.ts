import type { Page } from "@playwright/test";

// Dispensa o banner de cookies (aparece ~800ms após a carga). Idempotente:
// se já foi aceito no contexto, o botão não existe e a chamada é ignorada.
export async function acceptCookies(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /Aceitar todos/ })
    .click({ timeout: 5000 })
    .catch(() => {});
}

// Login em 2 passos (e-mail → senha). O 1º passo resolve a marca da org e só
// então revela o campo de senha: `#password` NÃO existe antes de "Continuar".
// Não navega nem espera URL — o teste decide o que asserir (dashboard vs erro).
// `page.fill("#password")` já auto-aguarda o passo da senha renderizar.
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.fill("#email", email);
  await page.click("button[type=submit]"); // Continuar
  await page.fill("#password", password);
  await page.click("button[type=submit]"); // Entrar
}
