-- A saved meal logged to the diary becomes one group: its entries share a group_id
-- and group_name, so the diary can show them as a single expandable row.
alter table public.food_log_entries
  add column group_id uuid,
  add column group_name text;

create index food_log_entries_group_idx on public.food_log_entries (group_id);
