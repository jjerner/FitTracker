# DS-2 – Design system: migrate Auth screens

Issue: jjerner/FitTracker#64

## Goal

Move Login, Signup and Forgot password to the shared bricks and tokens (`Button`, `AppText`, `spacing`) so they follow `docs/design-system.md`. No change to what the screens do.

## Today

- Login's button is already `Button`. Its "Plucky" title is a hand-made 32/700 `Text`.
- Signup (both steps) and Forgot password (both steps) still use hand-made `Pressable` + `ActivityIndicator` buttons. That is 4 buttons: Sign Up, Verify, Send Code, Set New Password.
- Titles are raw `fontSize: 28 / 700`. Info texts are `fontSize: 15`. Error and link texts have no `fontSize`, so they use the React Native default of 14.
- There is off-scale spacing: `paddingHorizontal: 24`, `marginBottom: 32/24/16/12`, link `marginTop: 20`, button `borderRadius: 8` and `padding: 14`.
- There are 6 text links, all plain black text about 20 dp tall: "Forgot password?", "Don't have an account? Sign up", "Already have an account? Log in", "Didn't get it? Send again" (×2, a `Pressable` with `hitSlop={12}`, about 44 dp) and "Back to log in" (×2).
- Error texts have no `accessibilityLiveRegion`, so TalkBack doesn't read them out.

## UX/UI

Written assuming the recommended answers (Q1 = a, Q2 = title 28, Q3 = yes).

**Flow.** Unchanged: Login → Log In → Home. Login → "Forgot password?" → Reset password (Send Code → code + new password → Set New Password → Home). Login → "Sign up" → Create account (Sign Up → Check your email → Verify → Home). Every step keeps a "Back to log in" or "Log in" link.

**Screens and parts.** Reuse `AppText`, `Button`, `LabeledInput` (as is), `colors`, `spacing`. One new brick: `TextLink`.

**`TextLink` (Q1).**
- Look: `AppText variant="label"` (16/600) in `colors.primary`, `textAlign: 'center'`, no underline. Blue on white is about 5:1, so it passes AA.
- Box: `Pressable` with `minHeight: 48`, `justifyContent: 'center'`, `alignSelf: 'center'` and `paddingHorizontal: spacing.md`. The tap area hugs the text, not the full row, and grows if the text wraps at a large font size.
- States (same numbers as `Button`): pressed `opacity 0.7`, disabled `opacity 0.5`, and it can't be tapped.
- A11y: `accessibilityRole="link"`, `accessibilityLabel={title}`, `accessibilityState={{ disabled }}`. TalkBack says "Back to log in, link".
- Where: Login has "Forgot password?" and "Don't have an account? Sign up". Signup form has "Already have an account? Log in". Signup code step has "Didn't get it? Send again" (disabled while busy) and "Back to log in". Forgot password has "Didn't get it? Send again" (step 2 only, disabled while busy) and "Back to log in". The whole line is blue, not just the last words.

**Title (Q2).** All three titles use `AppText variant="title"` (28/700), centred, plus `accessibilityRole="header"`, so TalkBack announces the screen name as a heading. The auth header stays hidden.

**Errors and notice (Q3).** Error: `AppText` body in `colors.danger`, left-aligned as today, with `selectable`, `accessibilityRole="alert"` and `accessibilityLiveRegion="polite"`, copied from `profile/password.tsx`. "New code sent." keeps the info look (body, `textSecondary`) and gets the same two a11y props. The `resendFailed` error that is already showing when the code screen opens may not be read out, because live regions only speak on change. That's fine: TalkBack reaches it when it reads the screen.

**Spacing per screen** (all tokens; ≈ is what the eye sees):

| Gap | Login | Signup form | Signup code | Forgot (both steps) |
|---|---|---|---|---|
| Side padding | xl 24 | xl 24 | xl 24 | xl 24 |
| Title → next | xxl 32 | xl 24 | xl 24 | lg 16 |
| Info → input | n/a | n/a | lg 16 | lg 16 |
| Input → input / error | md 12 (from `LabeledInput`) | same | same | same |
| Error (or notice) → button | md 12 + sm 8 = 20 (notice: lg 16 + sm 8 = 24) | same | same | same |
| Button → first link | `marginTop: spacing.sm`, ≈ 21 (today 20) | same | same | same |
| Link → link | no margin, the 48 dp boxes sit flush, ≈ 26 (today 20) | n/a | same | same |

```
Login                              Signup code step
┌───────────────────────────┐     ┌───────────────────────────┐
│          Plucky           │     │     Check your email      │
│                    (xxl)  │     │                     (xl)  │
│ Email address             │     │ We sent a code to a@b.c.  │
│ [ you@example.com       ] │     │ Enter it below.     (lg)  │
│                    (md)   │     │ Code from email           │
│ Password                  │     │ [ 123456                ] │
│ [ Your password       👁 ] │     │ red error, read aloud     │
│ red error, read aloud     │     │ New code sent. (grey)     │
│ [        Log In         ] │     │ [        Verify         ] │
│      Forgot password?     │ ←   │  Didn't get it? Send again│ ← blue,
│ Don't have an account?    │     │      Back to log in       │   48 dp
│         Sign up           │     └───────────────────────────┘   each
└───────────────────────────┘
```
Signup form and both Forgot steps follow the same pattern: title, (info), inputs, error, one blue `Button`, then blue links.

