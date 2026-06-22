import { test, expect } from "@playwright/test";

// Viewport estreito (mobile) = pior caso: o banner de cookies é mais alto.
test.use({ viewport: { width: 390, height: 844 } });

// Regressão: o banner fixo no rodapé não pode cobrir o botão de ação primário.
// A correção reserva padding-bottom no <body> igual à altura real do banner.
test("banner de cookies não sobrepõe o botão de ação no mobile", async ({ page }) => {
  await page.goto("/registro");

  // Garante que o banner está visível (aparece ~800ms após a carga).
  await expect(page.getByRole("button", { name: /Aceitar todos/ })).toBeVisible();

  const pad = await page.evaluate(
    () => parseFloat(getComputedStyle(document.body).paddingBottom) || 0
  );
  expect(pad).toBeGreaterThan(40);

  // Rola até o fim (como um usuário) e confirma que o botão fica ACIMA do banner.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const botao = page.getByRole("button", { name: /Criar conta gratuitamente/ });
  const banner = page.getByRole("dialog", { name: /Preferências de cookies/ });
  const btnBox = await botao.boundingBox();
  const banBox = await banner.boundingBox();

  expect(btnBox).not.toBeNull();
  expect(banBox).not.toBeNull();
  // borda inferior do botão acima da borda superior do banner = sem sobreposição
  expect(btnBox!.y + btnBox!.height).toBeLessThanOrEqual(banBox!.y);
});
