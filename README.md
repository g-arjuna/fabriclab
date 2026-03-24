# FabricLab

FabricLab is an offline-first HPC / AI data centre networking learning platform.
Target audience: network engineers transitioning from enterprise to AI cluster infrastructure.
Reference hardware: NVIDIA DGX H100, ConnectX-7 NICs, QM9700 / SN5600 switches, BlueField-3 DPU.

The current repo contains a working Next.js app in `apps/web` with:

- 11 chapter routes available locally (Ch0-Ch10 present in the repo)
- 6 interactive labs with a state-driven multi-device CLI simulator
- 80+ React visualisation components registered in `mdxComponents.ts`
- Lab-specific topology views and a reference drawer
- MDX chapter rendering with a large component registry
- Browser smoke checks for Ch0-Ch4

## Chapter status

| Ch | Slug | Title | Status |
|----|------|-------|--------|
| 0 | ch0-hardware-foundations | The Hardware Story | ✅ live |
| 1 | ch1-os-platforms | OS, Platforms, and First Power-On | ✅ live |
| 2 | ch2-why-different | Why HPC Networking Is Different | ✅ live |
| 3 | ch3-the-cli | The CLI — Reading the Fabric | ✅ live |
| 4 | ch4-infiniband-operations | InfiniBand Operations | ✅ live |
| 5 | ch5-pfc-ecn-congestion | PFC, ECN, and Congestion Control | ✅ live |
| 6 | ch6-load-balancing | Efficient Load Balancing | ✅ live |
| 7 | ch7-topology-design | Topology Design | ✅ live |
| 8 | ch8-nccl-performance | NCCL — The Application Layer | ✅ live |
| 9 | ch9-optics-cabling | Optics, Cabling, and the Physical Layer | in repo |
| 10 | ch10-storage-fabric | The Storage Fabric | in repo |
| 11 | ch11-monitoring-telemetry | Monitoring, Telemetry, and Observability | 📋 next to write |

## Labs

| Lab | Fault modelled |
|-----|----------------|
| lab0-failed-rail | Rail 3 DAC cable failure → Err-Disabled switch port |
| lab1-pfc-fix | PFC not enabled on compute interface |
| lab2-silent-congestion | ECN not configured → silent drops under load |
| lab3-uneven-spine | ECMP hot-spotting on spine uplinks |
| lab4-topology-sizing | Undersized 2-stage fabric proposal |
| lab5-nccl-diagnosis | NCCL_IB_HCA set to mlx5_bond_0 → TCP fallback |

## Running the app

```bash
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful routes:

- `/` — landing page
- `/curriculum` — chapter + lab index
- `/learn` — chapter browser
- `/learn/ch0-hardware-foundations` — first chapter
- `/lab?lab=lab0-failed-rail` — lab entrypoint

## Project structure

```
apps/web/
  app/                        ← Next.js routes (learn/, lab/, curriculum/)
  content/chapters/           ← MDX chapter files (ch0-ch10 currently in repo)
  components/visualisations/  ← React viz components (80+ registered)
  lib/mdxComponents.ts        ← Registers all viz components for MDX
  components/visualisations/COMPONENTS_REGISTRY.md  ← Registry table
  lib/labs/                   ← Lab scenario TypeScript
  components/terminal/        ← xterm.js multi-device terminal
  components/topology/        ← Topology views
  store/                      ← Zustand state
```

## How the simulator works

- Device tabs map to DGX hosts, Spectrum-X leaf switches, spine switches, or workstation contexts.
- Commands are routed through lab-aware handlers in `components/terminal/commandHandler.ts`.
- Lab state lives in Zustand and drives command output, hints, and completion checks.
- Chapters are rendered from MDX files; visualisation components are registered in `lib/mdxComponents.ts`.

## Two-agent workflow

**Claude** authors all educational content: MDX chapters, React visualisation components, lab scenario
TypeScript, and Codex deploy prompts.

**Codex** applies file copies to the live repo, fixes TypeScript errors, wires infrastructure,
generates and places images, and may write short captions when contextualising images.
Codex does not write substantive educational content. Claude does not write infrastructure.

For the full workflow and image permissions, see `AGENTS.md` and `plan.md`.

## Pending Codex tasks (priority order)

1. **Continue image and browser QA passes** — Ch0-Ch4 now have inserted images plus smoke checks; continue the same workflow from Ch5 onward.
2. **Fix TopologyScalingViz** (Ch7) — leaf-to-spine connections are 1:1; should be full-mesh.
   Codex prompt: `outputs/TOPOLOGY_VIZ_FIX_CODEX_PROMPT.txt`
3. **Apply P11 + P12** (Ch0) — NVLink generation naming correction + NVSwitch SHARP addition.
   Codex prompt: `outputs/P11_P12_CODEX_PROMPT.txt`
4. **CLI accuracy batch** — counter name fixes, swp port naming, busbw correction.
   Codex prompts: `CLI_FACTUAL_FIX_CODEX_PROMPT.txt`, `REMAINING_FIXES_CODEX_PROMPT.txt`,
   `ANALYSIS_FINDINGS_FIX_CODEX_PROMPT.txt`, `PRACTITIONER_FIXES_CODEX_PROMPT.txt`

## Validation

```bash
apps/web/node_modules/.bin/tsc --noEmit --project apps/web/tsconfig.json
```

The app works without external APIs or runtime configuration.
