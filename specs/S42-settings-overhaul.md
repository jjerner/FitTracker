# S42 – Settings page overhaul (grouped sections)

Issue: jjerner/FitTracker#42. "Overhaul settings page. We are looking to add more settings to the app. We need to consider UX/UI design rules and look at all the settings in the app to potentially move things around to new sections in the profile/settings tab."

## Goal

Sort today's Profile settings into clear, labelled sections, so the planned settings (5.2, 5.3, 5.5, 5.6, 5.7, 5.8) each have an obvious place to go. Nothing new is built here. Rows only move, and every row gets the same look.

## Today: every setting in the app

All settings live on one screen, `src/app/(tabs)/profile/index.tsx`. No other screen has a setting of its own. Other screens only read them.

| Setting | Where it's set | Stored in | Read by |
|---|---|---|---|
| Display name (text box + Save) | Profile, top | Supabase `profiles.display_name` (`src/lib/profile.ts`, `useDisplayName`) | Home greeting |
| Email (shown, can't be changed) | Profile, under the name | Supabase auth session | – |
| Nutrition goals: protein/carbs/fat, kcal worked out from them | Profile → "Nutrition Goals" row → `profile/goals.tsx` | Supabase (`useNutritionGoals`) | Home and Food (calorie ring, macro bars) |
| Vibrate when rest ends (switch, off by default) | Profile | Phone only, AsyncStorage (`src/lib/settings.ts`, `useRestVibration`) | `workouts/active.tsx` rest timer |
| Default rest time (− / + in 15 s steps, 0:15–10:00, default 1:30) | Profile | Phone only (`useDefaultRest`) | `workouts/active.tsx` |
| "Remind me if no food logged" (switch) + "Reminder time" (− / + in 30 min steps, default 19:00; only shows when the switch is on) | Profile | Phone only (`useFoodReminder`) | `src/lib/reminders.ts` |
| "Remind me about missing meals (20:30)" (switch, fixed time) | Profile | Phone only (`useMealReminder`) | `src/lib/reminders.ts` |
| Sign Out (red outlined button) | Profile, bottom | – | – |

Not settings, but close: the Progress range tabs (30 days / 90 days / 1 year) aren't saved. Favourite foods are data, not settings. `profiles` also has `height_cm`, `sex` and `date_of_birth`, but no screen uses them (the user only wanted name, HANDOVER line 42).

Problems on today's page:
- One "Settings" header covers goals, workout, and reminder settings all at once.
- "Default rest time" has no icon, but the rows around it do. The first row has no top margin, and the rows under it do.
- The − / + buttons are 36×36 dp, below Android's 48 dp minimum, and have no screen-reader label (TalkBack reads "minus" with no context).
- The switches have no accessibility label, so TalkBack only says "switch, off".
- Sign Out is styled as a dangerous red button. On Android, red is meant for actions you can't undo (delete account, coming with 5.7).

## Proposed layout

One scrolling page with section headers. This is the Android settings pattern: short uppercase/muted section titles, one row per setting, switch or value on the right, a chevron for rows that open another screen. Less common and safety-critical things go at the bottom. Sections with no rows yet are **not shown**. They are listed here only so later items know where to go.

```
[ Name  ________ ] [Save]
  me@example.com

GOALS
  (target)  Nutrition goals                          >
            later: 5.3 training vs rest day goals and 5.2 goal helper go
            on the goals screen itself, not on this page

WORKOUTS
  (timer)   Default rest time                [−] 1:30 [+]
  (vibrate) Vibrate when rest ends               [switch]
            later: 7.3/7.4 progression settings

REMINDERS
  (bell)    Remind me if no food logged          [switch]
              Reminder time                 [−] 19:00 [+]   (only when on, as today)
  (bell)    Remind me about missing meals (20:30) [switch]

APPEARANCE & LANGUAGE   later: 5.6 dark mode, 5.8 language. Hidden for now
YOUR DATA               later: 5.5 export my data. Hidden for now

ACCOUNT
            later: 5.7 change password                >
            Sign out
            later: 5.7 delete account (red, last)
```

Why this order: goals get changed most, then workout settings, then reminders. Account actions go last so nobody taps them by accident. 5.2 and 5.3 change goals, so they go on the existing goals screen and the main page stays short.

## Files to touch

- `src/app/(tabs)/profile/index.tsx`:
  - Swap the single "Settings" label for the section headers above (Goals, Workouts, Reminders, Account), using the existing `styles.label`.
  - Put "Default rest time" first under Workouts and give it a timer icon (`{ ios: 'timer', android: 'timer' }`), so every top-level row has an icon.
  - Give every row the same spacing (fix the first row's missing top margin).
  - Make the − / + buttons at least 48 dp to tap (`hitSlop` or a bigger size) and give them `accessibilityLabel`s: "Shorter rest time", "Longer rest time", "Earlier reminder", "Later reminder".
  - Give each `Switch` an `accessibilityLabel` that matches its row text.
  - Put Sign out under an "Account" header. Its style follows open question 3.
  - Rename the row "Nutrition Goals" to "Nutrition goals" (sentence case, like the other rows).
- `src/app/(tabs)/profile/_layout.tsx`: only if open question 1 renames the screen title.

## Reuse

- The existing row styles (`row`, `rowSpaced`, `rowText`, `stepButton`, `label`), `SymbolView` icons, and `colors` / `spacing` / `radius` from `src/theme.ts`.
- All the hooks stay as they are (`useDisplayName`, `useDefaultRest`, `useRestVibration`, `useFoodReminder`, `useMealReminder`). No logic changes.
- No new component file. Only add a small helper inside the file, like `Section({ title, children })`, if it makes the file shorter.

## Acceptance criteria

- [ ] Profile shows, top to bottom: name + email, then GOALS, WORKOUTS, REMINDERS, ACCOUNT, each with the rows listed above. No empty sections.
- [ ] Every setting from the inventory is still there and works the same as before. Values are kept (same storage keys, same hooks).
- [ ] Every top-level row has an icon. The spacing between rows is the same everywhere.
- [ ] The − / + buttons have a tap area of at least 48×48 dp. TalkBack reads their labels, and each switch's label.
- [ ] The reminder time row still only shows when "Remind me if no food logged" is on.
- [ ] Sign out still signs out and goes to the login screen.
- [ ] Fits a 360 dp wide screen without text getting cut off (the long missing-meals label may wrap to two lines).
- [ ] `npx tsc --noEmit` and `npx expo lint` are clean.

## Test plan

- Unit tests: none. Only layout changes. No logic is new or moved.
- On web (test account from `.env.test.local`), `npx expo start --web --port 8081`:
  1. Open Profile. Check the section order and row order against the layout above.
  2. Change the name and save. Reload, and the name is still there.
  3. Nutrition goals opens the goals screen. Back returns to Profile.
  4. Default rest time − / + changes the value and stops at 0:15 and 10:00. Reload, and the value is kept.
  5. Toggle "Vibrate when rest ends". Reload, and the switch is kept.
  6. Turn on the food reminder (if web refuses permission, the "Notifications are off" alert shows; that's fine). When on, the time row shows and − / + wraps around midnight.
  7. Narrow the browser to about 360 px. Nothing is cut off.
  8. Sign out, and you land on login. No errors in the console.
- Phone list (HANDOVER): TalkBack reads the stepper and switch labels. The 48 dp tap areas feel right. Reminders still fire after turning them off and on again from the new place.

## Needs from the user

- Decisions on the open questions below.
- No SQL. No new APK build (the icons come from `expo-symbols`, which is already installed). JS only, so it ships with `eas update`.

## Open questions

1. Tab and screen title: keep "Profile", or rename to "Settings" / "Profile & settings"?
2. One page with sections (proposed), or a short hub page where each section opens its own screen (more taps, but room to grow)?
3. Sign out style: keep the red outlined button, or make it a plain row so red is kept for "Delete account" (5.7)?
4. Is this the "bigger UX overhaul" that dark mode (branch `dark-mode`, 5.6) is waiting for, or does that still wait for 1.14 (the full UI/UX review)?
5. Should a section group the phone-only settings with a note like "Saved on this phone only"? Today the rest, vibration and reminder settings don't follow you to a new phone.

## Out of scope

- Building any of 5.2, 5.3, 5.5, 5.6, 5.7, 5.8, 7.3/7.4. This only decides where they go.
- New profile fields (height, sex, birth date, units).
- A summary under rows (for example "2 000 kcal" under Nutrition goals), an app version line, or an About section.
- Restyling the goals screen, or changing how any setting is stored (no moving phone-only settings to Supabase).
- A configurable time for the missing-meal reminder (still fixed at 20:30).

## Decisions (PM, 2026-10-18)

These override the proposal above where they differ.

1. Tab keeps the name **"Profile"**.
2. **Menu page with sub-screens**, not one long page (UX: progressive disclosure, less cognitive load as settings grow). Hub: name + email at top, then rows that open sub-screens: **Goals** (existing goals screen), **Workouts** (default rest, rest vibration), **Reminders** (food reminder + time, missing-meal reminder), **Account**. Follow platform list conventions (chevron rows, grouped sections).
3. **Account is its own sub-screen**: email, Change password (5.7), Sign out as a **plain row**, Delete account in red at the very bottom (5.7). Red is reserved for Delete account. Build this item before 5.7; 5.7 fills in the Account screen.
4. Dark mode is **not** part of this; it still waits for 1.14.
5. **No** "Saved on this phone only" note.
