# Scaling & Production Readiness Guide

Reference document for when to adopt each practice and what it looks like.
This is a living document — update it as decisions are made.

---

## When to act on each section

| Trigger | Action |
|---|---|
| Adding a second developer | Supabase Pro branch databases |
| Onboarding a second org | Feature flags, platform super-admin role |
| First production incident | Sentry fully configured, smoke tests |
| Schema changes get complex | Expand/contract migration pattern |
| User base grows | Staging environment, canary deploys |

---

## 1. Supabase Pro — Branch Databases

**What it solves:** Right now all PR preview deploys share the dev Supabase. Two developers
working at the same time would stomp on each other's test data and migrations.

**What it looks like with Pro:**
```
PR opened  → Supabase clones the DB schema into a new isolated branch DB
           → CI and Vercel preview both point at that branch DB
           → Migrations run automatically against it
PR merged  → Branch DB is destroyed
```

**What needs to change in code:**
- `supabase/config.toml`: enable branching flag
- `.github/workflows/ci.yml`: add Supabase CLI login + fetch branch DB URL dynamically
- Vercel: configure to inject branch DB URL into preview env vars automatically

**Cost:** $25/month. Justified when a second developer joins or when PR conflicts
on the shared dev DB become a problem.

**Reference:** Task #11 in the project task list.

---

## 2. Expand/Contract Migrations

**What it solves:** A naive migration (e.g. renaming a column) can break the running
app the instant it executes, causing downtime. Expand/contract ensures the DB and
app code are always compatible with both old and new schema simultaneously.

**The pattern (example: renaming `name` → `full_name` on profiles):**

```
Step 1 — EXPAND: add the new column (old code still works, new column is null)
  ALTER TABLE profiles ADD COLUMN full_name text;

Step 2 — deploy code that writes BOTH columns
  -- app writes name AND full_name on every update

Step 3 — backfill
  UPDATE profiles SET full_name = name WHERE full_name IS NULL;

Step 4 — deploy code that reads full_name, ignores name
  -- app no longer writes name column

Step 5 — CONTRACT: drop the old column (now safe, nothing reads it)
  ALTER TABLE profiles DROP COLUMN name;
```

**Rule of thumb:** Each migration must leave the app functional both before and after
it runs. If you can't say that, split it into multiple steps.

**When to enforce this:** Starting now for any column rename or removal. New columns
(additive changes) are safe without this pattern.

**Checklist for every migration:**
- [ ] Is this additive only? (add column, add table, add index) → safe, no expand/contract needed
- [ ] Does this rename, remove, or change a column type? → use expand/contract
- [ ] Is the column referenced in any RLS policy? → test policy behavior after migration

---

## 3. Feature Flags

**What they solve:** Deploy code to production without exposing it to users. Roll out
to one org at a time. Kill switch if something breaks without a code deploy.

**Two levels:**

### Platform flags (Kyle / super-admin controls)
Controls which features are available to which organizations. Stored on the `organizations`
table as a `feature_flags jsonb` column. Set directly in the DB or via a future
super-admin UI.

```sql
-- Enable a feature for one org only
UPDATE organizations
SET feature_flags = feature_flags || '{"new_export_format": true}'::jsonb
WHERE id = '<international-center-org-id>';
```

In code:
```ts
// Server component
const { data: org } = await supabase.from('organizations')
  .select('feature_flags').eq('id', orgId).single();

const hasNewExport = org?.feature_flags?.new_export_format === true;
```

### Org settings flags (Kathy / admin controls)
Optional behaviors the admin can toggle for their org via `/admin/settings`.
Example: "Require activity type on all time entries."

These are just boolean columns on `organizations`, exposed in the Settings UI.
They are NOT the same as platform flags — these are stable features that orgs
opt into, not experimental code.

**Caseworkers never see or control flags.** They get whatever their org has enabled.

**Migration needed:**
```sql
ALTER TABLE public.organizations
  ADD COLUMN feature_flags jsonb NOT NULL DEFAULT '{}';
```

---

## 4. Testing Pyramid

Full reference for the testing layers in place and planned.

```
        /\
       /E2E\          ← tests/e2e/ (Playwright) — DONE
      /------\
     /Security\       ← tests/rls/ (task #17) — cross-org isolation
    /----------\
   /Integration \     ← tests/integration/ — server actions + real DB
  /--------------\
 /  Unit/Property \   ← tests/unit/ (Vitest + fast-check) — task #16
/------------------\
```

