# Claude Weekend Platform Summary

This document summarizes the platform engineering work completed over the weekend so Claude can
author content against the real live shape of FabricLab instead of the older static/paywalled MVP.

Read this after:

1. `AGENTS.md`
2. `plan.md`
3. `docs/CLAUDE_HANDOFF_RELEASE_CONTROL.md`

## Executive summary

FabricLab is no longer a mostly static course shell with pending monetization hooks.
It is now a live, domain-backed learning platform with:

- canonical production domain: `https://fabriclab.dev`
- branded auth entrypoint: `https://auth.fabriclab.dev`
- first-party Google and GitHub OAuth
- signed FabricLab session cookies
- sign-in-gated chapters and labs
- synced learner progress
- release-controlled catalog metadata
- public community reading plus signed-in discussion participation
- Mailgun-backed notification plumbing

The core product direction has also shifted:

- public curriculum discovery
- public community visibility
- sign-in required for doing the actual learning and participation work
- optional support/donations rather than hard paywall monetization

## What changed in the app

### 1. Auth moved into FabricLab

The app now owns the sign-in flow instead of depending on Supabase auth UI/runtime behavior.

Current auth behavior:

- login page lives in `apps/web/app/login`
- OAuth flows start from app-owned routes:
  - `/api/auth/login/[provider]`
  - `/api/auth/callback/[provider]`
- successful sign-in creates a signed FabricLab session cookie
- the server reads that cookie to determine the current viewer

Implication for Claude:

- do not write copy assuming “magic link only”
- do not assume anonymous learners can open lesson bodies

### 2. Access model changed

Public visitors can browse:

- `/`
- `/curriculum`
- `/community`

Signed-in learners can:

- open published chapter pages
- open published lab routes
- save progress
- create or reply to discussions

Unpublished content still stays dark until released from `/admin/releases`.

Implication for Claude:

- content can still be authored freely in git, but it is not automatically live
- new chapter/lab drops need catalog metadata and an admin publish step

### 3. Community loop exists now

FabricLab now has:

- quick comments on chapters/labs
- tracked chapter/lab discussions
- a general forum at `/community`
- optional GitHub issue mirroring from discussions

Implication for Claude:

- lesson pages are now part of a community workflow, not isolated documents
- avoid language that assumes no feedback or discussion surface exists

### 4. Notification system exists now

Mailgun-backed notifications can be triggered for:

- new published content
- discussion activity

The product also has:

- first-sign-in notification onboarding
- `/account` email preference controls
- reply-notification opt-ins in discussion forms

Implication for Claude:

- no need to add manual “subscribe” prose into content pages unless specifically requested
- learner notification behavior now exists at the platform level

## Live routes and domains

Production:

- `https://fabriclab.dev`

Redirects:

- `https://www.fabriclab.dev` -> apex
- `https://auth.fabriclab.dev` -> login flow

Important learner-facing routes:

- `/`
- `/curriculum`
- `/login`
- `/account`
- `/community`
- `/admin/releases`
- `/learn/[chapter]`
- `/lab?lab=[lab-id]`

## Current content/release workflow

For new or revised content:

1. Claude writes chapter/lab/visualization artifacts in git
2. Codex integrates them into the app
3. Codex updates `apps/web/content/catalog.json` if the route is new or metadata changed
4. Codex runs catalog sync
5. The item stays unpublished until the admin release dashboard marks it live

This means:

- content remains repo-backed
- release state is platform-backed

## What Claude should keep doing

- write MDX chapter prose
- write HPC/networking educational explanations
- write lab narrative and hints
- write visualisation teaching logic
- preserve stable chapter/lab IDs unless a rename is explicitly coordinated

## What Claude should avoid

- auth or billing product-copy inside lessons
- changing slugs casually
- assuming lesson pages are fully public
- assuming curriculum visibility means the content body is live
- inventing platform behavior that Codex has to undo later

## Catalog and routing constraints

When a new chapter or lab is added, Codex must update:

- `apps/web/content/catalog.json`

That metadata now matters for:

- order
- route
- publish defaults
- preview summary
- curriculum listing

Implication for Claude:

- if a new chapter or lab is proposed, include the intended slug/ID clearly and keep it stable

## Admin/release dashboard notes

The release dashboard now focuses on:

- `is_published`
- `preview_enabled`
- `preview_summary`

Stale legacy entitlement-testing UI has been removed from the admin surface, though some
backward-compatibility schema remains in Supabase.

Implication for Claude:

- no need to author content assuming a paid/free split in the UI
- unpublished vs published is the real release distinction now

## Community authoring implications

Because community discussion is live:

- chapter and lab pages may now receive user questions, issue reports, or correction requests
- GitHub issue mirroring can elevate discussion into repo-tracked work

Implication for Claude:

- if content is likely to benefit from feedback loops, that can now happen naturally in-product
- content can be iterated in smaller releases without pretending everything is final

## Notification authoring implications

You do not need to write platform copy for notifications into chapter MDX.
The platform now handles:

- notification onboarding
- preferences
- reply opt-ins
- outbound Mailgun sends

If content copy references updates, release cadence, or future chapters, keep it educational and
lightweight rather than operational.

## What is still operationally sensitive

Before the repository is made public:

- live Supabase secrets should be rotated if they were ever exposed during setup/debugging
- `.env.local` must remain uncommitted
- `.env.example` should stay placeholder-only

This is a Codex/platform concern, not a Claude authoring task, but it explains why some security
cleanup may still be happening around the repo.

## Current recommendation for content week

Claude should assume:

- the platform is stable enough for content work
- domain/auth/community/notification plumbing is already in place
- the best use of time now is new chapters, labs, and visual refinement

Unless a real regression is reported, avoid reopening platform design decisions in content output.
