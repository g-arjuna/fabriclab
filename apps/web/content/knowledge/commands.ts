import type { KnowledgeConcept } from '@/types'

export const commandConcepts: KnowledgeConcept[] = [
  {
    id: 'cmd-show-dcb-pfc',
    title: 'show dcb pfc',
    summary: 'Displays current PFC state — enabled priorities, pause quanta, and watchdog configuration.',
    relatedCommands: ['show dcb pfc'],
    relatedConcepts: ['pfc'],
    content: `## Usage

    show dcb pfc

## What to look for

  PFC enabled/disabled — if enabled, check which priorities are active
  PFC enabled priorities — should match your RoCE traffic priority (typically 3)
  Watchdog — should be enabled on all production fabrics

## Common problem

PFC enabled on the wrong priority class. If your RoCE traffic is on priority 3
but PFC is pausing priority 5, lossless delivery does not apply to your RDMA
traffic. The result is silent retransmissions that are hard to diagnose.`,
  },
  {
    id: 'cmd-show-roce',
    title: 'show roce',
    summary: 'Displays RoCEv2 configuration — PFC status, ECN/DCQCN state, DSCP marking, MTU, and GID information.',
    relatedCommands: ['show roce'],
    relatedConcepts: ['rocev2', 'ecn'],
    content: `## Usage

    show roce

## What to look for

  PFC status — enabled with correct priority for production RoCE
  ECN status — DCQCN active confirms congestion control is working
  DSCP marking — RoCE traffic should be marked DSCP 26 for correct QoS
  MTU — must be 9000 end to end
  GID — the routable address for this RDMA interface`,
  },
  {
    id: 'cmd-ethtool',
    title: 'ethtool -S eth0',
    summary: 'Low-level NIC statistics — primary tool for diagnosing PFC pause storms, ECN marking rates, and packet drops at the NIC level.',
    relatedCommands: ['ethtool -S eth0'],
    relatedConcepts: ['pfc', 'ecn'],
    content: `## Usage

    ethtool -S eth0

## Key counters

  rx_pfc_pause_frames  — growing rapidly means upstream pause storm
  tx_pfc_pause_frames  — growing means local buffer pressure
  rx_ecn_marked        — should be non-zero when ECN is enabled and working
  tx_dropped           — non-zero means drops are happening (not lossless)

## Pause storm diagnosis

If rx_pfc_pause_frames is growing fast and tx_dropped is zero, you have an
upstream pause storm. A switch is pausing this NIC continuously and the
fabric is deadlocked on this priority class.`,
  },
  {
    id: 'cmd-interface-counters',
    title: 'show interface counters',
    summary: 'Interface packet and byte counters — the first command to run when investigating throughput degradation.',
    relatedCommands: ['show interface counters'],
    relatedConcepts: ['rocev2'],
    content: `## Usage

    show interface counters

## What to look for

  Output drops > 0 — packets being dropped (not lossless)
  PFC pause frames — high values confirm a pause storm in progress
  Buffer util > 70% — concerning; above 90% means drops are imminent

## First step in any investigation

Always run show interface counters before anything else. The numbers tell
you whether the problem is drops, pauses, or something else. Start here
then narrow down with ethtool or show dcb pfc.`,
  },
]
