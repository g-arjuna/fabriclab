# FabricLab — Build Plan
> Engineering spec for Codex. Content comes from Claude — see AGENTS.md.
> Zero API calls. Zero configuration. Works offline.

---

## Current state (as of March 2026)

The MVP is complete and live. This plan now tracks:
- Pending Codex deploy tasks for content Claude has already written
- Pending bug-fix patches with existing Codex prompt files
- Infrastructure needed for the next chapter (Ch11)

For chapter status and content briefs, see `FABRICLAB_CONTENT_BACKLOG_v7.md`.

---

## Two-agent workflow

```
CLAUDE writes:                          CODEX applies:
──────────────                          ──────────────
MDX chapter files                       File copies to target paths
React viz components (.tsx)             TypeScript fixes (tsc --noEmit)
Updated mdxComponents.ts                Bug-fix patches from Codex prompt .txt
Codex deploy prompt .txt files          Nav link updates between chapters
Lab scenario TypeScript                 Image generation + placement (see below)
                                        Light prose when contextualising images
```

Codex does not write substantive educational content.
Claude does not write infrastructure or generate images.

---

## Platform — what is built ✅

| Component | Location | Status |
|-----------|----------|--------|
| MDX rendering engine | `app/learn/[chapter]/page.tsx` | ✅ live |
| Multi-device CLI terminal | `components/terminal/` | ✅ live |
| Lab engine + state | `lib/labs/`, `store/` | ✅ live |
| Visualisation registry | `lib/mdxComponents.ts` | ✅ live (Ch0–Ch9) |
| Topology view | `components/topology/` | ✅ live |
| Curriculum / learn routes | `app/curriculum/`, `app/learn/` | ✅ live |

---

## Pending Codex tasks

### TASK 1 — Deploy Ch10 (HIGHEST PRIORITY)

Ch10 is written by Claude and sitting in `outputs/`. It is NOT yet in the live repo.

**Files to copy:**

| Source | Destination |
|--------|-------------|
| `outputs/ch10-storage-fabric.mdx` | `apps/web/content/chapters/ch10-storage-fabric.mdx` |
| `outputs/visualisations/StorageSeparationViz.tsx` | `apps/web/components/visualisations/` |
| `outputs/visualisations/StorageDataPathViz.tsx` | `apps/web/components/visualisations/` |
| `outputs/visualisations/NVMeoFProtocolViz.tsx` | `apps/web/components/visualisations/` |
| `outputs/visualisations/ParallelFSViz.tsx` | `apps/web/components/visualisations/` |
| `outputs/visualisations/CheckpointCostViz.tsx` | `apps/web/components/visualisations/` |
| `outputs/visualisations/StorageTopologyViz.tsx` | `apps/web/components/visualisations/` |
| `outputs/mdxComponents.ts` | `apps/web/lib/mdxComponents.ts` |
| `outputs/COMPONENTS_REGISTRY.md` | `apps/web/components/visualisations/COMPONENTS_REGISTRY.md` |

**After copying:**
1. Verify Ch9 nav link says `/learn/ch10-storage-fabric` (already correct in live repo — confirm only).
2. Run `tsc --noEmit` — fix any type errors in the 6 new viz components before committing.
3. Add Ch10 nav link `[Continue to Chapter 11 →](/learn/ch11-monitoring-telemetry)` at end of
   `ch10-storage-fabric.mdx` (after Ch11 is written and deployed).

---

### TASK 2 — Fix TopologyScalingViz full-mesh bug

**File:** `apps/web/components/visualisations/TopologyScalingViz.tsx`
**Codex prompt:** `outputs/TOPOLOGY_VIZ_FIX_CODEX_PROMPT.txt`

Current bug: leaf-to-spine connections use `i % spineCount` (1:1 — wrong).
Fat-tree requires full mesh: every leaf connects to every spine.
Stage 3 has the same bug with hardcoded parent arrays.

Fix: replace with a nested loop generating all leaf×spine edges.

---

### TASK 3 — Apply P11 + P12 to Ch0

**File:** `apps/web/content/chapters/ch0-hardware-foundations.mdx`
**Codex prompt:** `outputs/P11_P12_CODEX_PROMPT.txt`

**P11:** Change "NVLink gen3 (in DGX H100)" → "4th-generation NVLink". Add generation table:
- A100 = NVLink 3, 600 GB/s
- H100 = NVLink 4, 900 GB/s
- B200 = NVLink 5, 1.8 TB/s
- Note: NVLink gen ≠ NVSwitch gen (separate counters)

**P12:** Add NVSwitch SHARP paragraph to Act 3. Add footnote to Act 6:
"NVSwitch SHARP = intra-node in-network reduction; IB SHARP = inter-node."

**Required before writing Ch12** (NVLink Switch System).

---

### TASK 4 — CLI factual accuracy batch

**Codex prompt:** `outputs/CLI_FACTUAL_FIX_CODEX_PROMPT.txt`

