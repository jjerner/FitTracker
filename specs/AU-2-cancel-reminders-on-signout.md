# AU-2: Cancel reminders on sign-out (issue #87)

## Goal
When the user signs out or deletes their account, the phone drops every food/meal reminder already booked, so nobody gets "You haven't logged any food today" for an account that is gone.

## Files to touch
- `src/lib/reminders.ts`: add `cancelAllReminders()`. It runs `Notifications.cancelAllScheduledNotificationsAsync()` through the existing `queue`, the same way `refreshFoodReminders()` does:
  ```ts
  // Sign-out: drop every booked reminder. Queued so a refresh already running can't re-book after it.
  export function cancelAllReminders(): Promise<void> {
    const run = queue.then(() => Notifications.cancelAllScheduledNotificationsAsync());
    queue = run.catch(() => {});
    return run;
  }
  ```
- `src/context/AuthProvider.tsx`: in the `onAuthStateChange` callback, use the event (rename `_event` to `event`) and add
  `if (event === 'SIGNED_OUT') cancelAllReminders().catch(() => {}); // rejects on web, where nothing is booked`
- `src/lib/__tests__/reminders.test.ts`: add `cancelAllScheduledNotificationsAsync` to the mock (wait a tick, then `mockStore.clear()`), plus one test (see Test plan).

## Reuse
- The `queue` in `reminders.ts` that `refreshFoodReminders()` already uses to run reminder jobs one at a time.
- `Notifications.cancelAllScheduledNotificationsAsync()` from `expo-notifications` ~57.0.22 (SDK 57). It is in `node_modules/expo-notifications/build/index.js`, so the name matches this SDK.
- Supabase's own `SIGNED_OUT` event. Both exits already fire it: `account.tsx:26` calls `supabase.auth.signOut()` and `delete-account.tsx:77` calls `signOut({ scope: 'local' })`. Both go through `_removeSession`, which sends `SIGNED_OUT` (auth-js `GoTrueClient.js:4435`). Neither screen needs a change.

## Checks done (answers to the brief)
- **Web:** `reminders.ts` is already loaded on web, through `(tabs)/_layout.tsx` and `foods.ts`, and it has no Platform guard. Importing it into `AuthProvider` adds no new web risk. On web, `cancelAllScheduledNotificationsAsync` throws `UnavailabilityError` inside an async function, so the promise rejects. The `.catch(() => {})` above handles that, so web logs no unhandled rejection.
- **Other notifications:** `reminders.ts` is the only code that books notifications; `scheduleNotificationAsync` appears nowhere else in `src/`. There is no rest-timer notification, so cancelling everything can't cut off a workout alert.
- **Existing helper:** `refresh()` already cancels by id prefix, but only after it reads settings and the session, and it returns early when no one is signed in. That is the bug. A separate one-line job in the same queue is simpler than reworking `refresh()`.
- **Delete account:** it ends with `signOut({ scope: 'local' })`, which fires `SIGNED_OUT`. Covered.

## Acceptance criteria
- [ ] Signing out from Profile > Account leaves no scheduled notifications on the phone.
- [ ] Deleting the account leaves no scheduled notifications on the phone.
- [ ] If a reminder refresh is still running when sign-out happens, the cancel runs after it finishes, so the refresh can't book reminders again afterwards.
- [ ] Signing back in books reminders again. Nothing new is needed for this: `(tabs)/_layout.tsx` calls `refreshFoodReminders()` when it mounts.
- [ ] Web: signing out shows no errors in the console.
- [ ] `npx tsc --noEmit`, `npx expo lint` and `npx jest` pass.

## Test plan
- Unit test (`reminders.test.ts`): start `refreshFoodReminders()` and then `cancelAllReminders()` without awaiting the first, then await both. Expect `mockStore` to be empty. This proves the cancel waited for the refresh, because a cancel that jumped the queue would leave the refresh's reminders behind.
- Web click-through (test account from `.env.test.local`): sign in, go to Profile > Account > Sign out, and check that the login screen shows and the console has no errors.
- Phone: see Needs from the user.

## Risk
🔴 changes existing: it changes what sign-out does and edits `AuthProvider` and the shared reminder queue, which every reminder refresh uses.

## Needs from the user
- A phone test, filed as a `phone-test` issue (notifications don't run on web). Steps:
  1. Turn on the food reminder and the meal reminder, with the food reminder set a few minutes ahead.
  2. Profile > Account > Sign out. Wait past the reminder time. Expect no notification.
  3. Sign in again, then set the reminder a few minutes ahead again. Expect the notification to come.
  4. On a throwaway account with reminders on, delete the account and wait past the reminder time. Expect no notification.
- Ships with `eas update`. No new APK build and no SQL.

## Decisions
- Cancel through a small helper in `reminders.ts` that uses the queue, not a bare call in `AuthProvider`. A refresh already running could otherwise book reminders again just after the cancel. It costs three lines.
- Cancel all notifications, not just ones with the reminder prefixes. Reminders are the only notifications the app books, and every one of them belongs to the account that signed out.
- Act on every `SIGNED_OUT`, including when a session expires. The user is signed out in each case, and signing in again rebuilds the reminders.
- Change neither screen. Both already fire `SIGNED_OUT`, and one hook in `AuthProvider` covers every way out.
- No Platform check on web. `.catch` is shorter and also covers any other place the call can fail.

## Open questions
None

## Out of scope
- Clearing the on-device reminder settings (`settings.ts`) on sign-out. They stay with the phone, so a next user on the same phone gets the same reminder settings. Nobody asked for this.
- Changing how `refresh()` acts when signed out.
- A `SIGNED_OUT` test for `AuthProvider`. The unit test covers the queue, and the phone test covers the wiring.
- Clearing notifications already shown in the tray. The task is about booked reminders.
