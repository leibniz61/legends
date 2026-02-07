# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Book of Legends is a fantasy-themed forum application built as a Yarn workspaces monorepo.

## Commands

```bash
# Development (runs server + client concurrently)
yarn dev

# Individual workspaces
yarn dev:server          # Express API on :4001
yarn dev:client          # Vite dev server on :6173

# Build (shared must build first - handled automatically)
yarn build               # Builds all workspaces
yarn build:shared        # TypeScript compilation only
yarn build:server        # TypeScript compilation
yarn build:client        # Vite production build

# Create admin user (requires SUPABASE_SERVICE_KEY in .env)
npx tsx scripts/create-admin.ts <email> <password>
```

## Architecture

```
shared/     → Types and constants, consumed by both server and client
server/     → Express API (JWT auth via Supabase, Zod validation)
client/     → React SPA (Vite, TanStack Query, React Router)
supabase/   → Database schema and migrations
```

### Data Flow

1. Client authenticates via Supabase Auth (email/password or OAuth)
2. Supabase trigger `handle_new_user()` auto-creates profile row
3. Client attaches JWT to requests via axios interceptor (`client/src/lib/api.ts`)
4. Server `requireAuth` middleware validates JWT and attaches `req.user` profile

### API Routes

All routes prefixed with `/api/`:

- `/auth` - register, login, logout, password reset
- `/profiles` - user profiles
- `/categories` - forum categories (nested)
- `/threads`, `/posts` - forum content with reactions
- `/notifications` - user notifications
- `/search` - full-text search
- `/admin` - admin operations (requires admin role)

### Database Tables

`profiles`, `categories`, `threads`, `posts`, `notifications`, `post_reactions` - all with RLS policies

## Key Patterns

**Imports**: Client uses `@/` alias for `client/src/`

**Env vars**: Single `.env` at repo root. Server loads via custom path resolution. Client vars prefixed with `VITE_`.

**Code splitting**: Pages using MD editor are lazy-loaded (`React.lazy`)

**API client**: `client/src/lib/api.ts` - axios instance with auto-attached auth token

**Validation**: Server uses Zod schemas in `server/src/validators/`

## Styling

- Use shadcn/ui components (installed in `client/src/components/ui/`)
- Tailwind units: gap-2, p-4, etc. (1 unit = 4px)
- Border widths in px: `border-[0.5px]` or `border-[1px]`
- Fantasy theme: dark mode default, Cinzel font for headings, gold primary color

## For all prompts

Please ask if you need more context, and suggest improvements along the way!
