# Unit 01 — Project Scaffold & Navigation Shell

## Goal

Initialize the Blood Donation app with Expo SDK 54, Expo Router v4, NativeWind v5, and Supabase. Create the full navigation shell with `(auth)`, `(donor)`, and `(hospital)` route groups. Wire the root layout to read the Supabase session and redirect to the correct group. All screens are placeholders at this stage — no real content yet.

---

## Implementation

### Step 1 — Initialize the Expo Project

```bash
npx create-expo-app@latest blood-donation-app --template blank-typescript
cd blood-donation-app
```

---

### Step 2 — Install All Dependencies

Run these installs in order:

```bash
# Expo Router v4
npx expo install expo-router expo-linking expo-constants expo-status-bar

# NativeWind v5 + Tailwind CSS
npm install nativewind@^5.0.0-beta tailwindcss

# NativeWind peer dependencies
npx expo install react-native-reanimated react-native-safe-area-context react-native-screens react-native-gesture-handler

# Supabase
npm install @supabase/supabase-js
npx expo install expo-secure-store

# State + Forms + Validation
npm install zustand react-hook-form @hookform/resolvers zod

# Date utility
npm install date-fns

# Icons
npm install @expo/vector-icons

# Fonts
npx expo install expo-font @expo-google-fonts/inter
```

---

### Step 3 — Configure `package.json` Entry Point

In `package.json`, add the `main` field:

```json
{
  "main": "expo-router/entry"
}
```

---

### Step 4 — Configure `app.json`

```json
{
  "expo": {
    "name": "BloodLink",
    "slug": "blood-donation-app",
    "version": "1.0.0",
    "scheme": "bloodlink",
    "platforms": ["ios", "android"],
    "plugins": [
      "expo-router",
      "expo-font",
      [
        "expo-secure-store",
        {
          "configureAndroidBackup": true
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

### Step 5 — Configure NativeWind v5

**Create `global.css` in the project root:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Create `tailwind.config.js` in the project root:**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#C62828',
        'primary-light': '#EF5350',
        'primary-dark': '#8E0000',
        emergency: '#FF1744',
        background: '#F5F5F5',
        surface: '#FFFFFF',
        'surface-alt': '#FAFAFA',
        'text-primary': '#1A1A1A',
        'text-secondary': '#616161',
        'text-disabled': '#BDBDBD',
        border: '#E0E0E0',
        divider: '#EEEEEE',
        success: '#2E7D32',
        'success-bg': '#E8F5E9',
        warning: '#E65100',
        'warning-bg': '#FFF3E0',
        error: '#C62828',
        'error-bg': '#FFEBEE',
        info: '#1565C0',
        'info-bg': '#E3F2FD',
      },
    },
  },
  plugins: [],
};
```

**Create `metro.config.js` in the project root:**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

**Update `babel.config.js`:**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

---

### Step 6 — Create `lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Create `.env` in the project root (never commit this file):**

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Add `.env` to `.gitignore`.**

---

### Step 7 — Create `types/index.ts`

```ts
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
```

Remaining types (DonorProfile, HospitalProfile, etc.) will be added in Unit 02 after the schema is confirmed.

---

### Step 8 — Create `stores/auth.store.ts`

Only the session state — no sign-in logic yet (that comes in Unit 03):

```ts
import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { UserRole } from '@/types';

interface AuthStore {
  session: Session | null;
  role: UserRole | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (val: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  role: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

---

### Step 9 — Create Root Layout `app/_layout.tsx`

```tsx
import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import '../global.css';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

function RootLayoutNav() {
  const { session, role, isLoading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && role === 'donor' && inAuthGroup) {
      router.replace('/(donor)/feed');
    } else if (session && role === 'hospital' && inAuthGroup) {
      router.replace('/(hospital)/requests');
    }
  }, [session, role, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(donor)" />
      <Stack.Screen name="(hospital)" />
    </Stack>
  );
}

