BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

─────────────────────────────────────────────────────

## Unit 11 — Confirm Donation & Inventory Update (Hospital)

### Objective
Implement the donation confirmation flow on the hospital side. After this unit, a hospital can mark a scheduled appointment as completed, which simultaneously creates a donation history record, updates the donor's last donation date, and increments the hospital's blood inventory for the donated blood group. This unit wires the backend consequences of a completed donation — the screens that display this data are built in Units 12 and 13.

### Scope
This unit must deliver:

- Confirm Donation button on the schedule screen built in Unit 10
- Atomic database operation that performs all three consequences in a single transaction
- Hospital and donor store updates reflecting the confirmation immediately
- No new screens — this unit extends existing screens only


### Engineering Principles

- All three database writes must succeed or all must fail — use a Supabase database function (RPC) to wrap them in a single transaction rather than making three separate client calls
- The three writes are:

- Set appointments.status = 'completed'
- Insert a row into donation_history
- Upsert blood_inventory incrementing units_available by the donated units for the correct blood group


- After the RPC succeeds, update donors.last_donation_date to today — this triggers eligibility recalculation on the donor's next profile fetch
- Blood inventory must never go below zero — the database constraint on blood_inventory.units_available already enforces this but the RPC must handle the error gracefully if it fires
- Confirm Donation button is only visible when appointments.status = 'scheduled' — never show it for completed, cancelled, or no-show appointments


### Database Function to Create
Create a new Supabase migration file with an RPC function confirm_donation that accepts:

- p_appointment_id UUID
- p_donor_id UUID
- p_hospital_id UUID
- p_blood_group TEXT
- p_units_donated INTEGER
- p_donation_date DATE
- p_notes TEXT

The function must:

- Update appointments.status = 'completed' where id = p_appointment_id
- Insert into donation_history with all provided parameters
- Upsert into blood_inventory incrementing units_available by p_units_donated for the matching hospital_id and blood_group
- Update donors.last_donation_date = p_donation_date where id = p_donor_id
- Return success or raise an exception if any step fails


### Screen Updates
Schedule Appointment Screen — app/(hospital)/schedule/[applicationId].tsx
In view mode (appointment already exists), add:

- Confirm Donation button visible only when appointments.status = 'scheduled'
- Tapping shows a confirmation prompt: "Confirm that this donation has been completed?"
- On confirm, calls the confirm_donation RPC
- On success, appointment status badge updates to Completed immediately
- Confirm Donation button disappears after successful confirmation
- Show a success toast: "Donation confirmed. Inventory updated."


Hospital Store Updates — `stores/hospital.store.ts`
Add to the existing hospital store:

- `confirmDonation(appointmentId, donorId, bloodGroup, unitsDonated, notes)` — calls the confirm_donation RPC, updates the local appointment status in store on success


### Donor Store Updates — `stores/donor.store.ts`
Add to the existing donor store:

- `refreshProfile()` — re-fetches the donor profile including updated last_donation_date and recalculated is_eligible — called after donation confirmation so the donor's eligibility reflects the new last donation date on their next profile view


### Acceptance Criteria

- Confirm Donation button visible only on appointments with status scheduled
- Confirmation prompt appears before any database write
- On confirmation all three database writes complete successfully as a single transaction
- If any write fails the entire operation rolls back and an error message is shown
- Appointment status badge updates to Completed immediately after confirmation
- Confirm Donation button disappears after successful confirmation
- A donation record exists in donation_history after confirmation
- Hospital blood inventory is incremented by the correct amount for the correct blood group
- Donor's last_donation_date is updated to today
- Donor's eligibility recalculates correctly on next profile fetch reflecting the new last donation date
- Success toast shown after confirmation
- npx tsc --noEmit passes with zero errors
- No inline styles on any component