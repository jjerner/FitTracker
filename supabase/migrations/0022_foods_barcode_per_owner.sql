-- One barcode per owner (AU-1). The old foods_barcode_key allowed each barcode once in the whole
-- table, so one user's private custom food blocked every other user and the shared OFF copy.
-- Partial (barcode is not null): Livsmedelsverket rows and many custom foods have no barcode, and
-- NULLS NOT DISTINCT would make all of those clash. Can't fail on existing data: the old
-- constraint was stricter (each barcode at most once).
create unique index foods_barcode_owner_key
  on public.foods (barcode, created_by) nulls not distinct
  where barcode is not null;

alter table public.foods drop constraint foods_barcode_key;
