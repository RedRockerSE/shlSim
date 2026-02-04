create extension if not exists "pgcrypto";

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  name text,
  teams jsonb not null default '[]'::jsonb,
  games jsonb not null default '[]'::jsonb,
  public_slug text unique,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists tables_owner_unique on public.tables (owner_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_tables_updated_at on public.tables;
create trigger set_tables_updated_at
before update on public.tables
for each row execute procedure public.set_updated_at();

alter table public.tables enable row level security;

drop policy if exists "tables_select_own" on public.tables;
create policy "tables_select_own"
on public.tables
for select
using (auth.uid() = owner_id);

drop policy if exists "tables_insert_own" on public.tables;
create policy "tables_insert_own"
on public.tables
for insert
with check (auth.uid() = owner_id);

drop policy if exists "tables_update_own" on public.tables;
create policy "tables_update_own"
on public.tables
for update
using (auth.uid() = owner_id);

drop policy if exists "tables_delete_own" on public.tables;
create policy "tables_delete_own"
on public.tables
for delete
using (auth.uid() = owner_id);

create or replace function public.get_table_by_slug(slug text)
returns table (
  id uuid,
  name text,
  teams jsonb,
  games jsonb,
  public_slug text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.name, t.teams, t.games, t.public_slug, t.updated_at
  from public.tables t
  where t.public_slug = slug
  limit 1;
$$;

grant execute on function public.get_table_by_slug(text) to anon, authenticated;
