# Contributing to FabricLab

FabricLab is a free, open-source learning platform for engineers working with AI and HPC networking infrastructure. Contributions that improve technical accuracy, lab realism, and usability are very welcome.

## Getting started

See [README.md](README.md) for how to run the project locally, including Supabase setup and required environment variables.

## What helps most

- **Technical corrections** — if something in a chapter is factually wrong, outdated, or misleading, open an issue with the chapter slug, the specific claim, and a primary source
- **Lab feedback** — if a lab command, scenario, or completion flow doesn't match real-world behaviour, report it with the lab slug and a description of what you expected
- **UI and usability** — layout bugs, mobile issues, accessibility gaps
- **Platform bugs** — auth, progress sync, curriculum navigation, or release control issues
- **CLI realism** — if a simulated command or output doesn't match real switch/NIC syntax

## Opening issues

Open an issue at [g-arjuna/fabriclab](https://github.com/g-arjuna/fabriclab/issues) before starting on a large change. For small fixes (typos, broken links, obvious bugs) a PR is fine without a prior issue.

Use the issue templates if your report fits one — they prompt for the details that make triage faster.

## Technical corrections

When reporting a factual error in a chapter:

- include the chapter slug and section heading
- quote the specific sentence or claim
- provide the correction and, if possible, a primary reference (datasheet, RFC, vendor doc)

## Lab feedback

When reporting a lab issue, include:

- lab slug (e.g. `lab5-nccl-diagnosis`)
- the command you entered
- what you expected to happen
- what actually happened
- a screenshot if relevant

## Pull requests

1. Keep PRs focused on one thing.
2. Run the TypeScript check before opening:

```bash
cd apps/web
node_modules/.bin/tsc --noEmit --project tsconfig.json
```

3. In the PR description, explain the user-visible change and call out any chapter, lab, or route affected.
4. For content changes (chapter prose, lab narrative, visualisation logic), open an issue first — corrections benefit from discussion to make sure the fix is accurate.

## Branch naming

Use a short descriptive prefix:

- `fix/nccl-busbw-table` — bug fix or correction
- `feat/chapter-search` — new feature
- `content/ch8-throughput-correction` — content correction
- `docs/contributing-setup` — documentation update

## Code of conduct

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). Be constructive, cite sources for technical disagreements, and welcome engineers at all levels.
