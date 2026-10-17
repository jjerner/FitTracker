# Fittracker – Beta test feedback (round 2)

Collected 2026-10-10 – 2026-10-17. Nothing fixed yet. Round 1: `beta_test_feedback.md`.

## Bugs / issues
- [ ] Sign-up confirmation email links to a localhost site (2026-10-10)
- [ ] Email confirmation isn't required — user can log in without confirming (2026-10-10)
- [ ] Missing-dinner food-log reminder fired twice (duplicate notification) (2026-10-15)
  - Check: scheduled twice (app open + background)? old notification not cancelled before rescheduling? same time or two different times?
- [ ] Typing "," in the food weight field resets the value to 0 (2026-10-15)
  - Likely cause: Swedish keyboard decimal ","; `Number("12,")` → NaN → falls back to 0. Fix: keep raw text in state, replace "," with ".", parse on blur/save

## UX / feature ideas
- [ ] "Save as meal" popup: list all items being saved with checkboxes (all checked by default) so items can be excluded (2026-10-10)
- [ ] Calorie ring: show the same info as Lifesum's ring, but without calories burned (2026-10-10)
- [ ] Custom meal from a cooked batch (2026-10-15): log every ingredient in the batch + how many portions it yielded → meal size of 1 portion
  - Example: pancake batter ingredients + "made 12 pancakes" → log 1, 2 or 2.5 pancakes
  - Open questions:
    - Yield by count only, or also by cooked weight (weigh the pot, log 350 g)?
    - Save as a reusable recipe (re-cook, tweak amounts next time)?
    - Separate recipe type, or an option on "Save as meal" / custom meals?

## Todo
- [ ] Add ponytail skill; evaluate need for refactoring of the code (2026-10-10)
