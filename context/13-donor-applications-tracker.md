BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

─────────────────────────────────────────────────────────────────
## Unit 13 — Donor Applications Tracker

### Objective
Implement the screen where a donor tracks all their blood donation applications and views appointment details for approved ones. After this unit, a donor can see every application they have submitted, its current status, and if approved, the full appointment details scheduled by the hospital. Status changes made by the hospital in Unit 09 must reflect here in real time without the donor needing to refresh.

### Scope
This unit must deliver:

- A fully functional applications tracker screen at app/(donor)/applications.tsx
- A fully functional appointment detail screen at app/(donor)/appointment/[id].tsx
- A reusable DonorApplicationCard component
- Realtime subscription that updates application status without manual refresh
- Donor store updates for applications and appointments


### Engineering Principles

- All Supabase calls go through `stores/donor.store.ts`
- The applications list must include joined data — request blood group, hospital name, urgency level — fetched in a single query with joins, not separate calls
- Realtime subscription listens for updates on `donor_applications` filtered by `donor_id = auth.uid()` so status changes made by the hospital appear instantly
- Tapping an approved application navigates to the appointment detail screen — tapping a pending or rejected application does nothing or shows a brief status message
- The appointment detail screen fetches the full appointment including joined hospital profile
- If an approved application has no appointment scheduled yet, show a "Awaiting appointment scheduling" message instead of navigating


### Screens & Components to Build

#### Applications Tracker Screen — `app/(donor)/applications.tsx`

- Screen header with title
- Filter tabs: All / Pending / Approved / Rejected
- List of `DonorApplicationCard` components
- Realtime subscription active while screen is mounted
- Pull-to-refresh as fallback
- Empty state per filter tab
- Loading state on initial fetch

#### DonorApplicationCard Component — `components/donor/DonorApplicationCard.tsx`

- Each card displays:

- Hospital name and logo (circular, 40px)
- Blood group chip of the request
- Urgency badge
- Application status badge (Pending / Approved / Rejected) with correct colors from ui-context.md
- Date applied using date-fns
- For approved applications with a scheduled appointment: "View Appointment" button
- For approved applications with no appointment yet: "Awaiting Scheduling" label

#### Appointment Detail Screen — `app/(donor)/appointment/[id].tsx`

- Displays full appointment details:

- Hospital name, logo, and address
- Scheduled date and time (formatted clearly)
- Location
- Notes from the hospital
- Appointment status badge
- Back button using router.back()


#### Donor Store Updates — stores/donor.store.ts

- Add to the existing donor store:

- applications — array of donor applications with joined request and hospital data
- `fetchApplications()` — fetches all applications for the logged-in donor with joined blood request and hospital profile
- `fetchAppointment(applicationId)` — fetches the appointment linked to a specific application id, returns null if none exists
- `subscribeToApplications()` — sets up Realtime subscription on donor_applications filtered by donor_id, updates local applications state on status change
- `unsubscribeFromApplications()` — cleans up the Realtime subscription


### Acceptance Criteria

- All donor applications listed with correct status badges and joined hospital and request data
- Filter tabs work correctly per status
- A status change made by the hospital appears on this screen in real time without the donor refreshing
- Tapping an approved application with a scheduled appointment navigates to the appointment detail screen
- Tapping an approved application with no appointment yet shows "Awaiting Scheduling" label — no navigation
- Appointment detail screen shows all fields correctly including formatted date and time
- Pending and rejected application cards are not tappable for navigation
- Pull-to-refresh reloads all applications as a fallback
- Realtime subscription is cleaned up when the screen unmounts
- All loading, empty, and error states handled
- npx tsc --noEmit passes with zero errors
- No inline styles on any component