**States.**
- Loading: the tapped `Button` shows a spinner and keeps its width, and taps are blocked. "Send again" also dims. During "Send again", the main button shows its spinner too, as it does today.
- Error: the red text above the button, with Supabase's own words as today, read aloud.
- Success: go to Home, or move to the code step, or show "New code sent.".
- Empty: not applicable (no data loads).

**Words.** No changes: "Log In", "Sign Up", "Verify", "Send Code", "Set New Password", the 6 link texts above, the titles, info texts and "New code sent.".

**What the user will notice** (so nobody is surprised):
- The links turn from small black text into blue, slightly bold 16 text. They are easier to hit and dim briefly when tapped.
- "Plucky" on Login is a bit smaller (32 → 28).
- Info and error text is 1–2 sizes bigger (15/14 → 16), so a long error may take one more line.
- When two links are stacked, the gap between them grows a little (≈ 20 → 26).
- "Send again" looks dimmed while a request runs. Today it gives no sign.
- Signup and Forgot buttons look the same as before (blue, 8 corners, about 48 tall).
- Not changed: the text boxes, the wording, which text is centred (Signup's info stays left-aligned, Forgot's stays centred).

## Files to touch

- `src/app/(auth)/login.tsx`
  - Title: `<AppText variant="title" accessibilityRole="header">` with layout style `textAlign: 'center', marginBottom: spacing.xxl` (32 → 28, see Q2). All three screens' titles get the same `accessibilityRole="header"`.
  - Error: `<AppText style={{ color: colors.danger }}>` (body, 14 → 16) with `marginBottom: spacing.md`. Add the live region if Q3 = yes.
  - Container `paddingHorizontal: 24` → `spacing.xl`.
  - Links: see "Links" below.
- `src/app/(auth)/signup.tsx`
  - Sign Up and Verify → `<Button title=… onPress=… loading={isSubmitting} style={styles.button} />`, with `button: { marginTop: spacing.sm }` (same as login). Remove the `buttonText` style and the `ActivityIndicator` import.
  - Titles ("Check your email", "Create account") → `AppText variant="title"`, `marginBottom: spacing.xl`.
  - Info texts and the "New code sent." notice → `AppText` body (15 → 16), colour `colors.textSecondary`, `marginBottom: spacing.lg`.
  - Error → same as login.
  - `paddingHorizontal` → `spacing.xl`.
  - Links: see "Links" below.
- `src/app/(auth)/forgot-password.tsx`
  - The one button → `<Button title={codeSent ? 'Set New Password' : 'Send Code'} onPress={codeSent ? handleSetPassword : handleSendCode} loading={isSubmitting} … />`.
  - Title, info, error and padding as in signup. The title keeps `marginBottom: spacing.lg`, and info keeps `textAlign: 'center'`.
  - Links: see "Links" below.
- **Links:** this depends on Q1.
  - **Q1 = (a), recommended.** Add `src/components/TextLink.tsx`. It is a `Pressable` (`minHeight: 48`, centred, `accessibilityRole="link"`, `accessibilityLabel={title}`, `opacity 0.5` when `disabled`) around an `AppText variant="label"` in `colors.primary`. Props: `{ title, onPress, disabled?, style? }`, where `style` is for layout only. Use it for all 6 links.
    - The 4 `<Link href>` links become `<TextLink onPress={() => router.navigate(href)} />`. This is the same action `Link` does by default; check that against the expo-router v57 docs before relying on it.
    - The 2 "Send again" links become `<TextLink onPress={…} disabled={isSubmitting} />`.
    - Link gap `marginTop: 20` → `spacing.sm` on the first link after the button only. Later links get no margin (see the UX/UI spacing table). Full look in UX/UI → `TextLink`.
    - Drop the `Link` and `Pressable` imports if nothing else uses them.
  - **Q1 = (b).** Keep `Link` and `Pressable`. Wrap each label in `<AppText style={{ color: colors.primary }}>`, add `hitSlop={14}` to each `Link`, and change link `marginTop: 20` → `spacing.lg`. 20 is exactly between lg and xl; lg keeps the screen compact.
- `docs/design-system.md`
  - Under "Moving old screens over", add Auth to the "So far … have moved" line.
  - If Q1 = (a): add `TextLink` to the components table, and change "There is no small button size or link component yet" so it only mentions the small button size.

## Reuse

