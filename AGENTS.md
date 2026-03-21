# AGENTS.md
> Read this file first. Read plan.md second. Then build.
> Zero external API calls. Zero configuration. Content comes from Claude.

---

## What this project is

FabricLab MVP — RoCEv2 networking learning platform with CLI simulation.
One module. Two labs. Six commands. Rich MDX content. Zero API costs.

---

## CRITICAL: How this project is built

This project uses a **two-agent workflow**. Codex does NOT write content or
visualisations. That is Claude's job. Codex integrates what Claude produces.

```
CLAUDE (content agent)          CODEX (engineering agent)
─────────────────────           ────────────────────────
Writes MDX chapters             Builds the platform infrastructure
Writes React visualisations     Renders MDX files in the app
Writes knowledge base content   Wires state to CLI commands
Defines component interfaces    Implements Zustand store
Generates command outputs        Builds xterm.js terminal
                │                         │
                └──── drops files ────────►
                      into /content/       Codex picks them up
                      and /components/     and integrates
```

**Codex rule:** If a task involves writing HPC educational content, concept
explanations, CLI output text, or visualisation component logic — STOP.
That comes from Claude. Ask the human to get it from Claude first.

---

## Hard rules

### Rule 1 — No API calls
Zero external API calls. No OpenAI. No Supabase. No HTTP requests.
No `.env` file. Works offline. No configuration needed.

### Rule 2 — CLI output from state
Every CLI command output reads from the Zustand topology store.
No hardcoded strings. Output changes when state changes.
This is the entire simulation model.

### Rule 3 — Content comes from Claude
Do NOT write MDX content. Do NOT write concept explanations.
Do NOT write CLI output templates. Do NOT create visualisation logic.
These come from Claude. Codex integrates them.

### Rule 4 — No real networking simulation
`pfcEnabled: boolean` is the PFC simulation.
`ecnEnabled: boolean` is the ECN simulation.
State flags are enough. No protocol implementation.

### Rule 5 — One step at a time
Follow the build order in plan.md exactly.
Run `tsc --noEmit` after each step before moving on.

---

## Tooling — VSCode or Codex app?

### Use VSCode + Codex CLI for:
- Integrating Claude-generated MDX files into the app
- Wiring up state to components
- Fixing TypeScript errors
- Debugging rendering issues
- Small targeted changes ("add this prop", "fix this type")
- Anything interactive where you want to see the change immediately

Install: `npm install -g @openai/codex`
Run in your project root: `codex`

### Use Codex Web for:
- Building entire features from scratch (full terminal component, full lab engine)
- Large multi-file refactors
- Anything you can describe completely and let run overnight

### Recommended workflow for this project:
1. **Codex Web** → build the initial scaffold (Steps 1–8 in plan.md)
2. **VSCode + Codex CLI** → integrate Claude content, fix issues, iterate

---

## Your first Codex Web prompt (copy this exactly)

```
Read AGENTS.md then plan.md in this repository carefully.

I am building FabricLab — an HPC networking learning platform.
Your job is ENGINEERING ONLY. Content comes from Claude separately.

Start with Steps 1–7 from the build order in plan.md:
1. types/index.ts — all TypeScript interfaces
2. store/labStore.ts — Zustand store with all actions
3. lib/commandClassifier.ts — Levenshtein-based classifier
4. lib/labEngine.ts — isComplete(), calculateScore(), getHint()
5. lib/commands/*.ts — all 6 command handlers + mutations.ts
6. components/terminal/Terminal.tsx + commandHandler.ts
7. components/lab/LabPanel.tsx + LabResult.tsx

Rules:
- CLI output must come from Zustand state — never hardcoded
- Do NOT write MDX content or educational text — that comes from Claude
- Do NOT add any API calls or environment variables
- Use the exact folder structure from AGENTS.md
- Use the exact state shape from plan.md
- After each file, ensure TypeScript compiles

Do not build the knowledge panel, topology view, or page assembly yet.
Build only what is listed above, in that order.
```

