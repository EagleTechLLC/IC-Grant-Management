-- =============================================================================
-- ORGANIZATIONS: configurable time slot granularity + entry lock window
-- =============================================================================

alter table public.organizations
  add column time_slot_minutes integer not null default 15,
  add column lock_after_days    integer not null default 0;
-- lock_after_days = 0 → entries lock at midnight on the day they were created
-- lock_after_days = 1 → editable through end of the following day, etc.

-- =============================================================================
-- CLIENTS: alien registration number (A#)
-- =============================================================================

alter table public.clients
  add column alien_number text;

-- =============================================================================
-- TIME LOGS: correction tracking columns
-- =============================================================================

alter table public.time_logs
  add column correction_of uuid references public.time_logs(id) on delete set null,
  add column superseded_at  timestamptz;
-- correction_of  → points to the original entry this one is correcting
-- superseded_at  → set on the original when a correction is approved; hides it from calendar

-- =============================================================================
-- AUDIT LOG (append-only, written by DB trigger)
-- =============================================================================

create table public.time_log_audits (
  id          uuid        primary key default gen_random_uuid(),
  time_log_id uuid        not null references public.time_logs(id) on delete cascade,
  changed_by  uuid        references public.profiles(id) on delete set null,
  action      text        not null check (action in ('insert', 'update', 'delete')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create index idx_time_log_audits_log_id    on public.time_log_audits(time_log_id);
create index idx_time_log_audits_created   on public.time_log_audits(created_at);
create index idx_time_log_audits_changed_by on public.time_log_audits(changed_by);

alter table public.time_log_audits enable row level security;

-- Admins can read; nobody can insert/update/delete via API (trigger only)
create policy "Admins can view audit log"
  on public.time_log_audits for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
        and org_id = public.get_user_org_id()
    )
  );

-- Trigger function (security definer so it can always write audit rows)
create or replace function public.record_time_log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  -- Resolve caller from JWT when invoked via PostgREST/Supabase client
  begin
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  exception when others then
    v_user_id := null;
  end;

  if TG_OP = 'INSERT' then
    insert into public.time_log_audits(time_log_id, changed_by, action, new_data)
    values (NEW.id, v_user_id, 'insert', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.time_log_audits(time_log_id, changed_by, action, old_data, new_data)
    values (NEW.id, v_user_id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.time_log_audits(time_log_id, changed_by, action, old_data)
    values (OLD.id, v_user_id, 'delete', to_jsonb(OLD));
    return OLD;
  end if;
end;
$$;

create trigger time_log_audit_trigger
  after insert or update or delete on public.time_logs
  for each row execute function public.record_time_log_change();

-- =============================================================================
-- CORRECTION REQUESTS
-- =============================================================================

create table public.time_log_corrections (
  id                   uuid        primary key default gen_random_uuid(),
  org_id               uuid        not null references public.organizations(id) on delete cascade,
  original_log_id      uuid        not null references public.time_logs(id) on delete cascade,
  requested_by         uuid        not null references public.profiles(id),
  reason               text        not null,
  -- Full proposed replacement values (null = remove that field, e.g. remove grant)
  new_client_id        uuid        references public.clients(id),
  new_grant_id         uuid        references public.grants(id),
  new_activity_type_id uuid        references public.activity_types(id),
  new_start_time       timestamptz,
  new_end_time         timestamptz,
  new_case_note_ref    text,
  -- Admin response
  status               text        not null default 'pending'
                                   check (status in ('pending', 'approved', 'rejected')),
  reviewed_by          uuid        references public.profiles(id),
  review_note          text,
  reviewed_at          timestamptz,
  replacement_log_id   uuid        references public.time_logs(id) on delete set null,
  created_at           timestamptz not null default now()
);

create index idx_corrections_org_id       on public.time_log_corrections(org_id);
create index idx_corrections_status       on public.time_log_corrections(status);
create index idx_corrections_requested_by on public.time_log_corrections(requested_by);

alter table public.time_log_corrections enable row level security;

create policy "Caseworkers can submit corrections"
  on public.time_log_corrections for insert
  to authenticated
  with check (
    requested_by = auth.uid()
    and org_id = public.get_user_org_id()
  );

create policy "Users can view relevant corrections"
  on public.time_log_corrections for select
  to authenticated
  using (
    requested_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
        and org_id = public.get_user_org_id()
    )
  );

create policy "Admins can approve or reject corrections"
  on public.time_log_corrections for update
  to authenticated
  using (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
