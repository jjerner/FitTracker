# DS-6 – Design system: migrate Profile screens

Issue: jjerner/FitTracker#68

## Goal

Move the Profile area (`src/app/(tabs)/profile/*`) onto the shared bricks and tokens (`Button`, `AppText`, `Card`, `spacing`, `radius`) so it follows `docs/design-system.md`, and give it the app's one look: a grey screen with white groups and cards. No change to what any screen does.

## Decisions (owner, 2026-10-21)

- **Q1:** new shared text step `labelSmall` = 14/600 `colors.text`. The Goals field labels use it. `LabeledInput`'s own label can switch to it later with no visible change (not in this ticket).
- **Q2:** daily calories 20 → `title` 28.
- **Q3:** the "Name" label uses `labelSmall` in `colors.textSecondary`, kept uppercase.
- **Q4:** Delete account heading → `heading` 20/600, still a TalkBack heading.
- **Q5:** Fill in suggestion becomes the white `secondary` Button. Save Goals stays the only primary.
- **Contrast fix:** the 3 hints in the Goals helper box (`weightHint`, `{missing}`, "Estimate only…") use `small` + `color: colors.textSecondary`.
- **New, and it changes S42's look:** Profile and every settings screen switch to a **grey `surface` screen with white groups**, so the whole app has one look ("same look and feel throughout the app"). **This replaces S42's "grey groups on a white screen" decision.** It is done once in the shared `SettingsList` (`settingsStyles` + group colour), so every Profile screen follows. Text that sits straight on the grey screen uses `textSecondary`, not `muted`.
- **Delete account:** "Delete my account" stays a red filled `danger` Button. It is the one exception to app-wide rule C below, because deleting is that screen's main action. It still asks for the password again and asks for confirmation.

App-wide decisions (the first DS ticket built adds each shared piece and the later ones reuse it):

