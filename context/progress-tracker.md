# Progress Tracker — Blood Donation App

Update this file after every meaningful implementation change.
This is the file that keeps every session grounded.

---

## Current Phase

- Phase 4: Hospital Blood Request Management

---

## Current Goal

- Complete the hospital side of the Create Blood Request flow (create screen + request management list) so hospitals can create, view, and cancel their own blood requests, enabling end-to-end testing of the request lifecycle with donor features.

---

## Completed

- Unit 01 — Project Scaffold & Navigation Shell ✅
- Unit 02 — Supabase Schema & Database Setup ✅
- Unit 03 — Auth Screens (Register, Login, Forgot Password) ✅
- Unit 04 — Donor Profile Setup & Edit ✅
- Unit 05 — Hospital Profile Setup & Edit ✅
- Unit 06 — Blood Requests Feed (Donor) ✅
- Unit 07 — Apply to a Blood Request (Donor) ✅
- Unit 08 — Create & Manage Blood Requests (Hospital) ✅
- Unit 09 — Review Applications & Approve/Reject (Hospital) ✅
- Unit 10 — Schedule Donation Appointment (Hospital) ✅
- Unit 11 — Confirm Donation & Blood Inventory Update (Hospital) ✅
- Unit 12 — Blood Inventory Management (Hospital) ✅
- Unit 13 — Donor Applications & Appointment Tracker ✅
- Unit 14 — Donor Donation History & Deletion ✅
- Unit 15 — Push Notification System ✅

---

## In Progress

- None

---

## Next Up

14. Unit 16 — Blood Matching & Location Sorting Refinement

---

## Open Questions

- Should a donor be allowed to apply to multiple active requests simultaneously, or only one at a time?: NO, Only one at a time.
- Should expired blood requests be automatically cancelled by a Supabase cron job or manually by the hospital?: NO, Manually by the hospital.

---

## Architecture Decisions

- NativeWind v4 + Tailwind CSS v3.3.2 chosen over NativeWind v5 (preview) for stability
- babel-preset-expo pinned to ~54.0.10 to match Expo SDK 54 (v56.x caused Hermes private fields errors)
- Supabase storage adapter uses SSR-safe guards (`typeof window === 'undefined'`) for static rendering compatibility
- React Compiler enabled in app.json for optimized re-renders
- Replaced static age column with date_of_birth and calculated it dynamically using PostgreSQL's age() function
- Replaced stored generated is_eligible column with a dynamic PostgREST computed field function is_eligible(public.donors) to avoid stale caching
- Split schema migrations into 9 focused files for modularity and better DDL tracking
- User signup trigger handle_new_user only inserts into profiles; role-specific records are created on onboarding
- SecureStore session storage chunked (ChunkedSecureStoreAdapter) at 2000-byte boundaries to bypass Android's 2048-byte key/value limit, preventing session storage errors on Android devices
- Implemented mirrored client-side eligibility checking function (lib/eligibility.ts) to provide instantaneous checkbox verification during profile updates while database triggers act as final database-level truth
- Build order pivoted after Unit 07: hospital side built first (Units 08-11), then remaining donor screens (Units 12-14), so every donor feature can be tested end-to-end immediately
- Created and applied Supabase migration 20260627000012 to add a DELETE policy for public.donation_history table, enabling donors to remove past records from their histories securely
- Public registration is donor-only; hospital access is restricted to manually pre-provisioned Supabase hospital accounts with `profiles.role = hospital`, and the app no longer exposes hospital self-registration.
- Hospital profiles are represented as Hospital-only in the app; the Blood Bank profile type option is no longer exposed, and profile saves force `hospitals.type = hospital`.

---

## Session Notes

