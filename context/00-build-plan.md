# Build Plan — Blood Donation App

This is the complete ordered build plan. Every unit produces one visible, verifiable result.
Build in this exact order — each unit depends on everything before it.

---

## Phase 1: Foundation

### Unit 01 — Project Scaffold & Navigation Shell

**What it builds:**
Bare Expo project initialized with TypeScript, Expo Router v3, NativeWind v4, and all base dependencies. Navigation shell with `(auth)/`, `(donor)/`, and `(hospital)/` route groups created. Root `_layout.tsx` reads auth session from Supabase and redirects to the correct group. Placeholder screens in each group so routing works end-to-end. `lib/supabase.ts` singleton configured. Tailwind config extended with all color tokens from `ui-context.md`. Inter font loaded.

**Dependencies:**
- expo-router
- nativewind
- tailwindcss
- @expo-google-fonts/inter
- expo-font
- @supabase/supabase-js
- zustand
- react-hook-form
- @hookform/resolvers
- zod
- date-fns
- @expo/vector-icons

**Depends on:** Nothing — this is unit 1

**Verify when done:**
- [ ] `npx expo start` runs without errors
- [ ] Navigating to `/` redirects to `/(auth)/login` (no session)
- [ ] All route group folders exist with placeholder screens
- [ ] NativeWind `bg-primary` applies the correct crimson color on a test element
- [ ] Inter font renders on a test Text element
- [ ] `lib/supabase.ts` exports the client with no TypeScript errors

---

### Unit 02 — Supabase Schema & Database Setup

**What it builds:**
All SQL migration files for the full database schema: `profiles`, `donors`, `hospitals`, `blood_requests`, `donor_applications`, `appointments`, `donation_history`, `blood_inventory`, `notifications`, `expo_push_tokens`. RLS enabled on all tables with correct policies. `profiles` auto-insert trigger on auth user creation. `lib/blood-compat.ts` with the full compatibility matrix. `types/index.ts` with all shared TypeScript types.

**Dependencies:** None new

**Depends on:** Unit 01 (Supabase client must exist)

**Verify when done:**
- [ ] All migration files applied to Supabase project without errors
- [ ] RLS enabled on all 10 tables
- [ ] `donors.is_eligible` generated column computes correctly (test with sample data)
- [ ] `UNIQUE(donor_id, request_id)` constraint exists on `donor_applications`
- [ ] `lib/blood-compat.ts` exports a function `getCompatibleGroups(bloodGroup: BloodGroup): BloodGroup[]` that returns correct results for all 8 groups
- [ ] `types/index.ts` has all types defined with zero TypeScript errors

---

## Phase 2: Authentication

### Unit 03 — Auth Screens (Register, Login, Forgot Password)

**What it builds:**
Three screens inside `(auth)/`: `login.tsx`, `register.tsx`, `forgot-password.tsx`. Register screen includes role selection (Donor / Hospital) as the first step, then email + password. On successful registration, Supabase Auth creates the user and the `profiles` trigger fires. Root `_layout.tsx` redirect logic completed (reads role from `profiles` and routes to correct group). `auth.store.ts` created with `session`, `role`, `signIn`, `signUp`, `signOut`, `resetPassword` actions.

**Dependencies:**
- expo-secure-store (for Supabase session persistence)

**Depends on:** Unit 01, Unit 02

**Verify when done:**
- [ ] A donor can register and is redirected to `/(donor)/feed`
- [ ] A hospital can register and is redirected to `/(hospital)/requests`
- [ ] Login works for both roles
- [ ] Forgot password sends a reset email via Supabase
- [ ] Form validation shows errors for empty fields and invalid email format
- [ ] Auth session persists across app restarts (SecureStore)
- [ ] Logout clears the session and redirects to `/(auth)/login`

---

## Phase 3: Donor Profile

### Unit 04 — Donor Profile Setup & Edit

**What it builds:**
`(donor)/profile.tsx` screen with full donor profile display and edit functionality. All profile fields rendered: full name, blood group, age, gender, weight, phone, address, last donation date, health declaration toggle. Eligibility status badge computed from `is_eligible` column. Avatar upload to Supabase Storage (`avatars/` bucket). `donor.store.ts` created with `profile`, `fetchProfile`, `updateProfile` actions. Profile screen shows eligibility breakdown (which rules pass/fail).