export default function RootLayout() {
  const { setSession, setRole, setLoading } = useAuthStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);

      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setRole(data?.role ?? null);
      }

      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);

        if (session) {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          setRole(data?.role ?? null);
        } else {
          setRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!fontsLoaded) return <View className="flex-1 bg-background" />;

  return (
    <>
      <StatusBar style="dark" />
      <RootLayoutNav />
    </>
  );
}
```

---

### Step 10 — Create Route Group Layouts and Placeholder Screens

**`app/(auth)/_layout.tsx`**
```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**`app/(auth)/login.tsx`** (placeholder)
```tsx
import { View, Text } from 'react-native';

export default function LoginScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-2xl font-bold text-text-primary">Login Screen</Text>
      <Text className="text-sm text-text-secondary mt-2">Unit 03</Text>
    </View>
  );
}
```

**`app/(donor)/_layout.tsx`**
```tsx
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function DonorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C62828',
        tabBarInactiveTintColor: '#616161',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E0E0',
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Feather name="droplet" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applications',
          tabBarIcon: ({ color }) => <Feather name="file-text" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Feather name="clock" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**`app/(donor)/feed.tsx`** (placeholder)
```tsx
import { View, Text } from 'react-native';

export default function DonorFeed() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-2xl font-bold text-text-primary">Donor Feed</Text>
      <Text className="text-sm text-text-secondary mt-2">Unit 06</Text>
    </View>
  );
}
```

Create identical placeholder screens for:
- `app/(donor)/applications.tsx` → "Donor Applications — Unit 08"
- `app/(donor)/history.tsx` → "Donation History — Unit 12"
- `app/(donor)/profile.tsx` → "Donor Profile — Unit 04"

**`app/(hospital)/_layout.tsx`**
```tsx
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function HospitalLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C62828',
        tabBarInactiveTintColor: '#616161',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E0E0',
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <Feather name="droplet" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Applications',
          tabBarIcon: ({ color }) => <Feather name="file-text" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color }) => <Feather name="package" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

Create identical placeholder screens for:
- `app/(hospital)/requests.tsx` → "Hospital Requests — Unit 09"
- `app/(hospital)/applications.tsx` → "Review Applications — Unit 10"
- `app/(hospital)/inventory.tsx` → "Blood Inventory — Unit 13"
- `app/(hospital)/profile.tsx` → "Hospital Profile — Unit 05"

---

### Step 11 — Final Folder Structure Check

Your project root must look exactly like this before moving on:

```
blood-donation-app/
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (donor)/
│   │   ├── _layout.tsx
│   │   ├── feed.tsx
│   │   ├── applications.tsx
│   │   ├── history.tsx
│   │   └── profile.tsx
│   └── (hospital)/
│       ├── _layout.tsx
│       ├── requests.tsx
│       ├── applications.tsx
│       ├── inventory.tsx
│       └── profile.tsx
├── components/            ← empty for now
├── context/               ← your AI context files
├── lib/
│   └── supabase.ts
├── stores/
│   └── auth.store.ts
├── types/
│   └── index.ts
├── global.css
├── tailwind.config.js
├── metro.config.js
├── babel.config.js
├── app.json
├── .env
└── tsconfig.json
```

---

## Dependencies Installed This Unit

- expo-router
- expo-linking
- expo-constants
- expo-status-bar
- nativewind@^5.0.0-beta
- tailwindcss
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens
- react-native-gesture-handler
- @supabase/supabase-js
- expo-secure-store
- zustand
- react-hook-form
- @hookform/resolvers
- zod
- date-fns
- @expo/vector-icons
- expo-font
- @expo-google-fonts/inter

---

## Verify When Done

- [ ] `npx expo start` runs without errors or warnings
- [ ] With no session, app redirects to `/(auth)/login` and shows the Login placeholder screen
- [ ] Manually setting a session routes to `/(donor)/feed` with the donor tab bar visible
- [ ] Manually setting a session routes to `/(hospital)/requests` with the hospital tab bar visible
- [ ] All 4 donor tabs navigate between placeholder screens
- [ ] All 4 hospital tabs navigate between placeholder screens
- [ ] A test element with `className="bg-primary"` renders in crimson (#C62828)
- [ ] A test element with `className="text-text-secondary"` renders in grey (#616161)
- [ ] Inter font renders correctly on a test `<Text>` element
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `.env` is in `.gitignore` and not committed
