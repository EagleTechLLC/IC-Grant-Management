-- =============================================================================
-- MULTI-TENANT AUDIT HARDENING
-- =============================================================================

-- =============================================================================
-- 1. time_log_audits: stamp org_id at write time for multi-tenant isolation
--    and fix ON DELETE CASCADE → SET NULL so audit rows survive log deletion
-- =============================================================================

-- Add org_id directly on the audit row (denormalized; survives time_log deletion)
alter table public.time_log_audits
  add column org_id uuid references public.organizations(id) on delete set null;

-- Backfill existing rows from their time_log
update public.time_log_audits tla
set org_id = tl.org_id
from public.time_logs tl
where tla.time_log_id = tl.id;

create index idx_time_log_audits_org_id on public.time_log_audits(org_id);

-- Make time_log_id nullable — it will be set null when the underlying log is deleted
alter table public.time_log_audits
  alter column time_log_id drop not null;

-- Replace CASCADE with SET NULL so audit records are never silently deleted
alter table public.time_log_audits
  drop constraint time_log_audits_time_log_id_fkey;

alter table public.time_log_audits
  add constraint time_log_audits_time_log_id_fkey
  foreign key (time_log_id) references public.time_logs(id) on delete set null;

-- Update RLS: read from org_id directly instead of joining through time_logs
drop policy if exists "Admins can view audit log" on public.time_log_audits;

create policy "Admins can view audit log"
  on public.time_log_audits for select
  to authenticated
  using (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Update trigger to write org_id at insert time
create or replace function public.record_time_log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  begin
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  exception when others then
    v_user_id := null;
  end;

  if TG_OP = 'INSERT' then
    insert into public.time_log_audits(time_log_id, changed_by, action, new_data, org_id)
    values (NEW.id, v_user_id, 'insert', to_jsonb(NEW), NEW.org_id);
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.time_log_audits(time_log_id, changed_by, action, old_data, new_data, org_id)
    values (NEW.id, v_user_id, 'update', to_jsonb(OLD), to_jsonb(NEW), NEW.org_id);
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.time_log_audits(time_log_id, changed_by, action, old_data, org_id)
    values (OLD.id, v_user_id, 'delete', to_jsonb(OLD), OLD.org_id);
    return OLD;
  end if;
end;
$$;

-- =============================================================================
-- 2. organizations: audit retention policy (metadata only for now)
--    Enforcement via scheduled job when needed — 7 years is standard for
--    federal grant compliance (HHS / ORR).
-- =============================================================================

alter table public.organizations
  add column audit_retention_years integer not null default 7;

-- =============================================================================
-- 3. grant_activity_types: audit activity type assignment/unassignment changes
--    Junction table has no id column so we use grant_id as record_id.
-- =============================================================================

create or replace function public.record_grant_activity_type_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_org_id  uuid;
begin
  begin
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  exception when others then
    v_user_id := null;
  end;

  if TG_OP = 'DELETE' then
    select org_id into v_org_id from public.grants where id = OLD.grant_id;
    insert into public.admin_audits(org_id, table_name, record_id, changed_by, action, old_data)
    values (v_org_id, 'grant_activity_types', OLD.grant_id, v_user_id, 'delete', to_jsonb(OLD));
    return OLD;
  else
    select org_id into v_org_id from public.grants where id = NEW.grant_id;
    insert into public.admin_audits(org_id, table_name, record_id, changed_by, action, new_data)
    values (v_org_id, 'grant_activity_types', NEW.grant_id, v_user_id, 'insert', to_jsonb(NEW));
    return NEW;
  end if;
end;
$$;

create trigger admin_audit_grant_activity_types
  after insert or delete on public.grant_activity_types
  for each row execute function public.record_grant_activity_type_change();