- **A.** One look everywhere: grey screen + white cards/groups.
- **B.** `labelSmall` 14/600 for field labels, table numbers and the active tab.
- **C.** Destructive actions are quiet red text links (`TextLink tone="danger"`, `colors.dangerDark` text so it reads on grey and white, 48 dp), not red filled buttons, and they always confirm. Profile has no other delete/remove action. The red "Delete account" row on Account only *opens* the delete screen, so it stays a `destructive` `SettingsRow`.
- **D.** New `success` Button variant (dark green #15803d, white text). Profile does not use it.

### Shared pieces: already on master

B (`typography.labelSmall` in `src/theme.ts`, plus its row in the design doc's text ladder), C (`TextLink tone="danger"`, `dangerDark` text) and D (`Button variant="success"` on `colors.successDark`) are all on master. This ticket reuses B and does not touch C or D. `src/theme.ts` and `src/components/TextLink.tsx` are not changed.

## Today

- 4 hand-made `Pressable` + `ActivityIndicator` buttons: Save (name), Change password, Delete my account, Save Goals. Plus one hand-made outlined button: Fill in suggestion.
- Raw `fontSize`/`fontWeight` text in `index.tsx`, `password.tsx`, `delete-account.tsx`, `goals.tsx` and `SettingsList.tsx`.
- Off-scale values only in `goals.tsx` (`padding: 16`, `marginTop: 12/24/4`, `marginBottom: 8`, `borderRadius: 8`) and `index.tsx` (`paddingHorizontal: 20`).
- Every Profile screen is white (`settingsStyles.container` and Goals' `container` use `colors.background`). Groups and the Goals helper are grey (`colors.surface`). The `Stepper`'s − / + squares are white, so they would vanish on a white group.
- `account.tsx`, `workouts.tsx`, `reminders.tsx` and `_layout.tsx` are pure `SettingsList` + tokens. They get the new look through `SettingsList` with **no code change**.

## Files to touch (line numbers = master at 13b7aaa)

- `src/components/SettingsList.tsx`
  - L119 `settingsStyles.container` `backgroundColor: colors.background` → `colors.surface` (grey screen).
  - L124 `group` `backgroundColor: colors.surface` → `colors.background` (white group).
  - L143 `stepButton` `backgroundColor: colors.background` → `colors.surface` (grey square on the white group).
  - L56 row label → `<AppText variant="label" style={[styles.rowText, …]}>`; `rowText` (L136) becomes `{ flex: 1 }`. Keep `rowTextDestructive` (L137).
  - L104 value `timeText` (L148, 16/600) → `AppText variant="label"`, style keeps `minWidth: 52, textAlign: 'center'`.
  - L102/L112 "−"/"+" `stepButtonText` (L147, 20/600) → `{ ...typography.heading, color: colors.primary }` on the plain `Text`. Not `AppText variant="heading"`: that would mark the glyph as a heading.
  - `rowPressed` (`colors.border`) and the separator stay as they are and still show on white.
- `src/components/Button.tsx`
  - Add optional `accessibilityHint?: string`, passed to the `Pressable`, so Fill in suggestion keeps its TalkBack hint (goals L354). About 3 lines.
- `src/app/(tabs)/profile/index.tsx`
  - L28 the Name block's `<View>` → `<Card>` (white on the grey screen). Card's 8 dp gap replaces the label's `marginBottom` and the email's `marginTop`, so the spacing stays the same.
  - L29 "Name" label → `AppText variant="labelSmall"`, style `{ color: colors.textSecondary, textTransform: 'uppercase' }`.
  - L35 email → `AppText variant="small"` (no style needed).
  - L93–103 Save → `<Button title="Save" onPress={() => onSave(trimmed || null)} disabled={!isChanged} loading={isSaving} />`. Same blocking, and it dims only when the name is unchanged, as today. It gains a TalkBack role and label.
  - Delete the `label`, `email`, `saveButton`, `saveButtonDisabled` and `saveButtonText` styles (this removes the off-scale `paddingHorizontal: 20`). Drop the `Pressable` and `Text` imports. `ActivityIndicator` stays (L31). `nameInput` is not touched (inputs are out of scope), and it is see-through, so it shows white inside the Card.
- `src/app/(tabs)/profile/password.tsx`
  - L68 form `<View>` → `<Card>`. The red error needs white behind it (`danger` on grey is 4.4:1).
  - L100–109 error → `AppText` (body, 14 → 16) with `color: colors.danger`, `marginBottom: spacing.md`. Keep `selectable`, `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"`.
  - L110–114 "Password changed." → `AppText variant="label"` with `color: colors.success`, `marginBottom: spacing.md`. Keep the role and live region.
  - L116–129 → `<Button title="Change password" onPress={handleSave} disabled={!canSave} loading={isSubmitting} />`. No `style`: the Card's 8 dp gap replaces `marginTop: spacing.sm`. `canSave` already includes `!isSubmitting`, so it looks as it does today: a dimmed spinner while saving. TalkBack label and disabled/busy state are the same.
  - Delete the `button`, `buttonDisabled` and `buttonText` styles. Drop the `ActivityIndicator`, `Pressable`, `Text`, `View` and `radius` imports.
- `src/app/(tabs)/profile/delete-account.tsx`
  - L88 info `<View style={styles.info}>` → `<Card>` (same 8 dp gap). L97 form `<View>` → `<Card>`.
  - L89 heading → `AppText variant="heading"` (20/600). `AppText` sets the header role, so drop the explicit `accessibilityRole`.
  - L90–94 two body texts → `AppText` body (15 → 16) with `color: colors.textSecondary`.
  - L109–118 error → same as on the password screen.
  - L120–133 → `<Button variant="danger" title="Delete my account" onPress={handleDelete} disabled={!canDelete} loading={isSubmitting} />` (red filled: the decided exception to C).
  - Delete the `info`, `heading`, `body`, `button`, `buttonDisabled` and `buttonText` styles. Drop the `ActivityIndicator`, `Pressable`, `Text`, `View` and `radius` imports.
- `src/app/(tabs)/profile/goals.tsx` (tokens and components only, no logic changes)
  - L365 `container` → `backgroundColor: colors.surface`. L388 `helper` → `backgroundColor: colors.background` (a white group, like `SettingsGroup`).
  - L169–216 (macro fields, calories, Save Goals) go into one `<Card style={styles.fields}>`, with `fields: { gap: 0, paddingTop: spacing.xs }`. Gap 0 keeps today's label/input/hint spacing (each label and input are separate children). The `xs` top padding plus the first label's 12 dp makes 16 dp, the same as the sides.
  - Field labels L169/179/189/202 (`label`), L298/315/318 (`helperLabel`) and L322/332 (`stepLabel`) → `AppText variant="labelSmall"`. They look as they do today. The styles keep layout only: `label: { marginTop: spacing.md, marginBottom: spacing.sm }`, `helperLabel: { marginBottom: spacing.xs }`, `stepLabel: { flex: 1 }`.
  - L103 `macroDetail`, L199 "Filled in from the helper…", L204 "Calculated: …" → `AppText variant="small"` (13 → 14, `muted` on the white Card). `hint` (L378) becomes `{ marginTop: spacing.xs }`.
  - Helper hints L312 `weightHint`, L358 `{missing}`, L359 "Estimate only…" → `AppText variant="small"` with `color: colors.textSecondary` (contrast fix). `weightHint` keeps `marginTop: -spacing.sm, marginBottom: spacing.md`. The other two use `[styles.hint, { color: colors.textSecondary }]` or a `helperHint` style. Pick whichever is shorter.
  - L150 "Suggest goals for me" (`helperTitle`) → `AppText variant="label"`, style `{ flex: 1 }`. The toggle `Pressable` (L144–161) stays: it is a show/hide row, not a `Button`.
  - L203 calories → `AppText variant="title"` (28/700). It is read as plain text, not as a heading.
  - L206–216 Save Goals → `<Button title="Save Goals" onPress={handleSave} disabled={!isValid} loading={isSaving} style={styles.saveButton} />`, with `saveButton: { marginTop: spacing.xl }`. It gains a TalkBack role and label.
  - L343 `clampNote` → `AppText variant="small"` with `color: colors.warningText`, `marginTop: spacing.sm`.
  - L348–357 Fill in suggestion → `<Button variant="secondary" title="Fill in suggestion" onPress={handleFill} disabled={!target} accessibilityHint={missing ?? undefined} style={styles.fillButton} />`, with `fillButton: { marginTop: spacing.md }`.
  - L366 `content: { padding: 16 }` → `spacing.lg`. L372 input `borderRadius: 8` → `radius.md`.
  - Delete the `calories`, `saveButtonDisabled`, `saveButtonText`, `fillButtonText` and `helperTitle` font styles, and `fillButton`'s box styles. Drop the `Text` import. `Pressable`, `ActivityIndicator` and `TextInput` stay.
- `docs/design-system.md` (`labelSmall` in the text ladder, `Button`'s `success`, `TextLink`'s `tone="danger"` and the "Destructive actions" rules are already there)
  - New short rule (if missing), under Colour or as "One look": every screen is grey `surface`, and its content sits in white `Card`s or `SettingsGroup`s. Text placed straight on the grey screen uses `textSecondary`, never `muted`. Update the Accessibility bullet to match.
  - Components table: add a `SettingsList` row: "Settings screens (Profile): `SettingsGroup` = white rounded group on the grey screen, `SettingsRow` = icon + label row (a chevron opens a screen, `destructive` only for delete), `Stepper` = − value +. `settingsStyles` gives the grey screen." Remove `SettingsList` from the "Older shared pieces" line.
  - `Button` row: "`accessibilityHint` says what is missing while the button is disabled."
  - "Moving old screens over": add Profile to the "So far … have moved" line.

About 220–270 changed lines in total. **No split needed.** If one is wanted anyway, the clean cut is PR 1 = `SettingsList` colours + `Button.accessibilityHint` + docs, and PR 2 = the screen swaps.

## Must NOT change

- **Auth/account handlers, byte-identical:** `password.tsx` L21–25 (success `useEffect` → `router.back()`), L27–58 `handleSave` (mismatch check, `signInWithPassword` re-auth, wrong-password mapping, `updateUser`), L60 `canSave`. `delete-account.tsx` L19–38 (`CONFIRM_*`, `confirmDelete` with web `window.confirm`), L46–78 `handleDelete` (re-auth, confirm, `rpc('delete_my_account')`, `signOut({ scope: 'local' })`), L80 `canDelete`. `account.tsx` Sign out `onPress={() => supabase.auth.signOut()}`.
- Every `LabeledInput` prop on the password and delete screens (`autoComplete`, `textContentType`, `accessibilityLabel`, `password`).
- `index.tsx` `NameEditor` logic (`trimmed`, `isChanged`, `onSave(trimmed || null)`). `reminders.tsx` `handleReminderToggle`, `formatMinutes` and the stepper maths. The code of `workouts.tsx`, `account.tsx` and `reminders.tsx`.
- `goals.tsx` logic: L38–134 (defaults, macro maths, `macroDetail`'s numbers, `fill`/`handleApply`, `handleSave` with `router.back()`), L221–294 (`rangeHint`, `GoalHelper` state, `missing`, `target`, `step`, `handleFill`/`saveBody`), the helper that is hidden but not unmounted (L163), `key={weightKg}` (L165).
- S42 decisions that still hold: hub + sub-screens, row order, icons, chevrons, Sign out as a plain row, Delete account red and last, `SettingsRow` `minHeight: 56`, `Stepper` 36 dp + `hitSlop={6}`. (S42's "grey groups on a white screen" is replaced, see Decisions.)
- `_layout.tsx` (titles, `unstable_settings.anchor`). All wording, TalkBack labels, routes, hooks and storage.

## Reuse

- `Button` (`loading` replaces `ActivityIndicator` + `disabled={… || isSaving}`; the `danger` and `secondary` variants).
- `Card` for the hub's Name block, the password/delete forms and the Goals fields (white on grey: exactly its job).
- `AppText` variants, including the existing `labelSmall`, and `colors` / `spacing` / `radius` / `typography` from `src/theme.ts`.
- The error-text pattern already in `password.tsx` (alert role + polite live region), kept as is.

## Acceptance criteria

- [ ] Every Profile screen (hub, Goals, Workouts, Reminders, Account, Change password, Delete account) has a grey `surface` background. Its groups, cards and the Goals helper are white.
- [ ] The `Stepper` − / + squares are visible (grey) on Reminders and in the Goals helper.
- [ ] No text sits straight on the grey screen in `muted`. Grey text on grey uses `textSecondary`. Red error text sits on a white Card.
- [ ] No hand-made buttons are left in `src/app/(tabs)/profile/`. Save, Change password, Delete my account (red filled `danger`), Save Goals (the only primary on Goals) and Fill in suggestion (`secondary`) are `Button`. Each one blocks double taps while it runs.
- [ ] Grepping `fontSize|fontWeight|borderRadius: \d|padding: \d|margin\w*: \d|#[0-9a-fA-F]{3}` in the profile files and `SettingsList.tsx` finds only the `TextInput` styles (goals `input`, index `nameInput`).
- [ ] The existing `labelSmall` (14/600) is used by all Goals field labels and the Name label.
- [ ] The "Must NOT change" handlers are byte-identical (`git diff` shows no lines changed inside them).
- [ ] Every flow works as before (see Test plan). Delete my account still asks for the password again and then for confirmation.
- [ ] Fill in suggestion still carries its TalkBack hint while it is disabled.
- [ ] `src/theme.ts` and `src/components/TextLink.tsx` are unchanged. `docs/design-system.md` is updated as listed.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit tests: none. This is a style swap onto existing components with no new logic. The new `Button` prop is a pass-through, and `tsc` covers it.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`):
  - **Look:** open each Profile screen. Each is grey with white groups/cards, nothing white-on-white vanishes, and no grey text is hard to read.
  - **Profile:** the Name card is white with "NAME" in dark grey bold caps. Save is dimmed until the name changes. Change it → Save shows a spinner → reload, and the name is kept. Put the name back.
  - **Account / Workouts / Reminders:** they open, with white groups on grey. The rest-time boxes and switches work. Turn on the food reminder: the stepper's grey − / + squares show and change the time. Turn it back off.
  - **Change password:** mismatched new passwords show the error in red at 16 inside the white card. A wrong current password shows "Current password is wrong." **Don't finish a real change** on the test account.
  - **Delete account:** info and form are in two white cards. A wrong password shows "Wrong password. Nothing was deleted." With the right password, the confirm dialog appears → **Cancel** (never confirm). The button is red and filled, and back on the screen the spinner stops.
  - **Goals:** the fields sit in a white card, and the calories number is big (28). Toggle the helper (white box, labels 14 bold, grey stepper squares). Fill it until Fill in suggestion turns on (it is dimmed with a dark grey hint below until then), tap it, then Save Goals → back to Profile.
  - The console has no errors.
- Phone (`phone-test` issue): the grey/white look on every Profile screen. TalkBack reads Fill in suggestion's hint when it is disabled, the password/delete errors when they appear, and Save/Save Goals as buttons. With a large font size, Goals' bigger calories line and the hints wrap and nothing is cut off.

## What the user will notice

- **All of Profile turns grey with white boxes** (it was white with grey boxes), like Home and Progress. The name, the password/delete forms and the Goals numbers sit in white cards. The − / + squares turn grey.
- On Change password and Delete account the fields sit 8 dp further apart (the Card's gap).
- The "NAME" label goes from 13 bold light grey to 14 bold dark grey. Small hints go 13 → 14. Info and error texts go 14/15 → 16. The helper hints turn dark grey.
- Daily calories gets bigger (20 → 28).
- Delete account's heading goes from 18 bold to 20 semi-bold.
- Fill in suggestion changes from a blue outline with blue text to the white secondary button (grey outline, black text).
- The Save button next to the name is a little narrower (side padding 20 → 16).

## UX/UI

Look-only pass on Android. Flow, words and states stay as they are.

- **Flow:** unchanged. Profile → Goals / Workouts / Reminders / Account → Change password / Delete account, with back everywhere as today.
- **Screens and parts:** reused: `Button` (primary, secondary, danger), `AppText` (including `labelSmall`), `Card`, `SettingsList`. New: `Button.accessibilityHint`.
- **States:** no new ones. A spinner while the name or goals load. A button spinner while saving (it keeps its width and blocks taps). Errors are read out (alert + polite live region). Fill in suggestion stays disabled, with the reason shown below it and read as its hint.
- **Words:** unchanged.

### Profile hub before / after

```
Before (white screen)          │ After (grey screen)
NAME            13 bold grey   │ ┌─────────────────────────────┐ white Card
[ Jonathan     ] [ Save ]      │ │ NAME   labelSmall, dark grey│
me@example.com                 │ │ [ Jonathan     ] [ Save ]   │ Button
┌────────────────────────────┐ │ │ me@example.com   small      │
│ ◎ Goals                  › │ │ └─────────────────────────────┘
│ ⚲ Workouts               › │ │ ┌─────────────────────────────┐ white group
│ 🔔 Reminders              › │ │ │ ◎ Goals                   › │
└──────── grey group ────────┘ │ │ ⚲ Workouts                › │
                               │ │ 🔔 Reminders               › │
                               │ └─────────────────────────────┘
```

### Goals after (helper open)

```
┌─────────────────────────────────────┐ grey screen
│ ← Goals                             │
│ ┌─────────────────────────────────┐ │ white helper box
│ │ Suggest goals for me          ˄ │ │ label 16/600
│ │ Sex (for the formula)           │ │ labelSmall 14/600
│ │ (Male) (Female)                 │ │
│ │ Birth year                      │ │ LabeledInput 14/600, untouched
│ │ [ e.g. 1990                 ]   │ │
│ │ Log a weigh-in on Progress to … │ │ small, textSecondary
│ │ Activity · Goal + chips         │ │ labelSmall
│ │ Protein (g per kg)  [−] 1.8 [+] │ │ grey stepper squares
│ │ [      Fill in suggestion     ] │ │ secondary Button
│ │ Pick your sex.                  │ │ small, textSecondary
│ │ Estimate only, not medical adv. │ │ small, textSecondary
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │ white Card
│ │ Protein (g)                     │ │ labelSmall
│ │ [ 150                       ]   │ │
│ │ 30 % of kcal · 1.8 g/kg         │ │ small grey
│ │ … Carbs, Fat …                  │ │
│ │ Daily Calories                  │ │ labelSmall
│ │ 2000 kcal                       │ │ title 28/700
│ │ Calculated: protein × 4 + …     │ │ small grey
│ │ [          Save Goals         ] │ │ primary Button, the only blue one
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Tap targets

- All 5 buttons become `Button`: at least 48 dp tall. Name Save hugs the word "Save" and is 48 dp tall (about 47 today).
- Unchanged: `SettingsRow` 56, helper toggle 56, `Stepper` 36 + `hitSlop` 6 = 48, step rows 48.
- Out of scope: `LabeledInput`'s eye toggle is 44 dp wide (the doc says 48). That goes to the inputs ticket.

### TalkBack

- Save and Save Goals are now read as "…, button", with disabled and busy states. Today they have no role.
- Fill in suggestion: "Fill in suggestion, button, disabled, Pick your sex." The hint is kept through the new prop.
- Change password and Delete my account keep their labels and states. The Delete heading is still a heading. Calories (`title`) is read as plain text. `Card` adds nothing for TalkBack.

### Contrast (WCAG AA: 4.5:1 for text below 18 bold)

- No Profile text sits straight on the grey screen: the Name block, forms, Goals fields and helper are all white. `muted` on grey is 4.4:1 and `danger` on grey is 4.4:1, so neither goes there. That is why the forms and the Name block move into white Cards.
- On white: `small` `muted` 4.8:1 (Goals hints in the card, email). `danger` errors 4.8:1. `dangerDark` destructive row 6.5:1. The helper hints use `textSecondary` (about 10:1) as decided, even though the helper is now white.
- Stepper "−/+" (`primary` on grey squares): about 4.7:1. Clamp note (`warningText` on white): fine.
- Not in this ticket: "Password changed." in `success` green on white is 3.3:1. It fails AA but only shows for 1.5 s, as today. It needs a darker text colour in its own ticket (`successDark`, now on master, could serve).

## Risk

🔴 changes existing. It changes the look of every Profile screen through the shared `SettingsList` (this replaces S42's colours) and adds a prop to the shared `Button`. It also restyles the change-password and delete-account screens, which call Supabase auth and account deletion: a broken button there blocks a password change or account deletion. All of it is presentation-only, and the handlers listed above must stay byte-identical.

## Needs from the user

None. It ships JS-only through `eas update`: no SQL, no migration, no new APK.

## Open questions

None.

## Out of scope

- `LabeledInput`, `RestTimeInput` and raw `TextInput` styles (input `fontSize: 16`, `padding: 14`, the name box's `border` colour), including moving `LabeledInput`'s label to `labelSmall`. Inputs are app-wide and get their own DS ticket.
- Goals layout, wording or flow, and anything from GOALS-3/4/5. Goals only gets token/component swaps and the Card wrap.
- Using C (`TextLink tone="danger"`) or D (`success` Button) anywhere in Profile: nothing there needs them.
- Any change to `src/theme.ts` or `TextLink.tsx` (B, C and D are already on master).
- A `size="sm"` button. Restyling `Stepper` or `SettingsRow` sizes. A grey background for the loading spinner view in Goals.
- Any change to S42's structure, to the code of `account.tsx`/`workouts.tsx`/`reminders.tsx`/`_layout.tsx`, or to auth logic or error wording.
- A darker green for "Password changed." Dark mode (`useColors()`).
