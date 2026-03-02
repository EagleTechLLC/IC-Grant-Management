# International Center Grant Management

A web application for the International Center enabling caseworkers to log time blocks against clients and grants, with admin export capabilities and role-based access control.

## Quick Start

### Prerequisites
- Node.js 18+
- A Supabase project ([create one here](https://supabase.com/dashboard))
- npm

### Setup

```bash
# Clone the repo
git clone https://github.com/EagleTechLLC/IC-Grant-Management.git
cd IC-Grant-Management

# Install dependencies
npm install

# Copy environment template and fill in your Supabase credentials
cp .env.example .env.local
# Edit .env.local with your values (see below)

# Start the dev server
npm run dev
```

### Environment Variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

Find these in your Supabase dashboard under **Settings → API → API Keys**.

### Database Setup

Apply the migration to your Supabase project. Either:

**Option A — Supabase Dashboard:**
1. Go to your project → SQL Editor
2. Paste the contents of `supabase/migrations/20260225000000_initial_schema.sql`
3. Run

**Option B — Supabase CLI:**
```bash
npx supabase db push
```

## Architecture

### Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript
- **Backend:** Supabase (PostgreSQL + auto-generated REST API)
- **Auth:** Supabase Auth with Microsoft Azure AD / Entra ID SSO
- **Hosting:** Vercel
- **Testing:** Playwright (E2E)

### Database Schema

Five tables with Row Level Security enforcing multi-tenant isolation:

| Table | Purpose |
|---|---|
| `organizations` | Tenant/org records |
| `profiles` | User profiles linked to Supabase Auth, includes role (admin/caseworker) |
| `grants` | Grant programs with codes and metadata |
| `clients` | Client records (first name, last name) |
| `time_logs` | Time blocks logged by caseworkers against clients and grants |

All tables include `org_id` with RLS policies ensuring users only see data from their own organization.

### Authentication Flow
1. User clicks "Sign in with Microsoft" on `/login`
2. Supabase redirects to Azure AD for SSO
3. On success, `/auth/callback` exchanges the code for a session
4. Dashboard layout verifies auth state and loads the user's profile/role
5. Unauthenticated requests are redirected to `/login` via middleware

## Development

### Branch Strategy
```
main              ← Production (protected, PRs only)
└── develop       ← Integration branch
     └── feature/ ← Feature branches, PR into develop
```

### Deployment
- **Production:** Auto-deploys from `main` on Vercel
- **Preview:** Every PR gets a Vercel preview deploy with an isolated Supabase branch
- **Release policy:** No production deploys after Thursday

### Testing
```bash
npm run test:e2e    # Run Playwright E2E tests
npm run lint        # ESLint
npm run build       # Verify production build
```

### Available Scripts
| Command | Description |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Create production build |
| `npm run start` | Run production build locally |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Run Playwright E2E tests |

## Contributing

1. Create a feature branch from `develop`: `git checkout -b feature/your-feature develop`
2. Make your changes
3. Ensure `npm run build` and `npm run lint` pass
4. Open a PR into `develop`
5. Wait for preview deploy + tests to pass
6. Request review

See [CLAUDE.md](CLAUDE.md) for detailed conventions, architecture decisions, and future roadmap.

## License

Proprietary — EagleTech LLC
