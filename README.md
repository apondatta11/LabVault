# LabVault

**Hardware & Lab Component Lending System** built for **CSE 3206 — Software Engineering Sessional (Lab 6)** at RUET.

LabVault manages university electronics & hardware laboratory inventory, student borrow/return checkouts, condition grading & automated fine calculation, time-windowed workbench reservations, real-time operational analytics, and an immutable audit trail.

---

## Key Features (5 Functional Modules)

1. **Equipment & Kit Inventory (`/inventory`)**
   - Full CRUD for microcontrollers, sensors, consumables, and high-value instruments (`Consumable`, `ReturnableComponent`, `HighValueInstrument`).
   - Search by name, SKU, or rack location; category filtering; low-stock threshold alerts; Bangladeshi Taka (`৳`) valuation.
2. **Borrow & Return Checkout (`/loans`)**
   - Student roll & institutional email verification (`@student.ruet.ac.bd`).
   - Category-enforced borrowing rules, due-date assignment, real-time stock updates, and return confirmation.
3. **Damage Inspection & Fine Engine (`/loans`, `/audit`)**
   - Condition grading on return (`Good`, `MinorDamage`, `Broken`, `Lost`).
   - Interchangeable fine calculation policies in `৳` BDT with pending/settled/waived settlement tracking.
4. **Lab Slot Reservations (`/reservations`)**
   - Book high-value instruments and lab workbenches for specific time windows with automatic overlap conflict prevention (`HTTP 409`).
5. **Usage Analytics & Audit Log (`/`, `/audit`)**
   - Real-time KPIs (active loans, overdue items, low-stock alerts, pending fines) and an immutable audit log of all lab events.

---

## Architecture & Design Patterns

All core domain patterns live in `src/lib/patterns/` with TypeScript interfaces and unit tests:

| Pattern | Category | Implementation | Purpose |
|---|---|---|---|
| **Factory Method** | Creational | `src/lib/patterns/equipment-factory.ts` | Instantiates `ConsumableItem`, `ReturnableComponent`, and `HighValueInstrument` with distinct borrowing durations, quantity caps, and slot reservation requirements. |
| **Strategy** | Behavioral | `src/lib/patterns/fine-strategy.ts` | Swaps `StandardLateFeeStrategy`, `DamagedItemFineStrategy`, and `AcademicGracePeriodStrategy` at runtime during return inspection. |
| **Observer** | Behavioral | `src/lib/patterns/lab-event-observer.ts` | `LabEventPublisher` notifies `DueReminderObserver`, `LowStockAlertObserver`, and `AuditLogObserver` on checkout, return, stock-drop, reservation, and fine-settlement events. |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript (`strict: true`)
- **Database:** PostgreSQL + Prisma ORM (`v6.19.0`) with an in-memory fallback (`USE_MEMORY_DB="true"`) for local/E2E runs without a live Postgres daemon
- **UI & Styling:** Tailwind CSS v4 + shadcn/ui (TweakCN **Caffeine** theme in `src/app/globals.css`), Lucide React, React Icons, `motion/react`
- **API Documentation:** OpenAPI 3.0.3 via `swagger-jsdoc` (`/api/openapi`) + interactive Swagger UI (`/api-docs`)
- **Testing & QA:** Vitest + `@vitest/coverage-v8`, Selenium WebDriver (headless Chrome E2E), GitHub Actions CI (`.github/workflows/ci.yml`)

---

## Getting Started

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
npx prisma generate
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

- For **PostgreSQL**, set `DATABASE_URL` and `USE_MEMORY_DB="false"`, then push the schema and seed:
  ```bash
  npx prisma db push
  npm run db:seed
  ```
- For **zero-setup local preview / E2E**, keep `USE_MEMORY_DB="true"` in `.env`.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Interactive API documentation is available at [http://localhost:3000/api-docs](http://localhost:3000/api-docs).

---

## Scripts & Quality Verification

| Command | Description |
|---|---|
| `npm run typecheck` | Run TypeScript compiler check (`tsc --noEmit`) |
| `npm run lint` | Run ESLint across the project |
| `npm run test` | Run Vitest unit test suite |
| `npm run test:coverage` | Run Vitest with `@vitest/coverage-v8` report |
| `npm run build` | Build production bundle (`next build --webpack`) |
| `npm run start` | Start production server on port 3000 |
| `npm run test:e2e` | Run Selenium WebDriver E2E tests against `http://localhost:3000` |
| `npm run db:seed` | Seed PostgreSQL with realistic lab hardware & RUET student records |

---

## API Endpoints

Full interactive OpenAPI 3.0 documentation is served at `/api-docs` (JSON spec at `/api/openapi`):

- `GET /api/equipment`, `POST /api/equipment`, `PATCH /api/equipment/[id]`, `DELETE /api/equipment/[id]`
- `GET /api/loans`, `POST /api/loans`, `POST /api/loans/[id]/return`
- `GET /api/fines`, `PATCH /api/fines/[id]/settle`
- `GET /api/reservations`, `POST /api/reservations`, `PATCH /api/reservations/[id]`
- `GET /api/analytics`

---

## Project Documentation

- [DESIGN.md](./DESIGN.md) — UI & Caffeine theme design system specification
- [PROJECT_FACTS.md](./PROJECT_FACTS.md) — Verified architecture, UML diagrams (Mermaid), coverage metrics, and Git workflow checklist
