# FabricLab — MVP Plan

## Goal
Build a working MVP in 30–45 days for:

RoCEv2 + Lossless Ethernet learning with CLI simulation

---

## Scope

### Include
- One module (RoCEv2)
- CLI simulator (10–12 commands)
- Simple topology (2 nodes + 1 switch)
- 2 labs
- Basic AI tutor

### Exclude
- InfiniBand simulation
- Knowledge pipelines
- Complex animations
- Multiple modules

---

## Tech Stack

Frontend:
- Next.js
- Tailwind
- Zustand
- xterm.js

Backend:
- Next.js API routes

AI:
- GPT-4.1 mini

---

## Core Design

CLI output must reflect topology state.

---

## Initial Commands

- show dcb pfc
- show dcb ets
- show interface counters
- ethtool -S eth0
- rdma link show
- show roce

---

## Topology State

- NIC state
- PFC enabled/disabled
- ECN enabled/disabled
- congestion flag

---

## Labs

1. Fix PFC misconfiguration
2. Diagnose congestion

---

## Success Criteria

- 10 users complete module
- 3 users say it improved understanding

---

## Rules

- Build one feature at a time
- Keep it simple
- Do not expand scope