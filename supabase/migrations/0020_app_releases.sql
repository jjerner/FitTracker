-- One row per APK build; the app shows an update banner when a newer row exists. Rows are added by hand after each eas build.
create table public.app_releases (
  version_code int primary key,
  install_url text not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.app_releases enable row level security;
-- No insert/update/delete policy: the app can only read. Rows go in through the SQL editor (table owner).
create policy "Signed-in users can read app releases"
  on public.app_releases for select to authenticated using (true);
