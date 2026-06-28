# Architecture — Blood Donation App

## Tech Stack

| Layer              | Technology                        | Role                                                              | 
|--------------------|-----------------------------------|-------------------------------------------------------------------|
| Framework          | React Native + Expo SDK 54       | Cross-platform mobile app (iOS + Android)                        |
| Navigation         | Expo Router v4                    | File-based routing with typed routes                             |
| Styling            | NativeWind v5 (Tailwind RN)       | Utility-class styling system with custom tokens                  |
| State Management   | Zustand                           | Global client state (auth session, notifications, inventory)     |
| Backend            | Supabase                          | Managed PostgreSQL, Auth, Storage, Realtime, Edge Functions      |
| Database           | PostgreSQL (via Supabase)         | All persistent app data                                          |
| Auth               | Supabase Auth                     | Email/password auth, password reset via email                    |
| File Storage       | Supabase Storage                  | Donor avatars, hospital logos                                    |
| Realtime           | Supabase Realtime                 | Live application status updates, inventory changes               |
| Edge Functions     | Deno (Supabase Edge Functions)    | Eligibility computation, blood matching, push notification dispatch |
| Push Notifications | Expo Notifications + Expo Push    | Device token registration and push delivery                      |
| Location           | Expo Location                     | Get donor/hospital coordinates for proximity sorting             |
| Form Validation    | React Hook Form + Zod             | All form inputs with schema-based validation                     |
| Date Utilities     | date-fns                          | Eligibility date math (30-day wait period)                       |
| Type Safety        | TypeScript (strict mode)          | All files typed, no implicit any                                 |

---

## System Boundaries

```
app/
├── (auth)/               ← unauthenticated screens: login, register, forgot-password
├── (donor)/              ← donor-role screens protected by auth + role check
│   ├── _layout.tsx       ← donor tab layout
│   ├── feed.tsx          ← blood requests feed
│   ├── apply/[id].tsx    ← apply to a specific request
│   ├── applications.tsx  ← view my applications
│   ├── appointment/[id].tsx ← appointment details
│   ├── history.tsx       ← donation history
│   └── profile.tsx       ← donor profile + eligibility
├── (hospital)/           ← hospital-role screens protected by auth + role check
│   ├── _layout.tsx       ← hospital tab layout
│   ├── requests.tsx      ← my blood requests list
│   ├── create-request.tsx ← create a new blood request
│   ├── applications/[requestId].tsx ← review applications for a request
│   ├── schedule/[applicationId].tsx ← schedule appointment
│   ├── inventory.tsx     ← blood inventory management
│   └── profile.tsx       ← hospital profile
├── _layout.tsx           ← root layout: auth state → redirect to role
└── index.tsx             ← splash / redirect screen

context/                  ← all AI context files live here
lib/
├── supabase.ts           ← Supabase client singleton
├── eligibility.ts        ← eligibility computation logic
├── blood-compat.ts       ← blood group compatibility matrix
├── notifications.ts      ← push token registration, notification helpers
└── location.ts           ← location permission + coordinate fetch
stores/
├── auth.store.ts         ← user session, role, profile loaded state
├── donor.store.ts        ← donor profile, eligibility status, applications
├── hospital.store.ts     ← hospital profile, requests, inventory
└── notification.store.ts ← unread count, notification list
types/
└── index.ts              ← all shared TypeScript types and enums
supabase/
├── migrations/           ← SQL migration files (never edit after applied)
└── functions/            ← Edge Function source files
```

---

## Database Schema

