# Codex Handoff

## Repo state

- Workspace root: `C:\Users\arjun\Desktop\fabriclab`
- App root: `apps/web`
- Primary branch in use: `main`
- Follow `AGENTS.md` first, then `plan.md`

## What has been built

- FabricLab scaffold implemented in `apps/web`
- Zustand store, lab engine, command classifier, command handlers
- xterm-based terminal and command routing
- Lab panel, result overlay, topology view
- Knowledge panel wired to static knowledge content
- MDX chapter routing and first chapter rendering
- Module page and lab page

## Content currently integrated

- `apps/web/content/knowledge/pfc.ts`
- `apps/web/content/knowledge/ecn.ts`
- `apps/web/content/knowledge/rocev2.ts`
- `apps/web/content/knowledge/commands.ts`
- `apps/web/content/chapters/ch1-foundations.mdx`

## Key implementation details

- The runnable Next app is under `apps/web`, not repo root
- Knowledge panel chips dispatch `insert-command` and terminal listens for it
- Lab completion is triggered reactively in `apps/web/app/module/rocev2/lab/LabExperience.tsx`
- Condition labels come from `apps/web/lib/formatters.ts`
- `show dcb pfc` verifies both `pfcDisabled` and `pfcVerified` when PFC is off
- Command classifier uses lowercase normalized commands, including `ethtool -s eth0`

## Verified recently

- `tsc --noEmit` passes in `apps/web`
- `npm run build` passes in `apps/web`
- `/module/rocev2` loads
- `/module/rocev2/ch1-foundations` loads and renders the table
- `/module/rocev2/lab` loads
- Command classifier test passed 6/6
- Lab 1 state trace verified:
  - `show dcb pfc` -> PFC concept active, no conditions met
  - `disable pfc` -> `pfcDisabled` met
  - `show dcb pfc` -> `pfcDisabled` and `pfcVerified` verified, lab completes
  - reset/reload clears conditions and score

## Good resume starting points

- Inspect `apps/web/app/module/rocev2/lab/LabExperience.tsx`
- Inspect `apps/web/components/terminal/Terminal.tsx`
- Inspect `apps/web/components/knowledge/KnowledgePanel.tsx`
- Inspect `apps/web/lib/commands/showDcbPfc.ts`
- Inspect `apps/web/store/labStore.ts`

## Resume prompt

Use this in the next Codex session:

> Read `AGENTS.md`, then `plan.md`, then `docs/codex-handoff.md`. Work inside `apps/web`. This repo already has the FabricLab scaffold, knowledge panel content, first MDX chapter, and lab simulation loop integrated. First inspect git status and the latest commit, then summarize current state, open the key lab/terminal/knowledge files, and continue from there without rebuilding completed work.
