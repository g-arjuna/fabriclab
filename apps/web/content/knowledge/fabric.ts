import type { KnowledgeConcept } from '@/types'

export const fabricConcepts: KnowledgeConcept[] = [
  {
    id: 'fat-tree',
    title: 'Fat-tree topology',
    summary: 'The standard AI cluster topology — a multi-stage Clos network that provides full bisection bandwidth for any traffic matrix, making it ideal for AllReduce workloads.',
    relatedCommands: ['show topology', 'show ecmp load-balance'],
    relatedConcepts: ['ecmp', 'load-balancing', 'rail-optimised'],
    content: `## What fat-tree provides

A fat-tree (k-ary fat-tree) with 1:1 oversubscription is **non-blocking**:
any pair of nodes can communicate simultaneously at full line rate, regardless
of what other nodes are doing. No traffic pattern can exceed the bisection.

This property is critical for AllReduce — the communication pattern changes
every training step (different parameter shards, different pipeline stages).
The fat-tree doesn't care: it provides full bandwidth for all of them.

## BasePOD = 2-stage fat-tree

    32 DGX H100 nodes
    8 leaf switches (SN5600, one per GPU rail)
    32 spine switches
    256 GPUs total

Each leaf switch: 16 DGX downlinks (one per node per rail) + 32 spine uplinks.
Rail-optimised: GPU-N on every node connects to the same Leaf-N switch.
AllReduce for a single GPU rail touches only 1 leaf switch hop — maximum efficiency.

## Oversubscription

    1:1 (non-blocking) → every downlink has a matching uplink
    2:1 → half the uplinks → acceptable for storage fabric (bursty, not synchronous)
    4:1 → quarter uplinks → enterprise Ethernet standard, not acceptable for RoCEv2

## Bisection bandwidth

Bisection = cut the cluster in half, measure BW across the cut.
Fat-tree 1:1: bisection BW = sum of all uplinks on one side.
Torus: bisection BW = 2/K of fat-tree (K = nodes per dimension).`,
  },
  {
    id: 'rail-optimised',
    title: 'Rail-optimised design (ROD)',
    summary: 'DGX fabric design where GPU-N on every node connects to Leaf-N switch — AllReduce for a single parameter shard uses only 1 leaf switch hop.',
    relatedCommands: ['show topology'],
    relatedConcepts: ['fat-tree', 'allreduce'],
    content: `## Rail layout

A DGX H100 has 8 ConnectX-7 NICs (mlx5_0 through mlx5_7).
In rail-optimised design:
  mlx5_0 on all 32 nodes → Leaf Switch 0 (Rail 0)
  mlx5_1 on all 32 nodes → Leaf Switch 1 (Rail 1)
  ...
  mlx5_7 on all 32 nodes → Leaf Switch 7 (Rail 7)

## Why this matters for AllReduce

NCCL's ring-AllReduce assigns each GPU a rank. Parameter gradients are divided
into 8 shards. Each shard's AllReduce uses a different NIC (different rail).

Since all GPUs participating in Rail-0's AllReduce connect to the same Leaf-0
switch, the AllReduce traffic never reaches the spine. It stays within one
leaf switch — the fastest possible path.

## Rail-unified design (RUD) — the alternative

Some deployments use RUD where every NIC on a node connects to the same pair
of leaf switches (bonded). This simplifies cabling but eliminates the locality
benefit. AllReduce traffic must route through spine switches even for same-shard
communication.

ROD is preferred for AI training. RUD is used when cabling simplicity matters
more than maximum AllReduce performance.`,
  },
  {
    id: 'ecmp',
    title: 'ECMP — Equal Cost Multipath',
    summary: 'Load balancing across multiple equal-cost paths using a hash of the packet header fields — distributes flows across spine links.',
    relatedCommands: ['show ecmp load-balance'],
    relatedConcepts: ['load-balancing', 'fat-tree'],
    content: `## How ECMP works

When multiple equal-cost paths exist between a source and destination (e.g.
8 spine switches in a BasePOD), ECMP selects a path by hashing the packet
header fields.

Default hash fields: src-IP, dst-IP, src-port, dst-port, protocol.

All packets with the same 5-tuple hash to the same spine link. This keeps
packets in order within a flow (good for TCP) but creates a problem for
RoCEv2 AllReduce.

## The low-entropy problem (Lab 3)

AllReduce between DGX nodes: source IP and destination IP are fixed (same node
pairs communicate every step). Source port is often static (RoCEv2 QPs use
fixed ports). Result: all traffic between a pair of nodes → same hash → same
spine link.

8 spine links but only 1 is used between any two nodes = 87.5% spine wasted.

## Fix: adaptive routing or flowlet switching

Adaptive routing: switch monitors per-link utilisation and redirects new flows
away from congested spine links. Available on Spectrum-X switches.

Flowlet switching: instead of hashing per-flow, hash on short bursts (flowlets).
A gap between bursts allows re-hashing to a different spine link.

## Detection

    show ecmp load-balance
    Spine utilisation: [67%, 68%, 12%, 11%, 13%, 12%, 11%, 10%]

Two spines at 67–68%, six spines near 11% = hash collision.`,
  },
  {
    id: 'load-balancing',
    title: 'Load balancing in AI fabrics',
    summary: 'Distributing AllReduce traffic evenly across spine links — harder than it sounds because RoCEv2 flows are low-entropy (fixed src/dst) and hash collisions are common.',
    relatedCommands: ['show ecmp load-balance', 'show interface counters'],
    relatedConcepts: ['ecmp', 'fat-tree'],
    content: `## Why load balancing is hard for AllReduce

AllReduce is a fixed communication pattern: GPU-N on Node-A always communicates
with GPU-N on Node-B. The src/dst IP and port are stable across training steps.
ECMP hash → same result every step → same spine link → hot-spot.

## Taxonomy of load balancing approaches

| Approach | Granularity | Rerouting trigger |
|---|---|---|
| Static ECMP | Per-flow | Never |
| Adaptive routing | Per-flow | On congestion detection |
| Flowlet LB | Sub-flow (burst) | On inter-burst gap |
| Packet-based LB | Per-packet | Every packet |

Packet-based LB solves hash collisions but causes reordering (bad for TCP,
tolerated by RoCEv2 with reorder-resilient QPs).

## Spectrum-X adaptive routing

Spectrum-X (SN5600) supports hardware adaptive routing. The switch measures
per-port queue depth and steers new flows toward less-loaded uplinks.
This works well for AI training where elephant flows are long-running.

## Detecting uneven spine (Lab 3)

    show ecmp load-balance
    show interface counters    ← on spine switch

Hot spines: tx_bytes much higher than average spine.
Cool spines: tx_bytes at 15–20% of expected.
Difference = hash collision, flows pinned to subset of spines.`,
  },
  {
    id: 'incast',
    title: 'Incast congestion',
    summary: 'Multiple senders transmitting to one receiver simultaneously — a pattern inherent in AllReduce that can overwhelm switch buffers if not handled by ECN.',
    relatedCommands: ['show interface counters', 'show dcb ets'],
    relatedConcepts: ['ecn', 'load-balancing'],
    content: `## What incast is

In AllReduce gather phase, many GPUs send to one destination simultaneously.
If all senders start at the same time (synchronized by the barrier), their
packets arrive at the switch in a synchronized burst.

The switch buffer at the receiver port fills in microseconds. Without ECN
to slow senders, packets are dropped. With ECN, senders slow down before
drops occur.

## Incast vs regular congestion

Regular congestion: one flow grows until it fills buffers.
Incast: N flows all arrive simultaneously — a step function in queue depth.
ECN thresholds tuned for regular congestion may respond too slowly for incast.

## Mitigation

1. ECN min_threshold set low enough to catch incast bursts (~100–200KB)
2. Switch deep buffers absorb bursts during ECN response time
3. NCCL chunking — break AllReduce into smaller messages to spread the burst
4. Adaptive routing to spread receivers across multiple uplinks`,
  },
  {
    id: 'err-disabled',
    title: 'Err-Disabled switch port',
    summary: 'A switch port automatically disabled after repeated link flaps — protects the fabric from a flapping link causing routing instability.',
    relatedCommands: ['show switch port rail3', 'show topology'],
    relatedConcepts: ['fat-tree'],
    content: `## What triggers Err-Disable

Cumulus Linux / ONYX switches monitor link flap frequency.
If a port flaps more than a threshold number of times in a window
(default: 5 flaps in 30 seconds), the switch Err-Disables the port.

The port stays down until manually cleared:
    interface swp5 no shutdown    ← after fixing root cause

## Why the NIC doesn't see it

The NIC (ibstat) reports the NIC's own physical state, not the switch port state.
If the switch Err-Disables its port, the NIC's transmitter is still active.
The NIC reports "Active" because it is sending — the switch just isn't accepting.

This is the two-ended view principle: always check both ends of a link.

## Lab 0 fault chain

    DAC cable degrades → electrical signal marginal
    → Switch port flaps 7 times in 60 seconds
    → Switch Err-Disables swp5 on leaf-rail3
    → DGX mlx5_3 still reports Active (NIC cannot see switch state)
    → show topology reveals the disagreement
    → Rail 3 AllReduce path broken → GPU-3 drops out of training
    → Throughput = 7/8 = 87.5% of baseline

## Resolution

Fix root cause (replace DAC cable), then:
    show switch port rail3     ← confirm Err-Disabled
    clear err-disabled swp5    ← re-enable port
    show topology              ← verify Rail 3 Active on both ends`,
  },
]
