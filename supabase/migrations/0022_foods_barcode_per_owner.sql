-- One barcode per owner (AU-1). The old foods_barcode_key allowed each barcode once in the whole
-- table, so one user's private custom food blocked every other user and the shared OFF copy.
-- Partial (barcode is not null): Livsmedelsverket rows and many custom foods have no barcode, and
-- NULLS NOT DISTINCT would make all of those clash. Can't fail on existing data: the old
-- constraint was stricter (each barcode at most once).
create unique index foods_barcode_owner_key
  on public.foods (barcode, created_by) nulls not distinct
  where barcode is not null;

alter table public.foods drop constraint foods_barcode_key;

-- Shared OFF rows must have no owner. The old check (source = 'off' or ...) let anyone insert an
-- 'off' row with someone else's created_by, and per-owner barcodes would let that row win the
-- victim's scan lookup.
drop policy "Users can insert OFF-sourced foods" on public.foods;
create policy "Users can insert shared OFF foods or their own"
  on public.foods for insert
  to authenticated
  with check ((source = 'off' and created_by is null) or created_by = auth.uid());
