BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

──────────────────────────────────────────────────────────
Unit 05 — Hospital Profile Setup & Edit
Objective
Implement the complete hospital profile screen where a hospital can view, complete, and edit their institutional information. After this unit, a hospital has a fully functional profile with all required fields, logo upload capability, and their location captured for proximity-based donor matching. The hospital Zustand store must be created and fully wired to Supabase.

## Scope
This unit must deliver:

- A fully functional hospital profile screen at `app/(hospital)/profile.tsx`
- The ability to view and edit all hospital profile fields
- Logo upload to Supabase Storage
- Location capture via `expo-location`
- `stores/hospital.store.ts` with all profile actions
- Form validation on all inputs
- View mode and Edit mode split layout, consistent with the donor profile screen built in Unit 04


## Engineering Principles

- `stores/hospital.store.ts` handles all Supabase calls — the screen only calls store actions
- Logo is uploaded to the `logos` Supabase Storage bucket, the public URL saved to `hospitals.logo_url`
- All forms use React Hook Form with Zod validation
- Location coordinates are captured via `expo-location` and saved to `hospitals.latitude` and `hospitals.longitude`
- The profile screen must handle three states: loading, loaded with data, and empty (first time setup)
- All field values must be saved as a single upsert operation
- View/Edit mode split must match the pattern established in Unit 04


## Screen to Build
### Hospital Profile Screen — `app/(hospital)/profile.tsx`
View Mode:

- Logo (circular, 80px) with hospital name and type badge
- Address and contact information displayed in a structured summary
- Edit Profile button and Sign Out button

### Edit Mode:

- Logo (tap to change)
- Hospital name
- Hospital type (Hospital or Blood Bank)
- Phone number
- Address
- Use Current Location button that populates coordinates and resolves a readable address via reverse geocoding
- Save and Cancel buttons


## Hospital Store — `stores/hospital.store.ts`
Create the hospital store with these actions:

- `fetchProfile()` — fetches the hospital row, sets it in the store
- `updateProfile(data)` — upserts the hospital row, refreshes the profile in store after save
- `uploadLogo(uri)` — uploads image to Supabase Storage `logos` bucket, returns and saves the public URL


## Acceptance Criteria

- Hospital profile screen loads existing data correctly on mount
- All fields are editable and persist correctly to the `hospitals` table after save
- Hospital type selector shows both options: Hospital and Blood Bank
- Logo upload saves to Supabase Storage and updated image displays immediately
- Use Current Location captures coordinates and populates the address field via reverse geocoding
- First-time hospitals with no existing row see an empty form ready to fill in
- Save operation uses a single upsert
- View and Edit modes work correctly with Cancel discarding changes
- Sign out clears the session and redirects to login
- All loading, empty, and error states are handled
- `npx tsc --noEmit` passes with zero errors
- No inline styles on any component