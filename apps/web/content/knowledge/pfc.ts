import type { KnowledgeConcept } from '@/types'

export const pfcConcepts: KnowledgeConcept[] = [
  {
    id: 'pfc',
    title: 'Priority Flow Control (PFC)',
    summary: 'PFC pauses specific traffic classes to prevent packet drops on lossless Ethernet — but misconfigured, it creates pause storms that halt entire fabrics.',
    relatedCommands: ['show dcb pfc', 'disable pfc', 'enable pfc', 'ethtool -S eth0'],
    relatedConcepts: ['ecn', 'rocev2'],
    content: `## What PFC does

Priority Flow Control (IEEE 802.1Qbb) allows a switch to send a PAUSE frame
to a specific traffic class on a connected NIC. When the NIC receives the PAUSE
frame, it stops transmitting that priority for a defined quanta period.

This is what makes Ethernet lossless — instead of dropping packets when buffers
fill, the switch pauses the sender. RDMA requires lossless delivery because a
single dropped packet causes the queue pair to timeout and retransmit the entire
message — catastrophic at 400Gb/s.

## Priority classes

RoCEv2 traffic uses **priority 3** (DSCP 26). PFC must be enabled exactly on
priority 3. Other priorities carry management or storage traffic.

## The pause storm problem

If switch A pauses switch B, and switch B is already paused by switch C, the
pause propagates backward through the fabric — a "credit loop deadlock".
In a fat-tree topology this cascades into a pause storm where large sections
of the fabric halt simultaneously — often worse than packet loss.

## ECN + PFC together

Modern DGX deployments run both. ECN handles gradual congestion (keeps queues
shallow). PFC is a backstop for sudden bursts that exceed ECN's response time.
With both enabled and properly tuned, pause storms are rare.

## Key commands

    show dcb pfc          — check current PFC state
    enable pfc            — enable PFC on interface (simulator)
    disable pfc           — disable PFC
    ethtool -S eth0       — check rx_prio3_pause counter`,
  },
  {
    id: 'pfc-watchdog',
    title: 'PFC watchdog',
    summary: 'A safety mechanism that detects and breaks PFC deadlocks by disabling PFC on stuck ports after a configurable timeout (default 200ms).',
    relatedCommands: ['show dcb pfc'],
    relatedConcepts: ['pfc'],
    content: `## What the PFC watchdog does

When a port has been continuously paused for longer than the watchdog interval
(default 200ms on Spectrum switches), the watchdog triggers. It temporarily
disables PFC on that port, breaking the deadlock. Traffic resumes at the cost
of some brief drops during the recovery window.

## Why 200ms matters

In a 128-GPU AllReduce, a 200ms pause means the training step misses its
synchronisation window entirely. The watchdog fires before the pause becomes
permanent — but even the brief recovery drop can cause a NCCL timeout if it
coincides with a collective operation.

## Reading watchdog status

    show dcb pfc
      Watchdog: enabled
      Watchdog interval: 200ms

Always keep the watchdog enabled. It is your last line of defence against
permanent pause storms. Never disable it to "fix" a pause alarm — fix the
root cause instead.`,
  },
  {
    id: 'pfc-pause-storm',
    title: 'PFC pause storm',
    summary: 'A fabric-wide deadlock where pause frames propagate backwards through multiple hops, halting large sections of the fabric simultaneously.',
    relatedCommands: ['ethtool -S eth0', 'show dcb pfc'],
    relatedConcepts: ['pfc'],
    content: `## How pause storms form

1. Receiver buffer fills → switch sends PAUSE to upstream switch
2. Upstream switch stops sending → its own buffer fills
3. Upstream switch sends PAUSE to its upstream
4. Chain continues until the source of traffic is paused
5. If the chain forms a cycle (credit loop), the fabric deadlocks

## Detection

    ethtool -S eth0
      rx_prio3_pause: 4,847,291   ← growing rapidly
      tx_prio3_pause: 3,201,044   ← also growing (propagating upstream)
      tx_discards_phy: 0           ← paradoxically zero — no drops, just paused

The absence of drops is misleading. The fabric is not dropping — it is halted.

## Causes in DGX deployments

- Single-path elephant flow filling a switch buffer
- Misconfigured ECN thresholds (too high → no rate reduction before buffer fill)
- PFC enabled on wrong priority (pausing non-RDMA traffic)
- Missing headroom reservation on switch port buffers

## Resolution

Enable ECN on the RDMA traffic class so senders slow down before buffers fill.
ECN prevents the condition that causes pauses in the first place.`,
  },
  {
    id: 'pfc-headroom',
    title: 'PFC buffer headroom',
    summary: 'The reserved switch buffer that absorbs in-flight packets during the RTT between sending a PAUSE frame and the upstream NIC actually stopping.',
    relatedCommands: ['show dcb pfc'],
    relatedConcepts: ['pfc'],
    content: `## The headroom problem

When a switch sends a PAUSE frame, the upstream NIC keeps transmitting for
one round-trip time (RTT) before it receives the PAUSE and stops. At 400Gb/s,
1 microsecond RTT = 50KB of data still in flight.

The switch must have enough buffer reserved (headroom) to absorb this data
without dropping. If headroom is insufficient, drops occur even with PFC enabled.

## Headroom formula

    Headroom ≥ (link_rate × cable_RTT) + safety_margin
    At 400Gbps, 1m cable: ~50KB minimum headroom per port

## DGX H100 configuration

Spectrum-X switches pre-configure headroom for 400G ports. The default values
are correct for rack-scale DGX deployments (1–3m DAC cables). For longer
runs (AOC cables, cross-row wiring) headroom may need adjustment.`,
  },
]