### `profiles`
Extends Supabase `auth.users`. Created via trigger on user sign-up.
```sql
CREATE TABLE profiles (
  id        UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role      TEXT NOT NULL CHECK (role IN ('donor', 'hospital')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `donors`
```sql
CREATE TABLE donors (
  id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name           TEXT NOT NULL,
  blood_group         TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  age                 INTEGER NOT NULL CHECK (age >= 0),
  gender              TEXT NOT NULL CHECK (gender IN ('male','female','other')),
  weight              NUMERIC NOT NULL CHECK (weight >= 0),
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  latitude            NUMERIC,
  longitude           NUMERIC,
  last_donation_date  DATE,
  health_declaration  BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url          TEXT,
  is_eligible         BOOLEAN GENERATED ALWAYS AS (
                        age >= 21
                        AND weight >= 100
                        AND health_declaration = TRUE
                        AND (
                          last_donation_date IS NULL
                          OR (CURRENT_DATE - last_donation_date) >= 30
                        )
                      ) STORED,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### `hospitals`
```sql
CREATE TABLE hospitals (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('hospital','blood_bank')),
  phone       TEXT,
  email       TEXT,
  address     TEXT NOT NULL,
  latitude    NUMERIC,
  longitude   NUMERIC,
  logo_url    TEXT,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `blood_requests`
```sql
CREATE TABLE blood_requests (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id      UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  blood_group      TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  quantity_needed  INTEGER NOT NULL CHECK (quantity_needed > 0),
  urgency_level    TEXT NOT NULL DEFAULT 'normal' CHECK (urgency_level IN ('normal','urgent','emergency')),
  contact_info     TEXT,
  hospital_address TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','fulfilled','cancelled')),
  is_emergency     BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### `donor_applications`
```sql
CREATE TABLE donor_applications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id    UUID REFERENCES donors(id) ON DELETE CASCADE NOT NULL,
  request_id  UUID REFERENCES blood_requests(id) ON DELETE CASCADE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (donor_id, request_id)
);
```

### `appointments`
```sql
CREATE TABLE appointments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id  UUID REFERENCES donor_applications(id) ON DELETE CASCADE NOT NULL,
  donor_id        UUID REFERENCES donors(id) NOT NULL,
  hospital_id     UUID REFERENCES hospitals(id) NOT NULL,
  scheduled_date  TIMESTAMPTZ NOT NULL,
  location        TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `donation_history`
```sql
CREATE TABLE donation_history (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id         UUID REFERENCES donors(id) NOT NULL,
  hospital_id      UUID REFERENCES hospitals(id) NOT NULL,
  appointment_id   UUID REFERENCES appointments(id),
  blood_group      TEXT NOT NULL,
  units_donated    INTEGER NOT NULL DEFAULT 1,
  donation_date    DATE NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### `blood_inventory`
```sql
CREATE TABLE blood_inventory (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id      UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  blood_group      TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  units_available  INTEGER NOT NULL DEFAULT 0 CHECK (units_available >= 0),
  last_updated     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hospital_id, blood_group)
);
```

### `notifications`
```sql
CREATE TABLE notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN (
                'new_request','application_status','appointment','emergency','donation_confirmed'
              )),
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  data        JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `expo_push_tokens`
```sql
CREATE TABLE expo_push_tokens (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);
```

---

## Blood Group Compatibility Matrix

A donor's blood can be given to the following recipients:

| Donor Blood Group | Can Donate To                  |
|-------------------|-------------------------------|
| O-                | O-, O+, A-, A+, B-, B+, AB-, AB+ (universal donor) |
| O+                | O+, A+, B+, AB+               |
| A-                | A-, A+, AB-, AB+              |
| A+                | A+, AB+                       |
| B-                | B-, B+, AB-, AB+              |
| B+                | B+, AB+                       |
| AB-               | AB-, AB+                      |
| AB+               | AB+                           |

When a donor views the requests feed, only requests with a `blood_group` the donor is compatible with are shown. This lookup lives in `lib/blood-compat.ts`.

---

## Storage Model

| Data                        | Location                          |
|-----------------------------|-----------------------------------|
| All structured app data     | Supabase PostgreSQL               |
| Donor profile photos        | Supabase Storage (`avatars/`)     |
| Hospital logos              | Supabase Storage (`logos/`)       |
| Client UI state             | Zustand stores (in-memory)        |
| Push device tokens          | `expo_push_tokens` table          |
| Session tokens              | Supabase Auth (device storage via SecureStore) |

---

## Auth and Access Model

- Authentication: Supabase Auth, email/password only
- On sign-up, user selects role (donor or hospital). A database trigger inserts into `profiles` with the selected role.
- On sign-up as donor, a row is inserted into `donors` with the user's `id`; same for hospitals into `hospitals`.
- Expo Router's root `_layout.tsx` reads the session and role, then redirects:
  - No session → `/(auth)/login`
  - Session + role `donor` → `/(donor)/feed`
  - Session + role `hospital` → `/(hospital)/requests`
- Row Level Security (RLS) is enabled on all tables.
- Donors can only read/write their own rows in `donors`, `donor_applications`, `appointments` (as donor), `donation_history`, `notifications`.
- Hospitals can read/write their own rows in `hospitals`, `blood_requests`, `appointments` (as hospital), `blood_inventory`, `notifications`.
- Hospitals can read `donors` profiles for applications they have received (via join on `donor_applications`).
- No row is readable without a valid session.

---

## Edge Functions

| Function Name              | Trigger                        | Responsibility                                                  |
|----------------------------|--------------------------------|-----------------------------------------------------------------|
| `compute-eligibility`      | Called after donor profile save | Recomputes and returns eligibility (backed by generated column) |
| `dispatch-notifications`   | Called after key DB events      | Sends Expo push notifications to relevant device tokens         |
| `match-donors`             | Called by hospital review page  | Returns compatible eligible donors for a given blood request    |

---

## Invariants — Rules the Codebase Must Never Violate

1. **Eligibility is never manually set.** `is_eligible` is a PostgreSQL generated column computed from `age`, `weight`, `health_declaration`, and `last_donation_date`. The app reads it, never writes it.
2. **Role is set once at sign-up and never changes.** No screen or function may update the `role` column in `profiles`.
3. **A donor may apply to the same request only once.** The `UNIQUE(donor_id, request_id)` constraint in `donor_applications` enforces this. The UI must check for existing applications before showing an Apply button.
4. **Appointment creation requires an approved application.** No appointment row may be created unless `donor_applications.status = 'approved'`.
5. **Donation confirmation requires a scheduled appointment.** The hospital may only call "confirm donation" on an appointment with `status = 'scheduled'`.
6. **Blood inventory is never decremented below zero.** All inventory update operations must include a `CHECK (units_available >= 0)` guard.
7. **Push notifications are dispatched from Edge Functions only.** No client-side code calls Expo Push API directly.
8. **RLS is always enabled.** No table may have RLS disabled in any migration. All client queries are subject to RLS policies.
9. **Navigation is role-gated.** The `/(donor)` route group must never be accessible to a hospital user, and vice versa. The root `_layout.tsx` enforces this redirect; individual screens do not need to recheck.
10. **Blood compatibility matching uses only `lib/blood-compat.ts`.** No screen or function hardcodes blood group compatibility logic inline.
