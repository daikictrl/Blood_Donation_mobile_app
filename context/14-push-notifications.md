BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

─────────────────────────────────────────────────────────────────

## Unit 15 — Push Notification System

### Objective
Implement the complete push notification system for BloodLink. After this unit, all 5 notification types fire correctly to the right users at the right time. The notification bell in the donor feed shows a live unread count. A notification list screen shows all past notifications. Tapping a notification navigates to the relevant screen.

### Scope
This unit must deliver:

- Push token registration on login for both donor and hospital users
- A Supabase Edge Function dispatch-notifications that sends Expo push notifications
- Database triggers or webhook calls that fire the Edge Function on the 5 key events
- A notification list screen at `app/(donor)/notifications.tsx` and `app/(hospital)/notifications.tsx`
- A reusable NotificationItem component
- `stores/notification.store.ts` fully wired to the notifications table
- Live unread count badge on the notification bell icon in both donor and hospital headers
- Tapping a notification marks it as read and navigates to the relevant screen


### Engineering Principles

- Push notifications are dispatched from the Supabase Edge Function only — no client code calls the Expo Push API directly
- The Edge Function reads recipient push tokens from `expo_push_tokens` table and sends via Expo Push API
- Token registration happens immediately after login and is saved to `expo_push_tokens` via upsert — duplicate tokens are handled by the existing UNIQUE constraint
- The 5 notification events and their recipients are:

| Event | Trigger | Recipients |
|---|---|---|
| New blood request | New row inserted in blood_requests | All eligible donors compatible with the requested blood group |
| Emergency alert | New row in blood_requests with is_emergency = true | All eligible donors compatible with the requested blood group — sent as high priority |
| Application status updated | donor_applications.status changes to approved or rejected | The donor who applied |
| Appointment scheduled | New row inserted in appointments | The donor linked to the appointment |
| Donation confirmed | appointments.status changes to completed | The donor linked to the appointment |

- Every push notification must also insert a row into the `notifications` table for in-app display
- The notification bell icon uses a Realtime subscription on `notifications` filtered by `user_id = auth.uid()` to update the unread count live
- Notifications are marked as read when the user opens the notification list screen or taps a specific notification


### Edge Function to Build

`supabase/functions/dispatch-notifications/index.ts`

The function receives a payload containing:

- type — one of the 5 notification types
- data — event-specific data (request id, application id, appointment id, etc.)

Based on type the function:

- Determines the correct recipient user ids
- Fetches their push tokens from `expo_push_tokens`
- Sends push notifications via Expo Push API (`https://exp.host/--/api/v2/push/send`)
- Inserts notification rows into the `notifications` table for each recipient

The function must handle Expo push ticket errors gracefully — log failures but do not throw, so a single bad token does not block notifications to other recipients.

### Database Triggers to Create

Create a new migration file with PostgreSQL triggers that call the Edge Function via pg_net (Supabase's HTTP extension) on:

- AFTER INSERT ON `blood_requests` — fires `dispatch-notifications` with type `new_request` or `emergency` based on `is_emergency`
- AFTER UPDATE OF `status` ON `donor_applications` — fires when `status` changes to `approved` or `rejected`
- AFTER INSERT ON `appointments` — fires with type `appointment`
- AFTER UPDATE OF `status` ON `appointments` — fires when `status` changes to `completed`


### Screens & Components to Build

**Notification List Screen** — `app/(donor)/notifications.tsx` and `app/(hospital)/notifications.tsx`

- Screen header with title "Notifications"
- List of `NotificationItem` components sorted by `created_at` descending
- Unread notifications visually distinct from read ones (e.g. bold title, colored left border)
- Mark all as read button in the header
- Pull-to-refresh as fallback
- Empty state when no notifications exist
- Loading state on initial fetch

**NotificationItem Component** — `components/shared/NotificationItem.tsx`

Each item displays:

- Notification icon based on type (use Feather icons from `ui-context.md`)
- Title and body text
- Timestamp using date-fns
- Unread indicator (bold or accent left border)
- Tapping marks it as read and navigates to the relevant screen based on notification type and data field

**Notification Navigation Map**

| Notification Type | Navigate To |
|---|---|
| new_request | `app/(donor)/request/[id].tsx` |
| emergency | `app/(donor)/request/[id].tsx` |
| application_status | `app/(donor)/applications.tsx` |
| appointment | `app/(donor)/appointment/[id].tsx` |
| donation_confirmed | `app/(donor)/history.tsx` |

**Notification Store** — stores/notification.store.ts

Create the notification store with:

- notifications — array of AppNotification
- unreadCount — number
- `fetchNotifications()` — fetches all notifications for the logged-in user sorted by created_at descending
- `markAsRead(id)` — sets read = true for a specific notification, updates local state immediately
- `markAllAsRead()` — sets read = true for all unread notifications in a single update
- `subscribeToNotifications()` — Realtime subscription on notifications filtered by user_id, updates unread count and prepends new notifications to the list
- `unsubscribeFromNotifications()` — cleans up the subscription


## Token Registration — `lib/notifications.ts`

Create or update `lib/notifications.ts` with:

- `registerPushToken()` — requests notification permissions, gets the Expo push token, upserts it into `expo_push_tokens` for the current user
- Must handle permission denial gracefully — if the user denies permission, skip token registration silently without crashing
- Must check that the device is a physical device — Expo push tokens do not work on simulators


## Dependencies

- expo-notifications
- expo-device

## Acceptance Criteria

- Push token registered and saved to `expo_push_tokens` on login on a physical device
- New blood request notification received by all compatible eligible donors
- Emergency alert received with high priority by all compatible eligible donors
- Application status notification received by the correct donor when approved or rejected
- Appointment notification received by the correct donor when appointment is scheduled
- Donation confirmed notification received by the correct donor after hospital confirms
- Every push notification also creates a row in the notifications table
- Notification bell shows correct live unread count on both donor and hospital headers
- Unread count updates in real time when a new notification arrives
- Notification list screen shows all notifications with correct unread styling
- Tapping a notification marks it as read and navigates to the correct screen
- Mark all as read correctly clears the unread count and updates all items visually
- Permission denial is handled gracefully with no crash
- Edge Function handles bad push tokens without blocking other recipients
- Pull-to-refresh works as fallback on notification screens
- `npx tsc --noEmit` passes with zero errors
- No inline styles on any component