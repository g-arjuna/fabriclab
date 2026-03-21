# FabricLab

RoCEv2 networking learning platform with CLI simulation and MDX content.
Zero setup. Zero API costs. Content from Claude, engineering from Codex.

---

## Status

MVP in progress — RoCEv2 module, two scenario labs, MDX rendering engine.

---

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000/module/rocev2`

No `.env` file. No API keys. No configuration. Works immediately.

---

## Tooling guide

### Which tool for which job

| Task | Tool |
|------|------|
| Build the initial platform scaffold | Codex Web |
| Integrate a Claude-written MDX chapter | VSCode + Codex CLI |
| Integrate a Claude-written component | VSCode + Codex CLI |
| Fix a TypeScript error | VSCode + Codex CLI |
| Large feature (new lab, new page) | Codex Web |
| Write chapter content | Claude |
| Write visualisation components | Claude |
| Write knowledge base content | Claude |

### Setting up Codex CLI in VSCode

```bash
npm install -g @openai/codex
# In your project terminal:
codex
```

### First Codex Web prompt — copy this exactly

```
Read AGENTS.md then plan.md in this repository carefully.

I am building FabricLab — an HPC networking learning platform.
Your job is ENGINEERING ONLY. All content comes from Claude separately.

Build Phase A from plan.md (Steps 1–11):
  types/index.ts, store/labStore.ts, lib/commandClassifier.ts,
  lib/labEngine.ts, lib/commands/*.ts, lib/mdxComponents.ts,
  components/terminal/, components/lab/, components/topology/,
  components/knowledge/ (shell only), data/labs/

Critical rules:
- CLI output must come from Zustand state — never hardcoded
- Do NOT write MDX content or educational text
- Do NOT add any API calls or .env variables
- Use exact folder structure from AGENTS.md
- Use exact state shape from plan.md
- tsc --noEmit must pass after each step
```

### Codex CLI prompt when Claude delivers a new MDX chapter

```bash
codex "New MDX file added: content/chapters/ch1-foundations.mdx
It uses these components: <MentalModelTable />, <AllReduceBarrier />, <DGXGenerationExplorer />
Component files are at components/visualisations/*.tsx (already there)
1. Register each component in lib/mdxComponents.ts
2. Verify the chapter renders at /module/rocev2/ch1-foundations
3. Fix any TypeScript or import errors — do not touch component logic
4. Run tsc --noEmit"
```

### Codex CLI prompt when Claude delivers a new visualisation component

```bash
codex "New component delivered by Claude: components/visualisations/PFCPauseStormViz.tsx
1. Add it to lib/mdxComponents.ts as PFCPauseStormViz
2. Run tsc --noEmit and fix any TypeScript errors
3. Do not modify the component logic — only fix imports if needed"
```

---

## Content workflow

```
You → ask Claude for a chapter or component
Claude → generates MDX + React components
You → save files to the repo
You → tell Codex CLI to integrate (use prompts above)
Codex → registers, fixes errors, confirms it compiles
You → check in browser at localhost:3000/module/rocev2/[chapter]
If visual issue → describe to Claude → Claude fixes → repeat
If TypeScript error → tell Codex to fix → Codex fixes
```

---

## Document hierarchy

| File | Read when | Purpose |
|------|-----------|---------|
| `AGENTS.md` | Every Codex session (first) | Rules, folder structure, tooling, prompts |
| `plan.md` | Every Codex session (second) | Full implementation spec |
| `vision.md` | Context only | Product direction |
| `extended_vision.md` | Future reference | Full platform blueprint |

---

## Project structure

```
fabriclab/
├── content/
│   ├── chapters/          MDX files from Claude → rendered at /module/rocev2/[chapter]
│   └── knowledge/         Static knowledge base from Claude → rendered in knowledge panel
├── components/
│   ├── terminal/          CLI terminal (Codex-built)
│   ├── lab/               Lab panel + result (Codex-built)
│   ├── topology/          Static SVG topology (Codex-built)
│   ├── knowledge/         Knowledge panel shell (Codex-built)
│   └── visualisations/    Interactive React components from Claude
├── lib/
│   ├── commands/          CLI command handlers (Codex-built)
│   ├── mdxComponents.ts   Registry — Codex maintains, registers Claude's components
│   ├── labEngine.ts       Scoring + hints (Codex-built)
│   └── commandClassifier.ts
├── store/labStore.ts      Zustand state (Codex-built)
├── data/labs/             Lab config files (Codex-built per plan.md spec)
├── app/module/rocev2/     Next.js pages (Codex-built)
└── types/index.ts         All interfaces (Codex-built)
```

---

## Core rules

1. CLI output always comes from Zustand topology state — never hardcoded
2. Zero API calls — works fully offline
3. Content (MDX, components, knowledge) comes from Claude, not Codex
4. Codex integrates what Claude produces — never modifies component logic
