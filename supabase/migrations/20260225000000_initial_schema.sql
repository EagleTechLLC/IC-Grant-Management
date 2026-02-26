-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================================================
-- TABLES
-- =============================================================================

-- 1. Organizations
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 2. Profiles (linked to auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'caseworker' check (role in ('admin', 'caseworker')),
  full_name text,
  email text
);

-- 3. Grants
create table public.grants (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  grant_code text not null,
  name text not null,
  metadata jsonb
);

-- 4. Clients
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null
);

-- 5. Time Logs
create table public.time_logs (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  caseworker_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  grant_id uuid references public.grants(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  case_note_ref text,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

create index idx_profiles_org_id on public.profiles(org_id);
create index idx_grants_org_id on public.grants(org_id);
create index idx_clients_org_id on public.clients(org_id);
create index idx_time_logs_org_id on public.time_logs(org_id);
create index idx_time_logs_caseworker_id on public.time_logs(caseworker_id);
create index idx_time_logs_client_id on public.time_logs(client_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Helper: get the current user's org_id from their profile
create or replace function public.get_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

-- --- Organizations ---
alter table public.organizations enable row level security;

create policy "Users can view their own organization"
  on public.organizations for select
  to authenticated
  using (id = public.get_user_org_id());

-- --- Profiles ---
alter table public.profiles enable row level security;

create policy "Users can view profiles in their organization"
  on public.profiles for select
  to authenticated
  using (org_id = public.get_user_org_id());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- --- Grants ---
alter table public.grants enable row level security;

create policy "Users can view grants in their organization"
  on public.grants for select
  to authenticated
  using (org_id = public.get_user_org_id());

create policy "Admins can insert grants"
  on public.grants for insert
  to authenticated
  with check (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update grants"
  on public.grants for update
  to authenticated
  using (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete grants"
  on public.grants for delete
  to authenticated
  using (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- --- Clients ---
alter table public.clients enable row level security;

create policy "Users can view clients in their organization"
  on public.clients for select
  to authenticated
  using (org_id = public.get_user_org_id());

create policy "Users can insert clients in their organization"
  on public.clients for insert
  to authenticated
  with check (org_id = public.get_user_org_id());

create policy "Users can update clients in their organization"
  on public.clients for update
  to authenticated
  using (org_id = public.get_user_org_id());

create policy "Admins can delete clients"
  on public.clients for delete
  to authenticated
  using (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- --- Time Logs ---
alter table public.time_logs enable row level security;

create policy "Users can view time logs in their organization"
  on public.time_logs for select
  to authenticated
  using (org_id = public.get_user_org_id());

create policy "Caseworkers can insert their own time logs"
  on public.time_logs for insert
  to authenticated
  with check (
    org_id = public.get_user_org_id()
    and caseworker_id = auth.uid()
  );

create policy "Caseworkers can update their own time logs"
  on public.time_logs for update
  to authenticated
  using (
    org_id = public.get_user_org_id()
    and caseworker_id = auth.uid()
  );

create policy "Admins can delete time logs in their organization"
  on public.time_logs for delete
  to authenticated
  using (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
