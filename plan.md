# FabricLab - Platform Plan
> Engineering plan for Codex.
> Read `AGENTS.md` first.

---

## Current direction

FabricLab is moving from a fully static MVP to a hybrid platform:

- content remains repo-backed
- Supabase becomes the source of truth for auth, entitlements, release metadata, and synced progress
- Vercel becomes the canonical host for `apps/web`

Content writing is still Claude-owned.
Platform engineering is Codex-owned.

---

## V1 product shape

- Free anonymous access to all published chapters and labs
- Sign-in is optional and used for:
  - synced progress
  - admin workflows
- Email magic-link auth only
- Minimal admin dashboard for:
  - `is_published`
  - optional future `access_tier`
  - optional future `preview_enabled`
  - optional future `preview_summary`
  - admin entitlement grants/revocations for internal testing if needed

---

## Architecture rules

### Content

- Chapter bodies stay in `apps/web/content/chapters/*.mdx`
- Visualisation components stay in repo files
- Labs stay in repo TypeScript files
- Do not move learning content into Supabase

### Supabase tables

- `profiles`
- `content_catalog`
- `user_entitlements`
- `chapter_progress`
- `lab_progress`

### Access model

- middleware: session refresh only
- route render: actual publish-state enforcement
- unpublished content must not render for normal users

### Progress model

- guest progress: browser-local
- signed-in progress: Supabase-backed
- no guest-to-account merge in v1

---

## Local dev bootstrap

### 1. Install dependencies

```bash
cd apps/web
npm install
```

### 2. Create a Supabase dev project

In Supabase:

1. create a new project for FabricLab dev
2. enable email auth / magic links
3. set site URL to `http://localhost:3000`
4. add redirect URLs for:
   - `http://localhost:3000/auth/callback`
   - your Vercel preview callback URLs later

### 3. Apply the schema

Run the SQL in:

- `supabase/migrations/20260328_001_auth_access_release_control.sql`

This creates:

- profiles
- content catalog
- entitlements
- chapter progress
- lab progress
- RLS policies

### 4. Configure local env

Copy:

- `apps/web/.env.example`

to:

- `apps/web/.env.local`

Fill in:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ADMIN_EMAILS`

### 5. Seed catalog metadata

```bash
cd apps/web
npm run catalog:sync
```

This upserts chapter/lab metadata from `content/catalog.json` into `content_catalog`.

### 6. Run the app

```bash
cd apps/web
npm run dev
```

Useful routes:

- `/`
- `/curriculum`
- `/login`
- `/account`
- `/admin/releases`
- `/learn/ch0-hardware-foundations`
- `/lab?lab=lab0-failed-rail`

---

## Vercel and domain plan

### Dev / preview

1. create the Vercel project for `apps/web`
2. add the same Supabase env vars to Vercel
3. add preview deployment callback URLs to Supabase auth settings
4. test magic-link flows on preview URLs

### Production

1. create a separate production Supabase project later
2. mirror schema + env vars
3. add `fabriclab.dev` to Vercel
4. point Cloudflare DNS to Vercel
5. add production callback URLs in Supabase auth settings

---

## Implementation phases

### Phase 1 - Foundations

- add Supabase clients/utilities
- add migrations and env example
- add shared catalog source and sync script

### Phase 2 - Auth and access

- auth provider
- login/account routes
- curriculum from shared catalog
- route-level publish checks

### Phase 3 - Progress sync

- preserve guest progress locally
- hydrate remote progress on sign-in
- sync chapter/lab completion for signed-in users

### Phase 4 - Admin release control

- protected admin page
- catalog publish/access controls
- manual entitlement grant/revoke tools

### Phase 5 - Deployment and handoff

- validate local + preview flows
- update README/docs
- create Claude handoff notes for ongoing weekly content drops

---

## Ongoing content-release workflow

When Claude ships new content:

1. commit the new chapter/viz/lab files to git
2. update `content/catalog.json` for the new route metadata
3. run `npm run catalog:sync`
4. keep the new item unpublished by default
5. verify locally / on preview
6. publish via `/admin/releases` when ready

This allows content work to continue weekly without exposing unfinished material immediately.

---

## Validation checklist

### TypeScript

```bash
apps/web/node_modules/.bin/tsc --noEmit --project apps/web/tsconfig.json
```

### Auth

- sign in with magic link
- session survives refresh
- sign out returns to guest mode

### Access

- guests can open all published chapters and labs
- signed-in users see the same published catalog with progress sync/account features
- unpublished content remains hidden from non-admins

### Admin

- non-admin users cannot access `/admin/releases`
- admin can change publish/access/preview fields
- admin can grant and revoke `core_paid` for internal testing if still needed

### Progress

- guest progress stays local
- signed-in progress syncs from Supabase
- signing out restores guest progress

### Release flow

- unpublished content does not appear for non-admins
- published content appears after sync + admin publish

---

## Follow-up docs

- `README.md` - quickstart and repo status
- `docs/CLAUDE_HANDOFF_RELEASE_CONTROL.md` - content-agent guidance
