# LabVault Design System (`DESIGN.md`)

## 1. Design Philosophy
LabVault is a precision university hardware & laboratory component lending system for CSE 3206. The interface prioritizes **clarity, auditability, and operational speed** over decorative flair.

- **Zero AI-Slop UI:** No neon/purple gradients, no glassmorphism blobs, no floating ambient glows, and no generic marketing hero sections.
- **Single Source of Truth:** All colors MUST reference the **TweakCN Caffeine** CSS variables defined in `src/app/globals.css` (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `bg-destructive`, etc.). Never hardcode Tailwind palette colors (`bg-purple-500`, `text-blue-600`, etc.) except for semantic status indicators mapped cleanly to theme tokens or muted accessible badges.
- **Laboratory Precision:** Use `font-mono` and `tabular-nums` for SKUs, serial numbers, stock counts, student IDs, fine amounts, and timestamps.

## 2. Layout & Navigation
- **App Shell:** Persistent left sidebar (`w-64` on desktop, collapsible sheet on mobile) + top utility header (`h-14`) with quick search/status indicator.
- **Workspace Density:** Compact, scannable data tables and action drawers/dialogs. Every primary view fits comfortably without excessive vertical scrolling.
- **5 Core Navigation Views:**
  1. **Overview & Analytics** (`/`) — KPI cards (Active Loans, Overdue Items, Low-Stock Alerts, Unsettled Fines), recent audit trail, and quick actions.
  2. **Equipment Inventory** (`/inventory`) — Searchable, category-filterable hardware catalog (`Consumable`, `ReturnableComponent`, `HighValueInstrument`), CRUD modal, stock badges.
  3. **Borrow & Return** (`/loans`) — Active & historical loans table, Student Checkout dialog, Return & Damage Inspection modal with live fine preview.
  4. **Lab Slot Reservations** (`/reservations`) — High-value instrument & workbench time-window booking with overlap conflict detection.
  5. **Audit Log & API Docs** (`/audit`, `/api-docs`) — Immutable event log and interactive Swagger/OpenAPI 3.0 explorer.

## 3. Typography & Surfaces
- **Surfaces:** Flat or 1px-bordered cards (`border border-border bg-card rounded-lg`) with subtle elevation only on popovers/dialogs.
- **Motion:** Subtle, purposeful transitions via `motion/react` (e.g., list item entrance, modal transitions, KPI number/card mount). Keep animations under `200ms` with `easeOut` — never bouncy or distracting.
- **Empty & Error States:** Explicit, actionable empty states and inline form validation messages.
