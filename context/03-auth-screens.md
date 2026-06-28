BEFORE YOU WRITE A SINGLE LINE OF CODE, read the following files in this exact order:

CLAUDE.md
context/project-overview.md
context/architecture.md
context/ui-context.md
context/code-standards.md
context/ai-workflow-rules.md
context/progress-tracker.md

──────────────────────────────────────────────────────────
## Unit 03 — Authentication Screens
### Objective
Implement the complete authentication flow for BloodLink. This includes user registration with role selection, login, and password reset. After this unit, a user can create an account as either a donor or a hospital, log in, and be redirected to the correct section of the app. The auth store must be fully wired to Supabase Auth.

### Scope
This unit must deliver:

- A fully functional Register screen with role selection (Donor or Hospital)
- A fully functional Login screen
- A Forgot Password screen that triggers a Supabase password reset email
- A fully wired auth.store.ts with all auth actions
- Correct role-based redirect after login and registration
- Form validation on all inputs
- Proper error handling and user feedback on all screens


## Engineering Principles

- All forms use React Hook Form with Zod validation — no uncontrolled inputs
- All Supabase Auth calls live in stores/auth.store.ts — never called directly from a screen
- Registration must pass { data: { role } } in the options object of supabase.auth.signUp() so the database trigger correctly inserts the role into the profiles table
- Role is read from the profiles table after sign-in and stored in the auth store — the root layout uses it to redirect
- Screens use only NativeWind utility classes — no inline styles or StyleSheet.create()
- All screens handle loading, error, and success states explicitly
- Navigation after auth actions uses router.replace() — never router.push()


## Screens to Build
### Register Screen — app/(auth)/register.tsx
Two-step flow:

Step 1: Role selection — two clearly distinct tappable cards: "I want to donate blood" (Donor) and "I am a Hospital / Blood Bank" (Hospital). User taps one to proceed to step 2.
Step 2: Email and password fields. Password confirmation field. Submit button.

## On successful registration:

Donor → redirect to /(donor)/feed
Hospital → redirect to /(hospital)/requests

## Login Screen — app/(auth)/login.tsx

Email and password fields
Login button
Link to Register screen
Link to Forgot Password screen

## On successful login:

Donor → redirect to /(donor)/feed
Hospital → redirect to /(hospital)/requests

## Forgot Password Screen — app/(auth)/forgot-password.tsx

Email field
Submit button that calls supabase.auth.resetPasswordForEmail()
Success message shown after submission
Link back to Login screen


## Auth Store — stores/auth.store.ts
Complete the auth store with these actions:

signUp(email, password, role) — registers user, passes role in metadata
signIn(email, password) — logs in, fetches role from profiles table, sets session and role in store
signOut() — clears session and role, redirects to login
resetPassword(email) — sends reset email via Supabase
fetchRole(userId) — fetches role from profiles table and sets it in store


## Acceptance Criteria

- A new user can register as a Donor and is redirected to the donor feed
- A new user can register as a Hospital and is redirected to hospital requests
- A registered user can log in and land on the correct screen based on their role
- A user can request a password reset email successfully
- Submitting empty or invalid fields shows clear validation error messages
- A wrong password or unregistered email shows a readable error message, not a raw Supabase error
- The auth store holds the correct session and role after login
- Logging out clears the session and redirects to the login screen
- npx tsc --noEmit passes with zero errors
- No inline styles anywhere on any of the three screens