- Project planning complete. All 6 context files and build plan created.
- Stack confirmed: React Native + Expo SDK 54, Expo Router v4, NativeWind v2, Zustand, Supabase
- Unit 01 complete: full scaffold, navigation shell, auth redirect, role-based tab layouts.
- Unit 02 complete: 9 focused migration files successfully applied, RLS policies active, storage buckets provisioned, PostgREST computed field for dynamic eligibility configured, database.types.ts generated, and typescript models & helper verified.
- Unit 03 complete: completed the full auth store (signUp, signIn, signOut, resetPassword, fetchRole) and implemented high-fidelity Register (two-step flow), Login, and Forgot Password screens with React Hook Form, Zod validation, and UI tokens from ui-context.md. Implemented a ChunkedSecureStoreAdapter to fix the Android SecureStore 2048-byte size limit.
- Unit 04 complete: implemented the complete donor profile screen (app/(donor)/profile.tsx) with high-fidelity View Mode and Edit Mode layout, a client-side eligibility helper (lib/eligibility.ts) for real-time validation, a Zustand store (stores/donor.store.ts), location coordinate resolving with geocoding, and compressed avatar uploads to Supabase Storage.
- Unit 05 complete: implemented Zustand store stores/hospital.store.ts for database sync and image uploads, completed app/(hospital)/profile.tsx with high-fidelity split view/edit mode layout, form validation, logo picking, and GPS location geocoding.
- Unit 06 complete: implemented client-side location math library (lib/location.ts), updated stores/donor.store.ts with requests state, fetching queries and realtime insert handlers, implemented high-fidelity components/donor/RequestCard.tsx with dynamic urgency styling, built the main app/(donor)/feed.tsx feed screen with pull-to-refresh and a warning banner, created the detailed view app/(donor)/request/[id].tsx screen with a stats grid and eligibility indicators, and added the placeholder app/(donor)/apply/[id].tsx to prevent router crashes. Both strict TypeScript compiler and Metro bundling checks completed successfully with zero errors.
- Build order pivoted after Unit 07. Specs 00-build-plan.md deleted. New order documented in Next Up above.
- Unit 09 complete: implemented state and database sync actions in stores/hospital.store.ts, developed high-fidelity components/hospital/ApplicationCard.tsx with collapsible profile details and custom inline eligibility failure warning banners, configured dynamic route routing in app/(hospital)/_layout.tsx, built the applications review board screen at app/(hospital)/applications/[requestId].tsx with status filters, and verified complete compilation with zero TypeScript errors.
- Unit 10 complete: Installed `@react-native-community/datetimepicker`, implemented appointment actions (`fetchAppointment`, `scheduleAppointment`, `cancelAppointment`, `fetchApplicationById`) in `stores/hospital.store.ts`, added a "Schedule Appointment" button for approved applications in `components/hospital/ApplicationCard.tsx`, registered the `schedule/[applicationId]` route, built a premium scheduling screen in `app/(hospital)/schedule/[applicationId].tsx` with form/view modes, and integrated Realtime database listeners on the donor side (`app/(donor)/apply/[id].tsx`) to sync status updates and scheduled bookings automatically. Verified compilation with zero TypeScript errors.
- Unit 11 complete: Implemented `confirm_donation` Supabase RPC running under `SECURITY DEFINER` to complete the donation lifecycle (updating appointment status to completed, inserting donation history record, upserting hospital blood inventory, and updating donor's last donation date). Added `confirmDonation` to `stores/hospital.store.ts` and `refreshProfile` to `stores/donor.store.ts`. Extended the schedule details screen (`app/(hospital)/schedule/[applicationId].tsx`) to show a "Confirm Donation" button for scheduled appointments, wired up a confirmation alert prompt, and handled loading and state synchronizations. Verified compilation with zero TypeScript errors.
- Unit 12 complete: Added inventory state and actions to `stores/hospital.store.ts`, built high-fidelity `app/(hospital)/inventory.tsx` screen with card listings, low stock warnings, totals summary, and manual adjustments (add units/set stock) modal. Wired up pull-to-refresh and realtime Supabase database subscriptions. Verified compilation with zero TypeScript errors.
- Unit 13 & 14 complete: Created reusable `DonorApplicationCard` component and refactored `app/(donor)/applications.tsx` with filter tabs (All/Pending/Approved/Rejected) and realtime database sync. Developed high-fidelity `app/(donor)/history.tsx` to list verified completed donations and integrated record deletion actions in the store. Generated and applied a database migration for the RLS delete policy on the donation history table. Verified compilation with zero TypeScript errors.
- Bug Fix: Generated and applied a database migration `20260628000003_cascade_user_deletion.sql` to add `ON DELETE CASCADE` to the foreign key constraints in the `appointments` and `donation_history` tables. This fixes the "Failed to delete user" bug by ensuring that deleting a donor or hospital cascades correctly to their appointments and donation history.
- OTP Password Recovery: Refactored the password recovery flow to verify a 6-digit OTP code and update the password directly in the app. Added `verifyAndResetPassword` action to `stores/auth.store.ts` and refactored `app/(auth)/forgot-password.tsx` to use a two-step wizard layout with interactive password toggles, code resending, and error validation. Verified compilation with zero TypeScript errors.
- Hospital Dashboard Refinement: Enabled direct appointment actions (Confirm Donation and Cancel Appointment) and state visibility (Scheduled, Completed, Cancelled badges) directly on the hospital applications review card. Fetched appointments relation in the store query, refactored fetch query for latest appointment to prevent single-row crash, and supported rescheduling cancelled appointments with a togglable form state. Verified compilation with zero TypeScript errors.
- Startup & Push Token Bug Fixes: Downgraded push token notification errors from console.error to console.log and configured LogBox to ignore notifications warnings, completely hiding push token error overlays in development. Refactored auth initialization in app/_layout.tsx with an async try/catch/finally block to guarantee that setLoading(false) is always called and prevent startup loading screen hangs. Verified compilation with zero TypeScript errors.
- In-app Notifications Swipe to Delete: Created database migration to add a DELETE RLS policy to the notifications table and successfully applied it. Added `deleteNotification` to `stores/notification.store.ts` for optimistic state clearing. Wrapped root components inside `GestureHandlerRootView` in `app/_layout.tsx` and wrapped `NotificationItem` in `<Swipeable>` from `react-native-gesture-handler` to support swiping left or right to delete notification cards. Verified compilation with zero TypeScript errors.
- Global Notification Bell Visibility: Added the notification bell icon with real-time dynamic unread badge count to all primary tab screen headers on both the donor and hospital side (donor: feed, applications, history, profile; hospital: requests, applications, inventory, profile). Verified compilation with zero TypeScript errors.
- Hospital Donor Application Notifications: Created database migration to update the notifications trigger function and trigger definition on the `donor_applications` table to fire on both INSERT and UPDATE OF status. Updated the `dispatch-notifications` Edge Function to handle the new `new_application` type, sending in-app and push notifications to the hospital institution when a donor applies to their blood request. Updated `NotificationItem` to render a custom file icon for `new_application` and route hospitals directly to the corresponding donor applications review page on tap. Verified compilation with zero TypeScript errors.
- App Logo & Branding Assets: Generated a modern, premium, minimalist app logo featuring a stylized red blood droplet combined with a connection link graphic. Saved to assets and configured it as the primary app icon (assets/images/icon.png), splash screen image (assets/images/splash-icon.png), and custom branding asset (assets/images/logo.png). Refactored the login screen to display the high-fidelity branding logo instead of the previous Feather icon placeholder. Verified compilation with zero TypeScript errors.
- Hospital Access Lockdown: Removed public hospital self-registration from the auth flow, forced sign-up metadata to `role = donor`, clarified login copy for authorized hospital staff, and hardened root navigation so donor users are redirected away from the hospital route group while hospital users are redirected away from donor routes. No database migrations were changed.
- Hospital Profile Type Simplification: Removed the Type section from the hospital profile details and edit form, updated the profile copy to use Hospital terminology, normalized fetched hospital profile state to Hospital, and forced profile saves to use `type = hospital`. Verified compilation with zero TypeScript errors.
