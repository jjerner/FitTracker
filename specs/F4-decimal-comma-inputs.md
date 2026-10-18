# F4 – Decimal comma in number fields

Source: `beta_test_feedback_2026-10-17.md` line 10 (reported 2026-10-15).

## Goal

Typing a Swedish decimal comma ("12,5") in any number field must work like a dot. Today some fields turn it into 0, NaN, or silently drop the value.

## Audit: which fields are affected

All fields already keep the raw text in state (good). The bug is in the parsing: plain `Number(text)` without turning "," into ".".

| Screen / field | File | Affected? | What goes wrong |
|---|---|---|---|
| Food amount (grams / servings) | `src/app/(tabs)/food/food/[foodId].tsx:204` | **Yes** | `Number(amount) \|\| 0` → preview shows 0 kcal, entry is saved with quantity 0 |
| Serving size (add / edit default) | `src/app/(tabs)/food/food/[foodId].tsx:150` | **Yes** | "Add": nothing happens. "Edit default": NaN is not > 0, so the default serving is **removed** |
| Custom food form (kcal, P, C, F, fiber, serving size) | `src/app/(tabs)/food/custom-food/new.tsx:41-47` | **Yes** | NaN sent to the DB → "Could not save"; serving size silently dropped |
| Nutrition goals (P, C, F) | `src/app/(tabs)/profile/goals.tsx:58,67-69` | **Yes** | Calorie total ignores the field; NaN saved as goal |
| Quick add (kcal, P, C, F) | `src/app/(tabs)/food/quick-add.tsx:29` | No | already replaces "," |
| Body weight | `src/app/(tabs)/progress.tsx:93` | No | already replaces "," |
| Active workout kg/reps | `src/app/(tabs)/workouts/active.tsx:53` | No | local `toNumberOrNull` replaces "," |
| Set edit in workout log | `src/app/(tabs)/workouts/log/[logId].tsx:29` | No | same local helper |
| Template targets | `src/app/(tabs)/workouts/[templateId].tsx:49` | No | same local helper |

## Files to touch

- `src/lib/numbers.ts` (new): export `toNumberOrNull(text: string): number | null` – the exact body already copied in the three workout files (`Number(text.replace(',', '.'))`, `null` for empty or NaN).
- `src/app/(tabs)/food/food/[foodId].tsx`: `amountNumber = toNumberOrNull(amount) ?? 0`; `size = toNumberOrNull(servingSize) ?? 0`.
- `src/app/(tabs)/food/custom-food/new.tsx`: parse each field with the helper; `isValid` also requires the four required fields to parse (not null).
- `src/app/(tabs)/profile/goals.tsx`: parse with the helper for the calorie total and the save; `isValid` requires all three to parse.
- `src/app/(tabs)/workouts/active.tsx`, `log/[logId].tsx`, `[templateId].tsx`: delete the local `toNumberOrNull`, import the shared one (same behaviour, removes 3 copies).

`LabeledInput` is not changed: it is a plain text box and parsing belongs where the value is used.

## Reuse

- The existing `toNumberOrNull` (workout screens) – moved, not rewritten.
- Raw-text-in-state pattern is already in place everywhere; keep it.

## Acceptance criteria

- [ ] Food screen: amount "12,5" g shows the same kcal preview as "12.5" and saves quantity 12.5.
- [ ] Food screen: amount "12," (mid-typing) shows the preview for 12, not 0.
- [ ] "Add serving size" with "45,5" creates a 45.5 g serving; "Edit default serving" with "45,5" keeps the default serving (not deleted).
- [ ] Custom food with "3,5" fat saves with fat 3.5; serving "30,5" is kept.
- [ ] Goals with "150,5" protein: calorie total updates and the goal saves as 150.5.
- [ ] Custom food and Goals Save stay disabled when a required field is not a number.
- [ ] Workout / quick add / body weight still behave as before.
- [ ] No `toNumberOrNull` copies left in the workout files; `npx tsc --noEmit` and `npx expo lint` pass.

## Test plan

Unit (`src/lib/__tests__/numbers.test.ts`): `"12,5"` → 12.5, `"12,"` → 12, `"12.5"` → 12.5, `""` and `"  "` → null, `"abc"` → null, `"0"` → 0.

On web (test account): type the comma values from the criteria above in Food amount, Add serving size, Edit default serving (on your own custom food), Custom food form, and Goals; check preview/total and the saved diary entry. Log one set in an active workout with "62,5" kg to confirm the moved helper. Note: a desktop keyboard is enough to type ","; the real Swedish phone keyboard goes on the phone test list in HANDOVER.md.

## Needs from the user

None (JS only, ships with `eas update`).

## Open questions

None.

## Decisions (user, 2026-10-18)

- Frontend only: accept "," as decimal separator in every number field; the box keeps what was typed (no live swap to ".").
- Fix all four affected screens in one PR.

## Out of scope

- Showing numbers back with a comma (display stays as today).
- Rejecting or filtering characters while typing.
- Changing `keyboardType` values or `LabeledInput`.
- Quick add's own `toNumber` (works; left as is).
