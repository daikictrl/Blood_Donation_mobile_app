BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

────────────────────────────────────────────────────────────────

## Unit 12 — Blood Inventory Management (Hospital)

### Objective
Implement the blood inventory screen for hospitals. After this unit, a hospital can view their current blood stock across all 8 blood groups, manually add or adjust units, and see a summary of their total inventory. Stock incremented automatically by Unit 11 donation confirmations must be visible here immediately.

### Scope
This unit must deliver:

- A fully functional inventory screen at `app/(hospital)/inventory.tsx`
- A card per blood group showing current stock
- Manual stock adjustment (add units or set to a specific number)
- Low stock indicator when units fall below threshold
- Total inventory summary
- Hospital store updates for inventory management


### Engineering Principles

- All Supabase calls go through stores/hospital.store.ts
- Inventory rows are managed via upsert — if a row for a blood group does not exist yet it is created, if it exists it is updated
- Stock can never go below zero — the database constraint already enforces this but the UI must also prevent negative input
- All 8 blood groups must always be displayed even if no inventory row exists yet for some — show zero for missing rows
- Low stock threshold is 5 units — show a warning indicator on any card below this threshold
- Manual adjustments must not overwrite donation-confirmed stock silently — when setting stock manually, the input represents the new absolute value, not an increment


### Screen to Build

Inventory Screen — `app/(hospital)/inventory.tsx`

- Screen header with title and total units summary (e.g. "Total Stock: 42 units")
- Grid or list of 8 blood group cards — one per blood group
Each card displays:

- Blood group chip
- Current units available
- Low stock warning indicator if units < 5
- Last updated timestamp
- Add Units button — opens a bottom sheet or modal with a numeric input to add a specific number of units to current stock
- Set Stock button — opens a bottom sheet or modal to set stock to an absolute value

- Loading state on initial fetch
- Empty state is not applicable — all 8 blood groups always render


### Hospital Store Updates — stores/hospital.store.ts

- Add to the existing hospital store:

- inventory — array of BloodInventoryItem for all 8 blood groups
- fetchInventory() — fetches all inventory rows for the logged-in hospital, fills missing blood groups with zero units
- addUnits(bloodGroup, units) — increments current stock for the given blood group via upsert, updates local store state immediately
- setStock(bloodGroup, units) — sets stock to an absolute value for the given blood group via upsert, updates local store state immediately


### Acceptance Criteria

- All 8 blood groups are always displayed even with no existing inventory rows
- Stock incremented by a donation confirmation in Unit 11 is visible immediately on this screen
- Add Units correctly increments existing stock — does not replace it
- Set Stock correctly replaces existing stock with the new absolute value
- Negative input is rejected before any database call is made
- Low stock warning indicator appears on any card with units below 5
- Total units summary at the top is always accurate
- Last updated timestamp updates after every manual adjustment
- Pull-to-refresh reloads all inventory data
- Loading and error states handled 
- npx tsc --noEmit passes with zero errors
- No inline styles on any component
- IMPORTANT:
    - Add a Realtime subscription on `blood_inventory` in `stores/hospital.store.ts` that updates the local inventory state whenever a row changes
    - Set up the subscription when the inventory screen mounts and clean it up when it unmounts
    - Keep pull-to-refresh as a fallback