**Dependencies:**
- expo-image-picker
- expo-image-manipulator (for avatar compression)

**Depends on:** Unit 03

**Verify when done:**
- [ ] Donor profile screen loads existing profile data correctly
- [ ] All fields are editable and save correctly to `donors` table
- [ ] Blood group picker shows all 8 options
- [ ] Health declaration toggle saves correctly
- [ ] Eligibility badge shows "Eligible" (green) or "Not Eligible" (red) based on `is_eligible`
- [ ] Avatar upload saves to Supabase Storage and displays on profile
- [ ] Last donation date picker works correctly
- [ ] Profile saves with no TypeScript errors

---

## Phase 4: Hospital Profile

### Unit 05 — Hospital Profile Setup & Edit

**What it builds:**
`(hospital)/profile.tsx` screen with full hospital profile display and edit. Fields: name, type (hospital / blood bank), phone, email, address. Location coordinates captured via `expo-location` and saved to `hospitals` table. Logo upload to Supabase Storage (`logos/` bucket). `hospital.store.ts` created with `profile`, `fetchProfile`, `updateProfile` actions.

**Dependencies:**
- expo-location

**Depends on:** Unit 03

**Verify when done:**
- [ ] Hospital profile screen loads existing profile data
- [ ] All fields editable and save correctly to `hospitals` table
- [ ] Type selection (hospital / blood bank) works
- [ ] Location permission request fires and coordinates are saved
- [ ] Logo upload works and displays on profile
- [ ] No TypeScript errors

---

## Phase 5: Blood Requests — Donor Side

### Unit 06 — Blood Requests Feed (Donor)

**What it builds:**
`(donor)/feed.tsx` screen. Fetches all active blood requests where `blood_group` is compatible with the donor's blood group (using `lib/blood-compat.ts`). Results sorted by distance (nearest first) using donor's saved coordinates and request's hospital coordinates. Each request renders as a `RequestCard` component showing: hospital name, blood group chip, urgency badge, distance, quantity needed, posted time. Emergency requests appear at the top with the emergency badge. Pull-to-refresh. Empty state when no compatible requests exist.

**Dependencies:** None new

**Depends on:** Unit 04

**Verify when done:**
- [ ] Feed shows only requests compatible with the donor's blood group
- [ ] Emergency requests appear first regardless of distance
- [ ] Non-emergency requests sorted by nearest hospital
- [ ] Distance displayed in km (e.g., "2.4 km away")
- [ ] Urgency badges render with correct colors (Normal=blue, Urgent=orange, Emergency=red)
- [ ] Pull-to-refresh works
- [ ] Empty state shows when no compatible active requests exist
- [ ] Loading state shows spinner while fetching

---

### Unit 07 — Apply to a Blood Request (Donor)

**What it builds:**
`(donor)/apply/[id].tsx` screen. Shows full request details: hospital name, address, blood group, quantity, urgency level, contact info, notes. Shows donor's eligibility status. Apply button visible only to eligible donors who haven't applied yet. Ineligible donors see a "You are not eligible" message with the specific failing rule. If donor already applied, shows current application status instead of Apply button. Submitting creates a row in `donor_applications`. A "new_request" or "application_status" notification is not sent here — that comes in Unit 14.

**Dependencies:** None new

**Depends on:** Unit 06

**Verify when done:**
- [ ] Full request details display correctly
- [ ] Apply button visible only if donor is eligible and hasn't applied
- [ ] Ineligible donors see which specific rule they fail
- [ ] Donors who already applied see their current status instead of Apply button
- [ ] Successful application creates row in `donor_applications` with status `pending`
- [ ] Duplicate application is prevented (UNIQUE constraint error handled gracefully)
- [ ] Success toast shown after applying

---

### Unit 08 — Donor Applications Tracker

**What it builds:**
`(donor)/applications.tsx` screen. Lists all of the donor's applications with: request blood group, hospital name, application status badge, applied date. Tapping an application opens `(donor)/appointment/[id].tsx` if approved (appointment details: date, time, location, hospital notes). Status badges: Pending (orange), Approved (green), Rejected (red). Empty state for no applications.

**Dependencies:** None new

**Depends on:** Unit 07

