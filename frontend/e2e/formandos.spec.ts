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
import { acceptCookies, login } from "./helpers/ui";

const orgNome = uniqueOrgName();
const adminEmail = uniqueEmail("formandos-admin");

// Nome único (não colide com nenhum outro) para exercitar a busca server-side.
const NOME_UNICO = "Xyztoken Zebraunica";

test.beforeAll(async () => {
  const { orgId } = await createOrgWithAdmin({ orgNome, adminEmail, onboardingConcluido: true });
  await prisma.organizacao.update({
    where: { id: orgId },
    data: { planoAssinatura: "BASICO", status: "ATIVO" },
  });

  // 13 formandos numerados + 1 com nome único → total 14 (> PAGE_SIZE de 12),
  // forçando 2 páginas. Ordenação por nome asc torna a página determinística.
  const numerados = Array.from({ length: 13 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      organizacaoId: orgId,
      nome: `E2E Formando ${n}`,
      estadoCivil: "solteiro",
      modalidade: "presencial",
      nivelFormativo: "discipulado",
      dataIngresso: new Date(),
      telefone: "11999999999",
      email: uniqueEmail(`formando-${n}`),
    };
  });
  await prisma.formando.createMany({
    data: [
      ...numerados,
      {
        organizacaoId: orgId,
        nome: NOME_UNICO,
        estadoCivil: "solteiro",
        modalidade: "presencial",
        nivelFormativo: "discipulado",
        dataIngresso: new Date(),
        telefone: "11999999999",
        email: uniqueEmail("formando-unico"),
      },
    ],
  });
});

test.afterAll(async () => {
  await deleteOrgByName(orgNome);
  await disconnect();
});

async function entrar(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await acceptCookies(page);
  await login(page, adminEmail, TEST_PASSWORD);
  await page.waitForURL("**/dashboard");
  await page.goto("/formandos");
  await acceptCookies(page);
}

// A listagem pagina no servidor: 14 registros → página 1 mostra 12, página 2
// mostra o restante. O rodapé da paginação reflete o total real.
test("paginação server-side navega entre as páginas", async ({ page }) => {
  await entrar(page);

  await expect(page.getByText(/1–12 de 14 registro/)).toBeVisible();
  await expect(page.getByText("E2E Formando 01")).toBeVisible();
  // O 13º registro não está na primeira página.
  await expect(page.getByText("E2E Formando 13")).toHaveCount(0);

  // Vai para a página 2 pelo botão numérico; a URL carrega o estado.
  await page.getByRole("button", { name: "2", exact: true }).click();
  await page.waitForURL(/[?&]page=2/);
  await expect(page.getByText(/13–14 de 14 registro/)).toBeVisible();
  await expect(page.getByText("E2E Formando 13")).toBeVisible();
  await expect(page.getByText("E2E Formando 01")).toHaveCount(0);
});

// A busca é server-side (?q=): filtra no banco e reduz o resultado a 1.
test("busca server-side filtra pelo nome", async ({ page }) => {
  await entrar(page);

  await page.getByPlaceholder(/Buscar por nome/).fill("Xyztoken");
  await page.waitForURL(/[?&]q=Xyztoken/);

  await expect(page.getByText(NOME_UNICO)).toBeVisible();
  await expect(page.getByText("E2E Formando 01")).toHaveCount(0);
  // Resultado único → controle de paginação não aparece (1 página só).
  await expect(page.getByText(/de 14 registro/)).toHaveCount(0);
});
