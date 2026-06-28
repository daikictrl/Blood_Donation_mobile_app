BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

─────────────────────────────────────────────────────────────────
## Unit 10 — Schedule Donation Appointment (Hospital)

### Objective
Implement the screen where a hospital schedules a donation appointment for an approved donor application. After this unit, a hospital can set a date, time, location, and notes for the appointment. The donor sees the appointment details immediately on their side. This completes the approved application path that was left incomplete in Unit 07.

### Scope
This unit must deliver:

- A fully functional schedule appointment screen at app/(hospital)/schedule/[applicationId].tsx
- Appointment creation linked to an approved donor application
- Real-time appointment visibility on the donor side immediately after scheduling
- Hospital store updates for appointment management


### Engineering Principles

- All Supabase calls go through stores/hospital.store.ts
- The schedule screen is only accessible from an approved application — if somehow accessed for a non-approved application, show an error and redirect back
- Appointment creation requires all mandatory fields — date, time, and location — notes are optional
- Date and time must be combined into a single TIMESTAMPTZ value before saving to appointments.scheduled_date
- Once an appointment exists for an application, the schedule screen switches to a view mode showing the existing appointment details with an option to cancel it
- Cancelling an appointment sets appointments.status = 'cancelled' — it does not delete the row
- A Realtime subscription on appointments on the donor side means the donor sees the appointment appear without refreshing — ensure the database insert triggers this correctly


### Screens to Build
Schedule Appointment Screen — app/(hospital)/schedule/[applicationId].tsx
If no appointment exists yet:

- Screen header with donor name and blood group
- Donor profile summary (avatar, name, blood group, eligibility badge)
- Date picker
- Time picker
- Location input (pre-filled from hospital profile address, editable)
- Notes input (optional, multiline)
- Schedule Appointment button

If appointment already exists:

- Display existing appointment details in view mode:

  - Scheduled date and time
  - Location
  - Notes
  - Current appointment status badge


Cancel Appointment button (only visible if status is scheduled) — shows confirmation prompt before cancelling


### Navigation
The schedule screen is accessed from the ApplicationCard built in Unit 09. Add a Schedule Appointment button on approved application cards in components/hospital/ApplicationCard.tsx that navigates to app/(hospital)/schedule/[applicationId].tsx passing the application id.

### Hospital Store Updates — stores/hospital.store.ts
Add to the existing hospital store:

- `fetchAppointment(applicationId)` — fetches the existing appointment for a given application id, returns null if none exists
- `scheduleAppointment(data)` — inserts a new appointment row linked to the application id, donor id, and hospital id
- `cancelAppointment(appointmentId)` — sets appointments.status = 'cancelled', updates local store state immediately


### Dependencies
- @react-native-community/datetimepicker

### Acceptance Criteria

- Schedule button visible on approved application cards in the applications review screen
- Tapping Schedule navigates to the schedule screen with the correct donor details pre-loaded
- All mandatory fields (date, time, location) must be filled before submission is allowed
- Submitting creates a row in appointments with status = 'scheduled'
- After scheduling, the screen switches to view mode showing the appointment details
- A donor logged in simultaneously sees the appointment appear on their apply screen without refreshing
- Cancel appointment shows a confirmation prompt before actioning
- Cancelling sets status to cancelled and updates the view immediately
- Accessing the screen for a non-approved application shows an error and redirects back
- Date and time are combined correctly into a single TIMESTAMPTZ before saving
- All loading and error states handled
- npx tsc --noEmit passes with zero errors
- No inline styles on any component