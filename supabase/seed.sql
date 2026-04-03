-- =============================================================================
-- SEED / RESET SCRIPT
-- Run via: supabase db reset (local) or psql $DATABASE_URL -f supabase/seed.sql
-- Wipes all app data and reseeds with known fixture data for E2E / RLS tests.
-- Uses fixed UUIDs so tests can reference specific records without querying first.
-- =============================================================================

-- ── Wipe ──────────────────────────────────────────────────────────────────────

truncate table
  public.admin_audits,
  public.time_log_audits,
  public.time_log_corrections,
  public.time_logs,
  public.grant_activity_types,
  public.activity_types,
  public.grants,
  public.clients,
  public.profiles,
  public.organizations
restart identity cascade;

-- Remove only test auth users (keeps any real users intact on dev)
delete from auth.users where email like '%@test.ic' or email like '%@test.org2';

-- ── Auth users ────────────────────────────────────────────────────────────────

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  -- Org 1: International Center
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@test.ic',
   crypt('TestPass123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alice@test.ic',
   crypt('TestPass123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bob@test.ic',
   crypt('TestPass123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  -- Org 2: Demo Org (for RLS isolation tests)
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@test.org2',
   crypt('TestPass123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}'),

  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'worker@test.org2',
   crypt('TestPass123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}');

-- ── Organizations ─────────────────────────────────────────────────────────────

insert into public.organizations (id, name, work_day_start, work_day_end, time_slot_minutes, lock_after_days, audit_retention_years)
values
  ('00000000-0000-0000-0000-000000000001', 'International Center',
   '08:00', '17:00', 15, 2, 7),
  ('00000000-0000-0000-0000-000000000002', 'Demo Org',
   '09:00', '17:00', 15, 1, 7);

-- ── Profiles ──────────────────────────────────────────────────────────────────

insert into public.profiles (id, org_id, role, full_name, email)
values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'admin',      'IC Admin',    'admin@test.ic'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
   'caseworker', 'Alice Smith', 'alice@test.ic'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001',
   'caseworker', 'Bob Jones',   'bob@test.ic'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002',
   'admin',      'Org2 Admin',  'admin@test.org2'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002',
   'caseworker', 'Org2 Worker', 'worker@test.org2');

-- ── Activity Types (Org 1) ────────────────────────────────────────────────────

insert into public.activity_types (id, org_id, name, activity_code, color, sort_order)
values
  ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000001',
   'Case Management',  'CM',    '#3b82f6', 0),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001',
   'Direct Services',  'DS',    '#22c55e', 1),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001',
   'Advocacy',         'ADV',   '#8b5cf6', 2),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001',
   'Transportation',   'TRANS', '#f97316', 3),
  -- Archived type (should not appear in dropdowns)
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001',
   'Outreach',         'OUT',   '#64748b', 4,
   archived_at => now());

-- ── Grants (Org 1) ───────────────────────────────────────────────────────────

insert into public.grants (id, org_id, grant_code, name, color)
values
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001',
   'RCA-2026', 'Refugee Cash Assistance', '#3b82f6'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
   'EMP-2026',  'Employment Services',    '#22c55e');

-- ── Grant → Activity Type assignments ────────────────────────────────────────

insert into public.grant_activity_types (grant_id, activity_type_id)
values
  -- RCA allows all four active types
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000200'),
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201'),
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202'),
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000203'),
  -- EMP allows only CM and DS
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000200'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201');

-- ── Grants (Org 2) ───────────────────────────────────────────────────────────

insert into public.grants (id, org_id, grant_code, name, color)
values
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002',
   'ORG2-GRANT', 'Org2 Grant', '#ec4899');

-- ── Clients ───────────────────────────────────────────────────────────────────

insert into public.clients (id, org_id, first_name, last_name, alien_number)
values
  -- Org 1
  ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000001',
   'Jane',    'Smith',   '123456789'),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001',
   'Carlos',  'Johnson', null),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001',
   'Mai',     'Nguyen',  '987654321'),
  -- Org 2 (must not be visible to Org 1 users — RLS test target)
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000002',
   'Org2',    'Client',  null);

-- ── Time Logs ─────────────────────────────────────────────────────────────────
-- Mix of: recent (editable), old (locked), superseded (replaced by correction)

insert into public.time_logs (
  id, org_id, caseworker_id, client_id, grant_id, activity_type_id,
  start_time, end_time, case_note_ref
)
values
  -- Today: unlocked, editable
  ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000011', -- alice
   '00000000-0000-0000-0000-000000000300', -- Smith
   '00000000-0000-0000-0000-000000000100', -- RCA
   '00000000-0000-0000-0000-000000000200', -- CM
   now()::date + '09:00'::time, now()::date + '10:00'::time, 'CN-001'),

  -- Today: second block, different client
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000301', -- Johnson
   '00000000-0000-0000-0000-000000000101', -- EMP
   '00000000-0000-0000-0000-000000000201', -- DS
   now()::date + '10:30'::time, now()::date + '11:30'::time, null),

  -- 30 days ago: locked (lock_after_days = 2 for test org)
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000302', -- Nguyen
   '00000000-0000-0000-0000-000000000100', -- RCA
   '00000000-0000-0000-0000-000000000202', -- ADV
   (now() - interval '30 days')::date + '09:00'::time,
   (now() - interval '30 days')::date + '10:00'::time, null),

  -- 30 days ago: locked AND superseded (has approved correction)
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000300', -- Smith
   '00000000-0000-0000-0000-000000000100', -- RCA
   '00000000-0000-0000-0000-000000000200', -- CM
   (now() - interval '30 days')::date + '14:00'::time,
   (now() - interval '30 days')::date + '15:00'::time, null,
   superseded_at => now()),

  -- Replacement entry (correction of #403)
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000300', -- Smith
   '00000000-0000-0000-0000-000000000100', -- RCA
   '00000000-0000-0000-0000-000000000200', -- CM
   (now() - interval '30 days')::date + '14:00'::time,
   (now() - interval '30 days')::date + '16:00'::time, 'corrected',
   correction_of => '00000000-0000-0000-0000-000000000403'),

  -- Bob's entry today (separate caseworker — tests caseworker isolation)
  ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000012', -- bob
   '00000000-0000-0000-0000-000000000300', -- Smith
   '00000000-0000-0000-0000-000000000100', -- RCA
   '00000000-0000-0000-0000-000000000200', -- CM
   now()::date + '09:00'::time, now()::date + '09:30'::time, null),

  -- Org 2 time log (must not be visible to Org 1 — RLS test target)
  ('00000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000310',
   '00000000-0000-0000-0000-000000000102', -- Org2 grant
   null,
   now()::date + '09:00'::time, now()::date + '10:00'::time, null);

-- ── Pending correction request (for corrections queue tests) ──────────────────

insert into public.time_log_corrections (
  id, org_id, original_log_id, requested_by, reason,
  new_client_id, new_grant_id, new_activity_type_id,
  new_start_time, new_end_time, new_case_note_ref, status
)
values (
  '00000000-0000-0000-0000-000000000500',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000402', -- locked entry
  '00000000-0000-0000-0000-000000000011', -- alice
  'Wrong activity type logged — should have been Direct Services.',
  '00000000-0000-0000-0000-000000000302', -- Nguyen (same)
  '00000000-0000-0000-0000-000000000100', -- RCA (same)
  '00000000-0000-0000-0000-000000000201', -- DS (corrected)
  (now() - interval '30 days')::date + '09:00'::time,
  (now() - interval '30 days')::date + '10:00'::time,
  null,
  'pending'
);
