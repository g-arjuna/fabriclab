# FabricLab — Vision

> Context only. Do NOT implement from this file.
> For what to build right now: read plan.md.

---

## What FabricLab is

An interactive learning platform for HPC and AI data centre networking.
Structured MDX curriculum, CLI-based labs, and visualisation-rich chapters
covering the full HPC fabric stack that engineers need as they move into
AI infrastructure roles.

Reference hardware: NVIDIA DGX H100, ConnectX-7 NICs, QM9700 / SN5600 switches,
BlueField-3 DPU. Reference fabrics: InfiniBand NDR and RoCEv2 / Spectrum-X.

The platform works offline with zero API costs. Progressive API features
(AI tutor, analytics) are added as enhancements without structural changes.

---

## Content model

All educational content is authored by Claude and delivered as:

- MDX chapter files (`apps/web/content/chapters/*.mdx`)
- React visualisation components (`apps/web/components/visualisations/*.tsx`)
- Lab scenario TypeScript (`apps/web/lib/labs/`)

Codex renders what Claude writes. Content quality is independent of
engineering velocity — both improve in parallel.

---

## Where we are (March 2026)

MVP is live. Ten chapters written (Ch0–Ch9 deployed, Ch10 deploy pending).
Six interactive labs. 80+ visualisation components.

The platform has proved the concept. We are now in sustained expansion:
adding chapters, deepening lab accuracy, and building toward the full
14-chapter curriculum.

---

## Curriculum roadmap

| Ch | Title | Status |
|----|-------|--------|
| 0 | The Hardware Story | ✅ live |
| 1 | OS, Platforms, and First Power-On | ✅ live |
| 2 | Why HPC Networking Is Different | ✅ live |
| 3 | The CLI — Reading the Fabric | ✅ live |
| 4 | InfiniBand Operations | ✅ live |
| 5 | PFC, ECN, and Congestion Control | ✅ live |
| 6 | Efficient Load Balancing | ✅ live |
| 7 | Topology Design | ✅ live |
| 8 | NCCL — The Application Layer | ✅ live |
| 9 | Optics, Cabling, and the Physical Layer | ✅ live |
| 10 | The Storage Fabric | 🟡 written, deploy pending |
| 11 | Monitoring, Telemetry, and Observability | 📋 next |
| 12 | Scale-Up Networking — NVLink Switch System | 📋 after Ch11 |
| 13 | Alternative Topologies (Torus, Dragonfly) | 📋 planned |
| 14 | GPU Hardware Generations | 📋 planned |
| 15 | Ultra Ethernet Consortium | 💡 candidate |

---

## Lab roadmap

Six labs are live (Lab 0–5). A Lab 6 (alert triage, monitoring scenario)
is an optional candidate to accompany Ch11.

---

## Platform principles (permanent)

**Offline-first.** No API calls at render time. No `.env` file. Works without a network.
Image generation may use external APIs during authoring — generated assets are committed
as static files. The running app never calls an external service.

**Two-agent authorship.** Claude writes all educational content and visualisation logic.
Codex builds and maintains all platform infrastructure, generates and places images,
and may write short captions when contextualising images.
Neither agent writes the other's core output.

**CLI fidelity.** Simulator commands match real ConnectX-7 / ONYX / Cumulus
syntax. The platform is a rehearsal environment, not a toy.

**No duplication.** Every concept is owned by exactly one chapter.
Downstream chapters reference — they do not re-explain.

**Progressive complexity.** Each chapter assumes all prior chapters are known.
The reader builds a complete mental model from Ch0 upward.
