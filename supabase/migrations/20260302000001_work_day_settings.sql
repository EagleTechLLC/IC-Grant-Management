-- Add configurable work day time window to organizations
alter table public.organizations
  add column work_day_start time not null default '08:00',
  add column work_day_end time not null default '16:30';

-- Allow admins to update their organization's settings
create policy "Admins can update their organization"
  on public.organizations for update
  to authenticated
  using (
    id = public.get_user_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
