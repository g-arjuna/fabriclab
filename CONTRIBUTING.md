# Contributing to FabricLab

FabricLab is an open learning platform for practitioners working with AI and HPC networking.

## What contributions help most

- technical corrections to chapter content
- lab-flow feedback from real operators
- CLI realism fixes
- screenshot, layout, and usability feedback
- bug reports for auth, progress sync, curriculum navigation, and release controls

## Before opening a PR

1. Open an issue if the change is large or changes product direction.
2. Keep content ownership in mind:
   - Claude-owned: educational prose, lab narrative, visualization teaching logic
   - Codex-owned: platform engineering, integration, auth, progress, deployment, docs, image placement
3. If you are changing app behavior, run:

```bash
cd apps/web
node_modules/.bin/tsc --noEmit --project tsconfig.json
npm run build
```

## Branch naming

Use branch names with clear ownership and scope:

- `codex/v1.0-readability-mobile`
- `codex/v1.0-release-docs`
- `codex/v1.1-progress-polish`

## Pull request guidance

- keep PRs focused
- explain user-visible changes
- call out any chapter, lab, or route affected
- mention whether the change is content-facing, platform-facing, or both

## Content corrections

If you spot a technical issue in a chapter:

- quote the exact sentence or concept
- include the chapter slug and section heading
- provide the correction and, if possible, a primary source

## Lab feedback

When reporting lab issues, include:

- lab slug
- command entered
- expected behavior
- actual behavior
- screenshot if relevant

## Code of conduct

Please follow the repository code of conduct in [CODE_OF_CONDUCT.md](C:\Users\arjun\Desktop\fabriclab\CODE_OF_CONDUCT.md).
