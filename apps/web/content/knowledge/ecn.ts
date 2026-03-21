import type { KnowledgeConcept } from '@/types'

export const ecnConcepts: KnowledgeConcept[] = [
  {
    id: 'ecn',
    title: 'Explicit Congestion Notification (ECN)',
    summary: 'ECN marks packets at the switch when queues build up, letting senders slow down before buffers overflow — no drops, no pause storms.',
    relatedCommands: ['enable ecn', 'show dcb ets', 'show roce'],
    relatedConcepts: ['pfc', 'dcqcn'],
    content: `## How ECN works

ECN (RFC 3168) uses two bits in the IP header. Switches mark these bits when
queue depth exceeds a threshold. The receiver generates a CNP (Congestion
Notification Packet) and sends it back to the sender. The sender's NIC reduces
its injection rate via the DCQCN algorithm.

## ECN vs PFC

| | ECN | PFC |
|--|-----|-----|
| Mechanism | Marks packets | Sends PAUSE frames |
| Granularity | Per-flow | Per-priority-class |
| Risk | None | Pause storms |
| Preferred | Modern deployments | Legacy or storage |

## The DCQCN algorithm

NVIDIA uses DCQCN (RFC 7560) implemented in ConnectX NIC firmware:

1. Switch marks CE bit when queue exceeds min_threshold
2. Receiver sends CNP back to sender
3. Sender NIC reduces injection rate (multiplicative decrease)
4. Sender slowly recovers rate (additive increase)
5. Fabric stabilises at a rate that keeps queues shallow

## Key commands

    enable ecn            — enable ECN on this interface
    show dcb ets          — verify ECN marking is configured
    show roce             — confirm DCQCN is running`,
  },
  {
    id: 'dcqcn',
    title: 'DCQCN congestion control',
    summary: 'The rate control algorithm inside ConnectX NICs — reduces sender rate on ECN marks, recovers gradually when congestion clears.',
    relatedCommands: ['show roce', 'show dcb ets'],
    relatedConcepts: ['ecn'],
    content: `## DCQCN in practice

DCQCN (Data Center Quantized Congestion Notification) is implemented in
ConnectX NIC firmware. It controls how fast the NIC injects packets into
the fabric when congestion is signalled via ECN marks.

Key parameters (tunable via mlxconfig):
  CNP interval — minimum time between CNPs from receiver (default 4 microseconds)
  Rate decrease — multiplicative decrease on each CNP (default halves the rate)
  Rate increase — additive increase each period with no CNP

The defaults work well for most RoCEv2 deployments. Only tune if you have
specific latency or throughput targets that the defaults do not meet.`,
  },
]
