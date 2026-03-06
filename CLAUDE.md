# SymfloFi Cloud

Cloud management portal for the SymfloFi WiFi vending system. Manages licenses, operators, and machines for Piso WiFi devices running ImmortalWrt firmware.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (no tailwind.config — uses CSS-based config)
- **Auth & Database:** Supabase (auth + Postgres via RLS)
- **Deployment:** Vercel via GitHub Actions (preview on PR, production on `main`)
- **Package Manager:** npm

## Project Structure

```
src/
  app/
    page.tsx              # Public landing page
    layout.tsx            # Root layout
    signin/page.tsx       # Sign in
    signup/page.tsx       # Sign up
    auth/callback/route.ts # Supabase OAuth callback
    (portal)/             # Authenticated route group
      layout.tsx          # Portal layout with sidebar + role gate
      dashboard/page.tsx
      licenses/page.tsx
      machines/page.tsx
      operators/          # Admin-only CRUD
  components/
    sidebar.tsx
  lib/
    roles.ts              # getUserContext() — role resolution (admin/operator/null)
    supabase/
      client.ts           # Browser Supabase client
      server.ts           # Server Supabase client
      middleware.ts        # Session refresh middleware
  middleware.ts            # Next.js middleware (session refresh on all routes)
```

## Key Patterns

- **Role system:** Two roles — `admin` and `operator`. Checked via `getUserContext()` in `src/lib/roles.ts`. Admin is resolved by `is_admin()` Supabase RPC function (SECURITY DEFINER). Operators are looked up from the `operators` table.
- **Route protection:** The `(portal)` layout redirects unauthenticated users to `/signin`. Users with no role see an "Access Denied" message.
- **Supabase RLS:** Database access is scoped by Row Level Security. The server client uses cookies for auth context.
- **Styling convention:** Dark theme with oklch color gradients, backdrop blur, rounded-2xl cards. Uses Tailwind CSS utility classes only (no component library).

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

## Environment Variables

Required in `.env.local` (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## CI/CD

- `.github/workflows/preview.yml` — deploys preview on PRs
- `.github/workflows/production.yml` — lint + type check + deploy to Vercel on push to `main`