| ID | File | Fix |
|----|------|-----|
| CLI-1 | `lib/commands/ethtoolStats.ts` | Counter names: `rx_prio3_pause`, `tx_prio3_pause`, `rx_ecn_marked_pkts`, `tx_discards_phy` |
| CLI-2 | `showDcbPfc`, `showDcbEts`, `showInterfaceCounters`, `showRoce`, `showSpineCounters`, `mutations.ts` | Switch ports: `swp1–swp32` not `eth0` |
| CLI-3 | `ibstat.ts` | Remove duplicate `State:` field on error-disabled rail |
| CLI-4 | NCCL test output | Correct busbw to ~146 GB/s (not ~380 GB/s) for 128-GPU cluster, 8 GB message |

---

### TASK 5 — Remaining fixes batch

**Codex prompt:** `outputs/REMAINING_FIXES_CODEX_PROMPT.txt`

| ID | Fix |
|----|-----|
| RF-1 | `showProposal.ts`: "2 hops (4 traversals)" — split into two separate lines |
| RF-2 | Replace `clear counters eth0` → `clear counters` throughout |
| RF-3 | Add `ibstat` to Lab 1 + Lab 2 DGX `help` output and `allowedCommands` |

---

### TASK 6 — Analysis findings fixes

**Codex prompt:** `outputs/ANALYSIS_FINDINGS_FIX_CODEX_PROMPT.txt`

| ID | Fix |
|----|-----|
| AF-1 | Lab 0: add `ethtool -S eth3` handler showing NIC Active, switch port Err-Disabled |
| AF-2 | Ch7 Proposal B: "not feasible" → "75% port waste (economically irrational)" |
| AF-3 | Ch8 NCCL simulator: add `← FabricLab simulator command` labels + "In production" `export` blocks |
| AF-4 | Lab 3: add `show ecmp load-balance` to `KNOWN_COMMANDS`, `EXACT_HANDLERS`, `allowedCommands` |

---

### TASK 7 — Practitioner experience fixes

**Codex prompt:** `outputs/PRACTITIONER_FIXES_CODEX_PROMPT.txt`

| ID | Fix |
|----|-----|
| PF-1 | Add educational responses for: `ping`, `ip`, `ip a`, `export` (currently "unknown command") |
| PF-2 | Add `show interface swp1`–`swp8` aliases → `showSwitchPort(activeRailId)` |
| PF-3 | Lab 0 scenario text: "32 DGX downlinks" → "16 active DGX downlinks + 16 active spine uplinks (32 ports unused)" |

---

## Next content to write (Claude's job — not Codex)

**Ch11: Monitoring, Telemetry, and Observability**

Start a new Claude conversation. Upload:
- `repo-context.txt`
- `FABRICLAB_STRATEGY.md`
- `FABRICLAB_CHAPTER_METADATA.md`
- `FABRICLAB_CONTENT_BACKLOG_v7.md`

Say: "Write Chapter 11 — Monitoring, Telemetry, and Observability."

Claude will produce: MDX chapter + 5 viz components + updated `mdxComponents.ts` +
updated `COMPONENTS_REGISTRY.md` + Codex deploy prompt.

Planned vizzes: `UFMApiViz`, `DCGMMetricsViz`, `AlertThresholdViz`,
`CorrelationTimelineViz`, `FabricHealthDashboardViz`.

**Chapters after Ch11 (in order):**
- Ch12: Scale-Up Networking — NVLink Switch System *(requires P11+P12 first)*
- Ch13: Alternative Topologies (Torus, Dragonfly)
- Ch14: GPU Hardware Generations

---

## Tech stack (unchanged)

```
Next.js 15 (App Router) + TypeScript strict
Tailwind CSS
Zustand (no persistence)
xterm.js
@next/mdx + next-mdx-remote + remark-gfm + gray-matter
No backend. No database. No env vars.
```

---

## Validation protocol (run after every Codex task)

```bash
apps/web/node_modules/.bin/tsc --noEmit --project apps/web/tsconfig.json
```

Fix all errors before committing. Do not leave TypeScript errors in the repo.

---

## Image assets

Codex is authorised to generate and place images across all file types.
See Rule 6 in AGENTS.md for the full permission set. Summary:

**Where images live:** `apps/web/public/images/[chapter-slug]/filename.ext`

**Generation methods Codex may use:**
- AI image APIs (DALL-E, Stability AI) — generate at authoring time, commit static file
- SVG generation from code — write `.svg` directly or via script
- Vendor screenshots / diagrams placed manually

**Placement targets:** MDX chapters, React viz components, any `.md` file, any page/component file

**Light prose rule:** Codex may write short captions (1–2 sentences) immediately adjacent
to an image tag in `.mdx` files. No other prose changes to educational content.

**Blocked items for P10 (Ch7 real images):** waiting on `RealImage` MDX component
from platform engineering before the 6 Ch7 image placeholders can be wired up.

---

## What Codex must NOT do

- Write educational prose or concept explanations in MDX chapters
  *(exception: short captions / context sentences when placing images)*
- Write React visualisation component logic or layouts
- Write CLI output text or lab scenario narrative
- Invent component names not in `COMPONENTS_REGISTRY.md`
- Add runtime API calls to the app (image generation is build-time only)
- Add environment variables required at page render time
- Use localStorage or sessionStorage (not supported in lab environment)
- Use `<form>` tags in React components (xterm.js environment restriction)
