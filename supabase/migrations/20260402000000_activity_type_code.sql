-- =============================================================================
-- ACTIVITY TYPES: add short code for unambiguous reporting
-- =============================================================================

alter table public.activity_types
  add column activity_code text;

-- Codes must be unique within an org (nulls are excluded from uniqueness checks)
alter table public.activity_types
  add constraint activity_types_org_code_unique unique (org_id, activity_code);
