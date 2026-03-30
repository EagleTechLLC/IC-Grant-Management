-- Add archived_at to grants for soft-delete / archive workflow
alter table public.grants add column archived_at timestamptz;
