# F1 – Signup: email confirmation must be required

Source: GitHub issue jjerner/FitTracker#8; `beta_test_feedback_2026-10-17.md` line 7 (reported 2026-10-10).

## Goal

Nobody can log in before confirming their email. If an unconfirmed user tries to log in, the app sends a new code and opens the existing "Check your email" code screen, instead of showing a bare error.

## What is likely going on (check first)

The code already assumes confirmation is on (`signup.tsx` only goes to home if `signUp` returns a session). Two possible causes of the report:

1. **"Confirm email" is off in Supabase.** Then `signUp` returns a session right away and the user goes straight to home. Fix: dashboard setting only.
2. **The setting was on, and the user clicked the old link (before 1.10).** Clicking the link confirms the email even if the page it opens is the dead localhost page. Then the user could log in, and it looked like confirmation was skipped. Nothing left to fix for that: 1.10 replaced the link with a code.

The user's check below tells us which one it was. Either way, the login change below is still useful: today an unconfirmed user who leaves the code screen only sees "Email not confirmed" and has no way to enter a code.

## Files to touch

- `src/app/(auth)/login.tsx`: in `handleLogin`, if `signInError.code === 'email_not_confirmed'`, call `supabase.auth.resend({ type: 'signup', email })` and then `router.push({ pathname: '/(auth)/signup', params: { email: email.trim() } })`. Any other error is shown as today.
- `src/app/(auth)/signup.tsx`: read `email` with `useLocalSearchParams<{ email?: string }>()`. If it is set, start with `email` = that value and `confirmationSent = true`, so the code screen opens directly. Nothing else changes.

## Reuse

- The code screen in `signup.tsx` (Verify, "Send again", "Back to log in") – used as is, no new screen.
- `supabase.auth.resend({ type: 'signup' })` – the same call `handleResend` already makes.

## Acceptance criteria

- [ ] With "Confirm email" on: Sign Up with a new email shows the code screen, not home.
- [ ] Logging in with that email and the right password before entering the code does **not** reach home. It opens the code screen with the email filled in, and a new code arrives.
- [ ] Entering the code there signs the user in and goes to home.
- [ ] Wrong password for an unconfirmed email shows the normal "Invalid login credentials" error (Supabase checks the password first).
- [ ] Normal login for a confirmed user works as before.
- [ ] Opening Sign Up from the login link (no email param) still shows the empty signup form.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

Unit: none (one `if` on a Supabase error code, no new logic worth a test).

On web: needs a fresh email address the agent can read (a `+tag` alias of the test account's mailbox, if it supports that; see open question 2). Sign up with it, tap "Back to log in", log in → expect the code screen and a new email. Enter the code → home. Log out and log in again → home directly. Also log in once with the normal test account to confirm nothing changed. Check the console for errors.

Phone: one fresh signup + login-before-confirming on the APK (after `eas update`), added to the phone test list in HANDOVER.md.

## Needs from the user

1. **Check the dashboard setting:** Supabase → Authentication → Sign In / Providers → Email → **"Confirm email"** must be **on**. Turn it on if it is off. Tell us which it was (decides cause 1 or 2 above).
2. **Optional check in the SQL editor** (read-only) to see if any account is unconfirmed or was auto-confirmed:
   ```sql
   select email, created_at, email_confirmed_at
   from auth.users
   order by created_at desc;
   ```
   `email_confirmed_at` empty = never confirmed. Same as `created_at` (within a second) = auto-confirmed because the setting was off.
3. Ship: JS only, `eas update`. No SQL migration, no new APK.

## Open questions

1. If the setting was off: what about accounts that were auto-confirmed while it was off? Leave them (they work today), or something else? Turning the setting on does not log them out or un-confirm them.
2. Is there a mailbox the agent may read for a fresh signup during the web test (e.g. a `+alias` of the test account)? If not, the confirm-flow test goes on the user's phone list.

## Out of scope

- Any change to Supabase email templates, SMTP or the "Site URL" (localhost) – already handled by 1.10 / on hold in HANDOVER.md.
- Handling unconfirmed sessions in `AuthProvider` – with the setting on, Supabase never gives an unconfirmed user a session, so there is nothing to block there.
- A separate "verify" screen or route.
- Changing what happens to existing accounts (see open question 1).

## Decisions (2026-10-18)

- Supabase "Confirm email" was already **on**. No dashboard change; accounts left as they are. Build only the login fix (unconfirmed login → resend code → open signup code screen).
- Web test: sign up with a `+alias` of the test account's email; the user reads the code from the mail and gives it in chat.
