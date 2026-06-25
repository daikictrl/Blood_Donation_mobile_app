# UI Context — Blood Donation App

## Design Philosophy

Clean medical aesthetic. The app must feel trustworthy, urgent when needed, and easy to scan quickly — donors and hospitals are often making time-sensitive decisions. White surfaces, strong crimson red for actions and alerts, clear typography hierarchy, and generous spacing. Emergency states use a distinct bright red that demands attention without being alarming.

---

## Color Tokens

These tokens are configured in `tailwind.config.js` and used as NativeWind classes throughout the app.

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#C62828',       // Crimson — primary actions, buttons, key accents
        'primary-light': '#EF5350', // Lighter red — hover states, secondary accents
        'primary-dark': '#8E0000',  // Darker red — pressed states

        emergency: '#FF1744',     // Bright red — emergency request badges and alerts

        background: '#F5F5F5',    // Off-white — screen background
        surface: '#FFFFFF',       // Pure white — cards, modals, inputs
        'surface-alt': '#FAFAFA', // Slightly off — alternate card background

        'text-primary': '#1A1A1A',   // Near-black — headings, body text
        'text-secondary': '#616161', // Medium grey — labels, metadata, secondary info
        'text-disabled': '#BDBDBD',  // Light grey — placeholder, disabled

        border: '#E0E0E0',        // Light grey — card borders, input borders
        divider: '#EEEEEE',       // Hairline dividers

        success: '#2E7D32',       // Dark green — eligible status, confirmed
        'success-bg': '#E8F5E9',  // Light green — success background badges

        warning: '#E65100',       // Deep orange — urgent level badges
        'warning-bg': '#FFF3E0',  // Light orange — warning background badges

        error: '#C62828',         // Same as primary — errors, not eligible status
        'error-bg': '#FFEBEE',    // Light red — error backgrounds

        info: '#1565C0',          // Deep blue — informational text
        'info-bg': '#E3F2FD',     // Light blue — info backgrounds
      },
    },
  },
};
```

### Color Usage Rules
- `bg-primary` + `text-white` — primary CTA buttons only
- `bg-emergency` + `text-white` — emergency badge and alert banner only
- `bg-success-bg` + `text-success` — "Eligible" status badge
- `bg-error-bg` + `text-error` — "Not Eligible" status badge
- `bg-warning-bg` + `text-warning` — "Urgent" level badge
- `bg-info-bg` + `text-info` — "Normal" level badge
- `bg-surface` — all cards and form inputs
- `bg-background` — all screen backgrounds

---

## Typography

Font family: **Inter** (via `expo-font` + `@expo-google-fonts/inter`)

| Token         | Size | Weight   | Usage                                      |
|---------------|------|----------|--------------------------------------------|
| `text-3xl`    | 30px | Bold     | Screen hero headings (rare)                |
| `text-2xl`    | 24px | Bold     | Screen titles, section headers             |
| `text-xl`     | 20px | SemiBold | Card titles, modal headings                |
| `text-lg`     | 18px | SemiBold | List item primary labels                   |
| `text-base`   | 16px | Regular  | Body text, descriptions, form values       |
| `text-sm`     | 14px | Regular  | Secondary info, metadata, labels           |
| `text-xs`     | 12px | Regular  | Timestamps, captions, small badges         |

NativeWind font-weight classes map to Inter weights. Always pair a size with an explicit weight class (e.g., `text-xl font-semibold`).

---

## Spacing Scale

Use Tailwind's default spacing scale. Key conventions:

| Usage                                | Class            |
|--------------------------------------|------------------|
| Screen horizontal padding            | `px-4` (16px)    |
| Screen vertical padding top          | `pt-6` (24px)    |
| Card internal padding                | `p-4` (16px)     |
| Section gap between cards            | `gap-3` (12px)   |
| Stack gap inside a card              | `gap-2` (8px)    |
| Input vertical padding               | `py-3` (12px)    |
| Input horizontal padding             | `px-4` (16px)    |
| Button height                        | `min-h-[48px]`   |
| Tab bar height                       | 60px (configured in tab layout) |

---

## Border Radius

| Usage              | Class          | Value  |
|--------------------|----------------|--------|
| Cards              | `rounded-2xl`  | 16px   |
| Buttons            | `rounded-xl`   | 12px   |
| Inputs             | `rounded-xl`   | 12px   |
| Badges / Pills     | `rounded-full` | 9999px |
| Avatars / Logos    | `rounded-full` | 9999px |
| Modal bottom sheet | `rounded-t-3xl`| 24px top corners |

---

## Shadows

Cards use a soft shadow:
```
shadow-sm (iOS) + elevation-2 (Android)
```
NativeWind class: `shadow shadow-black/5`

Emergency alert cards use a stronger shadow:
```
shadow-md shadow-red-200
```

---

## Component Patterns

### Screen Layout
Every screen follows this shell:
```tsx
<SafeAreaView className="flex-1 bg-background">
  <ScrollView
    className="flex-1"
    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
    showsVerticalScrollIndicator={false}
  >
    {/* screen header */}
    {/* content */}
  </ScrollView>
