# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

This is a monorepo of three independent packages — there is no pnpm workspace at the root, each package has its own lockfile and must be installed/run from its own directory:

- **`api/`** — NestJS 11 + Prisma 7 + PostgreSQL backend for "Vodiy Kafel", a ceramic-tile (kafel/keramogranit) B2B sales platform. This is the actively developed package. It has its own detailed [api/CLAUDE.md](api/CLAUDE.md) — **read it before making any change under `api/`**, it is the source of truth for backend business rules and conventions. `api/AGENTS.md` is an older, partially stale duplicate of the same guidance; prefer `api/CLAUDE.md` when the two disagree.
- **`storefront/`** — public-facing marketing/catalog site (`vodiy-kafel-storefront`), React 19 + Vite + Tailwind + GSAP. **No accounts of any kind live here** (2026-09-17 decision): retail visitors never get one by design, and the wholesale cabinet went to `dashboard/` — treat this package as an advertising site. Frontend-only with local mock data, not wired to `api/`. The React Three Fiber / `three` subsystem was **removed in S-001** (2026-09-17) — it was dead code; do not reintroduce it without asking. Built independently per `api/CLAUDE.md`'s scope note ("FAQAT BACKEND — frontend alohida jamoa tomonidan yoziladi"). Has its own [storefront/README.md](storefront/README.md) and [storefront/DESIGN.md](storefront/DESIGN.md). Planned work lives in [storefront/task.txt](storefront/task.txt) — 44 tasks (`S-001`…`S-044`; `S-001`–`S-003` done as of 2026-09-17) in the same format as `api/task.txt`, written from a code+browser audit on 2026-09-17. Read it before changing anything here: it records why the mock data must go (the whole catalog is still `src/data/*.js`), which of its own "categories/collections/finishes" have **no backend equivalent**, and that **all 43 product images are Marazzi's copyrighted photography** — `ASSETS.md` itself says they must be replaced before any commercial launch, so that one task (`S-033`) gates going live.
- **`dashboard/`** — admin panel consuming `api/`. **This is now a fully built application**, not a scaffold: routing, auth with silent refresh, RBAC, TanStack Query, forms, and tests are all in place. [dashboard/task.txt](dashboard/task.txt) is a dependency-ordered checklist of 60 tasks (`D-001`…`D-060`) in the same format as `api/task.txt`, derived from the real `api/openapi.json` surface. Read it before writing anything under `dashboard/` — it fixes the stack (TypeScript, Tailwind, React Router, TanStack Query), the global frontend rules, and which roles see what. Scope was originally **staff only** (`SUPER_ADMIN`/`MODERATOR`/`BRANCH_ADMIN`/`MANAGER`), and all 48 staff tasks (`D-001`…`D-048`) are done. On **2026-09-17 the open question was answered**: the **wholesale customer cabinet also lives here**, not in `storefront/` — added as EPIC 10 (`D-049`…`D-060`), a separate `/kabinet/*` route tree with its own login (`POST /auth/wholesale/login`, a login string rather than a phone), its own layout, and `CustomerOnlyGuard`-scoped endpoints (`/me/*`, `/orders`, `/calculator/*`, `/wholesale/contracts`). `D-052` is blocked on api `B-064`: there is no customer-facing catalog that returns prices, branch scoping, or the three-tier `StockStatus`.

## Commands

### api/ (backend)

```bash
cd api
pnpm install
pnpm start:dev          # dev server with watch
pnpm build               # tsc via nest build
pnpm lint                # eslint --fix
pnpm test                # jest unit tests
pnpm test -- path/to/file.spec.ts   # single test file
pnpm test -- -t "test name"          # single test by name
pnpm test:e2e            # jest e2e (test/jest-e2e.json)
pnpm db:generate         # regenerate Prisma client
pnpm db:migrate          # create + apply a migration
pnpm db:seed             # wipe DB and reseed (blocked in NODE_ENV=production)
pnpm openapi:export      # regenerate openapi.json
```

Requires **Node ≥ 24.9** — `@nestjs/config`/`@nestjs/jwt` are ESM-only and Jest can't load them on older Node. Seed accounts use password `Parol123!` (SUPER_ADMIN `+998900000001`, MODERATOR `+998900000002`, wholesale customer `fargona-optom`).

### storefront/

```bash
cd storefront
pnpm install
pnpm dev                          # vite dev server (port 5173 via .claude/launch.json)
pnpm build
pnpm lint                         # oxlint
pnpm test                         # node --test over tests/*.test.js
```

### dashboard/

```bash
cd dashboard
pnpm install
pnpm dev
pnpm build
pnpm lint        # oxlint
pnpm typecheck
pnpm test        # vitest
pnpm api:types   # regenerate src/shared/api/schema.d.ts from ../api/openapi.json
```

