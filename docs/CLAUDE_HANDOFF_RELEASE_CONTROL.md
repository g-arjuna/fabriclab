# Claude Handoff - Current Platform Constraints

This note tells Claude what changed in the platform so ongoing chapter work keeps fitting the live app.
For the full weekend engineering summary, also read:

- `docs/CLAUDE_WEEKEND_PLATFORM_SUMMARY.md`

## What stays the same

- Chapters remain MDX files in `apps/web/content/chapters/`
- Visualisations remain repo-backed React components
- Labs remain repo TypeScript files
- Claude still owns educational prose, lab narrative, and visual teaching logic

## What changed in the platform

FabricLab now has a Supabase-backed platform layer for:

- profiles and release metadata
- synced learner progress
- community comments / threads
- notification preferences

FabricLab-owned auth/session flow now lives in the app layer:

- Google and GitHub OAuth start from `fabriclab.dev`
- `auth.fabriclab.dev` is the branded auth entrypoint
- signed FabricLab session cookies are the app session source of truth

The app is no longer purely offline/static.

## Release and access model

Current learner access:

- public visitors can browse:
  - `/`
  - `/curriculum`
  - `/community`
- sign-in is required to open chapter and lab bodies
- all published chapters are available to signed-in learners
- all published labs are available to signed-in learners
- unpublished items stay dark until released in `/admin/releases`

## Important authoring implications for Claude

### 1. Keep slugs stable

Route gating, progress sync, and release metadata depend on stable chapter/lab slugs.
Do not casually rename:

- chapter slugs
- lab IDs
- continue-link targets

### 2. Content still ships through git

New chapters do not come from Supabase.
They still arrive as:

- MDX
- visualisation files
- registry updates
- deploy prompts

### 3. New content must be added to catalog metadata

When a new chapter or lab is introduced, Codex must also add an entry to:

- `apps/web/content/catalog.json`

That file controls:

- number/order
- href
- default publication metadata
- preview summary
- publish default

### 4. Keep lesson content educational

Do not write auth, billing, or product-copy into chapter bodies unless explicitly requested.
Keep course content focused on networking/HPC learning.

### 5. Expect community hooks around content

Chapters and labs now support:

- quick comments
- tracked discussions
- optional reply-notification opt-ins

Claude does not need to author these systems, but should avoid assuming lesson pages are
purely static documents.

## Operational release workflow

1. Claude writes or revises content
2. Codex integrates files into the repo
3. Codex updates `content/catalog.json` if needed
4. Codex runs catalog sync
5. Admin publishes the content from `/admin/releases`

## Current defaults to remember

- signed-in progress syncs to Supabase
- community reading is public, posting is signed-in
- admin controls exist for release state, preview shells, notification testing, and smoke cleanup
- no paywall copy should be added back into the public learner journey
- release metadata
- synced learner progress

The app is no longer purely offline/static.

## Release model

Current learner access:

- all published chapters are open
- all published labs are open
- auth is optional and mainly used for synced progress plus admin workflows

## Important authoring implications for Claude

### 1. Keep slugs stable

Route gating and release metadata depend on stable chapter/lab slugs.
Do not casually rename:

- chapter slugs
- lab IDs
- continue-link targets

### 2. Content still ships through git

New chapters do not come from Supabase.
They still arrive as:

- MDX
- visualisation files
- registry updates
- deploy prompts

### 3. New content must be added to catalog metadata

When a new chapter or lab is introduced, Codex must also add an entry to:

- `apps/web/content/catalog.json`

That file controls:

- number/order
- href
- default publication metadata
- preview summary if we ever reintroduce staged previews
- publish default

### 4. Do not write auth/billing prose into lessons

Keep course content educational.
Do not add subscription/paywall/product-copy into chapter bodies unless explicitly requested.

## Operational release workflow

1. Claude writes or revises content
2. Codex integrates files into the repo
3. Codex updates `content/catalog.json` if needed
4. Codex runs catalog sync
5. Admin publishes the content from `/admin/releases`

## Current product defaults to remember

- guest progress is local only
- signed-in progress syncs to Supabase
- admin controls still exist for release staging and internal testing
