# FabricLab — MVP Build Plan

> Engineering spec for Codex. Content comes from Claude — see AGENTS.md.
> Zero API calls. Zero configuration. Works offline.

---

## Goal

A working MVP in 30–45 days with zero running costs.

RoCEv2 learning with CLI simulation and Claude-authored MDX content.
The platform renders what Claude writes. Codex builds the renderer.

---

## Two-agent workflow

```
CLAUDE writes:                    CODEX builds:
─────────────                     ─────────────
content/chapters/*.mdx            The MDX rendering engine
content/knowledge/*.ts            The CLI terminal + state
components/visualisations/*.tsx   The lab engine
                                  The knowledge panel shell
                                  Everything in types/, store/, lib/
```

Codex does not write content. Claude does not write infrastructure.

---

## No API calls — what this means

```
No OpenAI API          → Knowledge panel uses static content/knowledge/*.ts
No Supabase            → No auth, no persistence, no DB
No .env file           → Nothing to configure
No network requests    → Works fully offline
```

Phase 2 adds APIs as progressive enhancements — zero structural changes needed.

---

## Scope

### ✅ Build (Codex)

| What | Detail |
|------|--------|
| MDX rendering engine | Next.js @next/mdx, dynamic chapter routes, mdxComponents registry |
| CLI terminal | xterm.js, all commands + mutations, state-driven output |
| Lab engine | State evaluation, scoring, 3-level hints |
| Knowledge panel shell | Renders content/knowledge/*.ts files from Claude |
| Static topology view | SVG per spec below |
| Zustand store | Topology state + lab state + active concept tracking |

### ✅ Content (Claude, integrated by Codex)

| What | Location |
|------|----------|
| MDX chapters | content/chapters/*.mdx |
| Visualisation components | components/visualisations/*.tsx |
| Knowledge base data | content/knowledge/*.ts |
| CLI output text | Inside knowledge base files |

### ❌ Do not build

Auth, payments, InfiniBand, crawlers, NVIDIA Air, React Flow canvas,
rack view, flow animations, RAG, embeddings, WebSockets, background jobs,
any API calls, any .env variables.

---

## Tech stack

```
Next.js 15 (App Router) + TypeScript strict
Tailwind CSS
Zustand (no persistence)
xterm.js
@next/mdx + react-markdown + remark-gfm + gray-matter
No backend. No database. No env vars.
```

---

## Page architecture

### `/module/rocev2` — module home
Shows lab selector (Lab 1 / Lab 2) and links to chapters.

### `/module/rocev2/[chapter]` — dynamic chapter route
Renders Claude-authored MDX from `content/chapters/[chapter].mdx`.
Sidebar shows chapter navigation.
All custom components resolved from `lib/mdxComponents.ts`.

### `/module/rocev2/lab` — lab environment
Three-panel layout: Lab Panel | Topology View | Knowledge Panel
Full-width CLI terminal below.

```
┌───────────────┬──────────────────┬──────────────────────────┐
│  Lab Panel    │  Topology View   │  Knowledge Panel         │
│  Scenario     │  Static SVG      │  Tabs: PFC|ECN|RoCEv2|   │
│  Conditions   │  2 nodes+switch  │  Commands                │
│  checklist    │  Status dots     │  Auto-highlights on cmd   │
│  Hints        │                  │  Keyword search          │
├───────────────┴──────────────────┴──────────────────────────┤
│  CLI Terminal (xterm.js — full width)                       │
│  fabric-sim:~$ _                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## MDX rendering engine — how to build it

### next.config.ts

```typescript
import createMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
  },
})

export default withMDX({
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
})
```

### app/module/rocev2/[chapter]/page.tsx

```typescript
import { MDXRemote } from 'next-mdx-remote/rsc'
import { mdxComponents } from '@/lib/mdxComponents'
import { readFile } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

export default async function ChapterPage({
  params,
}: {
  params: { chapter: string }
}) {
  const filePath = path.join(
    process.cwd(),
    'content/chapters',
    `${params.chapter}.mdx`
  )
  const raw = await readFile(filePath, 'utf-8')
  const { content, data } = matter(raw)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-medium mb-8">{data.title}</h1>
      <MDXRemote source={content} components={mdxComponents} />
    </div>
  )
}
```

### lib/mdxComponents.ts

Codex builds this file and maintains it. When Claude delivers a new
visualisation component, Codex adds it here. Never modify component logic.

```typescript
// lib/mdxComponents.ts
// Add new Claude-delivered components here when they arrive.
// Do not modify component logic — registration only.

export const mdxComponents = {
  // Claude-written visualisation components (add as they arrive)
  // AllReduceBarrier: dynamic(() => import('@/components/visualisations/AllReduceBarrier')),
  // DGXGenerationExplorer: dynamic(() => import('@/components/visualisations/DGXGenerationExplorer')),

  // Utility components Claude uses in MDX
  // CalloutBox, SpecTable, Pill — registered when Claude delivers them
}
```

---

## Visualisation component rules (for Codex when integrating)

Claude writes visualisation components. They follow this contract:

```
1. Self-contained — imports only React, no external state
2. No required props — everything has defaults
3. Tailwind classes or inline styles — no external CSS
4. Default export + named export (both present)
5. TypeScript strict — no 'any' types

Codex integration steps when a new component arrives:
  1. Copy file to components/visualisations/[ComponentName].tsx
  2. Add to lib/mdxComponents.ts
  3. Run tsc --noEmit
  4. Fix only TypeScript/import errors — never touch component logic
  5. Verify it renders at the chapter route
```

---

## State shape — do not deviate

```typescript
// types/index.ts — Codex builds this

export interface TopologyState {
  nic: {
    name: string        // "eth0"
    speed: number       // 400 (Gbps)
    state: 'up' | 'down'
  }
  pfcEnabled: boolean
  ecnEnabled: boolean
  congestionDetected: boolean
  bufferUtilPct: number   // 0–100
}

export interface LabState {
  labId: string | null
  conditions: Record<string, boolean>
  verifiedConditions: Set<string>
  mistakeCount: number
  nearMissCount: number
  hintsUsed: number
  startTime: number | null
  isComplete: boolean
  score: number | null
}

export interface KnowledgeConcept {
  id: string
  title: string
  summary: string
  content: string           // markdown — from Claude
  relatedCommands: string[]
  relatedConcepts: string[]
}

export interface CommandResult {
  output: string
  conceptId?: string        // which knowledge concept to surface
  type: 'success' | 'error' | 'info'
}

export interface LabConfig {
  id: string
  title: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  scenario: string
  expectedMinutes: number
  initialTopology: Partial<TopologyState>
  requiredConditions: string[]
  hints: LabHint[]
}

export interface LabHint {
  level: 1 | 2 | 3
  triggerAfterMistakes: number
  triggerAfterSeconds: number
  text: string
}

export interface ClassifiedCommand {
  type: 'exact' | 'near-miss' | 'exploratory' | 'gibberish'
  handler?: string
  suggestion?: string
  penalty: 'none' | 'light' | 'full'
}
```

---

## Zustand store — full shape

```typescript
// store/labStore.ts

interface Store {
  // State
  topology: TopologyState
  lab: LabState
  activeConceptId: string | null    // drives knowledge panel highlighting

  // Topology actions
  setTopology: (patch: Partial<TopologyState>) => void

  // Lab actions
  loadLab: (config: LabConfig) => void
  setCondition: (key: string, value: boolean) => void
  markVerified: (key: string) => void
  incrementMistake: () => void
  incrementNearMiss: () => void
  useHint: () => void
  completeLab: () => void
  resetLab: () => void

  // Knowledge panel
  setActiveConceptId: (id: string | null) => void
}
```

---

## CLI commands — 6 core read commands

Each returns `CommandResult`. Each has a `conceptId` to surface in knowledge panel.

### `show dcb pfc`
```typescript
// Reads: pfcEnabled
// Side effect: markVerified('pfcDisabled') if pfcEnabled === false
// ConceptId: 'pfc'

// Output when pfcEnabled = true:
`Interface eth0
  Priority Flow Control:  enabled
  PFC enabled priorities: 3 (cos3)
  Pause quanta:           0xffff
  Watchdog:               enabled
  Watchdog interval:      200ms`

// Output when pfcEnabled = false:
`Interface eth0
  Priority Flow Control:  disabled
  PFC enabled priorities: none
  Pause quanta:           N/A
  Watchdog:               disabled`
```

### `show dcb ets`
```typescript
// Reads: ecnEnabled
// ConceptId: 'ecn'

`Interface eth0 — ETS Configuration
  Traffic class  Priority  Bandwidth  Algorithm
  TC0            0,1,2     30%        ETS
  TC3 (RoCE)     3         50%        Strict Priority
  TC7 (mgmt)     7         20%        ETS

  ECN marking:  ${ecnEnabled ? 'enabled (DSCP 26)' : 'disabled'}
  DCQCN:        ${ecnEnabled ? 'active' : 'inactive'}`
```

### `show interface counters`
```typescript
// Reads: nic, congestionDetected, bufferUtilPct
// Side effect: markVerified('congestionChecked') if congestionDetected
// ConceptId: 'rocev2'

// When congestionDetected = true:
`Interface eth0
  Input packets:     1,847,293,441
  Output drops:      47,291
  PFC pause frames:  12,847
  Buffer util:       ${bufferUtilPct}%`

// When congestionDetected = false:
`Interface eth0
  Input packets:     1,847,293,441
  Output drops:      0
  PFC pause frames:  0
  Buffer util:       12%`
```

### `ethtool -S eth0`
```typescript
// Reads: pfcEnabled, ecnEnabled, nic, bufferUtilPct
// ConceptId: 'pfc'

`NIC statistics:
  rx_pfc_pause_frames:  ${pfcEnabled ? '12847' : '0'}
  tx_pfc_pause_frames:  ${pfcEnabled ? '8293' : '0'}
  rx_ecn_marked:        ${ecnEnabled ? '2947' : '0'}
  tx_dropped:           ${congestionDetected ? '47291' : '0'}
  link_speed:           ${nic.speed}Gb/s
  link_state:           ${nic.state}`
```

### `rdma link show`
```typescript
// Reads: nic.state, pfcEnabled
// ConceptId: 'rocev2'

`link mlx5_0/1 state ${nic.state === 'up' ? 'ACTIVE' : 'DOWN'} physical_state ${nic.state === 'up' ? 'LINK_UP' : 'DISABLED'}
  type RoCE
  netdev eth0
  ${nic.state === 'up' ? 'roce_mode: RoCEv2' : ''}
  ${!pfcEnabled && nic.state === 'up' ? 'WARNING: PFC disabled — lossless not guaranteed' : ''}`
```

### `show roce`
```typescript
// Reads: pfcEnabled, ecnEnabled, nic
// Side effect: markVerified('ecnVerified') if ecnEnabled
// ConceptId: 'ecn'

`RoCE Configuration — eth0
  RoCE version:   RoCEv2
  State:          ${nic.state === 'up' ? 'active' : 'down'}
  PFC:            ${pfcEnabled ? 'enabled (priority 3)' : 'DISABLED — retransmissions possible'}
  ECN:            ${ecnEnabled ? 'enabled — DCQCN active' : 'DISABLED — no congestion control'}
  DSCP marking:   ${ecnEnabled ? '26 (RoCE traffic)' : 'not configured'}
  MTU:            9000
  GID:            fe80::506b:4b03:00a1:b200`
```

---

## Mutation commands

```typescript
// lib/commands/mutations.ts

'disable pfc'        → setTopology({ pfcEnabled: false })
                       setCondition('pfcDisabled', true)

'enable pfc'         → setTopology({ pfcEnabled: true })
                       setCondition('pfcDisabled', false)

'enable ecn'         → setTopology({ ecnEnabled: true, congestionDetected: false })
                       setCondition('ecnEnabled', true)

'disable ecn'        → setTopology({ ecnEnabled: false })
                       setCondition('ecnEnabled', false)

'clear counters eth0' → setTopology({ congestionDetected: false, bufferUtilPct: 20 })

'help'               → return list of all available commands

'hint'               → useHint() → return current hint text based on level
```

---

## Command classifier

```typescript
// lib/commandClassifier.ts

const KNOWN_COMMANDS = [
  'show dcb pfc', 'show dcb ets', 'show interface counters',
  'ethtool -S eth0', 'rdma link show', 'show roce',
  'disable pfc', 'enable pfc', 'enable ecn', 'disable ecn',
  'clear counters eth0', 'help', 'hint'
]

const KNOWN_VERBS = ['show', 'disable', 'enable', 'no', 'clear', 'help', 'hint']

// Classification:
// 1. Exact match → { type: 'exact', handler: commandName, penalty: 'none' }
// 2. Levenshtein ≤ 2 → { type: 'near-miss', suggestion: closest, penalty: 'light' }
//    + nearMissCount++
//    + show: "Did you mean: <suggestion>?"
// 3. First token in KNOWN_VERBS but no match → { type: 'exploratory', penalty: 'none' }
//    + show: "Unknown arguments. Available: help"
// 4. Anything else → { type: 'gibberish', penalty: 'full' }
//    + mistakeCount++
```

---

## Lab engine

### Scoring

```typescript
// lib/labEngine.ts

function calculateScore(state: LabState): number {
  let score = 100
  score -= state.mistakeCount * 8
  score -= state.nearMissCount * 3
  score -= state.hintsUsed * 10
  return Math.max(0, Math.min(100, Math.round(score)))
}

// Bands:
// 90–100 → "Clean execution"     (green)
// 70–89  → "Completed"           (blue)
// 50–69  → "Completed with help" (amber)
// 0–49   → "Needs review"        (red)
```

### Hint triggers

```typescript
function shouldTriggerHint(state: LabState, config: LabConfig): LabHint | null {
  const elapsed = state.startTime
    ? (Date.now() - state.startTime) / 1000
    : 0

  const triggered = config.hints.find(h =>
    state.mistakeCount >= h.triggerAfterMistakes ||
    elapsed >= h.triggerAfterSeconds
  )

  // Only show each level once
  return triggered && !alreadyShown(triggered.level) ? triggered : null
}
```

---

## Lab configs

### Lab 1 — Fix PFC misconfiguration

```typescript
export const lab1: LabConfig = {
  id: 'lab1-pfc-fix',
  title: 'Fix the PFC misconfiguration',
  difficulty: 'beginner',
  expectedMinutes: 10,
  scenario: `A RoCEv2 training workload is experiencing frequent retransmissions,
slowing GPU-to-GPU communication by ~35%. The operations team suspects a PFC
misconfiguration is causing a pause storm.

Diagnose the current PFC state, identify the problem, and fix it.
Verify the fix using the appropriate show command.`,
  initialTopology: {
    pfcEnabled: true,
    ecnEnabled: false,
    congestionDetected: true,
    bufferUtilPct: 92,
  },
  requiredConditions: ['pfcDisabled', 'pfcVerified'],
  hints: [
    { level: 1, triggerAfterMistakes: 3, triggerAfterSeconds: 120,
      text: "Start by checking the current state of Priority Flow Control on this interface." },
    { level: 2, triggerAfterMistakes: 6, triggerAfterSeconds: 240,
      text: "The 'dcb' command family manages Data Center Bridging. Try 'show dcb pfc'." },
    { level: 3, triggerAfterMistakes: 10, triggerAfterSeconds: 360,
      text: "Run 'disable pfc' to disable PFC, then verify with 'show dcb pfc'." },
  ],
}
```

### Lab 2 — Diagnose congestion

```typescript
export const lab2: LabConfig = {
  id: 'lab2-congestion',
  title: 'Diagnose fabric congestion',
  difficulty: 'intermediate',
  expectedMinutes: 15,
  scenario: `GPU training throughput has dropped 40% across this node's RoCEv2 links.
Monitoring shows elevated buffer utilisation but the team cannot identify the root cause.

Use CLI tools to diagnose why congestion is occurring, then configure
the correct mechanism to manage it without disabling PFC.`,
  initialTopology: {
    pfcEnabled: true,
    ecnEnabled: false,
    congestionDetected: true,
    bufferUtilPct: 87,
  },
  requiredConditions: ['congestionChecked', 'ecnEnabled', 'ecnVerified'],
  hints: [
    { level: 1, triggerAfterMistakes: 3, triggerAfterSeconds: 120,
      text: "Start by looking at interface counters. What metric stands out?" },
    { level: 2, triggerAfterMistakes: 6, triggerAfterSeconds: 240,
      text: "ECN signals congestion before buffers overflow. Is it configured here?" },
    { level: 3, triggerAfterMistakes: 10, triggerAfterSeconds: 360,
      text: "Run 'show interface counters', then 'enable ecn', then verify with 'show roce'." },
  ],
}
```

---

## Topology SVG spec

Static SVG in `components/topology/TopologyView.tsx`.
State-driven: dot colour and line style only. No interaction.

```
[DGX H100 Node A]      ← blue rect, label + status dot
        |
   400G link (solid when up, dashed when nic.state = 'down')
        |
[Spectrum-X SN5600]    ← indigo rect
        |
   400G link
        |
[DGX H100 Node B]      ← blue rect, label + status dot

Status dots: filled green = up, empty red = down
Legend: ● Active  ○ Down  — 400G link  - - degraded
```

---

## Knowledge panel shell

Codex builds the shell. Claude fills the content (content/knowledge/*.ts).

```typescript
// What the knowledge panel does:
// 1. Reads all KnowledgeConcept arrays from content/knowledge/
// 2. Displays as 4 tabs: PFC | ECN | RoCEv2 | Commands
// 3. Each tab shows concept cards (summary visible, content expands on click)
// 4. When store.activeConceptId changes → scroll to + highlight that concept
// 5. Keyword search filters across all concepts by title + summary
// 6. relatedCommands chips: clicking inserts command text into terminal

// Codex builds the shell with placeholder content
// Claude-written content/knowledge/*.ts files replace placeholder automatically
```

---

## Build order — Codex follows this exactly

```
Phase A: Core infrastructure (Codex Web — first session)
  Step 1  types/index.ts
  Step 2  store/labStore.ts
  Step 3  lib/commandClassifier.ts
  Step 4  lib/labEngine.ts
  Step 5  lib/commands/*.ts + mutations.ts
  Step 6  lib/mdxComponents.ts (empty registry to start)
  Step 7  components/terminal/Terminal.tsx + commandHandler.ts
  Step 8  components/lab/LabPanel.tsx + LabResult.tsx
  Step 9  components/topology/TopologyView.tsx
  Step 10 components/knowledge/KnowledgePanel.tsx + ConceptCard.tsx (shell)
  Step 11 data/labs/lab1-pfc-fix.ts + lab2-congestion.ts

Phase B: MDX engine (Codex Web — second session)
  Step 12 Configure @next/mdx in next.config.ts
  Step 13 app/module/rocev2/[chapter]/page.tsx (dynamic chapter route)
  Step 14 app/module/rocev2/page.tsx (module home)
  Step 15 app/page.tsx (entry)

Phase C: Content integration (Codex CLI — ongoing)
  Each time Claude delivers MDX or components:
  - Drop files in correct location
  - Tell Codex CLI to register + verify
  - Check in browser
  - Report issues back to Claude or Codex
```

---

## Phase 2 upgrade path (stubs only)

```typescript
// In KnowledgePanel.tsx — Phase 2: replace with API call, zero structural change
function getContextualContent(conceptId: string): KnowledgeConcept | null {
  // Phase 1: local lookup from content/knowledge/
  return knowledgeBase.find(c => c.id === conceptId) ?? null
  // Phase 2: → await fetch('/api/knowledge', { body: { id: conceptId } })
}

// In labStore.ts — Phase 2: add after completeLab()
// await supabase.from('attempts').insert({ labId, score, ... })
```

---

## Success criteria

1. Visit `/module/rocev2` — zero setup, zero env vars, works immediately
2. `/module/rocev2/ch1-foundations` renders Claude-written MDX with visualisations
3. All CLI commands + mutations return state-driven output
4. Knowledge panel auto-highlights concept when related command runs
5. Lab 1 + Lab 2 complete with correct scoring
6. Hints trigger at correct thresholds
7. New Claude MDX file integrates with single Codex CLI command
8. `tsc --noEmit` — zero errors
9. Zero network requests — fully offline

---

*Last updated: March 2026*
*Content: Claude · Engineering: Codex · Zero API cost*
