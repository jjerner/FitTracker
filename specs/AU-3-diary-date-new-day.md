# AU-3 – Diary date moves to today on a new day

Issue: jjerner/FitTracker#88

## Goal

When the app comes back to the front on a new calendar day, the shared diary date becomes today, so the Food tab and "Log Food" never land on yesterday by accident.

## Files to touch

- `src/context/DiaryDateProvider.tsx` only. Add one `useEffect` (empty deps) to `DiaryDateProvider`:

  ```tsx
  // Android keeps the app alive overnight; a new day starts on today.
  useEffect(() => {
    let day = todayLocalDate();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || todayLocalDate() === day) return;
      day = todayLocalDate();
      setDate(day);
    });
    return () => sub.remove();
  }, []);
  ```

  Imports: add `useEffect` from `react`, `AppState` from `react-native`. No other file changes.

## Reuse

- `todayLocalDate` from `src/lib/dateUtils.ts`.
- The `AppState.addEventListener('change', …)` + `sub.remove()` pattern already in `src/app/(tabs)/_layout.tsx` and `src/lib/pendingSets.ts`.
- Home's `setDate(today)` in `openDiary`/`logFood` (`src/app/(tabs)/home.tsx`) stays as is; it covers taps from Home, this covers coming back to the app. No duplication to remove.

## Acceptance criteria

- [ ] App left open on any diary date, sent to the background, brought back after midnight: Food tab shows "Today" (the new day) and food logged lands on the new day.
- [ ] App brought back on the same calendar day: the diary date is unchanged (a past day picked earlier today stays picked).
- [ ] Day arrows, calendar picker, "Today" button and Home's "Log Food"/diary links work as before.
- [ ] No ref is read during render (`react-hooks/refs` rule); `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

- Unit tests: none. The logic is one comparison inside an event listener; testing it needs a render library the repo does not have (`jest-expo` only, no `@testing-library/react-native`) plus faked clocks. Not worth a new dependency.
- Web (`npx expo start --web --port 8081`, test account from `.env.test.local`), regression only:
  - Food tab → go back two days with ‹. Switch to another browser tab and back (web `AppState` follows `visibilitychange`). Date still shows the picked day.
  - Log a food on that day, it lands on that day. Home → "Log Food" still goes to today.
  - Console has no errors.
  - Optional new-day check: DevTools → Sensors → Location → set a timezone a few hours ahead so it is already tomorrow there, then hide and show the browser tab; the Food tab should jump to the new today. If the override doesn't take effect on a live page, skip it; the phone test covers it.
- Phone test issue (`phone-test` label): "Diary date after midnight". Steps: 1) Before midnight, open Food tab, leave it on Today (or pick yesterday). 2) Press Home on the phone, don't swipe the app away. 3) After midnight (or set the phone clock forward a day), reopen the app. 4) Food tab shows Today with an empty diary for the new day; log a food and check it is on the new day. 5) Set the clock back afterwards.

## Risk

🔴 changes existing – it changes shared state (`DiaryDateProvider`) that the Food tab, search, quick add, saved meals and Home all read.

## Needs from the user

None. JS-only: ships with `eas update`, no SQL, no new APK.

## Decisions

- Compare against the day seen when the provider mounted / last came to the front (a variable inside the effect), not against the selected date. Why: that is the only way to tell "new day" from "user picked a past day today".
- After midnight, reset to today even if the user had picked a past day. Why: simplest rule, matches the issue ("keep a past day … during the same day"), and a picked day from yesterday's session is stale.
- Use a plain `let` inside the effect, not a `useRef`. Why: one listener for the provider's lifetime, so a closure variable is enough and it sidesteps the `react-hooks/refs` gotcha in `docs/PROJECT_NOTES.md`.
- Update `day` only when it changed and we reset. Why: it is equivalent and keeps the listener to one branch.
- No unit test. Why: see Test plan; would need a new test dependency for a 6-line listener.
- Keep Home's own `setDate(today)` calls. Why: they handle "tap from Home" while the app is already open, which this fix does not cover.

## Open questions

None.

## Out of scope

- App kept in the foreground across midnight (screen on, never backgrounded): no timer to catch midnight. Rare; Home's links still reset.
- Other screens that compute `todayLocalDate()` at render (Home ring, Progress) — they recompute on their next render already; not touched.
- Refetching diary queries on resume; the date change already changes the query key.