**Verify when done:**
- [ ] All donor applications listed with correct status badges
- [ ] Tapping an approved application navigates to appointment details
- [ ] Appointment detail screen shows: date, time, location, hospital name, notes
- [ ] Rejected and pending applications do not navigate to appointment (tapping is disabled or shows a message)
- [ ] Empty state shown for donors with no applications

---

## Phase 6: Blood Requests — Hospital Side

### Unit 09 — Create & Manage Blood Requests (Hospital)

**What it builds:**
`(hospital)/requests.tsx` screen listing the hospital's own blood requests (active, fulfilled, cancelled). `(hospital)/create-request.tsx` form to create a new request: blood group picker, quantity input, urgency level selector, contact info, hospital address, notes, emergency toggle. Submitted request creates a row in `blood_requests`. Status management: hospital can cancel an active request. Requests list shows count of pending applications per request.

**Dependencies:** None new

**Depends on:** Unit 05

**Verify when done:**
- [ ] Hospital can create a blood request with all fields
- [ ] Emergency toggle correctly sets `is_emergency = true` and `urgency_level = 'emergency'`
- [ ] Created request appears in the requests list
- [ ] Hospital can cancel an active request (status changes to `cancelled`)
- [ ] Request cards show pending application count
- [ ] Form validates all required fields before submission

---

### Unit 10 — Review Applications & Approve / Reject (Hospital)

**What it builds:**
`(hospital)/applications/[requestId].tsx` screen. Lists all donor applications for a specific request. Each application card shows: donor name, blood group chip, eligibility badge, weight, age, apply date. Hospital can view donor's full profile inline (expanded card or modal). Approve button and Reject button on each pending application. Approving sets `donor_applications.status = 'approved'`. Rejecting sets it to `'rejected'`. Approved/rejected cards show the final status badge only.

**Dependencies:** None new

**Depends on:** Unit 09

**Verify when done:**
- [ ] All pending applications for a request are listed
- [ ] Donor profile information visible per application card
- [ ] Eligibility badge shows correctly per donor
- [ ] Approve sets status to `approved`
- [ ] Reject sets status to `rejected`
- [ ] Already-decided applications show status badge without Approve/Reject buttons
- [ ] Only eligible donors can be approved (UI should warn if somehow an ineligible donor appears)

---

### Unit 11 — Schedule Donation Appointment (Hospital)

**What it builds:**
`(hospital)/schedule/[applicationId].tsx` screen. Only accessible after an application is approved. Form to schedule appointment: date picker, time picker, location field, notes. Submitting creates a row in `appointments` linked to the `application_id`. Scheduled appointment appears in the donor's `applications.tsx` and `appointment/[id].tsx` screens immediately (via Supabase Realtime subscription on `appointments`).

**Dependencies:**
- @react-native-community/datetimepicker

**Depends on:** Unit 10

**Verify when done:**
- [ ] Schedule form accessible only from an approved application
- [ ] Date and time pickers work on both iOS and Android
- [ ] Submitting creates a row in `appointments` with `status = 'scheduled'`
- [ ] Donor's applications screen reflects the new appointment immediately via Realtime
- [ ] Appointment details visible on `(donor)/appointment/[id].tsx`

---

## Phase 7: Donation Confirmation & History

### Unit 12 — Confirm Donation & Donation History

**What it builds:**
Confirm donation button on the `(hospital)/schedule/[applicationId].tsx` screen (visible only when appointment exists with `status = 'scheduled'`). Confirming: sets `appointments.status = 'completed'`, creates a row in `donation_history`, updates `donors.last_donation_date` to today, increments the relevant `blood_inventory` row for the hospital. `(donor)/history.tsx` screen listing all confirmed donations: hospital name, blood group, donation date, units donated. Empty state for no history.

**Dependencies:** None new

**Depends on:** Unit 11

**Verify when done:**
- [ ] Confirm donation button visible only for scheduled appointments
- [ ] Confirming sets appointment status to `completed`
- [ ] Donation history row created with correct data
- [ ] `donors.last_donation_date` updated to today
- [ ] Donor's eligibility recalculates immediately (via generated column refresh)
- [ ] Hospital blood inventory incremented for the correct blood group
- [ ] Donation appears in `(donor)/history.tsx`
- [ ] Empty state shown for donors with no history

---

## Phase 8: Blood Inventory

