// O servidor de desenvolvimento (Turbopack) compila cada rota sob demanda na
// primeira requisição — a primeira compilação de uma API pode levar ~20s e
// estourar o timeout de uma asserção. Este global setup "aquece" as rotas e
// APIs usadas pelos testes UMA vez, fora dos timeouts de teste, deixando as
// requisições reais rápidas e determinísticas.
const BASE = "http://localhost:3000";

async function warm(path: string, init?: RequestInit): Promise<void> {
  try {
    await fetch(`${BASE}${path}`, init);
  } catch {
    /* compilação ainda pode ser disparada mesmo se a resposta falhar */
  }
}

export default async function globalSetup(): Promise<void> {
  const dummyToken = "0".repeat(64);

  // Páginas
  for (const p of ["/registro", "/login", "/onboarding", "/dashboard", `/convite/${dummyToken}`]) {
    await warm(p);
  }

  // APIs (qualquer método compila o módulo da rota)
  await warm("/api/organizacao");
  await warm("/api/grupos-formacao");
  await warm(`/api/convites/${dummyToken}`);
  await warm("/api/registro", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
}
