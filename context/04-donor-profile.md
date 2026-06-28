BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

──────────────────────────────────────────────────────────
Unit 04 — Donor Profile Setup & Edit

## Objective
Implement the complete donor profile screen where a donor can view, complete, and edit their personal and medical information. After this unit, a donor has a fully functional profile with all required fields, an eligibility status display, and avatar upload capability. The donor Zustand store must be created and fully wired to Supabase.

## Scope
This unit must deliver:

- A fully functional donor profile screen at app/(donor)/profile.tsx
- The ability to view and edit all donor profile fields
- Eligibility status displayed clearly with a breakdown of which rules pass or fail
- Avatar upload to Supabase Storage
- stores/donor.store.ts with all profile actions
- Form validation on all inputs


## Engineering Principles

- stores/donor.store.ts handles all Supabase calls — the screen only calls store actions
- Eligibility is never computed on the client — read is_eligible from the database as a computed field by querying .select('*, is_eligible') on the donors table
- Avatar is uploaded to the avatars Supabase Storage bucket, the public URL is saved to donors.avatar_url
- All forms use React Hook Form with Zod validation
- The profile screen must handle three states explicitly: loading, loaded with data, and empty (first time setup where no donor row exists yet)
- Date of birth must use a proper date picker — not a plain text input
- All field values must be saved as a single upsert operation — not individual updates per field

## Screen to Build
Donor Profile Screen — app/(donor)/profile.tsx
Display and edit the following fields:

- Avatar (circular image with tap-to-change)
- Full name
- Date of birth
- Gender (Male, Female, Other)
- Blood group (all 8 options)
- Weight (in kg)
- Phone number
- Address
- Last donation date
- Health declaration (toggle/checkbox with label)

Below the fields, display an Eligibility Status section showing:

- Overall status badge: Eligible (green) or Not Eligible (red)
- A breakdown of each rule with a pass/fail indicator:
    - Age requirement (must be 21+)
    - Weight requirement (must be 100kg+)
    - Donation wait period (30 days since last donation)
    - Health declaration accepted
- A Save button that upserts the donor row.
- A Sign Out button.

## Donor Store — stores/donor.store.ts
Create the donor store with these actions:

- fetchProfile() — fetches the donor row including is_eligible computed field, sets it in the store
- updateProfile(data) — upserts the donor row, refreshes the profile in store after save
- uploadAvatar(uri) — uploads image to Supabase Storage avatars bucket, returns and saves the public URL


## Dependencies
expo-image-picker
expo-image-manipulator

## Acceptance Criteria

- Donor profile screen loads existing data correctly on mount
- All fields are editable and persist correctly to the donors table after save
- Blood group picker shows all 8 options
- Gender selector shows all 3 options
- Date of birth uses a date picker, not a text field
- Health declaration toggle saves correctly
- Eligibility badge reflects the current is_eligible value from the database
- Eligibility breakdown shows which specific rules pass and which fail
- Avatar upload saves to Supabase Storage and the updated image displays immediately
- First-time donors with no existing row see an empty form ready to fill in
- Save operation uses a single upsert — not multiple separate updates
- Sign out clears the session and redirects to login
- All loading, empty, and error states are handled
- npx tsc --noEmit passes with zero errors
- No inline styles on any component