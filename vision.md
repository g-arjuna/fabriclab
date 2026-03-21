# FabricLab — Vision

> Context only. Do NOT implement from this file.
> For what to build right now: read plan.md.

---

## What FabricLab will become

An interactive learning platform for HPC and AI infrastructure networking.
Structured MDX curriculum, CLI-based labs, visualisation-rich chapters,
and eventually an AI tutor — all covering the HPC fabric stack engineers
need as they move into AI infrastructure roles.

The MVP proves the concept with zero running costs.
API features (OpenAI tutor, Supabase analytics) are added progressively.

## Content model

All educational content is authored by Claude and delivered as:
- MDX chapter files (`content/chapters/*.mdx`)
- React visualisation components (`components/visualisations/*.tsx`)
- Static knowledge base data (`content/knowledge/*.ts`)

Codex renders what Claude writes. This separation means content quality
is independent of engineering velocity — both can improve in parallel.

## Post-MVP expansion

See `extended_vision.md` for full platform roadmap:
- 7-module curriculum (RDMA → IB → RoCEv2 → Congestion → Topology → SuperPOD → Troubleshooting)
- Knowledge acquisition pipeline
- Drag-drop topology canvas
- Multi-scenario expert labs
- Analytics dashboard

> Follow plan.md. Build the MVP first.