---

## Your first VSCode Codex CLI prompts (after scaffold is built)

When a new MDX file arrives from Claude, run in terminal:

```bash
# Tell Codex CLI what to do with a new MDX file
codex "A new MDX file has been added to content/chapters/ch1-foundations.mdx.
It uses these custom components: <MentalModelTable />, <AllReduceBarrier />,
<DGXGenerationExplorer />. These components are defined at the top of the MDX file.
Wire this chapter into the app:
1. Ensure next.config.ts has MDX support configured
2. Add the chapter to app/module/rocev2/[chapter]/page.tsx
3. Make sure the MDX components render correctly
4. Run tsc --noEmit and fix any errors"
```

```bash
# Tell Codex CLI to integrate a new visualisation component
codex "Claude has provided a new React component file at
components/visualisations/PFCPauseStormViz.tsx.
This component is already complete — do not modify its logic.
Add it to the MDX component registry in lib/mdxComponents.ts
so it can be used in MDX files. Run tsc --noEmit."
```

---

## Folder structure

```
fabriclab/
├── AGENTS.md                         ← this file (Codex reads first)
├── plan.md                           ← full build spec (Codex reads second)
├── vision.md                         ← long-term context (Codex ignores)
├── extended_vision.md                ← full platform blueprint (Codex ignores)
│
├── content/                          ← CLAUDE WRITES THESE — Codex integrates
│   ├── chapters/                     ← MDX chapter files from Claude
│   │   ├── ch1-foundations.mdx
│   │   ├── ch2-pfc-basics.mdx
│   │   └── ch3-ecn-congestion.mdx
│   └── knowledge/                    ← static knowledge base from Claude
│       ├── pfc.ts
│       ├── ecn.ts
│       ├── rocev2.ts
│       └── commands.ts
│
├── components/
│   ├── terminal/
│   │   ├── Terminal.tsx              ← Codex builds
│   │   └── commandHandler.ts        ← Codex builds
│   ├── lab/
│   │   ├── LabPanel.tsx              ← Codex builds
│   │   └── LabResult.tsx             ← Codex builds
│   ├── topology/
│   │   └── TopologyView.tsx          ← Codex builds (static SVG spec from plan.md)
│   ├── knowledge/
│   │   ├── KnowledgePanel.tsx        ← Codex builds (reads from content/knowledge/)
│   │   └── ConceptCard.tsx           ← Codex builds
│   └── visualisations/               ← CLAUDE WRITES THESE — Codex registers
│       ├── AllReduceBarrier.tsx      ← interactive stepper from Claude
│       ├── DGXGenerationExplorer.tsx ← tabbed spec explorer from Claude
│       ├── PFCPauseStormViz.tsx      ← PFC animation from Claude
│       └── CableDecisionTree.tsx     ← interactive cable selector from Claude
│
├── lib/
│   ├── commands/                     ← Codex builds
│   │   ├── showDcbPfc.ts
│   │   ├── showDcbEts.ts
│   │   ├── showInterfaceCounters.ts
│   │   ├── ethtoolStats.ts
│   │   ├── rdmaLinkShow.ts
│   │   ├── showRoce.ts
│   │   └── mutations.ts
│   ├── mdxComponents.ts              ← Codex builds (registry of all MDX components)
│   ├── labEngine.ts                  ← Codex builds
│   └── commandClassifier.ts          ← Codex builds
│
├── store/
│   └── labStore.ts                   ← Codex builds
│
├── data/
│   └── labs/
│       ├── lab1-pfc-fix.ts           ← Codex builds (spec in plan.md)
│       └── lab2-congestion.ts        ← Codex builds (spec in plan.md)
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── module/
│       └── rocev2/
│           ├── page.tsx              ← module home (lab selector)
│           └── [chapter]/
│               └── page.tsx          ← dynamic chapter renderer
│
└── types/
    └── index.ts                      ← Codex builds
```

---

