## What does this PR do?

<!-- One or two sentences. Focus on the why, not just the what. -->

## Checklist

### Code
- [ ] No secrets or credentials committed
- [ ] No `console.log` left in production code
- [ ] Server actions use `requireAdmin()` or equivalent auth check

### Database
- [ ] No migrations, OR migration is additive only (new column/table/index)
- [ ] If renaming/removing a column: expand/contract pattern used (see SCALING.md)
- [ ] Migration tested against dev Supabase before this PR

### Tests
- [ ] New user-facing feature has at least one new E2E test
- [ ] New server action has an integration or E2E test covering it
- [ ] CI is passing (green checkmark on this PR)

### Multi-tenancy
- [ ] Any new table has `org_id` + RLS policy
- [ ] Any new query is scoped to the current org (no cross-org reads possible)