### Unit 13 — Blood Inventory Management (Hospital)

**What it builds:**
`(hospital)/inventory.tsx` screen. Displays a card per blood group (all 8 groups) showing current `units_available`. Hospital can tap any blood group card to manually adjust stock: add units or set to a specific number. Changes update `blood_inventory` (upsert). Low stock indicator shown when `units_available < 5`. Last updated timestamp per group. Simple inventory report at the top: total units across all groups.

**Dependencies:** None new

**Depends on:** Unit 12

**Verify when done:**
- [ ] All 8 blood group cards displayed with current stock
- [ ] Stock adjustment saves correctly via upsert
- [ ] Low stock indicator appears when units < 5
- [ ] Total units calculation at top is accurate
- [ ] Last updated timestamp updates on save

---

## Phase 9: Notifications

### Unit 14 — Push Notification System

**What it builds:**
`lib/notifications.ts` — registers Expo push token on login and saves to `expo_push_tokens` table. Supabase Edge Function `dispatch-notifications` that reads event type and sends Expo push API calls to relevant token(s). Database triggers (via Edge Function calls or Supabase webhooks) fire the Edge Function on:

1. New `blood_requests` row → push to all compatible eligible donors: "New blood request from [hospital]"
2. Emergency `blood_requests` → priority push to all compatible eligible donors: "🚨 Emergency: [blood group] blood needed at [hospital]"
3. `donor_applications.status` update → push to the donor: "Your application was [approved/rejected]"
4. New `appointments` row → push to the donor: "Appointment scheduled at [hospital] on [date]"
5. `appointments.status = 'completed'` → push to donor: "Donation confirmed! Thank you."

`notification.store.ts` — fetches notification list from `notifications` table, marks as read. `notifications` bell icon in the header with unread count badge.

**Dependencies:**
- expo-notifications
- expo-device

**Depends on:** Unit 13

**Verify when done:**
- [ ] Push token registered and saved on login
- [ ] New blood request notification received by a compatible eligible donor
- [ ] Emergency alert received with correct priority by all compatible eligible donors
- [ ] Application status notification received by donor on approve/reject
- [ ] Appointment notification received by donor when appointment is scheduled
- [ ] Donation confirmed notification received after hospital confirms
- [ ] Notification list screen shows all notifications with read/unread state
- [ ] Unread count badge appears on bell icon

---

## Phase 10: Finalization

### Unit 15 — Blood Matching Refinement & Location Sorting

**What it builds:**
Refinement pass on blood matching and location logic. Verifies the donor feed correctly uses the full compatibility matrix from `lib/blood-compat.ts`. Ensures distance calculation is accurate using the Haversine formula in `lib/location.ts`. Adds a "Nearby" filter toggle to the donor feed (show requests within 50km only). Adds location permission fallback: if permission denied, feed shows all compatible requests without distance sorting and displays a banner prompting the user to enable location.

**Dependencies:** None new

**Depends on:** Unit 06, Unit 14

**Verify when done:**
- [ ] Blood group compatibility matrix produces correct results for all 8 donor groups
- [ ] Distance displayed on request cards is accurate (verified manually with known coordinates)
- [ ] "Nearby (50km)" filter toggle works and hides distant requests
- [ ] If location permission denied, feed works with a "Enable location for better results" banner
- [ ] No crashes when `latitude` / `longitude` is null on donor or hospital profile
- [ ] Zero TypeScript errors across the full codebase
- [ ] Full `npx expo export` build completes without errors

---

## Build Summary

| Phase | Units  | What Gets Built                                             |
|-------|--------|-------------------------------------------------------------|
| 1     | 01-02  | Scaffold, navigation shell, full DB schema                  |
| 2     | 03     | Auth: register (with role), login, password reset           |
| 3     | 04-05  | Donor profile + eligibility, Hospital profile + location    |
| 4     | 06-08  | Donor: feed, apply, application tracker + appointments      |
| 5     | 09-11  | Hospital: requests, application review, appointment scheduling |
| 6     | 12     | Donation confirmation + donor history                       |
| 7     | 13     | Hospital blood inventory management                         |
| 8     | 14     | Full push notification system (5 types)                     |
| 9     | 15     | Blood matching refinement + location filter                 |

**Total: 15 units across 9 phases.**
