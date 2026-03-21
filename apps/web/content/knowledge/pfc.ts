import type { KnowledgeConcept } from '@/types'

export const pfcConcepts: KnowledgeConcept[] = [
  {
    id: 'pfc',
    title: 'Priority Flow Control (PFC)',
    summary: 'PFC pauses specific traffic classes to prevent packet drops — but misconfigured, it creates pause storms that halt entire fabrics.',
    relatedCommands: ['show dcb pfc', 'disable pfc', 'enable pfc', 'ethtool -S eth0'],
    relatedConcepts: ['ecn', 'rocev2'],
    content: `## What PFC does

Priority Flow Control (IEEE 802.1Qbb) allows a switch to send a PAUSE frame
to a specific traffic class on a connected NIC. When the NIC receives the PAUSE
frame, it stops transmitting that priority for a defined period.

This is what makes Ethernet lossless — instead of dropping packets when buffers
fill, the switch pauses the sender. RDMA requires lossless delivery because a
single dropped packet causes the queue pair to timeout and retransmit the entire
message — catastrophic at 400Gb/s.

## The pause storm problem

If switch A pauses switch B, and switch B is already paused by switch C, the
pause propagates backward through the fabric. In a fat-tree topology this cascades
into a pause storm where large sections of the fabric halt simultaneously —
worse than packet loss.

## When to disable PFC

If your deployment uses ECN for congestion control, you may not need PFC at all.
ECN marks packets before buffers overflow so senders rate-limit themselves without
PAUSE frames. This eliminates pause storms entirely.

## Key commands

    show dcb pfc          — check current PFC state
    disable pfc           — disable PFC on this interface
    ethtool -S eth0       — check rx_pfc_pause_frames counter`,
  },
  {
    id: 'pfc-watchdog',
    title: 'PFC watchdog',
    summary: 'A safety mechanism that detects and breaks PFC deadlocks by disabling PFC on stuck ports after a timeout.',
    relatedCommands: ['show dcb pfc'],
    relatedConcepts: ['pfc'],
    content: `## What the PFC watchdog does

When a port has been paused continuously for longer than the watchdog interval
(default 200ms on Spectrum switches), the watchdog triggers. It disables PFC on
that port, breaking the deadlock. Traffic resumes at the cost of some brief drops
during recovery.

## Reading watchdog status

    show dcb pfc
      Watchdog: enabled
      Watchdog interval: 200ms

Always keep the watchdog enabled on production fabrics.
It is your last line of defence against permanent pause storms.`,
  },
]
