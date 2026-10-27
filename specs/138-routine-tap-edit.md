# 138 – Tapping a routine no longer opens the editor

Issue: jjerner/FitTracker#138

## Goal

On Workouts home, tapping an active routine row does nothing. A quiet "Edit" link on each row opens the editor instead, so a stray tap doesn't land you in edit mode.

## Files to touch

- `src/components/TextLink.tsx`: add an optional `accessibilityLabel?: string` prop that defaults to `title`. That way TalkBack can read "Edit Push Day" while the screen just shows "Edit". It's an added option, so every current caller works as before.
- `src/app/(tabs)/workouts/index.tsx` (active routine rows, around lines 69-93):
  - The outer row `Pressable` becomes a plain `View` with the same `style`, and its `onPress` goes away. A row that does nothing should not tell TalkBack it is a button.
  - Before the Start chip, add `<TextLink title="Edit" accessibilityLabel={`Edit ${template.name}`} onPress={() => router.push(`/(tabs)/workouts/${template.id}`)} />`. Edit always shows, even during an active workout.
  - The Start chip doesn't change. It is still hidden while a workout is active.
  - Archived rows (around lines 108-123) don't change. They still open the editor on tap.
- `docs/design-system.md`: add one line to the `TextLink` row in the components table about the optional `accessibilityLabel` (for example "Edit <name>" in lists).

## Reuse

- `TextLink` (blue `primary` tone, 48 dp tap area, `accessibilityRole="link"`, pressed look). Don't add a new chip or button.
- The existing `router.push(`/(tabs)/workouts/${template.id}`)` route, the same one today's row tap uses.

## UX/UI

**Flow**
- Edit: Workouts → tap "Edit" on a routine row → that routine's editor → back → Workouts.
- Start (unchanged): Workouts → tap "Start" → active workout.
- Tapping the name or exercise count does nothing (no pressed look, no navigation).
- Archived (unchanged): Show archived → tap the row → editor.

**Screens and parts** (only Workouts home changes)
- The routine row stays inside the same white `Card`, with the same divider and padding. It is a plain `View` now.
- Left side, unchanged: name (`label`) and "N exercises" (`small`). It takes the free width and wraps.
- Right side, in this order: `TextLink` "Edit" (blue `primary`, 48 dp tap area), then the existing blue Start chip at the far right. The link's own side padding is the gap between them, so no extra spacing is added.
- New in the system: only the `accessibilityLabel` prop on `TextLink`. No new components, colours or spacing.
- The row grows a little (the 48 dp link is taller than the text next to it). That is expected.

**States**
- Loading, empty ("No routines yet. Make one with New Routine, or pick one from Browse Programs.") and archived: unchanged. Empty shows no rows, so it shows no Edit.
- Workout in progress: Start is hidden as today, and Edit still shows at the far right.
- Start busy (`isStarting`): Start is disabled as today. Edit stays tappable, the same as today's row tap.
- Error: none new. Edit only navigates.

**Words**
- Visible: "Edit". "Start" is unchanged.
- TalkBack: "Edit <routine name>, link" and "Start <routine name>, button" (unchanged). The name and count are read as plain text, not as a button.

**Wireframe** (Workouts home, Routines card)
```
No workout in progress
┌──────────────────────────────────────┐
│ Push Day                Edit [Start] │
│ 5 exercises                          │
├──────────────────────────────────────┤
│ Legs and a very long                 │
│ routine name            Edit [Start] │
│ 4 exercises                          │
├──────────────────────────────────────┤
│ Show archived (1)                    │
└──────────────────────────────────────┘

Workout in progress (Start hidden)
┌──────────────────────────────────────┐
│ Push Day                        Edit │
│ 5 exercises                          │
└──────────────────────────────────────┘
```
"Edit" = blue text link. [Start] = the existing blue pill with white text.

## Acceptance criteria

- [ ] Tapping the name or exercise count of an active routine does nothing: no navigation, no pressed look.
- [ ] Each active routine row shows a blue "Edit" link to the left of the Start chip. Tapping it opens that routine's editor.
- [ ] With a workout in progress, rows show Edit only (no Start), and Edit still opens the editor.
- [ ] Start still starts the workout from that routine, as before.
- [ ] Archived routines (after "Show archived") still open the editor when you tap the row, and have no Edit link.
- [ ] The Edit link has a tap area of at least 48 dp, and TalkBack reads it as "Edit <routine name>, link".
- [ ] Every other `TextLink` caller looks and reads the same as before (its label defaults to `title`).
- [ ] With a long routine name or a large font setting, the name wraps and Edit and Start stay fully visible.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

Unit tests: none. This is layout and wiring only, with no new logic.

Web (`npx expo start --web --port 8081`, test account from `.env.test.local`):
1. Workouts tab: tap a routine's name and confirm nothing happens.
2. Tap Edit on that row and confirm the editor opens for the right routine. Go back.
3. Tap Start on a routine and confirm the active workout opens. Go back to Workouts home, confirm Start is gone from the rows and Edit is still there, then tap Edit and confirm the editor opens. Finish or discard the workout.
4. Tap Show archived, tap an archived routine, and confirm the editor opens (if the test account has none, archive one in the editor first, then unarchive it afterwards).
5. Check the console for errors.

Phone (one `phone-test` issue): with TalkBack on, focus the Edit link and check that it reads "Edit <name>, link". Also set the font size to largest and check that the row still fits.

## Risk

🔴 changes existing: it changes how the routine rows on Workouts home behave when tapped, and adds a prop to the shared `TextLink`.

## Needs from the user

None. No SQL, no APK build (JS only, ships with `eas update`).

## Open questions

None.

## Out of scope

- Archived rows: they keep tap-to-edit, as decided.
- Making the whole row start the workout, or a long-press menu: not asked for.
- The Start chip's own tap area (`hitSlop` top/bottom 5 only, may be under 48 dp). It's an existing issue; flag it separately if wanted.
- Rows anywhere else (History, programs): untouched.
