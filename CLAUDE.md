# CLAUDE.md — AI Agent & Developer Guide

## Project Overview

**International Center Grant Management** — a multi-tenant web application for caseworkers to log time blocks against specific clients and grants. Administrators (CFO) get export capabilities and role-based access control.

**Current Phase:** Phase 1 — Time tracking and grant management foundation.

### Who uses this
- **Caseworkers** at the International Center — log time against clients/grants, primarily on desktop computers
- **Kathy (CFO)** — exports data, manages grants, admin oversight
- **Future:** Other organizations (multi-tenant), potentially on mobile devices

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 (possibly shadcn/ui — TBD) |
| Backend & Database | Supabase (PostgreSQL via PostgREST, auto-generated API) |
| Authentication | Supabase Auth with Microsoft Azure AD / Entra ID SSO |
| Hosting | Vercel (production on `main`, preview deploys on PRs) |
| Error Tracking | Sentry (placeholder, not yet configured) |
| E2E Testing | Playwright |
| CI/CD | GitHub Actions + Vercel preview deploys (shared dev Supabase for previews) |
| Project Management | GitHub Projects (Phase 1); Jira planned for team scaling |

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Public routes (login)
│   ├── (dashboard)/         # Protected routes (auth + RBAC guard in layout)
│   ├── auth/callback/       # OAuth code exchange
│   ├── global-error.tsx     # Sentry placeholder
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Redirects to /login
├── hooks/
│   └── use-auth.ts          # Azure AD OAuth hook
├── lib/
│   └── supabase/            # Browser, server, and middleware clients
└── middleware.ts             # Session refresh + auth redirect
supabase/
└── migrations/              # Raw SQL migrations (applied via CLI or dashboard)
```

## Development Conventions

### Git Workflow
- **Never push directly to `main`.** All changes go through pull requests.
- Branch from `develop` for feature work: `feature/description`, `fix/description`.
- PRs merge into `develop` first, then `develop` merges into `main` via PR.
- All PRs must pass automated tests and build checks before merging.

### Deployment Cadence
- **No production releases after Thursday.** This gives Friday–Sunday as a buffer to catch and fix issues without disrupting weekends.
- Deployments should be slow and deliberate, not fast and workflow-interrupting.
- Every PR gets a Vercel preview deploy connected to the shared dev Supabase project (isolated from production).

### Testing Requirements
- **E2E tests (Playwright):** Required for all user-facing features before merge.
- **Input validation:** All forms must validate inputs. Consider fuzzing for edge cases.
- **Test locally first**, then open a PR to spin up the ephemeral test environment. Never test against production data.
- Testing in development is cheaper than fixing in production — both in labor and cost.

### Security
- **All API endpoints require authentication by default.** Unauthenticated access is the exception, not the rule.
- **Row Level Security (RLS)** is enforced on every Supabase table via `org_id` scoping.
- Never commit secrets. All credentials go in `.env.local` (local) or Vercel env vars (deployed).
- The `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is safe to expose client-side — RLS protects the data.
- Validate and sanitize all user input on both client and server.

### Code Style
- Keep it simple. No premature abstractions or over-engineering.
- Phase 1 scope is **time tracking + grant management only**. Resist scope creep.
- Prefer editing existing files over creating new ones.
- Responsive design — works on desktop (primary) and mobile (secondary).

### Server → Client Function Props (Next.js App Router)
Never pass a plain function from a server component to a client component. React cannot serialize raw functions across the server/client boundary and will throw at runtime.

**Allowed — server actions are serializable:**
```tsx
// actions.ts has "use server" at the top
import { createGrant, updateGrant } from "./actions";

// Direct: fine
<Dialog action={createGrant} />

// Bound (pre-fills an argument): fine
<Dialog action={updateGrant.bind(null, grant.id)} />
```

**Not allowed:**
```tsx
// Plain anonymous function — not a server action
<Dialog action={async (fd) => { await doSomething(fd) }} />

// Inline "use server" that closes over a function prop — not serializable
<form action={async () => { "use server"; await propFn(id); }} />
```

**Rule of thumb:** If a client component needs a mutation, it must receive a server action (from a `"use server"` file) or a `.bind()`-ed variant of one — nothing else.

## Architecture Decisions

### Multi-Tenancy
Built in from day one via `org_id` on all tables + RLS policies. Currently single-org (International Center), but the schema supports multiple organizations for future monetization or sharing.

### Authentication
- **Phase 1:** Microsoft Azure AD / Entra ID SSO (International Center's provider).
- **Future consideration:** Multiple auth providers per org (Google, custom SSO). Supabase Auth supports this natively — additional providers can be enabled without schema changes.
- **Account lifecycle:** When a user loses Microsoft credentials (e.g., terminated), their Supabase auth session is invalidated. Admin can also revoke access via the profiles table.

### Database
- Supabase auto-generates REST API from the schema — no custom API layer needed.
- `get_user_org_id()` SQL function powers all RLS policies.
- Migrations live in `supabase/migrations/` and must be applied manually to each Supabase project (dev and production).

### Environment Strategy
- **Production Supabase:** Used only by Vercel production deploys (from `main`).
- **Dev Supabase:** Used by local development and Vercel preview deploys (from PRs).
- Vercel env vars are scoped per environment (Production vs Preview/Development).
- When Supabase Pro is justified (team growth, real production data), upgrade to get per-PR branching.

### Future Considerations (NOT in Phase 1 scope)
- **Jira integration:** Replace GitHub Projects with Jira for cross-project visibility, sprint planning, and Sentry→Jira→GitHub automated ticket pipeline. Free tier covers up to 10 users. MoneyBot team already uses Jira.
- **Sentry → auto-issue creation:** Configure Sentry to auto-create Jira tickets on errors detected in production. All fix PRs must be reviewed by a human developer.
- **Audit logs:** Track who changed what and when. Supabase may support this via triggers or extensions — research needed.
- **Case note system integration:** Tie time blocks to calendar and case notes.
- **Family/household grouping:** Group clients into families for shared tasks.
- **Geo-locking:** Restrict data modifications to office locations unless authorized.
- **Caching:** Not needed yet, evaluate when performance requires it.
- **shadcn/ui:** Component library decision pending — may adopt for consistent UI.
- **Supabase Pro branching:** Per-PR isolated databases when budget/team size justifies it.

## Commands

```bash
npm run dev          # Start local dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E tests
```

## Environment Variables

| Variable | `.env.local` | Vercel Production | Vercel Preview/Dev |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dev project URL | Production project URL | Dev project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Dev project key | Production project key | Dev project key |
| `NEXT_PUBLIC_SENTRY_DSN` | (optional) | Sentry DSN | Sentry DSN |

**Critical:** Never point local dev or preview deploys at the production Supabase project.