## MDX component registry — how it works

Codex builds `lib/mdxComponents.ts`. This is the registry that makes MDX components
work in Next.js. When Claude delivers a new MDX file or component, Codex adds it here.

```typescript
// lib/mdxComponents.ts
// Codex maintains this file.
// When Claude delivers a new visualisation component, add it here.
// Never modify the component logic — just register it.

import { AllReduceBarrier } from '@/components/visualisations/AllReduceBarrier'
import { DGXGenerationExplorer } from '@/components/visualisations/DGXGenerationExplorer'
import { PFCPauseStormViz } from '@/components/visualisations/PFCPauseStormViz'
import { CableDecisionTree } from '@/components/visualisations/CableDecisionTree'
import { CalloutBox } from '@/components/visualisations/CalloutBox'
import { SpecTable } from '@/components/visualisations/SpecTable'

// MDX files from Claude use these component names.
// They must be registered here exactly as named in the MDX.
export const mdxComponents = {
  AllReduceBarrier,
  DGXGenerationExplorer,
  PFCPauseStormViz,
  CableDecisionTree,
  CalloutBox,
  SpecTable,
  // Add new Claude-delivered components here
}
```

---

## Visualisation component contract

Claude writes visualisation components. They must follow this contract
so Codex can integrate them without touching their internals:

```typescript
// Every Claude-written visualisation component must:
// 1. Be a default export OR named export matching the filename
// 2. Have no required props (or all props have defaults)
// 3. Import only from React and its own file (no external state)
// 4. Use Tailwind classes OR inline styles — no external CSS files
// 5. Be self-contained — no side effects outside the component

// Codex's job when receiving a visualisation: register it in mdxComponents.ts
// Codex's job when it breaks: fix TypeScript/import errors ONLY, not logic
```

---

## Content delivery workflow — feedback loop

```
1. Human asks Claude for content
   Example: "Write the PFC chapter as MDX with visualisations"

2. Claude generates:
   - MDX file (content/chapters/ch2-pfc-basics.mdx)
   - Any new React components it uses
     (components/visualisations/PFCPauseStormViz.tsx)

3. Human saves files to the repo

4. Human tells Codex CLI:
   "New MDX file at content/chapters/ch2-pfc-basics.mdx
    New component at components/visualisations/PFCPauseStormViz.tsx
    Register the component in lib/mdxComponents.ts
    Verify the chapter renders at /module/rocev2/ch2-pfc-basics
    Fix any TypeScript or import errors"

5. Codex integrates, fixes errors, confirms it compiles

6. Human checks in browser at localhost:3000/module/rocev2/ch2-pfc-basics

7. If something looks wrong visually, human describes to Claude
   Claude fixes the component or MDX
   Back to step 3

8. If something is a TypeScript or import error, tell Codex to fix it
```

---

## What Codex should NEVER do

```
❌ Write HPC educational explanations
❌ Write CLI output text (that is the knowledge base content)
❌ Write React visualisation component logic
❌ Write MDX chapter content
❌ Decide what concepts to teach or in what order
❌ Make any API calls
❌ Add environment variables
❌ Install libraries not in the approved list
❌ Build InfiniBand simulation, crawlers, RAG, auth, payments
```

---

## Approved libraries

```
react-markdown        ← render MDX knowledge content
@next/mdx             ← MDX support in Next.js
gray-matter           ← parse MDX frontmatter
remark-gfm            ← GitHub-flavoured markdown in MDX
```

No others without explicit approval.

---

## Done when

- [ ] All 6 CLI commands + mutations work with state-driven output
- [ ] At least one Claude-written MDX chapter renders correctly
- [ ] Knowledge panel displays Claude-written content
- [ ] Lab 1 + Lab 2 complete with correct scoring
- [ ] Hints trigger at correct thresholds
- [ ] `tsc --noEmit` clean
- [ ] Zero network requests — works offline
- [ ] New Claude MDX files can be dropped in and render with one Codex command
