-- OFF foods are saved per user now (FIX-3). A shared row could be planted by anyone with fake
-- nutrition under a real barcode. Existing shared rows stay readable (0014) for old entries.
drop policy "Users can insert shared OFF foods or their own" on public.foods;
create policy "Users can insert their own foods"
  on public.foods for insert
  to authenticated
  with check (created_by = auth.uid());
