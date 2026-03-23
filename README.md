# FabricLab

FabricLab is an offline-first HPC networking learning platform focused on RoCEv2, InfiniBand operations, topology design, and NCCL diagnostics.

The current repo contains a working Next.js app in `apps/web` with:

- 9 chapter routes covering hardware foundations through NCCL performance
- 6 interactive labs with a state-driven CLI simulator
- a multi-device terminal with per-device command sets
- lab-specific topology views and a reference drawer
- MDX chapter rendering plus a large visualisation/component registry

## Current Scope

- Module: `RoCEv2`
- Chapters: `ch0` through `ch8`
- Labs:
  - `lab0-failed-rail`
  - `lab1-pfc-fix`
  - `lab2-congestion`
  - `lab3-uneven-spine`
  - `lab4-topology-sizing`
  - `lab5-nccl-diagnosis`

## Running The App

The runnable app lives under `apps/web`.

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful routes:

- [http://localhost:3000/](http://localhost:3000/) — landing page
- [http://localhost:3000/curriculum](http://localhost:3000/curriculum) — chapter + lab index
- [http://localhost:3000/learn](http://localhost:3000/learn) — chapter browser
- [http://localhost:3000/lab?lab=lab0-failed-rail](http://localhost:3000/lab?lab=lab0-failed-rail) — lab entrypoint
- [http://localhost:3000/module/rocev2](http://localhost:3000/module/rocev2) — module home

## Project Structure

Key directories:

- `apps/web/app` — Next.js routes
- `apps/web/content/chapters` — MDX chapter content
- `apps/web/content/knowledge` — reference content
- `apps/web/data/labs` — lab configs and device layouts
- `apps/web/lib/commands` — simulator command handlers
- `apps/web/components/terminal` — terminal UI
- `apps/web/components/topology` — topology visualisations
- `apps/web/components/visualisations` — chapter visuals
- `apps/web/store` — Zustand state

## How The Simulator Works

- Device tabs map to DGX hosts, Spectrum-X leaf switches, spine switches, or workstation contexts.
- Commands are routed through lab-aware handlers in `apps/web/components/terminal/commandHandler.ts`.
- Lab state lives in Zustand and drives command output, hints, and completion.
- Chapters and reference content are rendered from MDX/static content files in the repo.

## Workflow Notes

- Read `AGENTS.md` first in every coding session.
- Read `plan.md` second.
- Content and visualisations are dropped into the repo and integrated into the app.
- For the content-delivery workflow, see `CONTENT_PIPELINE.md`.

## Validation

Type-check the app with:

```bash
apps/web/node_modules/.bin/tsc.cmd --noEmit --project apps/web/tsconfig.json
```

The app is designed to work without external APIs or runtime configuration.