Dashboard types are **generated** from `api/openapi.json` — never hand-edit `schema.d.ts`.

## Architecture

### Business domain

The platform is turning a one-page storefront into a full B2B sales platform. The full spec lives in Notion ("Vodiy Kafel — Sayt va Platforma TZ (v1.1)", in Uzbek) and evolves via client conversations layered on top of the original written TZ — treat verbal/chat clarifications noted with dates as overriding the original document where they conflict. Facts that shape the backend and will eventually shape both frontends:

- **No accounts for retail (chakana) visitors** — open catalog only: no price, no exact stock count (only `AVAILABLE`/`UNAVAILABLE`). No cart, no checkout, no self-registration.
- **Wholesale (B2B, optom) customers** get accounts provisioned by a branch admin (temporary password shown once, must be changed on first login) — never self-registration. They see `IN_STOCK`/`LOW`/`OUT_OF_STOCK` plus branch- and possibly customer-specific pricing, order history, balance/debt, and notifications.
- **Two branch (filial) types**: `CENTRAL` (1–2 warehouses holding the _only_ real stock) and `RETAIL` (Farg'ona, Andijon, Namangan, Qo'qon — price only, no stock of their own). Pricing lives on `BranchProduct` (branch + product); stock lives only on the central `ProductStock`, never per-branch. A retail branch orders from the central warehouse through the same `Order` mechanism a customer would use.
- **Per-customer price overrides** stack over branch price, most specific rule wins: customer+product > customer+factory/category > customer general discount > branch base price. The reason a discount applied is never exposed to the customer or branch staff who didn't set it — only the final price.
- **Delivery pricing** is a branch × region × transport-type matrix (`BranchRegionTariff`), not a flat rate — transport types themselves are a CRUD table, not a hardcoded enum.
- **External services behind interfaces**: payments (mock until Payme/Click land in the final task), SMS, Telegram, e-contracting via Didox.uz (INN + E-IMZO based) are all interface + mock implementation — provider names must not appear in code before their dedicated task.

The full, current set of "unbreakable rules" (pricing resolution order, stock-visibility tiers, who authenticates and how, IDOR protection via 404-not-403, money as Decimal/BigInt never float, price snapshotting on orders, balance as a computed ledger, channel-agnostic notifications, DB-level CHECK invariants) is documented in [api/CLAUDE.md](api/CLAUDE.md) — that file is the source of truth and is kept in sync with the spec; don't re-derive or duplicate it here.

### api/ internals

- One module per domain under `src/modules/<name>/`: `<name>.module.ts`, `<name>.controller.ts` (public), optionally `<name>.admin.controller.ts` (admin), `<name>.service.ts`, and `dto/` with separate `*-public.response.dto.ts` / `*-admin.response.dto.ts` per entity — controllers never contain business logic.
- Prisma types are imported only via `src/prisma/prisma-client.ts`. Prisma 7's connection string is _not_ in `schema.prisma` — it's in `prisma.config.ts` for the CLI, and wired through the `PrismaPg` adapter inside `PrismaService` at runtime.
- Enums are all re-exported from `src/common/enums/` — DB-backed enums (`UserRole`, `BranchType`, `OrderStatus`, …) originate in `prisma/schema.prisma` and are only re-exported there (never redefined, to avoid drift); app-only enums (`StockStatus`, `SortOrder`) are hand-written there.
- Branch-scoping (multi-tenant isolation) is centralized in `BranchScopeService` — every Prisma query needing branch isolation goes through it rather than reimplementing the filter per-service.
- `src/storage/` handles uploaded files (local disk under `UPLOAD_DIR`), detecting file kind from content signature, not extension.
- `/dev/*` endpoints (mock payment simulation) only register when `NODE_ENV=development`.
- Development is task-driven: `api/task.txt` is a dependency-ordered (not numeric-ordered) checklist of backend tasks worked one at a time; a task is done when build+lint+test pass, new endpoints show up in Swagger, and the checklist + status summary at the bottom of the file are updated.

### storefront/ internals

- Pages under `src/pages/` (React Router), homepage marketing sections under `src/sections/home/`, scroll/entry animation in `src/animations/` (GSAP) and `src/hooks/`, 3D scenes (hero ceramic model, material scene) in `src/three/` (React Three Fiber).
- All content is local mock data in `src/data/` (`products.js`, `categories.js`, `company.js`) — there is no API integration; the contact form is an explicit local demo, not wired to anything.
- Deployed on Vercel; `vercel.json` rewrites all non-asset paths to `index.html` for client-side routing.
- `ASSETS.md` tracks image/model licensing and attribution — check it before using or adding reference photography for anything beyond internal review.
