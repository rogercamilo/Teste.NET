# Avaliação de Segurança — Formattio

> White-box, código atual. Última execução: **2026-07-01**.
> **Ressalva estrutural:** esta avaliação foi conduzida com assistência de IA (a mesma que
> participou da construção). **Não substitui um pentest externo independente** — o testador e o
> autor compartilham pontos cegos. Trate como "fundamentos verificados", não como certificação.

## Método e escopo

- Superfície mapeada: **99 rotas de API** (`src/app/api/**/route.ts`).
- Executado: `npm audit`; varredura de primitivas perigosas; padrão de autenticação/autorização e
  isolamento de tenant; XSS (injeção em `<style>`/DOM); gestão de segredos no git.
- Profundidade: **~8 rotas lidas integralmente** como amostra representativa; o restante verificado
  por padrão via busca. **Sem exploração em runtime nesta rodada** (análise estática).

## Achados

| Dimensão | Resultado | Status |
|----------|-----------|--------|
| Dependências | `npm audit` = 0 vulnerabilidades | ✅ |
| Primitivas perigosas | Zero `eval`/`new Function`/`child_process`/`queryRawUnsafe`; `$queryRaw` só tagged templates parametrizados | ✅ |
| XSS (`themeCss`) | `getThemeInlineCss` = lookup em allowlist (`THEME_PALETTES`); valor desconhecido → `""`; valores CSS hardcoded | ✅ |
| Segredos no git | `.env.local` gitignored; só `.env.example` versionado; nada no histórico | ✅ |
| Autenticação | 80/99 rotas com `auth()`; demais usam guards (`requireVocacionalAccess`, `requireLivroAccess`) ou são públicas intencionais (registro, webhook HMAC, portal token, cron secret) | ✅ |
| Autorização / IDOR (mutação e item) | Padrão consistente `findFirst({ id, organizacaoId })` → 404 → check de posse → mutação por id. Verificado em comentarios, eventos, documentos/[id], arquivos/[id]; escopo direto em agendamentos/etapas | ✅ |
| **Autorização — sobre-exposição em LISTAGEM (GET)** | **Auditoria dedicada 2026-07-01**: TODOS os `findMany` de rota escopam por `organizacaoId` (ou são cross-org super_admin, per-user em notificações, ou sem dado de tenant na vitrine). Templates `isGlobal` não são setáveis por tenant (clones forçam `isGlobal:false`). File-serves validam prefixo R2 (anti open-redirect). **Zero vazamento cross-tenant.** Agora coberto por teste no CI. | ✅ |
| Defesa em profundidade | rate limit + Zod (`parseJson`) + `isValidId` + audit log + ownership (FC restrito aos próprios registros) | ✅ |

**Nenhuma vulnerabilidade crítica encontrada nesta varredura.**

## Limitações desta avaliação (importante)

- **Cobertura parcial:** ~8 de 99 rotas lidas a fundo. Padrão consistente nas amostras, mas não é
  certificação de cada rota — a falha típica de authz é numa rota isolada que esqueceu o filtro.
- **Sem teste em runtime** nesta rodada.
- **Não varrido:** SSRF (outbound com URL de usuário), fixação de sessão, transições de estado de
  lógica de negócio, XSS de frontend além de `themeCss`, serve autenticado de arquivos em profundidade.
- **Conflito estrutural:** autor e testador compartilham pontos cegos.

## Veredito

Postura de segurança **materialmente acima da média** para a categoria — mas **não comprovada por
terceiro independente**.

- Confiança **alta**: vetores de "toma controle em minutos" (auth bypass, IDOR trivial, segredos
  expostos, injeção, deps vulneráveis) estão fechados no que foi verificado.
- Confiança **média**: inexistência de falha de authz de lógica de negócio em rota não lida, ou de
  caso de runtime que a análise estática não pega.

Risco residual dominado por **"não testado por quem não escreveu"**, não por defeito encontrado.

## Recomendações priorizadas

1. **Pentest externo independente** — maior valor; resolve o ponto cego estrutural. Antes de tráfego real.
2. ~~**Matriz de authz no CI**~~ ✅ **IMPLEMENTADA** (`src/__tests__/security/authz-matrix.test.ts`,
   6 testes): guardrail sobre as 99 rotas — auth em toda rota não-pública; escopo de org em toda
   ESCRITA **e toda LISTAGEM (findMany)**; super_admin nas rotas de plataforma. Rota nova que esqueça
   auth/escopo quebra o CI. Fecha o blind spot de sobre-exposição em listas.
3. **Dependabot/Renovate** — CVEs surgem depois do deploy.
4. **WAF de borda** (Cloudflare) quando o DNS migrar.
5. **Canal de disclosure responsável** quando houver usuários reais.

## Histórico de execuções

| Data | Executor | Resultado |
|------|----------|-----------|
| 2026-07-01 | White-box assistido por IA | 0 críticas; fundamentos verificados; pendente pentest externo |
| 2026-07-01 | Auditoria dedicada de listagem (GET) | Todos os `findMany` escopados por tenant; 0 sobre-exposição; matriz do CI estendida p/ cobrir listagem |
