-- =============================================================================
-- ADMIN AUDITS: technical audit log for configuration changes
-- Separate from time_log_audits (operational grant-reporting log).
-- Tracks changes to grants, activity_types, profiles (role changes),
-- and organizations (settings changes).
-- =============================================================================

create table public.admin_audits (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organizations(id) on delete cascade,
  table_name  text        not null,
  record_id   uuid        not null,
  changed_by  uuid        references public.profiles(id) on delete set null,
  action      text        not null check (action in ('insert', 'update', 'delete')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create index idx_admin_audits_org_id     on public.admin_audits(org_id);
create index idx_admin_audits_table      on public.admin_audits(table_name);
create index idx_admin_audits_created    on public.admin_audits(created_at);
create index idx_admin_audits_changed_by on public.admin_audits(changed_by);

alter table public.admin_audits enable row level security;

-- Admins can read their own org's config audit records; no API writes (trigger only)
create policy "Admins can view admin audit log"
  on public.admin_audits for select
  to authenticated
  using (
    org_id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =============================================================================
-- Trigger function (shared across all audited config tables)
-- Tables with org_id column: grants, activity_types, profiles
-- organizations table: org_id is the row's own id
-- =============================================================================

create or replace function public.record_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id  uuid;
  v_org_id   uuid;
  v_record_id uuid;
  v_old      jsonb;
  v_new      jsonb;
begin
  begin
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  exception when others then
    v_user_id := null;
  end;

  if TG_OP = 'DELETE' then
    v_record_id := OLD.id;
    v_old       := to_jsonb(OLD);
    v_new       := null;
    -- For organizations the org_id IS the record id
    if TG_TABLE_NAME = 'organizations' then
      v_org_id := OLD.id;
    else
      v_org_id := OLD.org_id;
    end if;
  else
    v_record_id := NEW.id;
    v_new       := to_jsonb(NEW);
    v_old       := case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end;
    if TG_TABLE_NAME = 'organizations' then
      v_org_id := NEW.id;
    else
      v_org_id := NEW.org_id;
    end if;
  end if;

  insert into public.admin_audits(
    org_id, table_name, record_id, changed_by, action, old_data, new_data
  ) values (
    v_org_id, TG_TABLE_NAME, v_record_id, v_user_id, lower(TG_OP), v_old, v_new
  );

  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;

-- =============================================================================
-- Attach trigger to each audited table
-- =============================================================================

create trigger admin_audit_grants
  after insert or update or delete on public.grants
  for each row execute function public.record_admin_change();

create trigger admin_audit_activity_types
  after insert or update or delete on public.activity_types
  for each row execute function public.record_admin_change();

create trigger admin_audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.record_admin_change();

create trigger admin_audit_organizations
  after update on public.organizations
  for each row execute function public.record_admin_change();
