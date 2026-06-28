BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

────────────────────────────────────────────────────────────────
## Unit 06 — Blood Requests Feed (Donor)
### Objective
Implement the donor's main feed screen where compatible blood requests from hospitals are displayed. After this unit, a donor can browse all active blood requests that match their blood group compatibility, sorted by proximity, with emergency requests always surfaced at the top. Tapping a request opens a full detail view.

### Scope
This unit must deliver:

- A fully functional feed screen at app/(donor)/feed.tsx
- A request detail screen at app/(donor)/request/[id].tsx
- A reusable RequestCard component
- Blood group compatibility filtering using lib/blood-compat.ts
- Distance calculation and proximity sorting using the Haversine formula
- Emergency requests pinned at the top regardless of distance
- Pull-to-refresh
- A Realtime subscription that adds new requests to the feed without requiring a manual refresh


### Engineering Principles

- Blood group filtering must use `getCompatibleGroups()` from `lib/blood-compat.ts` — no inline compatibility logic anywhere
- Distance is calculated on the client using the Haversine formula — create `lib/location.ts` with a `getDistanceKm(lat1, lon1, lat2, lon2)` function and use it wherever distance is needed
- Sorting order: emergency requests first, then non-emergency sorted by distance ascending
- If the donor has no saved coordinates, distance cannot be calculated — show requests without distance info and display a banner prompting the donor to update their profile location
- The feed only shows requests with status = 'active'
- Realtime subscription listens for new `blood_requests` inserts and prepends compatible ones to the feed automatically
- The detail screen fetches the full request including the hospital profile joined


### Screens & Components to Build
- Feed Screen — `app/(donor)/feed.tsx`

- Screen header with title and a notification bell icon (badge with unread count — store value comes from notification.store.ts which will be fully built in Unit 14; for now just render the icon with a static zero badge)
- List of RequestCard components
- Pull-to-refresh
- Empty state when no compatible active requests exist
- Location missing banner when donor has no coordinates
- Loading state on initial fetch

## Request Detail Screen — `app/(donor)/request/[id].tsx`
Display full request details:

- Hospital name and logo
- Blood group chip
- Urgency badge
- Quantity needed
- Distance from donor
- Hospital address
- Contact information
- Notes
- Posted date
- An Apply button at the bottom — tapping it navigates to app/(donor)/apply/[id].tsx (placeholder screen for now — that screen is built in Unit 07)

## RequestCard Component — `components/donor/RequestCard.tsx`
Each card displays:

- Hospital name and logo (circular, 40px)
- Blood group chip
- Urgency badge (Normal / Urgent / Emergency with correct colors from ui-context.md)
- Distance (e.g. "3.2 km away") or "Distance unknown" if no coordinates
- Quantity needed
- Time posted (e.g. "2 hours ago") using date-fns


## Donor Store Updates — stores/donor.store.ts
Add to the existing donor store:

- requests — array of compatible active blood requests
- fetchRequests() — fetches active requests, filters by compatibility, sorts by emergency then distance
- subscribeToRequests() — sets up Realtime subscription for new request inserts
- unsubscribeFromRequests() — cleans up the Realtime subscription


## New Library File
- `lib/location.ts`
  - Create a getDistanceKm(lat1, lon1, lat2, lon2) function using the Haversine formula.
  - This function must be pure — no side effects, no imports from React Native.
  - It is used wherever distance between two coordinates needs to be calculated.


## Acceptance Criteria

- Feed shows only requests compatible with the donor's blood group
- Emergency requests always appear at the top of the list
- Non-emergency requests are sorted by distance ascending
- Distance displays correctly in km on each card
- If donor has no saved coordinates, a banner prompts them to update their profile and distance shows as unknown
- Pull-to-refresh reloads the feed
- A new request inserted in Supabase appears on the feed without a manual refresh
- Empty state displays when no compatible active requests exist
- Tapping a card navigates to the request detail screen
- Detail screen shows all request fields including joined hospital data
- Apply button on detail screen navigates to app/(donor)/apply/[id].tsx
- All loading, empty, and error states handled on both screens
- npx tsc --noEmit passes with zero errors
- No inline styles on any component