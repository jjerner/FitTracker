# F3 – Missing-dinner reminder fired twice

Source: `beta_test_feedback_2026-10-17.md` line 8 (reported 2026-10-15).

## Goal

Make reminder refreshes run one at a time, so the scheduled reminders always match the latest diary. Confirm with the user whether the duplicate came from a second app install.

## Root cause analysis

**1. Overlapping refreshes (real bug in our code).** `refreshFoodReminders` (`src/lib/reminders.ts:60-85`) reads the diary, lists the scheduled reminders, cancels them, then schedules new ones. Many places start it without waiting for each other: app open (`src/app/(tabs)/_layout.tsx:25`), app back to foreground (`_layout.tsx:27`, which can fire right after the first one on a cold start), and every food log/edit/delete (`src/lib/foods.ts:327, 350, 386, 417, 434, 523, 541, 547`). Nothing stops two runs from overlapping.

**2. But overlapping runs cannot leave two copies of the same reminder.** Reminder ids are fixed per day slot (`meal-reminder-0` … `-13`, `reminders.ts:82`). On Android, expo-notifications stores each request and its alarm under its id, so scheduling the same id again replaces the old one:
- `SharedPreferencesNotificationsStore.saveNotificationRequest` overwrites by id
- `NotificationsService.createNotificationTrigger` (`node_modules/expo-notifications/android/.../NotificationsService.kt:416`) builds the alarm from a URI that includes the id (`scheduled/<id>/trigger`)

So the race causes a different bug: a reminder that is out of date or missing. Example: run A reads "no dinner", then you log dinner and run B reads "dinner logged". If B cancels before A schedules, A's "Nothing logged for dinner yet." stays even though dinner is logged. If the order is the other way round, the reminder can disappear. Worth fixing either way.

**3. Most likely cause of the duplicate: two copies of the app on the phone, both with the reminder on.** Two notifications with the same text must have two different ids, or come from two apps. Only `meal-reminder-0` (today) can say "dinner" alone (`reminders.ts:80`). The other slots always name all three meals, and food reminders use other text. The setting and the schedule are stored per install (AsyncStorage, `src/lib/settings.ts:55-61`). So the release APK plus Expo Go (or a dev build) signed in on the same phone would each fire their own 20:30 reminder. The code can't prove this. The user has to check (see Needs from the user).

Ruled out: id clashes between food and meal reminders (different prefixes, `reminders.ts:7-8`). Stale reminders from earlier days are also ruled out, because every successful refresh cancels both prefixes (`reminders.ts:67-72`).

## Files to touch

- `src/lib/reminders.ts`: rename today's body to a private `refresh()`. Export `refreshFoodReminders` as a small queue: each call waits for the run before it, so runs never overlap and the last one always sees the newest diary. About 4 lines:
  ```ts
  let queue: Promise<void> = Promise.resolve();
  export function refreshFoodReminders(): Promise<void> {
    const run = queue.then(refresh);
    queue = run.catch(() => {});
    return run;
  }
  ```
  The signature stays the same, so no caller changes.
- `src/lib/__tests__/reminders.test.ts`: add the overlap test (below).

## Reuse

- Existing `refreshFoodReminders` body and its offline guard. Only the wrapper is new.
- Existing jest mocks in `reminders.test.ts`.

## Acceptance criteria

- [ ] Two `refreshFoodReminders()` calls started together run one after the other. The second one reads the diary only after the first one has finished scheduling.
- [ ] Log dinner while another refresh is running: no "Nothing logged for dinner yet." reminder is left scheduled for today.
- [ ] If one run fails, the next call still runs (the queue doesn't get stuck).
- [ ] The existing reminder tests still pass. `npx tsc --noEmit`, `npx expo lint` and `npx jest` pass.

## Test plan

Unit (`reminders.test.ts`):
- Turn the expo-notifications mock into a small fake store: a `Map` that `schedule` writes to, `cancel` deletes from, and `getAll` lists. Make each call wait one tick so runs can interleave.
- Make the Supabase mock return answers from a list, one per call: call 1 gets `[breakfast, lunch]`, call 2 gets `[breakfast, lunch, dinner]`.
- Start both refreshes together with `Promise.all`. Expect the store to have no `meal-reminder-0` and to still have `meal-reminder-1`. This test should fail without the queue.
- Make the first call throw (e.g. `getPermissionsAsync` rejects once). Expect the second call to still schedule.

Web: no part of this runs on web. Add to the phone test list in HANDOVER.md:
- Meal reminder on, breakfast and lunch logged. Close and reopen the app a few times, then log a snack. At 20:30 exactly one "Nothing logged for dinner yet." should arrive.
- Next day, log dinner before 20:30. No meal reminder should arrive.

## Needs from the user

- Check the phone: is FitTrack also open in Expo Go or a dev build, signed in, with the missing-meal reminder on? If so, turn it off there. That alone explains the duplicate.
- If you remember: did the two notifications arrive at the same minute, and did both say "Nothing logged for dinner yet."? If it happens again after this fix and there is only one install, take a screenshot of the notification shade.
- Ships with `eas update` (JS only). No SQL, no new build.

## Open questions

None.

## Decisions (user, 2026-10-18)

- User likely had a second copy (Expo Go / dev build) with the reminder on and has removed it.
- Build the queue fix anyway; a failed run must never block later runs.

## Out of scope

- Moving from per-day-slot ids to per-date ids, or other changes to the schedule-ahead design.
- Using the exact-alarm permission or changing OnePlus battery-saver handling.
- Making the food reminder and the meal reminder suppress each other.
