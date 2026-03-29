# Engineering Sync

Last updated: 2026-03-29
Current baseline commit: `5ab5fc2`
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

- First-party OAuth broker routes now exist in-app (`/api/auth/login/[provider]`, `/api/auth/callback/[provider]`)
  and issue a signed FabricLab session cookie.
- Auth state is now read from FabricLab session cookies on the server (not Supabase auth session cookies).
- Google and GitHub OAuth are configured via app env vars and routed through FabricLab-owned callback URLs.
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
- Signed-in progress sync now uses server API routes (`/api/progress*`) instead of browser Supabase auth
  sessions, while still persisting progress in Supabase tables.
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

### Email Notifications

- New notification plumbing exists for Mailgun-backed outbound email from server routes.
- Publish notifications can be sent when admins flip a chapter/lab from unpublished to published.
- Thread activity notifications can be sent on thread creation and replies for subscribed users.
- Subscription preferences are now persisted in Supabase (`email_subscriptions`) via
  `/api/notifications/subscription`.

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
- Began auth-provider decoupling prep so FabricLab can migrate away from direct Supabase user
  types without touching route-level gating behavior:
  - `apps/web/lib/auth/types.ts`
  - `apps/web/lib/auth/server.ts`
  - this centralizes a platform-owned `ViewerUser` shape and maps Supabase-auth users into it at
    one boundary
- Implemented Phase 1 first-party OAuth/session broker in app runtime:
  - added OAuth login/callback/session/logout API routes under `apps/web/app/api/auth/*`
  - added signed cookie session utilities in `apps/web/lib/auth/session.ts`
  - added provider config/exchange utilities in `apps/web/lib/auth/env.ts` and
    `apps/web/lib/auth/oauth.ts`
  - added Supabase identity bridge (`apps/web/lib/auth/identity.ts`) so OAuth identities map to
    Supabase-backed `user_id` rows for profiles/progress/community
  - switched login UI to use app-owned OAuth start routes
  - switched progress sync client logic to app APIs (`/api/progress*`) instead of browser
    `supabase.auth.*`
  - converted proxy/middleware away from Supabase session-refresh behavior
- Deployment/DNS setup progress (operator-executed):
  - Cloudflare root domain record setup has started and apex `A` record is now created
  - pending DNS completion for `www` CNAME and final Vercel domain verification
  - pending environment split finalization for preview vs production public URLs
- Added email notification infrastructure (Mailgun-based) for:
  - new chapter/lab publish announcements from admin release updates
  - community thread activity updates for participating users
  - signed-in subscription preference persistence in Supabase (`email_subscriptions`)

## Open Items

### 1. Domain integration

Status:

- in progress
- configuration task, not code task

Needed:

- ensure `fabriclab.dev` and `www.fabriclab.dev` are both added and verified in Vercel
- complete Cloudflare DNS by adding `www` CNAME target to Vercel DNS endpoint
- set environment-specific `NEXT_PUBLIC_APP_URL` values in Vercel (Preview vs Production)
- update OAuth provider callback URLs for both preview and production public URLs
- update Supabase Site URL + redirect URLs
- redeploy and test auth end-to-end

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

### 5. Replace Supabase Auth with first-party domain auth (in progress)

Status:

- phase 1 implemented (OAuth broker + signed app session cookies)
- migration still incomplete

Needed:

- stabilize OAuth callback and provider edge cases (state expiry, denied consent handling)
- update Playwright smoke helpers/fixtures to use new auth flow
- keep Supabase for data only (profiles/progress/community/release metadata)
- define migration for `auth.users` foreign-key dependency in Supabase schema

### 6. Email notification provider configuration

Status:

- code path implemented
- provider/domain configuration pending

Needed:

- create/verify Mailgun sending domain and API key
- configure sender identity (Zoho-managed mailbox or alias) for `MAIL_FROM_EMAIL`
- set `MAILGUN_*` / `MAIL_FROM_*` env vars in Vercel Preview + Production
- apply `20260329_004_email_notifications.sql` migration in Supabase
- verify end-to-end sends on publish and thread reply flows

## Immediate Next Steps

1. Complete remaining DNS/domain steps (`www` CNAME + Vercel verification) and set canonical public host.
2. Configure Preview vs Production Vercel env URLs and align OAuth callback URLs for Google/GitHub.
3. Validate first-party OAuth flows end-to-end on Vercel preview with real Google/GitHub creds.
4. Update and pass browser smoke suites against the new session model.
5. Fix the GitHub issue mirror token and verify a real issue gets created.
6. Configure Mailgun + sender identity env vars and run an end-to-end notification send validation.

## Working Rules For Future Codex Sessions

- Read `AGENTS.md`, then `plan.md`, then this file.
- Do not rewrite Claude educational content unless fixing integration/runtime issues.
- Do not commit `.env.local` or secrets.
- Do not include unrelated local edits in commits.
- If you change deployment or auth behavior, run:
  - `apps/web/node_modules/.bin/tsc --noEmit --project apps/web/tsconfig.json`
  - `npm run build` from `apps/web`
- If you change auth, gating, admin, progress, or release behavior, run the relevant browser smoke tests.
