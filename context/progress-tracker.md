# Progress Tracker — Blood Donation App

Update this file after every meaningful implementation change.
This is the file that keeps every session grounded.

---

## Current Phase

- Phase 1: Foundation & Authentication

---

## Current Goal

- Set up the Expo + Supabase project, configure navigation shell, and implement the full auth flow (register with role selection, login, password reset)

---

## Completed

- None yet.

---

## In Progress

- None yet.

---

## Next Up

1. Unit 01 — Project Scaffold & Navigation Shell
2. Unit 02 — Supabase Schema & Auth Backend
3. Unit 03 — Auth Screens (Register, Login, Forgot Password)
4. Unit 04 — Donor Profile Setup & Edit
5. Unit 05 — Hospital Profile Setup & Edit
6. Unit 06 — Blood Requests Feed (Donor)
7. Unit 07 — Apply to a Blood Request (Donor)
8. Unit 08 — Donor Applications Tracker
9. Unit 09 — Create Blood Request (Hospital)
10. Unit 10 — Review Applications & Approve/Reject (Hospital)
11. Unit 11 — Schedule Donation Appointment (Hospital)
12. Unit 12 — Confirm Donation & History (Hospital + Donor)
13. Unit 13 — Blood Inventory Management (Hospital)
14. Unit 14 — Push Notification System
15. Unit 15 — Blood Matching & Location Sorting

---

## Open Questions

- Should a donor be allowed to apply to multiple active requests simultaneously, or only one at a time?: NO, Only one at a time.
- Should expired blood requests be automatically cancelled by a Supabase cron job or manually by the hospital?: NO, Manually by the hospital.
- Should the hospital profile require admin verification before they can create requests, or can they post immediately after registration?: NO, They can post immediately after registration.

---

## Architecture Decisions

- None recorded yet.

---

## Session Notes

- Project planning complete. All 6 context files and build plan created.
- Stack confirmed: React Native + Expo SDK 54, Expo Router v4, NativeWind v5, Zustand, Supabase
- Ready to begin Unit 01.
