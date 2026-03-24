# AGENTS.md
> Read this file first. Read plan.md second. Then build.
> Zero external API calls for the platform. Content comes from Claude.

---

## What this project is

FabricLab — an interactive HPC / AI data centre networking learning platform.
Ten chapters live (Ch0–Ch9). Chapter 10 written, deploy pending. Six labs. 80+ visualisation components.
Target audience: network engineers transitioning into AI cluster infrastructure roles.

---

## CRITICAL: How this project is built

This project uses a **two-agent workflow**.

```
CLAUDE (content agent)               CODEX (engineering agent)
─────────────────────                ──────────────────────────
Writes MDX chapters                  Copies Claude outputs to target paths
Writes React visualisation .tsx      Fixes TypeScript errors (tsc --noEmit)
Writes lab scenario TypeScript       Applies bug-fix patches from .txt prompts
Writes Codex deploy prompt .txt      Maintains mdxComponents.ts registry
Defines all component interfaces     Wires state to CLI commands
                                     Generates and places images (see below)
                                     Makes light prose edits when adding images
```

**Default Codex rule:** If a task involves writing HPC educational content, concept
explanations, CLI output text, or visualisation component logic — STOP.
That comes from Claude. Ask the human to get it from Claude first.

**Exception — image work:** Codex may generate, source, and place images, and may
write the minimal surrounding prose required to contextualise them. See Rule 6 below.

---

## Hard rules

### Rule 1 — Platform is API-free
Zero external API calls in the running app. No OpenAI. No Supabase. No HTTP requests.
No `.env` file. The app works offline. No configuration needed.
*(Image generation during the build/authoring step is fine — images are committed as
static assets. They must not require a live API call at page render time.)*

### Rule 2 — CLI output from state
Every CLI command output reads from the Zustand topology store.
No hardcoded strings. Output changes when state changes.

### Rule 3 — Educational content comes from Claude
Do NOT write MDX educational prose. Do NOT write concept explanations.
Do NOT write CLI output templates. Do NOT create visualisation component logic.
These come from Claude. Codex integrates them.

### Rule 4 — No real networking simulation
`pfcEnabled: boolean` is the PFC simulation. `ecnEnabled: boolean` is ECN.
State flags are enough. No protocol implementation.

### Rule 5 — One step at a time
Follow the task order in plan.md. Run `tsc --noEmit` after each task before moving on.

### Rule 6 — Image permissions (NEW)
Codex is authorised to do all of the following:

**Generate images:**
- AI-generated images via external APIs (e.g. DALL-E, Stability AI) — generate during
  authoring, commit the resulting static file. No API call at render time.
- SVG / diagram generation from code — write and commit the `.svg` file directly, or
  generate it via a script and commit the output.

**Source images:**
- Place vendor screenshots, diagrams, or manually sourced images into the repo.

**Wire up placeholders:**
- Replace `{/* TODO: image */}` or `<RealImage />` placeholder tags in MDX and component
  files with actual `<img>` or `<Image>` tags pointing to the committed asset.

**Allowed file targets for image work:**
- MDX chapter files (`apps/web/content/chapters/*.mdx`)
- React visualisation components (`apps/web/components/visualisations/*.tsx`)
- Any `.md` file in the repo (README, plan, vision, AGENTS, COMPONENTS_REGISTRY, etc.)
- Any other component or page file in `apps/web/`

**Image asset location:**
- Commit static images to `apps/web/public/images/[chapter-slug]/filename.ext`
- Use Next.js `<Image>` component for `.mdx` and `.tsx` files (handles optimisation)
- Plain `<img>` is acceptable in `.md` files

**Light prose rule:**
When inserting an image into an MDX chapter, Codex may write a short caption or
1–2 sentence contextual note immediately adjacent to the image tag — for example:
`*Figure: BasePOD wiring layout. Each DGX node connects to all 8 leaf switches.*`
This is the only case where Codex writes prose in `.mdx` files. Do not write or
rewrite any other educational content in the chapter.

**Do NOT:**
- Invent technical content to accompany an image (ask Claude if explanatory prose is needed)
- Modify existing educational prose while placing an image
- Add images to lab scenario `.ts` files (they are CLI-only environments)

---

## Tooling

### Use Codex CLI (VSCode) for:
- Integrating Claude-generated MDX files and components
- Wiring state to components, fixing TypeScript errors
- Small targeted changes, image placement, caption edits
- Anything where you want to see the change immediately

