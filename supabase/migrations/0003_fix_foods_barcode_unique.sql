-- The partial unique index (WHERE barcode IS NOT NULL) can't be used as an
-- ON CONFLICT (barcode) target for upserts. A plain UNIQUE constraint still
-- allows multiple NULLs (for custom foods) and works as an upsert target.

drop index if exists public.foods_barcode_unique;

alter table public.foods
  add constraint foods_barcode_key unique (barcode);