- `Button` (`loading` already shows a spinner, keeps the width and blocks taps, which replaces `disabled={isSubmitting}` + `ActivityIndicator`).
- `AppText` variants and `colors` / `spacing` from `src/theme.ts`.
- Error live-region pattern from `src/app/(tabs)/profile/password.tsx` (`accessibilityRole="alert"` + `accessibilityLiveRegion="polite"`).
- `Button`'s pressable/opacity pattern as the model for `TextLink` (Q1 = a).

## Acceptance criteria

- [ ] No raw `fontSize`, `fontWeight`, hex colour or off-scale spacing/radius left in the three auth files (grep `fontSize|fontWeight|#[0-9a-f]{3}|: (12|14|15|20|24|32)\b` returns nothing).
- [ ] No hand-made buttons: Sign Up, Verify, Send Code and Set New Password are `Button`. Each shows a spinner while submitting and can't be double-tapped.
- [ ] Every flow works as before: log in, wrong password error, unconfirmed email → code screen, sign up → code screen, verify, send again, forgot password send code → code + new password, "Back to log in", "Sign up", "Forgot password?".
- [ ] Titles are 28/700 on all three screens (Login included, if Q2 = yes). Info text is 16, and errors are 16 in `danger`.
- [ ] If Q1 = (a): all 6 links are blue `TextLink`s with a tap area of at least 48 dp and are read by TalkBack as "…, link". "Send again" looks dimmed and can't be tapped while a request is running.
- [ ] If Q1 = (b): all 6 links are blue, and every tap area is at least 48 dp (`hitSlop`).
- [ ] If Q3 = yes: error texts (and signup's "New code sent." notice) have `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"`.
- [ ] `docs/design-system.md` is updated as listed above.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit tests: none. This is a style swap onto existing components with no new logic.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`):
  - **Login:** a wrong password shows the red error. The right password lands on Home. "Forgot password?" and "Sign up" open their screens. The links are blue, and in DevTools each link box is at least 48 px tall (or has hitSlop).
  - **Signup form:** fill it in but **don't submit with a real address** (that would make a junk account). Tap "Log in" to go back.
  - **Signup code step without sending an email:** open `http://localhost:8081/signup?email=<test account email>`. Enter a wrong code and tap Verify: you should see the spinner, then the red error. Tap "Send again" with the test email: either the notice or an error is fine, and the button must be blocked while it runs. Tap "Back to log in".
  - **Forgot password:** "Send Code" with the test account's email sends a real email and moves to step 2. Enter a wrong code to see the error. **Don't finish the reset**, because it would change the test account's password. Check "Send again" and "Back to log in".
  - The console has no errors.
- Can't test on web, so these go on the phone list in HANDOVER.md:
  - TalkBack reads errors aloud when they appear (Q3), and reads links as "…, link".
  - Finishing sign-up or a password reset with a real emailed code. That needs a real inbox.
  - How the 48 dp link targets feel to a thumb, and the screen layout with a large phone font size.

## Risk

🔴 changes existing. It restyles the three screens every user must pass through to get in. A broken button or link here locks people out. If Q1 = (a), it also adds a shared component and changes the design doc.

## Needs from the user

- Answers to Q1–Q3.
- Ships JS-only: `eas update`. No SQL, no new APK.

## Open questions

1. **(design) Links.** The full design is in UX/UI → `TextLink`. (a) Add a small `TextLink` brick (blue, 48 dp target) and use it for all 6 auth links. (b) Only make the existing links blue and add `hitSlop` inline. **Recommended: (a).** Six links on three screens is already "two screens need it" (rule 4), and the design doc says the link fix must go "through the system, not by hand in one screen". It's about 25 lines. Later DS tickets can reuse it.
2. **(design) Login "Plucky" title is 32/700, but the ladder tops out at `title` 28/700.** Use `title` (28), or add a new bigger step to the theme? **Recommended: use `title` (28).** It matches the other two auth titles, and one hero word doesn't justify a new ladder step.
3. **(design) Error announcements.** Add `accessibilityRole="alert"` + `accessibilityLiveRegion="polite"` (+ `selectable`) to the error texts (and signup's notice)? **Recommended: yes.** It's two props per text, the design doc requires it, and `profile/password.tsx` already does it. Rewording raw Supabase error messages is not part of this (see Out of scope).

## Out of scope

- Rewording raw Supabase error messages into everyday words. That needs a mapping of error codes, so it belongs in its own ticket.
- `LabeledInput` (its label is still a raw 14/600, and its input padding is 14). It's shared by many screens, so it belongs to a separate DS ticket.
- A `size="sm"` button. Using `TextLink` on screens other than auth.
- Dark mode (`useColors()`), and any change to auth logic, routes or wording.
- The `(auth)/_layout.tsx` header. It stays hidden, so in-screen titles stay.

## Decisions (user, 2026-10-20)

Approved after seeing a before/after mockup of Login:
- Q1: (a) new shared `TextLink` brick, used for all 6 auth links.
- Q2: Login title uses `title` (28/700).
- Q3: yes, errors and "New code sent." are announced (alert role + polite live region).
- Risk: 🔴 changes existing.