</SafeAreaView>
```

### Screen Header
```tsx
<View className="mb-6">
  <Text className="text-2xl font-bold text-text-primary">Feed</Text>
  <Text className="text-sm text-text-secondary mt-1">Compatible blood requests near you</Text>
</View>
```

### Card
```tsx
<Pressable
  className="bg-surface rounded-2xl p-4 shadow shadow-black/5 border border-border"
  onPress={...}
>
  {/* card content */}
</Pressable>
```

### Primary Button
```tsx
<Pressable
  className="bg-primary rounded-xl min-h-[48px] items-center justify-center px-6"
  onPress={...}
>
  <Text className="text-white font-semibold text-base">Apply to Donate</Text>
</Pressable>
```

### Outline Button
```tsx
<Pressable
  className="border border-primary rounded-xl min-h-[48px] items-center justify-center px-6"
  onPress={...}
>
  <Text className="text-primary font-semibold text-base">View Details</Text>
</Pressable>
```

### Text Input
```tsx
<View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center">
  <TextInput
    className="flex-1 text-base text-text-primary"
    placeholder="Full name"
    placeholderTextColor="#BDBDBD"
  />
</View>
```

### Badge — Urgency Level
```tsx
// Normal
<View className="bg-info-bg px-3 py-1 rounded-full">
  <Text className="text-xs font-semibold text-info">Normal</Text>
</View>

// Urgent
<View className="bg-warning-bg px-3 py-1 rounded-full">
  <Text className="text-xs font-semibold text-warning">Urgent</Text>
</View>

// Emergency
<View className="bg-emergency px-3 py-1 rounded-full">
  <Text className="text-xs font-semibold text-white">Emergency</Text>
</View>
```

### Badge — Application Status
```tsx
// Pending
<View className="bg-warning-bg px-3 py-1 rounded-full">
  <Text className="text-xs font-semibold text-warning">Pending</Text>
</View>

// Approved
<View className="bg-success-bg px-3 py-1 rounded-full">
  <Text className="text-xs font-semibold text-success">Approved</Text>
</View>

// Rejected
<View className="bg-error-bg px-3 py-1 rounded-full">
  <Text className="text-xs font-semibold text-error">Rejected</Text>
</View>
```

### Badge — Eligibility Status
```tsx
// Eligible
<View className="bg-success-bg px-3 py-1 rounded-full">
  <Text className="text-xs font-semibold text-success">Eligible</Text>
</View>

// Not Eligible
<View className="bg-error-bg px-3 py-1 rounded-full">
  <Text className="text-xs font-semibold text-error">Not Eligible</Text>
</View>
```

### Blood Group Chip
```tsx
<View className="bg-primary px-3 py-1 rounded-full">
  <Text className="text-sm font-bold text-white">A+</Text>
</View>
```

### Empty State
```tsx
<View className="flex-1 items-center justify-center py-20">
  {/* icon or illustration */}
  <Text className="text-lg font-semibold text-text-primary mt-4">No requests found</Text>
  <Text className="text-sm text-text-secondary text-center mt-2 px-8">
    There are no compatible blood requests right now. Check back later.
  </Text>
</View>
```

### Loading State
```tsx
<View className="flex-1 items-center justify-center">
  <ActivityIndicator size="large" color="#C62828" />
</View>
```

---

## Tab Bar — Donor
Four tabs: Feed, Applications, History, Profile
- Active icon: `text-primary`
- Inactive icon: `text-text-secondary`
- Background: `bg-surface` with top border `border-border`

## Tab Bar — Hospital
Four tabs: Requests, Applications, Inventory, Profile
- Same styling as Donor tab bar

---

## Icons

Use `@expo/vector-icons` — specifically `Feather` icon set.

| Action / Element          | Icon Name            |
|---------------------------|----------------------|
| Blood request / donate    | `droplet`            |
| Emergency alert           | `alert-triangle`     |
| Application / apply       | `file-text`          |
| Appointment / calendar    | `calendar`           |
| Donation history          | `clock`              |
| Inventory / blood bank    | `package`            |
| Profile / user            | `user`               |
| Settings / edit           | `edit-2`             |
| Approve / check           | `check-circle`       |
| Reject / close            | `x-circle`           |
| Location / map pin        | `map-pin`            |
| Notifications             | `bell`               |
| Back / chevron            | `chevron-left`       |
| Phone                     | `phone`              |
| Blood group               | `activity`           |

---

## Illustrations and Imagery

- Donor and hospital profile photos: circular, `rounded-full`, 80px diameter on profile screen
- Hospital logos: circular, `rounded-full`, 48px diameter on cards
- Empty state illustrations: use simple Feather icon compositions — no third-party image assets in V1
- No stock photography

---

## Layout Rules

- All screens are single-column scrollable — no complex grid layouts in V1
- Cards in a list use `gap-3` between them
- Form fields stack vertically with `gap-4` between groups
- Section labels above groups of fields: `text-sm font-semibold text-text-secondary mb-2`
- Never center-align body text — left-align everything except empty state description text
