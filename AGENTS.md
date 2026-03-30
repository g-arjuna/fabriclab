# AGENTS.md
> Read this file first. Read `plan.md` second. Then build.
> Content still comes from Claude. Platform engineering now includes Supabase + Vercel.

---

## What this project is

FabricLab is an interactive HPC / AI data centre networking learning platform for network
engineers transitioning into AI cluster infrastructure roles.

The repo now has two layers:

- Content layer: MDX chapters, visualisation components, lab narrative, and deploy prompts
- Platform layer: Next.js app shell, auth, access control, release metadata, synced progress,
  curriculum/catalog plumbing, and deployment infrastructure

---

## Two-agent workflow

```text
CLAUDE (content agent)               CODEX (engineering agent)
----------------------               -------------------------
Writes MDX chapter prose             Deploys Claude drops into live app paths
Writes React visualisation logic     Fixes TypeScript/integration issues
Writes lab narrative and hints       Owns auth, entitlements, release control
Writes content deploy prompts        Owns Supabase/Vercel plumbing
Defines educational sequencing       Owns catalog sync, route gating, docs
```

Default rule:

- If the task is about educational explanation, HPC prose, CLI teaching text, or visualisation
  teaching logic, stop and get the content from Claude first.
- If the task is about platform behavior, access control, state wiring, deployment, admin tools,
  static images, or release workflow, Codex owns it.

---

## Hard rules

### Rule 1 - Content stays in git

Chapter bodies remain in `apps/web/content/chapters/*.mdx`.
Visualisations remain repo files.
Do not move educational content into Supabase.

Supabase stores only:

- auth/session state
- profiles
- release metadata
- synced learner progress
- community comments
- optional legacy entitlements kept only for internal regression/testing

### Rule 2 - Runtime APIs are now allowed, but only for platform infrastructure

Allowed runtime infrastructure:

- Supabase auth/db/storage APIs used by the app shell
- Vercel deployment/runtime environment

Still forbidden in the running app:

- OpenAI or other model APIs
- arbitrary third-party HTTP calls for page rendering
- content fetched from external services at lesson render time

### Rule 3 - Claude owns educational content

Do not write:

- MDX educational prose
- HPC concept explanations
- CLI output teaching copy
- lab scenario narrative
- visualisation teaching logic/layout

Those still come from Claude.

Codex may:

- add minimal surrounding access-control UI
- place or generate static images
- add short image captions when inserting images
- fix integration/type/runtime issues

### Rule 4 - CLI output must remain state-driven

Every lab/simulator command continues to read from the Zustand topology/lab state.
Do not replace simulator behavior with static text blobs.

### Rule 5 - Access control is route-level

Auth middleware is for session refresh/cookie propagation only.
Actual entitlement checks happen at route render time:

- `/curriculum`
- `/learn/[chapter]`
- `/lab`
- `/admin/*`

### Rule 6 - Unpublished content must stay dark

Unpublished chapters or labs must not be rendered for normal users.
Keep publish-state enforcement at the route level and do not leak unpublished lesson bodies or simulator state.

### Rule 7 - Content release stays repo-driven

Weekly content flow:

1. Claude writes content and commit-ready artifacts
2. Codex deploys the files into the app
3. Catalog sync upserts chapter/lab metadata to Supabase
4. Admin toggles publish flags when ready

New content should default to unpublished until explicitly released.

### Rule 8 - Guest progress is local; signed-in progress is synced

V1 rules:

- guest progress persists in browser storage
- signed-in progress syncs to Supabase
- no guest-to-account merge in v1
- when signed in, remote progress becomes the active source of truth

### Rule 9 - Image permissions

Codex is allowed to:

- generate static raster or SVG assets during authoring
- place sourced vendor screenshots/diagrams
- wire images into MDX, React components, and docs
- write short adjacent image captions/context when needed

Image assets live under:

- `apps/web/public/images/[slug]/...`

### Rule 10 - Validate after meaningful platform steps

Run:

```bash
apps/web/node_modules/.bin/tsc --noEmit --project apps/web/tsconfig.json
```

Also validate the relevant browser routes when touching auth, gating, progress, or admin flows.

---

## Current platform model

Current product shape:

- all published chapters are open
- all published labs are open
- FabricLab-owned Google/GitHub OAuth is the preferred sign-in path
- community comments can live alongside chapters and labs once the migration is applied
- minimal protected admin UI remains for release flags and internal tooling
- entitlement plumbing may remain in the schema for future experimentation, but it is not part of the public learner journey

---

## Key files Codex now owns

Platform/auth/catalog:

- `apps/web/content/catalog.json`
- `apps/web/lib/catalog/*`
- `apps/web/lib/auth/*`
- `apps/web/lib/supabase/*`
- `apps/web/lib/progress/*`
- `apps/web/proxy.ts`
- `apps/web/app/login/*`
- `apps/web/app/account/*`
- `apps/web/app/admin/*`
- `supabase/migrations/*`

Still Codex-maintained from before:

- `apps/web/lib/mdxComponents.ts`
- `apps/web/components/visualisations/COMPONENTS_REGISTRY.md`
- app-level route wiring
- CLI command/state integration

---

## Approved libraries

Already in use / allowed:

- `react`, `react-dom`
- `next`
- `zustand`
- `@next/mdx`, `next-mdx-remote`, `remark-gfm`, `gray-matter`
- `xterm.js`
- `next/image`
- `@supabase/ssr`
- `@supabase/supabase-js`

Do not add more libraries without explicit approval.

---

## What Codex must still never do

- write substantive HPC educational prose
- invent lesson concepts or reorder curriculum teaching
- rewrite Claude visualisation internals unless fixing a pure integration/runtime issue
- add third-party runtime calls unrelated to auth/release/progress infrastructure
- expose locked MDX content through previews
- silently change slugs or lab IDs that content already references
