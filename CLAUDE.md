# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

```
/                          # Root: docker-compose.yml, .env.local (not committed)
└── frontend/              # Next.js application — all app code lives here
    ├── prisma/            # schema.prisma, seed.ts, migrations/
    ├── src/
    │   ├── app/           # Next.js App Router
    │   │   ├── (app)/     # Protected routes (sidebar layout)
    │   │   ├── (auth)/    # Public auth pages (/login)
    │   │   └── api/       # API route handlers
    │   ├── components/
    │   ├── lib/           # Server-side business logic and stores
    │   ├── types/         # Shared TypeScript interfaces (types/index.ts)
    │   ├── auth.ts        # NextAuth full config (DB callbacks)
    │   ├── auth.config.ts # Edge-compatible auth config (no DB imports)
    │   └── proxy.ts       # Route protection middleware (Next.js 16 convention)
    └── data/              # Local file storage for uploaded documents
```

## Git Workflow

**After every completed code change, always commit and push to GitHub.**

```bash
git add <files>
git commit -m "type: descrição"
git push
```

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.  
Never use `git add -A` or `git add .` — stage only the files changed in the task.

## Commands

All commands run from `frontend/`:

```bash
npm run dev           # Dev server (Turbopack)
npm run build         # Production build
npm run lint          # ESLint

npm run db:migrate    # Apply pending migrations (prisma migrate deploy)
npm run db:push       # Push schema without migration files (prototyping only)
npm run db:seed       # Seed default org + users
npm run db:studio     # Prisma Studio UI
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:reset      # Drop + re-migrate + re-seed (destroys data)
```

**Database** requires Docker:
```bash
# From repo root:
docker compose up -d   # Start PostgreSQL (port 5432) + Adminer (port 8080)
```

**Prisma doesn't read `.env.local`** — set `DATABASE_URL` explicitly when running CLI commands outside npm scripts:
```bash
DATABASE_URL=postgresql://... npx prisma migrate dev --name <name>
```

## Architecture

### Next.js 16 Conventions

This project uses **Next.js 16**, which has breaking changes vs. earlier versions:
- Middleware is now called **proxy** — the file is `src/proxy.ts`, not `src/middleware.ts`
- Read `node_modules/next/dist/docs/` for unfamiliar APIs before writing code

### Authentication (NextAuth v5 beta)

Two config files are intentional — required by Next.js Edge Runtime:
- `auth.config.ts` — edge-safe config (no Prisma, no Node.js APIs); used by proxy
- `auth.ts` — full config with Prisma callbacks; used by API routes and server components

**Session shape** (set in JWT/session callbacks in `auth.ts`):
```ts
session.user.id, .perfil, .organizacaoId, .primeiroAcesso
```

**Roles** (`perfil`): `formador_comunitario` < `formador_geral` < `administrador`  
Helper: `temPermissao(userPerfil, requiredPerfil)` in `types/index.ts`

### Database & Multi-Tenancy (Phase 3 — active)

Every table has `organizacaoId` — all queries must be scoped to the current tenant:
```ts
// Always scope queries:
prisma.formando.findMany({ where: { organizacaoId: user.organizacaoId } })
```

`organizacaoId` is always read from the session JWT (`session.user.organizacaoId`). `DEFAULT_ORG_ID` env var is optional — retained as a convenience for dev/seed scripts and single-tenant legacy deployments; not used in runtime paths for authenticated users.

After any schema change: `npm run db:generate` to regenerate the client.

### API Route Pattern

Every protected API route follows this structure:
1. `const session = await auth()` → 401 if not authenticated
2. Role check if needed
3. Filter all DB queries by `organizacaoId: session.user.organizacaoId`
4. Business logic via functions in `lib/` (users-store, email, etc.)
5. `logAction(...)` from `lib/audit-log.ts` for writes

### State Management

No client-side state library. The app is server-first:
- Data lives in PostgreSQL, fetched in Server Components or API routes
- Client components use local `useState`/`useReducer` for UI state only
- Forms POST to API routes; pages revalidate via `router.refresh()` or navigation

### Key lib/ Files

| File | Purpose |
|------|---------|
| `lib/prisma.ts` | Singleton Prisma client (import this, not PrismaClient directly) |
| `lib/users-store.ts` | User CRUD, password hashing (scrypt), authentication |
| `lib/tenant-context.ts` | `getOrganizacaoId()`, `assertTenant()` helpers |
| `lib/audit-log.ts` | `logAction()` — structured audit trail with IP anonymization |
| `lib/crypto.ts` | AES-256-GCM field-level encryption (`encryptField`/`decryptField`) — requires `APP_ENCRYPTION_KEY` |
| `lib/email.ts` | Nodemailer send functions |
| `lib/rate-limit.ts` | In-memory rate limiting for auth endpoints |
| `types/index.ts` | All shared types + business logic constants (stage requirements, labels, colors) |

## Environment Variables

Required in `frontend/.env.local`:

```bash
AUTH_SECRET=<32-byte hex>
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://formativo:formativo_dev@localhost:5432/formacao_comunitaria
DEFAULT_ORG_ID=org_default  # optional in Phase 3; used by seed and dev tools

# Field-level encryption key (strongly recommended in production)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
APP_ENCRYPTION_KEY=<64-hex-chars>

# Optional — Google OAuth (omit if not needed)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional — Email (Resend tem prioridade sobre SMTP quando RESEND_API_KEY está setado)
RESEND_API_KEY=
RESEND_FROM=contato@send.formattio.com.br        # transacional — subdomínio dedicado (reputação isolada)
RESEND_FROM_MARKETING=novidades@news.formattio.com.br  # marketing/ciclo de vida; cai no RESEND_FROM se vazio
RESEND_WEBHOOK_SECRET=  # segredo de assinatura (whsec_…) do endpoint de webhook no painel Resend

# Optional — Email (SMTP por tenant, fallback / enterprise)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

> Webhook de bounce/complaint: aponte o Resend para `POST /api/webhooks/resend`
> (eventos `email.bounced` e `email.complained`) e copie o *Signing Secret* para
> `RESEND_WEBHOOK_SECRET`. Hard bounces (`type: Permanent`) e reclamações entram
> automaticamente na lista de supressão (`EmailSuppression`), bloqueando reenvios.

> **Segmentação de subdomínios (Resend):** e-mails transacionais saem de
> `send.formattio.com.br` (`RESEND_FROM`) e os de marketing/ciclo de vida de
> `news.formattio.com.br` (`RESEND_FROM_MARKETING`) — reputações isoladas. No
> código, `send(..., { stream: "marketing" })` escolhe o subdomínio; o padrão é
> `"transactional"`. Cada subdomínio precisa de **SPF** (`include:amazonses.com`),
> **MX** (`feedback-smtp.sa-east-1.amazonses.com`) e **DKIM** (`resend._domainkey.<sub>`,
> copiado do painel Resend) verificados. **DMARC** fica no apex (`_dmarc.formattio.com.br`)
> e cobre os subdomínios. DNS é gerenciado na **Hostinger** (hPanel → Zona DNS).

> `APP_ENCRYPTION_KEY` encrypts sensitive DB fields at rest (e.g. SMTP password).
> Without it the app runs but credentials are stored in plaintext.
> Existing plaintext values are read correctly and re-encrypted on next save.

Seed-specific (override defaults):
```bash
SEED_ADMIN_EMAIL=admin@example.org
SEED_ADMIN_PASSWORD=<if omitted, auto-generated and printed once>
SEED_ORG_NOME=Nome da Comunidade
```
