# Code Standards — Blood Donation App

## Language and Type Safety

- All files are TypeScript with `strict: true` in `tsconfig.json`
- No `any` types — use `unknown` and narrow explicitly, or define proper types in `types/index.ts`
- All Supabase query results must be typed against the generated database types
- All Zod schemas must match their corresponding TypeScript type exactly (use `z.infer<>`)

---

## File and Folder Naming

- Screen files: `kebab-case.tsx` (e.g., `create-request.tsx`, `donation-history.tsx`)
- Component files: `PascalCase.tsx` (e.g., `RequestCard.tsx`, `EligibilityBadge.tsx`)
- Utility/lib files: `kebab-case.ts` (e.g., `blood-compat.ts`, `eligibility.ts`)
- Store files: `noun.store.ts` (e.g., `auth.store.ts`, `donor.store.ts`)
- All component folders live in `components/` — never co-locate components inside `app/`
- Shared types all go in `types/index.ts` — no inline type declarations in screen files

---

## TypeScript Types

All shared types are declared in `types/index.ts`. Key types:

```typescript
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UserRole = 'donor' | 'hospital';

export type UrgencyLevel = 'normal' | 'urgent' | 'emergency';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type NotificationType =
  | 'new_request'
  | 'application_status'
  | 'appointment'
  | 'emergency'
  | 'donation_confirmed';

export interface DonorProfile {
  id: string;
  full_name: string;
  blood_group: BloodGroup;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  last_donation_date: string | null;
  health_declaration: boolean;
  avatar_url: string | null;
  is_eligible: boolean;
  created_at: string;
  updated_at: string;
}

export interface HospitalProfile {
  id: string;
  name: string;
  type: 'hospital' | 'blood_bank';
  phone: string | null;
  email: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface BloodRequest {
  id: string;
  hospital_id: string;
  blood_group: BloodGroup;
  quantity_needed: number;
  urgency_level: UrgencyLevel;
  contact_info: string | null;
  hospital_address: string | null;
  notes: string | null;
  status: 'active' | 'fulfilled' | 'cancelled';
  is_emergency: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  hospital?: HospitalProfile;
}

export interface DonorApplication {
  id: string;
  donor_id: string;
  request_id: string;
  status: ApplicationStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  donor?: DonorProfile;
  request?: BloodRequest;
}

export interface Appointment {
  id: string;
  application_id: string;
  donor_id: string;
  hospital_id: string;
  scheduled_date: string;
  location: string | null;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface DonationRecord {
  id: string;
  donor_id: string;
  hospital_id: string;
  appointment_id: string | null;
  blood_group: BloodGroup;
  units_donated: number;
  donation_date: string;
  notes: string | null;
  created_at: string;
  hospital?: HospitalProfile;
}

export interface BloodInventoryItem {
  id: string;
  hospital_id: string;
  blood_group: BloodGroup;
  units_available: number;
  last_updated: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}
```

---

## Component Pattern

Every component follows this structure:

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { ComponentProps } from '@/types'; // if shared props exist

interface RequestCardProps {
  request: BloodRequest;
  onPress: (id: string) => void;
}

export function RequestCard({ request, onPress }: RequestCardProps) {
  return (
    <View className="...">
      {/* content */}
    </View>
  );
}
```

Rules:
- Named exports only — no default exports for components
- Props interface always defined immediately above the component in the same file
- No business logic in components — call store actions or util functions
- No direct Supabase calls inside components — use store actions or hooks

---

## Zustand Store Pattern

```typescript
import { create } from 'zustand';
import { DonorProfile } from '@/types';

interface DonorStore {
  profile: DonorProfile | null;
  isLoading: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<DonorProfile>) => Promise<void>;
}

export const useDonorStore = create<DonorStore>((set) => ({
  profile: null,
  isLoading: false,

  fetchProfile: async () => {
    set({ isLoading: true });
    // supabase call here
    set({ profile: data, isLoading: false });
  },

  updateProfile: async (data) => {
    // supabase upsert here
    set((state) => ({ profile: { ...state.profile!, ...data } }));
  },
}));
```

Rules:
- One store per domain (auth, donor, hospital, notification)
- Stores handle all Supabase calls — screens call store actions only
- Errors are caught inside store actions and set to a local `error` state field
- No store reads another store directly — pass data via function arguments if needed

---

## Supabase Query Pattern

```typescript
// Always destructure { data, error }
const { data, error } = await supabase
  .from('blood_requests')
  .select('*, hospital:hospitals(*)')
  .eq('status', 'active')
  .order('created_at', { ascending: false });

if (error) throw new Error(error.message);
return data;
```

Rules:
- Always handle `error` before using `data`
- Always type the return: `.select<'*', BloodRequest[]>('*')`
- Never use `.single()` without wrapping in a null check
- Realtime subscriptions are set up in stores, unsubscribed on cleanup

---

## Form Validation Pattern (React Hook Form + Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  blood_group: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']),
  quantity_needed: z.number().min(1),
});

type FormData = z.infer<typeof schema>;

const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

---

## NativeWind Styling Rules

- Use utility classes only — no `StyleSheet.create()` anywhere in the codebase
- Use design tokens defined in `ui-context.md` via the Tailwind config (e.g., `text-primary`, `bg-surface`)
- Emergency badges always use `bg-emergency` and `text-white`
- Eligibility badge: green (`bg-success`) for eligible, red (`bg-error`) for not eligible
- All tap targets must be at least 44px tall (`min-h-[44px]`)
- All screens have horizontal padding of `px-4`

---

## Navigation Rules

- `router.push()` for forward navigation
- `router.replace()` for redirects after auth actions (login, logout)
- `router.back()` for back navigation — never hardcode a route to go "back"
- All protected routes live inside `(donor)/` or `(hospital)/` route groups
- Route params are typed via Expo Router's typed routes feature

---

## Error Handling

- All async store actions are wrapped in try/catch
- User-visible errors are shown via a `<Toast />` or `<ErrorBanner />` component — never via `console.error` only
- Network errors and Supabase errors are surfaced with a human-readable message, not raw error objects
- Empty states are always handled — never leave a screen blank on no data

---

## Import Alias

Use `@/` for all non-relative imports. Configured in `tsconfig.json`:
```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

Example: `import { useDonorStore } from '@/stores/donor.store'`

---

## Prohibited Patterns

- No `console.log` in committed code
- No hardcoded Supabase URLs or keys in source files — use `@env` variables via `expo-constants`
- No inline styles (`style={{ color: 'red' }}`) — use NativeWind classes
- No blood group compatibility logic outside of `lib/blood-compat.ts`
- No eligibility logic outside of the PostgreSQL generated column and `lib/eligibility.ts` (for display only)
- No direct calls to Expo Push API from client code — use Edge Functions
