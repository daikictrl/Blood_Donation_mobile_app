BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

─────────────────────────────────────────────────────────

## Unit 09 — Review Applications & Approve/Reject (Hospital)

### Objective
Implement the screen where a hospital reviews incoming donor applications for each blood request, views donor profiles and eligibility, and approves or rejects applications. After this unit, a hospital can action donor applications and a donor can see their application status change in real time.

### Scope
This unit must deliver:

- A fully functional applications review screen at app/(hospital)/applications/[requestId].tsx
- A reusable ApplicationCard component
- Approve and Reject actions with confirmation
- Real-time status update visible on the donor side immediately after hospital actions
- Hospital store updates for application management


### Engineering Principles

- All Supabase calls go through stores/hospital.store.ts
- Only pending applications show Approve and Reject buttons — already decided applications show their final status badge only
- Approving or rejecting must update donor_applications.status in the database and reflect immediately in the local store without a full refresh
- The hospital must be able to see the donor's full profile information before making a decision — name, blood group, age, weight, eligibility status
- Only eligible donors should realistically be approved — if a hospital attempts to approve an ineligible donor, show a clear warning but do not hard-block the action
- A Realtime subscription on donor_applications on the donor side (already set up in Unit 07) means the donor sees their status change without refreshing — this unit must ensure the database update triggers that correctly


### Screens & Components to Build
- Applications Review Screen — `app/(hospital)/applications/[requestId].tsx`

- Screen header showing the request details summary (blood group chip, urgency badge, quantity needed)
- Filter tabs: All / Pending / Approved / Rejected
- List of ApplicationCard components
- Empty state per filter tab
- Pull-to-refresh
- Loading state on initial fetch

- ApplicationCard Component — components/hospital/ApplicationCard.tsx
Each card displays:

- Donor avatar (circular, 40px)
- Donor full name
- Blood group chip
- Eligibility badge (Eligible green / Not Eligible red)
- Age and weight displayed as metadata
- Application date
- Current status badge
- For pending applications: Approve button (green) and Reject button (red) side by side
- Tapping the card expands it to show the donor's full profile details inline including address and any message the donor attached to the application

Hospital Store Updates — `stores/hospital.store.ts`
Add to the existing hospital store:

- applications — array of donor applications for the currently viewed request
- fetchApplications(requestId) — fetches all applications for a request including joined donor profile with is_eligible computed field
- approveApplication(applicationId) — updates donor_applications.status = 'approved', updates local store state immediately
- rejectApplication(applicationId) — updates donor_applications.status = 'rejected', updates local store state immediately


Navigation
- The applications review screen is accessed by tapping a request card on app/(hospital)/requests.tsx. Add onPress navigation to HospitalRequestCard built in Unit 08 that navigates to app/(hospital)/applications/[requestId].tsx passing the request id.


Acceptance Criteria

- Tapping a request card on the requests screen navigates to its applications list
- All donor applications for that request are listed with full donor profile info
- Eligibility badge shows correctly per donor
- Pending applications show Approve and Reject buttons
- Already decided applications show final status badge only with no action buttons
- Approving an application updates status to approved immediately on the card
- Rejecting an application updates status to rejected immediately on the card
- A donor logged in simultaneously sees their application status update in real time without refreshing
- Ineligible donor approval shows a warning before confirming
- Filter tabs work correctly per status
- Pull-to-refresh reloads the applications list
- All loading, empty, and error states handled
- npx tsc --noEmit passes with zero errors
- No inline styles on any component