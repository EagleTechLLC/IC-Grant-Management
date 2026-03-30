-- =============================================================================
-- ACTIVITY TYPES
-- =============================================================================

-- Activity types per org (e.g. "Case Management", "Direct Services")
create table public.activity_types (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  color       text not null default '#6b7280',
  sort_order  integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_activity_types_org_id on public.activity_types(org_id);

-- Junction: which activity types a grant allows
create table public.grant_activity_types (
  grant_id          uuid not null references public.grants(id) on delete cascade,
  activity_type_id  uuid not null references public.activity_types(id) on delete cascade,
  primary key (grant_id, activity_type_id)
);

-- Add activity_type_id to time_logs (nullable — existing entries have no type)
alter table public.time_logs
  add column activity_type_id uuid references public.activity_types(id) on delete set null;

create index idx_time_logs_activity_type_id on public.time_logs(activity_type_id);

-- Add color to grants (admin-configurable, used for background tint on calendar events)
alter table public.grants
  add column color text not null default '#3b82f6';

-- =============================================================================
-- RLS: activity_types
-- =============================================================================

alter table public.activity_types enable row level security;

create policy "Org members can view activity types"
  on public.activity_types for select
  to authenticated
  using (org_id = public.get_user_org_id());

create policy "Admins can manage activity types"
  on public.activity_types for all
  to authenticated
  using (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =============================================================================
-- RLS: grant_activity_types
-- =============================================================================

alter table public.grant_activity_types enable row level security;

create policy "Org members can view grant activity type assignments"
  on public.grant_activity_types for select
  to authenticated
  using (
    exists (
      select 1 from public.grants
      where id = grant_id and org_id = public.get_user_org_id()
    )
  );

create policy "Admins can manage grant activity type assignments"
  on public.grant_activity_types for all
  to authenticated
  using (
    exists (
      select 1 from public.grants
      where id = grant_id and org_id = public.get_user_org_id()
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.grants
      where id = grant_id and org_id = public.get_user_org_id()
    )
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
