# Engineering Sync

Last updated: 2026-03-29
Current baseline commit: `802d397`
Primary branch: `main`

This file is the shared engineering source of truth for FabricLab when work is split across
multiple Codex sessions or surfaces (desktop, web, VS Code).

Any future Codex session should read this file after `AGENTS.md` and `plan.md`, then update this
same file before ending the session if meaningful platform or deployment work was done.

Do not store secrets in this file.

## Update Protocol

When a Codex session completes meaningful work, update:

1. `Last updated`
2. `Current baseline commit`
3. `What Changed Recently`
4. `Current Platform State`
5. `Open Items`
6. `Immediate Next Steps`

If a task was started but not finished:

- add it under `Open Items`
- note the blocker clearly
- include the exact file paths touched

If a deployment/config issue is found:

- record whether it is `local`, `Vercel`, `Supabase`, `Cloudflare`, or `GitHub`
- note whether code is already ready and only configuration remains

## Current Product Direction

FabricLab is now being positioned as:

- open/public curriculum discovery
- sign-in required to open chapters and labs
- signed-in progress tracking
- community-driven feedback and contribution flow
- optional support/donations instead of hard monetization

Content still comes from Claude.
Platform engineering, auth, release control, community plumbing, and deployment stay with Codex.

## Current Platform State

### Auth and Access

- Supabase auth is wired and working locally and on Vercel.
- Google social login is configured in Supabase and Google Cloud for the maintainer account.
- Login is now required for:
  - `/learn/[chapter]`
  - `/lab`
- Public users can still browse:
  - `/`
  - `/curriculum`
  - `/community`
- Signed-in users can:
  - open published chapters
  - open published labs
  - sync progress
  - participate in community discussion

### Progress

- Guest progress no longer starts on chapter/lab content because those surfaces require sign-in.
- Signed-in progress sync to Supabase is working.
- Local browser release smoke verifies progress behavior.

### Release Control

- Admin release controls are working.
- Publish/unpublish flows for chapters and labs are covered by browser smoke tests.
- Access metadata remains in the schema/UI mainly for internal/legacy testing, not public monetization.

### Community

- `/community` now has:
  - general forum threads
  - thread detail pages
  - reply flow
- Chapters and labs support:
  - quick comments
  - tracked discussions
- Community/support/footer visibility is present in the global shell.
- Public community URLs are configured for:
  - GitHub repo
  - GitHub issues
  - GitHub discussions
  - GitHub Sponsors

### GitHub Issue Mirroring

Code path exists and is live.

Current result from live end-to-end verification:

- discussion creation succeeds
- GitHub issue mirroring attempt happens
- GitHub rejects the token with:
  - `Resource not accessible by personal access token`

This means the feature is implemented, but the configured GitHub token permissions are insufficient.

Required token shape:

- repository access to `g-arjuna/fabriclab`
- `Issues: Read and write`

### Deployment

- Vercel project is connected to GitHub.
- Feature branch pushes create Preview deployments.
- `main` deploys Production.
- Root directory issue has already been fixed to `apps/web`.

### Domain

Not yet integrated.

Planned direction:

- `fabriclab.dev` on Vercel
- Cloudflare Free for DNS/CDN/TLS
- optional later `www.fabriclab.dev`

Important caveat:

- removing `*.supabase.co` from hosted auth/OAuth flows requires Supabase custom auth domain support,
  which is a paid add-on

## What Changed Recently

### 2026-03-29

- Added sign-in-required shell for chapters/labs:
  - `apps/web/components/catalog/AuthRequiredContentShell.tsx`
- Updated chapter and lab route gating:
  - `apps/web/app/learn/[chapter]/page.tsx`
  - `apps/web/app/lab/page.tsx`
- Updated login/account/home/curriculum copy to reflect the signed-in learning model
- Fixed admin release-control toggle race:
  - `apps/web/components/admin/ReleaseControlsClient.tsx`
- Stabilized browser smoke tests for:
  - deploy/auth gating
  - admin release controls
  - progress sync
  - catalog surface
  - legacy entitlement regression
  - lab release controls
- Verified local full release suite passes:
  - `npm run test:browser:release`
- Verified live GitHub thread-to-issue mirror path and identified token-permission failure
- Documented GitHub token requirements in:
  - `README.md`
  - `plan.md`
  - `apps/web/.env.example`

## Open Items

### 1. Domain integration

Status:

- not started
- configuration task, not code task

Needed:

- add `fabriclab.dev` to Vercel
- create Cloudflare DNS records
- update `NEXT_PUBLIC_APP_URL`
- update Supabase Site URL + redirect URLs
- redeploy and test auth

### 2. GitHub issue mirroring token fix

Status:

- code complete
- config incomplete / wrong token scope

Needed:

- update `GITHUB_COMMUNITY_ISSUES_TOKEN` in Vercel
- use token with repo access and `Issues: Read and write`
- redeploy
- re-run live thread mirror test

### 3. Decide whether to require sign-in for community reading

Current state:

- reading community is public
- posting requires sign-in

Decision still open:

- keep public-read / signed-in-write
- or require sign-in for full community participation and reading

### 4. Magic-link and auth-branding polish

Current state:

- login page branding improved
- Supabase magic-link email content branded
- Google consent still shows Supabase-hosted auth identity

Blocked by:

- Supabase custom auth domain is paid

## Immediate Next Steps

1. Complete site domain integration on Vercel + Cloudflare.
2. Fix the GitHub issue mirror token and verify a real issue gets created.
3. Once the platform is stable, spend the next content-focused week on Claude-authored chapter/lab work.
4. Keep this file updated after each meaningful engineering session.

## Working Rules For Future Codex Sessions

- Read `AGENTS.md`, then `plan.md`, then this file.
- Do not rewrite Claude educational content unless fixing integration/runtime issues.
- Do not commit `.env.local` or secrets.
- Do not include unrelated local edits in commits.
- If you change deployment or auth behavior, run:
  - `apps/web/node_modules/.bin/tsc --noEmit --project apps/web/tsconfig.json`
  - `npm run build` from `apps/web`
- If you change auth, gating, admin, progress, or release behavior, run the relevant browser smoke tests.