### E2E (Playwright) — in place
Full browser workflows. Runs in CI on every push. Slowest but highest confidence.
Covers: auth, RBAC, time log modal, corrections queue, admin CRUD, audit log.

### RLS / Security tests — task #17
Node test suite using the Supabase JS client with different authenticated sessions.
Assert Org A cannot read Org B's data. These are the most critical tests for a
multi-tenant app — a gap here is a data breach, not just a bug.

### Integration tests
Test server actions against a real (seeded) DB without a browser. Faster than E2E.
Good for: "does approveCorrection() actually create a replacement log and mark the
original superseded?" — logic that's hard to verify just by checking the UI.

### Unit + Property-based tests (Vitest + fast-check) — task #16
Pure function tests. fast-check generates hundreds of random inputs to find edge cases.
Targets: `isEntryLocked`, overlap detection, time option generation.
Property example: "for any date D and lock_after_days N, an entry from D-(N+1) days
ago must always return locked=true."

### Enforcing test discipline going forward
- Every PR that adds a user-facing feature must include at least one new E2E test
- Every PR that adds a server action must include an integration test
- Use the PR template (`.github/pull_request_template.md`) as a checklist

---

## 5. Sentry — Error Tracking

**Status:** Placeholder in code (`src/app/global-error.tsx`, `NEXT_PUBLIC_SENTRY_DSN` env var).
Not yet configured.

**What to do:**
1. Create a project at sentry.io (free tier covers this usage)
2. Get the DSN
3. Set `NEXT_PUBLIC_SENTRY_DSN` in Vercel Production environment variables
4. Run `npx @sentry/wizard@latest -i nextjs` to complete the integration
5. Set up an alert rule: email Kyle on first occurrence of any new error

**What Sentry catches that logs don't:**
- Unhandled exceptions in server components and API routes
- Client-side JS errors (including React render errors)
- Performance regressions (slow DB queries, slow page loads)
- Full stack traces with the exact line of code

**Future:** Configure Sentry → auto-create GitHub issues on new errors. This ensures
bugs found in production get tracked and fixed, not lost.

---

## 6. Deployment Safety

### Current model
```
feature branch → develop (CI runs, tests pass) → main (Vercel auto-deploys to production)
```

### Vercel instant rollback
Every deploy to production is saved. If something breaks, go to Vercel dashboard →
Deployments → click any previous deploy → "Promote to Production." Takes ~10 seconds.
No code changes needed.

This is already available — no setup required. Just know it exists.

### Smoke tests post-deploy (future)
A tiny subset of E2E tests that run immediately after every production deploy:
- Can a user reach the login page?
- Does the dashboard load for an authenticated user?

These run in under 60 seconds and catch "the deploy itself broke something" scenarios.
Add as a second GitHub Actions workflow triggered by the Vercel deploy webhook.

### Staging environment (future, when warranted)
A full copy of production with anonymized data. Code path:
```
develop → staging (full test suite) → main (production)
```
Justified when International Center is actively using the app and you need to
verify changes against production-like data before they see it.
Not needed until the app has real production data worth protecting.

### Never automate production migrations
Migrations against the production Supabase are always run manually:
```bash
# Switch CLI link to production project first
supabase link --project-ref wmtimwzltnueoniqegxs
supabase db push
# Switch back to dev
supabase link --project-ref kjdwzhmyygmjedfnuiky
```
Run this in a quiet window, not during business hours, after verifying the migration
passed against the Supabase Pro branch DB first.

---

## 7. Keeping Best Practices From Being Skipped

### PR template
`.github/pull_request_template.md` is shown to every developer when opening a PR.
It contains a checklist they must consciously check off:
- Tests written for new features
- Migration is backwards-compatible (or expand/contract used)
- No secrets committed
- Sentry will catch errors from this change

### CLAUDE.md
The AI assistant (Claude Code) reads `CLAUDE.md` at the start of every session.
Keep it updated with decisions made — it enforces conventions automatically
during AI-assisted development.

### Dependency on task list
New features should not be merged until corresponding test tasks exist in the
project task list. If a feature has no test task, create one before starting.
