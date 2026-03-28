# Claude Handoff - Release Control and Content Constraints

This note tells Claude what changed in the platform so ongoing chapter work keeps fitting the app.

## What stays the same

- Chapters remain MDX files in `apps/web/content/chapters/`
- Visualisations remain repo-backed React components
- Labs remain repo TypeScript files
- Claude still owns educational prose, lab narrative, and visual teaching logic

## What changed in the platform

FabricLab now has a Supabase-backed platform layer for:

- auth and sessions
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
