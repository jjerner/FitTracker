# GOALS-7: Slimmer maintenance card (jjerner/FitTracker#61)

## Goal

On Progress, move the "Estimated maintenance" card so it comes after "Nutrition averages". Cut it down to the estimate alone plus a "Set goals ›" link. Picking a pace and setting goals happens only in Profile → Goals.

## Files to touch

- `src/app/(tabs)/progress.tsx`
  - In `Progress()`, change the order to: `WeightCard`, `NutritionAveragesCard`, `MaintenanceCard`, `WorkoutsCard`, `MuscleSetsCard`, `TrackedExercisesCard`.
  - In `MaintenanceCard`, remove: `paceIndex` state, `pace`, `sex`, `target`, `goalMatches`, the "Pace for your goal" line, `<Chips>`, the clamp note, the "Your goal already matches this." line, and the "Use X kcal as my goal" `Pressable`. Drop `useBodyProfile` and `bodyLoading` from the loading check. Change the empty-state condition from `!estimate || !target` to `!estimate`.
  - Keep: the title, loading/error/empty states, "≈ X kcal / day", the "From N logged days…" line, the skipped-days line, and "Your goal: X kcal" (`useNutritionGoals` stays).
  - Add as the last child of the card's data branch: `<TextLink title="Set goals ›" onPress={() => router.push('/(tabs)/profile/goals', { withAnchor: true })} />` (default tone, no params). Keep the `withAnchor` comment ("Puts Profile under Goals so the stack has a back arrow").
  - Delete `KEEP_INDEX` and `GOAL_MATCH_KCAL`, and the styles `applyButton` and `clampNote`. Remove imports that are now unused: `Chips`, `useBodyProfile`, `MIN_KCAL`, `PACES`, `targetKcal`. Add the `TextLink` import. (`router`, `Pressable`, `useState`, `goalLine`, `countRow`, `button` and `buttonText` are still used elsewhere, so they stay.)
- `src/app/(tabs)/profile/goals.tsx`: the params code is now dead. Grep shows only `progress.tsx:267` sends `maintenance`/`kgPerWeek`, and `profile/index.tsx:43` opens Goals without params. Remove:
  - `useLocalSearchParams` (import and the `params` line plus its comment), the `Suggestion` type, `SPLITS`, the `suggestion` prop on `GoalsForm`, `splits`, `splitIndex`, and the two pre-fill blocks (L171–193).
  - `start` becomes `initialGoals`. In `handleSave`, `onSuccess` becomes `() => router.back()`, which drops the `dismissAll` + navigate-to-Progress branch.
  - The `suggestionFromParams` and `scaleMacros` imports, and the `suggestionText` style. (`Chips`, `macroDefaults`, `PACES`, `targetKcal`, `MIN_KCAL` and `spacing` are still used by `GoalHelper`, so they stay.)
- `src/lib/goalHelper.ts`: delete `suggestionFromParams` and `scaleMacros`. Their only caller was the pre-fill path.
- `src/lib/__tests__/goalHelper.test.ts`: delete the `scaleMacros` and `suggestionFromParams` `describe` blocks and their imports.

## Reuse

- `TextLink` (`src/components/TextLink.tsx`), default `primary` tone. It already gives a 48 dp tap area and `accessibilityRole="link"`.
- The existing `router.push(..., { withAnchor: true })` call from the card, minus the params.

## Acceptance criteria

- [ ] Progress card order: Body weight, Nutrition averages (per day), Estimated maintenance, Workouts, then the rest as before.
- [ ] With enough data, the card shows "≈ X kcal / day", the "From N logged days…" line, the skipped-days line (when there are skipped days), "Your goal: X kcal" (when a goal is saved), then "Set goals ›".
- [ ] There are no pace chips, no clamp note, no "Use X kcal as my goal" button and no "already matches" line.
- [ ] The loading, error and empty texts are unchanged. "Set goals ›" shows only when there is an estimate.
- [ ] Tapping "Set goals ›" opens Profile → Goals with a back arrow. No pre-fill text and no split chips appear. The fields show the saved goals.
- [ ] Save Goals goes back one screen (to Profile), the same as when Goals is opened from Profile.
- [ ] `suggestionFromParams` and `scaleMacros` are gone from the repo, and nothing references them (grep).
- [ ] `npx tsc --noEmit`, `npx expo lint` and `npx jest` pass.

## Test plan

- Unit: no new tests (this change only deletes code). Delete the two `describe` blocks named above. The `estimateMaintenance` tests in `src/lib/__tests__/progress.test.ts` stay unchanged and must pass.
- Web (test account from `.env.test.local`): open Progress and check the card order. The test account may not have 14 days of data. If not, check that the empty state shows below Nutrition averages and has no link. Don't seed data. If the account has an estimate, tap "Set goals ›", check the back arrow and that no pre-fill shows, then Save and check it returns to Profile. Also check Profile → Nutrition Goals → helper → Fill in suggestion → Save still works. Check the console for errors.
- Phone (`phone-test` issue, only if the web account has no estimate): on an account with 14+ days of data, check the slim card and that "Set goals ›" opens Goals.

## Risk

🔴 changes existing: it removes a feature from an existing card, reorders Progress, and deletes shared helpers from `goalHelper.ts` plus the pre-fill path on Goals.

## Needs from the user

None. Ships with `eas update`, with no migration and no new APK.

## Open questions

None.

## Out of scope

- Any restyling of the card or the screen. DS-5 does that later, and the new link is the only new UI.
- Showing the maintenance number on the Goals screen, or passing it there in any form.
- Saving a pace (#55) and the weekly check-in (#57).
- Updating `specs/DS-6-profile-design-system.md`. Its notes on goals.tsx L172–193 (the pre-fill text and Chips) and its test step "Progress → maintenance card → Goals: the pre-fill text shows" go stale once this ships. Fix that spec before DS-6 is built.
