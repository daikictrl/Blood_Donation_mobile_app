BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

────────────────────────────────────────────────────────────────

### Unit 07 — Apply to a Blood Request (Donor)

## Objective

Implement the screen where a donor applies to donate blood for a specific request. After this unit, an eligible donor can tap Apply on a request, submit their application, and see confirmation. Ineligible donors see exactly which rule they fail. Donors who already applied see their current application status instead of the Apply button.

## Scope

This unit must deliver:

- A fully functional apply screen at app/(donor)/apply/[id].tsx
- Eligibility gate — ineligible donors cannot apply
- Duplicate application prevention — donors who already applied see their status
- Application submission creating a row in donor_applications
- Proper feedback on success and error


## Engineering Principles

- All Supabase calls go through the donor store — not directly from the screen
- Eligibility is read from donor.profile.is_eligible already in the store — do not re-fetch it
- Before showing the Apply button, check if the donor already has an application for this request by querying donor_applications where donor_id = auth.uid() and request_id = id
- The UNIQUE(donor_id, request_id) constraint on donor_applications is the database-level guard — the UI check is a UX convenience, not the security layer
- Use lib/eligibility.ts built in Unit 04 to display the breakdown of which specific rules the donor fails — do not recompute eligibility logic inline

## Screen to Build

- Apply Screen — `app/(donor)/apply/[id].tsx
The screen loads the request details (reuse fetchRequestById from the donor store) and the donor's existing application status for this request.

If donor is not eligible:

- Show the eligibility breakdown from lib/eligibility.ts with each failing rule clearly marked
- Show a clear message: "You are not eligible to donate at this time"
- No Apply button

If donor already applied:

- Show current application status badge (Pending / Approved / Rejected)
- Show the date they applied
- No Apply button
- If status is Approved, show a button linking to their appointment details

If donor is eligible and has not applied:

- Show a summary of the request: hospital name, blood group, urgency badge, quantity needed
- Optional message field (donor can add a note to the hospital)
- Apply button that submits the application

On successful application:

- Show a success confirmation message
- Replace the Apply button with a Pending status badge
- Do not navigate away — let the donor see the confirmation on the same screen

## Donor Store Updates — stores/donor.store.ts
Add to the existing donor store:

- applyToRequest(requestId, message?) — inserts a row into donor_applications with status pending, handles the duplicate constraint error gracefully
- fetchApplicationForRequest(requestId) — fetches the donor's existing application for a specific request, returns null if none exists

## Acceptance Criteria

- Eligible donor with no existing application sees the Apply button and request summary
- Ineligible donor sees the eligibility breakdown with specific failing rules marked
- Donor who already applied sees their current status badge instead of the Apply button
- Successful application creates a row in donor_applications with status pending
- If the donor somehow triggers a duplicate application, the UNIQUE constraint error is caught and handled gracefully with a readable message
- Approved applicants see a link to their appointment screen
- Optional message field is included and saved correctly
- All loading and error states handled
npx tsc --noEmit passes with zero errors
No inline styles on any component