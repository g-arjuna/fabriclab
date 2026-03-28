import type { KnowledgeConcept } from '@/types'

export const ecnConcepts: KnowledgeConcept[] = [
  {
    id: 'ecn',
    title: 'Explicit Congestion Notification (ECN)',
    summary: 'ECN marks packets at the switch when queues build, letting RDMA senders slow down before buffers overflow — no drops, no pause storms.',
    relatedCommands: ['enable ecn', 'show dcb ets', 'show roce'],
    relatedConcepts: ['pfc', 'dcqcn'],
    content: `## How ECN works

ECN (RFC 3168) uses two bits in the IP header (the ECN field).
When a switch queue depth exceeds the min_threshold, the switch sets the
CE (Congestion Experienced) bits on outbound packets.

The receiver sees the CE mark and sends a CNP (Congestion Notification Packet)
back to the sender. The sender's ConnectX NIC reduces its injection rate via
DCQCN. Queues drain. The fabric stabilises.

## ECN thresholds (configured in ETS)

    min_threshold: 150KB   ← start marking at this queue depth
    max_threshold: 1500KB  ← 100% marking probability above this

Between min and max, marking probability increases linearly. This gives a
smooth rate reduction rather than a sudden cliff.

## ECN vs PFC comparison

| | ECN | PFC |
|---|---|---|
| Mechanism | Marks packets (no stop) | Sends PAUSE frames (full stop) |
| Scope | Per-flow (selective) | Per-priority-class (blunt) |
| Risk | None | Pause storms, deadlocks |
| Response time | ~RTT (microseconds) | ~RTT (similar) |
| Preferred for | Congestion control | Lossless backstop only |

## Silent congestion (Lab 2 fault)

ECN disabled + buffers filling → switch starts dropping silently.
No PAUSE frames, no retransmit counters visible on NIC.
Only visible on switch: show interface counters → rx_drops > 0.

## Key commands

    enable ecn            — enable ECN on interface (simulator)
    show dcb ets          — verify ECN thresholds configured
    show roce             — confirm DCQCN is running`,
  },
  {
    id: 'dcqcn',
    title: 'DCQCN congestion control',
    summary: 'The rate control algorithm inside ConnectX NICs — reduces injection rate on ECN marks, recovers gradually when congestion clears.',
    relatedCommands: ['show roce', 'show dcb ets'],
    relatedConcepts: ['ecn'],
    content: `## DCQCN in the NIC firmware

DCQCN (Data Center Quantized Congestion Notification, RFC 8257) is implemented
in ConnectX NIC firmware. It controls how fast the NIC injects packets into
the fabric when congestion is signalled via ECN marks.

## Control loop

1. Switch marks CE bit when queue > min_threshold
2. Receiver sees CE mark → sends CNP back to sender (every CNP interval)
3. Sender NIC receives CNP → multiplicative rate decrease (e.g. halve rate)
4. No CNP for N periods → additive rate increase (slowly recover)
5. Rate stabilises at level that keeps queues below threshold

## Tunable parameters (mlxconfig)

| Parameter | Default | Notes |
|---|---|---|
| CNP interval | 4 µs | Min time between CNPs from one receiver |
| Rate decrease factor | 50% | Aggressive = faster convergence |
| Rate increase step | Additive | Slow recovery avoids oscillation |
| Initial rate | Line rate | Starts at full speed |

## When to tune

The defaults work for most deployments. Tune only if:
- Many short flows (decrease CNP interval for faster response)
- Long-running elephant flows (increase decrease factor)
- Measured oscillation in busbw (adjust increase step)`,
  },
  {
    id: 'ecn-silent-drops',
    title: 'Silent drops without ECN',
    summary: 'When ECN is disabled and buffers fill, switches drop packets silently — no PFC pauses, no retransmit counters on the NIC, only visible on the switch.',
    relatedCommands: ['show interface counters', 'enable ecn', 'show dcb ets'],
    relatedConcepts: ['ecn', 'pfc'],
    content: `## Lab 2 fault scenario

ECN is disabled. The fabric is running an AllReduce under load.
Switch buffers fill. Switch starts dropping packets.

Symptoms:
  - Throughput 40% below baseline
  - ethtool on DGX: rx_prio3_pause = 0, tx_discards = 0 ← NIC sees nothing
  - show interface counters on switch: rx_drops > 0 ← drops visible here only

## Why the NIC doesn't see it

The drops happen at the switch, not the NIC. The NIC only sees its own
transmit discards (tx_discards_phy). It cannot see packets dropped at a
downstream switch.

## Why it looks like a congestion problem (not a config problem)

Throughput drops under load, recovers when traffic decreases.
The pattern exactly mimics genuine congestion. The tell is:
  - No PFC pause frames anywhere
  - Drops visible only on switch interface counters
  - ECN status = disabled

## Fix

    enable ecn
    show dcb ets    ← verify thresholds configured
    show roce       ← confirm DCQCN active`,
  },
  {
    id: 'cnp',
    title: 'Congestion Notification Packet (CNP)',
    summary: 'A special RoCEv2 control packet sent by the receiver back to the sender when ECN marks are detected — triggers DCQCN rate reduction at the sender NIC.',
    relatedCommands: ['show roce'],
    relatedConcepts: ['ecn', 'dcqcn'],
    content: `## CNP mechanics

When a NIC receives a packet with CE bits set (congestion experienced),
it generates a CNP (port 4791, ECN-capable transport, specific OpCode).
The CNP is sent back to the sender over the reverse path.

The sender NIC's DCQCN engine processes the CNP and reduces its transmission
rate. CNPs are rate-limited to prevent CNP floods from themselves causing
congestion on the return path.

## CNP flow in a 256-GPU AllReduce

With 256 GPUs all sending simultaneously, a congested switch could trigger
thousands of CNPs per second. The CNP interval setting (default 4µs per
sender-receiver pair) prevents this from becoming a feedback storm.

## Checking CNP activity

CNP generation is not directly observable in the CLI simulator, but it is
visible via:
  - DCGM: rx_cnp_handled counter
  - UFM: per-QP CNP counters (advanced mode)
  - Network analyzer capture on RoCEv2 traffic`,
  },
]
