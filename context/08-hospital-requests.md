BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

─────────────────────────────────────────────────────────────────
Unit 08 — Create & Manage Blood Requests (Hospital)
Objective
Implement the complete blood request management flow for hospitals. After this unit, a hospital can create blood requests, mark them as emergency, view all their requests, and cancel active ones. This is the unit that makes the donor feed testable end-to-end for the first time.

Scope
This unit must deliver:

A fully functional requests list screen at app/(hospital)/requests.tsx
A create request screen at app/(hospital)/create-request.tsx
A reusable HospitalRequestCard component
Full hospital requests Zustand store actions
Ability to cancel an active request


Engineering Principles

All Supabase calls go through stores/hospital.store.ts — never directly from screens
Emergency toggle must simultaneously set both is_emergency = true and urgency_level = 'emergency' in a single operation — they must always be in sync
A cancelled request must update status = 'cancelled' in the database — it must never be deleted
The requests list must show requests of all statuses (active, fulfilled, cancelled) so the hospital has full history visibility
Newly created requests appear at the top of the list (sorted by created_at descending)
All forms use React Hook Form with Zod validation


Screens & Components to Build
Requests List Screen — app/(hospital)/requests.tsx

Screen header with title and a Create Request button (prominent, top right)
Filter tabs: All / Active / Fulfilled / Cancelled — defaults to Active
List of HospitalRequestCard components
Pull-to-refresh
Empty state per filter tab
Loading state on initial fetch

Create Request Screen — app/(hospital)/create-request.tsx
Fields:

Blood group selector (all 8 options)
Quantity needed (numeric input, minimum 1)
Urgency level selector (Normal / Urgent / Emergency)
Emergency toggle — when switched on, automatically sets urgency to Emergency; when switched off, resets urgency to Normal
Contact information (text input)
Hospital address (pre-filled from hospital profile, editable)
Notes (optional, multiline)
Expiry date (optional date picker)

On successful creation, navigate back to the requests list and show the new request at the top.
HospitalRequestCard Component — components/hospital/HospitalRequestCard.tsx
Each card displays:

Blood group chip
Urgency badge with correct colors from ui-context.md
Quantity needed
Status badge (Active / Fulfilled / Cancelled)
Number of pending applications (e.g. "3 applicants")
Time posted using date-fns
Cancel button visible only on active requests — tapping shows a confirmation prompt before cancelling


Hospital Store Updates — stores/hospital.store.ts
Add to the existing hospital store:

requests — array of all hospital blood requests
fetchRequests() — fetches all requests for the logged-in hospital sorted by created_at descending, includes count of pending applications per request
createRequest(data) — inserts a new blood request row, prepends it to the requests array in store
cancelRequest(id) — updates status = 'cancelled' for the given request id, updates the local store state



Acceptance Criteria

Hospital can create a blood request with all fields and it appears immediately at the top of the list
Emergency toggle correctly sets both is_emergency = true and urgency_level = 'emergency' simultaneously
Turning off the emergency toggle resets urgency back to Normal
Filter tabs correctly show requests by status
Pending application count displays correctly on each card
Hospital can cancel an active request after confirmation prompt
Cancelled request status updates immediately in the list without a full refresh
A request created by the hospital appears on the donor feed (test this after building — this is the first full end-to-end test)
Pull-to-refresh works on the requests list
All loading, empty, and error states handled
npx tsc --noEmit passes with zero errors
No inline styles on any component