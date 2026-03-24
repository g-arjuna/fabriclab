# FabricLab — Content Pipeline Design
## How Claude-generated content flows into the app systematically

---

## The problem with the current approach

Right now:
- Claude generates content in the chat
- You manually figure out where it goes
- Codex may or may not know how to integrate it
- No verification that it actually renders correctly
- No repeatable process

This document defines the system that fixes all of that.

---

## Roles and responsibilities — clear separation

### Claude's job (content agent)
- Write MDX chapter files
- Write React visualisation components
- Write knowledge base data files
- Define component props and interfaces
- Write the educational content itself
- Produce a DELIVERY MANIFEST with every content drop

### Codex's job (engineering agent)
- Register new components in lib/mdxComponents.ts
- Fix TypeScript/import errors in delivered files
- Verify routes render correctly
- Run tsc --noEmit after every integration
- Never modify component logic or educational text

### Your job (product owner)
- Request content from Claude
- Review rendered output in browser
- Report visual or pedagogical issues back to Claude
- Approve content before moving to next chapter

### What nobody does
- Codex does NOT write educational content
- Claude does NOT fix TypeScript infrastructure bugs
- You do NOT manually edit component files

---

## The content unit — what Claude delivers each time

Every Claude content delivery is a CONTENT DROP. Each drop contains:

```
CONTENT DROP: [chapter name or component name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILES IN THIS DROP:
  1. content/chapters/[filename].mdx          ← the chapter
  2. components/visualisations/[Name].tsx     ← each new component used

COMPONENTS USED IN THIS MDX:
  - ComponentName1 (NEW — file included)
  - ComponentName2 (NEW — file included)
  - ComponentName3 (EXISTING — already registered)

CODEX INTEGRATION COMMAND:
  [exact prompt to paste into Codex to integrate this drop]

VERIFICATION STEPS:
  [what to check in the browser after integration]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## The component contract — every visualisation component Claude writes

Every React component Claude delivers for use in MDX must follow this contract.
Codex uses this contract to integrate without touching the logic.

```typescript
// REQUIRED: named export matching the filename
// REQUIRED: no required props (all have defaults)
// REQUIRED: self-contained (no imports from @/store or @/lib)
// REQUIRED: Tailwind classes only (no external CSS)
// REQUIRED: TypeScript strict (no 'any')
// REQUIRED: default export also present

// Example contract:
export function AllReduceBarrier() {
  // ... component logic
}
export default AllReduceBarrier
```

If a component needs to read topology state (e.g. to show live state),
it receives it as an optional prop with a default:

```typescript
interface Props {
  pfcEnabled?: boolean  // defaults to true for standalone rendering
}
export function PFCStateVisualiser({ pfcEnabled = true }: Props) {
  // renders correctly standalone in MDX chapters
  // can also be passed live state from the lab page
}
```

---

## The MDX chapter contract — what every chapter file must include

```mdx
---
title: "Chapter N: [Title]"
module: "RoCEv2 + Lossless Ethernet"
level: "Beginner" | "Intermediate" | "Advanced"
estimatedMinutes: [number]
prerequisites: ["chapter-slug-1", "chapter-slug-2"]
labLink: "/module/rocev2/lab"
---

[content here]
```

Components are used exactly as named — no props required for basic rendering:

```mdx
<AllReduceBarrier />
<PFCPauseStormViz />
<CableDecisionTree />
```

---

## The full content pipeline — step by step

```
STEP 1 — Request
  You tell Claude: "Generate Chapter 2: PFC and Pause Storms"
  Include: any specific topics, depth level, which lab it connects to

STEP 2 — Claude generates
  Claude produces a CONTENT DROP containing:
    - The MDX chapter file (full content, ready to save)
    - Any new React visualisation components it uses
    - The delivery manifest (files list + Codex integration command)

STEP 3 — Save files
  You save each file to the exact path specified in the manifest:
    content/chapters/ch2-pfc-pause-storms.mdx
    components/visualisations/PFCPauseStormViz.tsx
    components/visualisations/PauseStormStepper.tsx

STEP 4 — Run Codex integration command
  Paste the exact Codex command from the manifest into the Codex desktop app
  Codex will:
    - Add new components to lib/mdxComponents.ts
    - Run tsc --noEmit
    - Verify the chapter route renders

STEP 5 — Verify in browser
  Open: http://localhost:3000/module/rocev2/ch2-pfc-pause-storms
  Check: title renders, all visualisations appear, no console errors

STEP 6 — Report back
  Tell Claude what you see:
    - Screenshot of any visualisation that looks wrong
    - Any console errors
    - Any content that needs adjusting

STEP 7 — Iterate if needed
  Claude fixes the component or MDX
  You save the updated file
  Back to Step 4
```

---

## Planned chapter sequence

The chapters below are ordered by learning dependency.
Each chapter references and builds on the previous one.

```
ch1-foundations.mdx          ← EXISTS (basic text, needs upgrade)
ch2-pfc-pause-storms.mdx     ← NEXT TO GENERATE
ch3-ecn-congestion.mdx       ← after ch2
ch4-rocev2-deep-dive.mdx     ← after ch3
ch5-cli-diagnostic.mdx       ← after ch4 (CLI command reference)
ch6-topology-design.mdx      ← after ch5
```

---

## Upgrading Chapter 1 — the right way

Chapter 1 currently exists as plain MDX with a comparison table.
It needs the interactive components I already designed:
  - MentalModelTable (the enterprise vs HPC comparison)
  - AllReduceBarrier (the 5-step animated stepper)
  - DGXGenerationExplorer (the tabbed spec explorer)

The upgrade process:
  1. Claude generates the full upgraded ch1-foundations.mdx
     PLUS all three component .tsx files
  2. You save them (replacing existing ch1)
  3. Run the Codex integration command from the manifest
  4. Verify in browser

This is the first real content drop to request.

---

## How to request a content drop from Claude

Use this exact format when asking Claude for content:

```
Generate a CONTENT DROP for: [chapter name]

Topics to cover: [list]
Level: [Beginner/Intermediate/Advanced]
Connects to lab: [lab 1 / lab 2 / both]
Visualisations wanted: [describe what you want to show interactively]
Approximate reading time: [10/20/30 minutes]

Output format:
- Full MDX file ready to save
- All new React component files ready to save
- Delivery manifest with Codex integration command
- Verification steps
```

---

## What makes this system resilient

1. Claude never writes infrastructure — no risk of breaking the build
2. Codex never writes content — no risk of hallucinated HPC facts
3. Each drop is verified before the next one starts
4. The manifest means Codex always knows exactly what to register
5. The component contract means integration is mechanical, not creative
6. Files are saved exactly where specified — no path ambiguity

---

## Starting point — request this first

To upgrade Chapter 1 with real interactive visualisations:

Tell Claude:
"Generate a CONTENT DROP for: Chapter 1 upgrade — HPC Networking Foundations
Topics: Why HPC networking is different, the AllReduce barrier problem,
DGX generation overview, the three networks, mental model comparison
Level: Beginner
Connects to lab: Lab 1 (PFC misconfiguration)
Visualisations: AllReduce barrier stepper (5 steps), DGX generation explorer
(tabbed specs A100/H100/H200/B200), enterprise vs HPC comparison table component
Approximate reading time: 20 minutes"