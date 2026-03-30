# Deployment Guide

## Core Rule: Migrations Before Frontend

**Always apply database migrations before the frontend deploy goes live.**

Vercel deploys fast. If a migration runs after the new frontend is up, there is a window where the new code is hitting the old schema — this breaks the app for live users. Running the migration first means the old frontend works fine against the new schema while Vercel is deploying, and the new frontend works the moment it goes live.

### Why we do this manually (for now)

Supabase and Vercel both have automated migration-on-deploy features, but they require paid plans:

- **Supabase Pro** — enables database branching, where each PR gets its own isolated DB branch seeded from production. Migrations are tested in isolation before merge, and the branch is destroyed when the PR closes.
- **Vercel Pro + Supabase integration** — Vercel can trigger `supabase db push` as part of the deploy pipeline automatically.

Until those are justified by team size or budget, we run `supabase db push` manually as part of the production deploy checklist. This is safe and reliable as long as the checklist is followed — the risk is human error (forgetting the step), not a technical limitation.

When we upgrade, the manual checklist step goes away entirely and migrations run automatically before every deploy, for both preview and production environments.

---

## Environments

| Environment | Supabase Project | Vercel Scope | Branch |
|---|---|---|---|
| Dev / Preview | `kjdwzhmyygmjedfnuiky` | Preview + Development | `develop`, PR branches |
| Production | `wmtimwzltnueoniqegxs` | Production | `main` |

---

## Supabase CLI Setup (one-time per machine)

```bash
brew install supabase/tap/supabase
supabase login                  # browser OAuth
supabase init                   # creates supabase/config.toml — commit this
supabase link --project-ref kjdwzhmyygmjedfnuiky   # links to dev project
```

After linking, `supabase db push` applies all unapplied migrations in `supabase/migrations/` to the linked (dev) project.

---

## Day-to-Day Dev Workflow

```
1. Branch from develop: feature/my-feature
2. Write migration in supabase/migrations/<timestamp>_description.sql
3. Apply to dev:  supabase db push
4. Build and test locally against dev Supabase
5. Open PR into develop → Vercel preview deploy spins up (uses dev Supabase)
6. Review + merge into develop
```

---

## Production Deploy Protocol

Run through this checklist every time `develop` → `main` (i.e., every production release):

### Pre-deploy checklist

- [ ] All Playwright E2E tests pass locally (`npm run test:e2e`)
- [ ] `npm run build` passes with no errors
- [ ] PR has been reviewed
- [ ] No production release after Thursday (Friday–Sunday buffer — see CLAUDE.md)

### Migration step (required if any new `.sql` files since last production deploy)

```bash
# Use the production DB connection string from Supabase dashboard:
# Dashboard → Project (prod) → Settings → Database → Connection string (URI mode)
supabase db push --db-url "postgresql://postgres:<password>@db.wmtimwzltnueoniqegxs.supabase.co:5432/postgres"
```

Verify in the Supabase dashboard (prod) that the migration appears in the migration history before proceeding.

### Deploy step

```
Merge the develop → main PR on GitHub.
Vercel auto-deploys to production from main.
```

### Post-deploy verification

- [ ] Visit the production URL and log in
- [ ] Spot-check the feature that was just shipped
- [ ] Check Sentry (when configured) for new errors

---

## Current CI/CD State

| Check | Status |
|---|---|
| Vercel build check (`next build`) on every PR | ✅ Active |
| Playwright E2E tests in CI | ❌ Not yet configured |
| Automated migration on deploy | ❌ Manual for now |
| Sentry error tracking | ❌ Placeholder only |

**Implication:** The only automated gate right now is "does the build pass." All other validation is manual. Playwright tests must be written and added to CI before the app goes to real production users.

---

## Adding GitHub Actions (when ready)

Create `.github/workflows/ci.yml` with:

```yaml
name: CI
on: [pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.DEV_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.DEV_SUPABASE_KEY }}
```

For automated migration on production deploy, add a separate workflow triggered on push to `main`:

```yaml
name: Migrate Production DB
on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db push --db-url "${{ secrets.PRODUCTION_DB_URL }}"
```

This runs the migration before Vercel's deployment hook fires (Vercel listens to the same push event but starts slightly later), giving you automatic migration-first deploys without Supabase Pro branching.

---

## Future: Supabase Pro + Vercel Pro

When the team grows or the budget justifies it:

- **Supabase Pro branching** — each PR gets its own isolated database branch, seeded from a snapshot of production. Migrations are tested against real schema before merge. Branches are destroyed when the PR closes.
- **Vercel Pro** — no direct DB benefit, but enables longer build timeouts, more concurrent deployments, and better preview URL management.
- **Combined flow** — Supabase's GitHub integration auto-creates a DB branch when a PR opens, runs migrations, and tears it down on merge. Zero manual steps.

Until then, the manual protocol above is the safest approach.

---

## Migration Naming Convention

```
supabase/migrations/<YYYYMMDDHHMMSS>_short_description.sql
```

Use UTC timestamps. Keep descriptions lowercase with underscores.

Examples:
- `20260225000000_initial_schema.sql`
- `20260302000001_work_day_settings.sql`
- `20260330000000_grants_archived_at.sql`

Each migration file must be idempotent where possible (use `if not exists`, `if exists` guards).

---

## Pending Migrations Not Yet Applied to Production

| Migration | Applied to Dev | Applied to Prod |
|---|---|---|
| `20260302000001_work_day_settings.sql` | ✅ (applied manually via SQL editor) | ❌ |
| `20260330000000_grants_archived_at.sql` | ✅ | ❌ |
| `20260330000001_activity_types.sql` | ✅ | ❌ |

> **Note:** `20260302000001_work_day_settings.sql` was marked as applied via `supabase migration repair` before the CLI was set up, but the SQL was never actually run. It was applied manually via the Supabase dashboard SQL editor on 2026-03-30.