### Use Codex Web for:
- Building entire features from scratch (terminal component, lab engine)
- Large multi-file refactors
- Batch tasks you can fully describe and let run unattended

---

## Folder structure (current)

```
fabriclab/
├── AGENTS.md                          ← this file (Codex reads first)
├── plan.md                            ← task list + build spec (Codex reads second)
├── vision.md                          ← long-term context
│
├── apps/web/
│   ├── app/                           ← Next.js routes (learn/, lab/, curriculum/)
│   ├── content/chapters/              ← MDX chapter files (ch0–ch9 live, ch10 pending)
│   ├── components/
│   │   ├── terminal/                  ← xterm.js multi-device terminal
│   │   ├── topology/                  ← topology views
│   │   ├── lab/                       ← lab panel UI
│   │   └── visualisations/            ← Claude-written React viz components (80+)
│   │       └── COMPONENTS_REGISTRY.md ← registry table (Codex maintains)
│   ├── lib/
│   │   ├── commands/                  ← CLI command handlers
│   │   ├── labs/                      ← lab scenario TypeScript
│   │   ├── mdxComponents.ts           ← MDX component registry (Codex maintains)
│   │   └── labEngine.ts
│   ├── public/
│   │   └── images/                    ← static image assets (Codex places here)
│   │       ├── ch0-hardware-foundations/
│   │       ├── ch7-topology-design/
│   │       └── [chapter-slug]/
│   └── store/                         ← Zustand state
│
└── outputs/                           ← Claude drop zone (not in live app until deployed)
    ├── ch10-storage-fabric.mdx
    ├── visualisations/*.tsx
    ├── mdxComponents.ts
    └── *_CODEX_PROMPT.txt             ← Codex prompt files (one per patch batch)
```

---

## MDX component registry — how it works

`apps/web/lib/mdxComponents.ts` is the registry that makes all viz components available
in MDX files. When Claude delivers a new component, Codex adds it here.
When Codex places an image and uses `<Image>` in MDX, add the Next.js import if needed.

```typescript
// lib/mdxComponents.ts — Codex maintains this file.
// When Claude delivers a new visualisation component, add it here.
// Never modify component logic — just register it.
import { StorageSeparationViz } from '@/components/visualisations/StorageSeparationViz'
// ...
export const mdxComponents = {
  StorageSeparationViz,
  // Add new Claude-delivered components here
}
```

---

## Visualisation component contract

Claude writes visualisation components. Codex integrates them without touching internals.

```typescript
// Every Claude-written visualisation component:
// 1. Named export matching the filename (and default export)
// 2. No required props (or all props have defaults)
// 3. Imports only from React — no external state
// 4. Inline styles only — no Tailwind custom values, no external CSS
// 5. Self-contained — no side effects outside the component
// 6. No <form> tags (xterm.js environment restriction)
// 7. No localStorage / sessionStorage

// Codex's job: register in mdxComponents.ts, fix TS/import errors only
// Codex must NOT modify component rendering logic
```

---

## Content delivery workflow

```
1. Claude produces: MDX file + viz .tsx files + updated mdxComponents.ts + Codex prompt .txt
2. Human saves outputs/ folder to repo
3. Human runs: codex < outputs/CH11_DEPLOY_CODEX_PROMPT.txt
4. Codex copies files, registers components, fixes tsc errors, updates nav link
5. Human verifies at localhost:3000/learn/ch11-monitoring-telemetry
6. Visual bugs → Claude fixes component; TypeScript errors → Codex fixes
```

---

## What Codex must NEVER do

```
❌ Write HPC educational prose or concept explanations in MDX chapters
   (exception: short captions / context sentences when placing images — see Rule 6)
❌ Write CLI output text or lab scenario narrative
❌ Write React visualisation component logic or layout
❌ Decide what concepts to teach or change the teaching order
❌ Invent component names not in COMPONENTS_REGISTRY.md
❌ Add runtime API calls to the app (image generation is build-time only)
❌ Add environment variables required at page render time
❌ Use localStorage or sessionStorage
❌ Use <form> tags in React components
❌ Install libraries not listed below without explicit approval
```

---

## Approved libraries

```
@next/mdx, next-mdx-remote    ← MDX rendering
gray-matter                    ← frontmatter parsing
remark-gfm                     ← GitHub-flavoured markdown
react, zustand                 ← UI + state
xterm.js                       ← CLI terminal
next/image                     ← optimised image component
```

No others without explicit approval.
