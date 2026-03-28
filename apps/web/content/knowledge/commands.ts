import type { KnowledgeConcept } from '@/types'

export const commandConcepts: KnowledgeConcept[] = [
  // ── DGX / Host commands ──────────────────────────────────────
  {
    id: 'cmd-ibstat',
    title: 'ibstat',
    summary: 'Per-HCA hardware state — link layer, physical state, active speed, port GUID, and subnet prefix for every InfiniBand or RoCEv2 port.',
    relatedCommands: ['ibstat'],
    relatedConcepts: ['rocev2', 'rdma-qp'],
    content: `## Usage

    ibstat                    # all HCAs
    ibstat mlx5_0             # specific HCA

## Key fields

    CA 'mlx5_0'
      Port 1:
        State: Active         ← should be Active; Down/Polling = fault
        Physical state: LinkUp
        Rate: 400 Gb/sec      ← NDR speed
        Link layer: Ethernet  ← RoCEv2 mode

## State values and what they mean

| State | Meaning |
|---|---|
| Active | Normal — data can flow |
| Down | No signal — check cable/transceiver |
| Polling | Trying to connect — far end may be down |
| Init | SM interaction in progress (IB only) |

## Common pitfall

ibstat shows the **NIC's view**. If the switch port is Err-Disabled, the NIC
still reports Active — it cannot see the switch side. Always check both ends.`,
  },
  {
    id: 'cmd-rdma-link-show',
    title: 'rdma link show',
    summary: 'RDMA subsystem link state for all interfaces — more granular than ibstat, shows the kernel RDMA layer view including port state and physical state.',
    relatedCommands: ['rdma link show'],
    relatedConcepts: ['rocev2'],
    content: `## Usage

    rdma link show            # all RDMA interfaces
    rdma link show mlx5_0/1   # specific port

## Output

    link mlx5_0/1 state ACTIVE physical_state LINK_UP
    link mlx5_3/1 state ACTIVE physical_state LINK_UP

## When to use vs ibstat

Both show RDMA link state. Use \`rdma link show\` when you want a compact
view of all ports, or when scripting (cleaner output format).
Use \`ibstat\` when you need full hardware detail per port (speed, GUID, etc).`,
  },
  {
    id: 'cmd-ethtool',
    title: 'ethtool -S eth0',
    summary: 'Low-level NIC driver statistics — the primary tool for diagnosing PFC pause storms, ECN marking rates, symbol errors, and physical layer degradation.',
    relatedCommands: ['ethtool -S eth0', 'ethtool -S eth3', 'ethtool -S eth5'],
    relatedConcepts: ['pfc', 'ecn'],
    content: `## Usage

    ethtool -S eth0           # Rail 0 NIC stats
    ethtool -S eth3           # Rail 3 NIC stats (fault rail in Lab 0)
    ethtool -S eth5           # Rail 5 NIC stats (Lab 6)

## Key counters — what each means

| Counter | What it shows | Bad if... |
|---|---|---|
| rx_prio3_pause | PFC pause frames received | Rapidly growing |
| tx_prio3_pause | PFC pause frames sent | Non-zero with no congestion |
| rx_ecn_marked_pkts | Packets marked by ECN | Zero when ECN should be active |
| tx_discards_phy | Physical layer TX drops | Any non-zero |
| rx_symbol_errors | Pre-FEC bit errors | Rising trend |
| rx_corrected_bits | Bits corrected by FEC | High = BER problem |

## Pause storm diagnosis

rx_prio3_pause growing fast + tx_discards = 0 → upstream pause storm.
Switch is pausing this NIC. The fabric is congested or deadlocked.

## Physical layer degradation (Lab 6)

rx_symbol_errors rising + port still Active → marginal connector or dirty fibre.
RS-FEC corrects errors but adds latency jitter, causing AllReduce straggler.`,
  },
  {
    id: 'cmd-show-dcb-pfc',
    title: 'show dcb pfc',
    summary: 'Displays current PFC state on the switch — enabled priorities, pause quanta, and watchdog configuration.',
    relatedCommands: ['show dcb pfc', 'enable pfc', 'disable pfc'],
    relatedConcepts: ['pfc'],
    content: `## Usage (Cumulus Linux leaf switch)

    show dcb pfc

## What to look for

    PFC status:    enabled
    PFC priority:  3           ← must match RoCE traffic class
    Watchdog:      enabled     ← always keep on
    Watchdog ms:   200

## Common mistake

PFC enabled on the wrong priority. If your RoCE traffic uses DSCP 26
(mapped to priority 3) but PFC is pausing priority 5, lossless delivery
does NOT apply to your RDMA traffic. Result: silent retransmissions.

## Fix

    enable pfc               ← simulator command
    show dcb pfc             ← verify`,
  },
  {
    id: 'cmd-show-dcb-ets',
    title: 'show dcb ets',
    summary: 'Displays Enhanced Transmission Selection config — traffic class queues, bandwidth allocation, and ECN threshold configuration.',
    relatedCommands: ['show dcb ets'],
    relatedConcepts: ['ecn'],
    content: `## Usage

    show dcb ets

## What to look for

    Traffic class 3 (RoCE):
      ECN min_threshold: 150KB
      ECN max_threshold: 1500KB
      ECN marking: enabled

ECN must be enabled on the RoCE traffic class with thresholds set.
If ECN is disabled, congestion causes silent drops instead of rate reduction.

## Relationship to DCQCN

ETS sets the ECN thresholds (when to mark). DCQCN in the NIC firmware
controls how senders respond to marks (how fast to reduce rate).
Both must be correctly configured for congestion control to work.`,
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

    PFC status:    enabled     ← lossless delivery
    ECN status:    enabled     ← DCQCN active
    DSCP marking:  26          ← correct RoCE traffic class
    MTU:           9000        ← jumbo frames required
    GID:           fe80::...   ← routable RDMA address

## All four must be correct

A single misconfiguration breaks RoCEv2. The most common are:
- PFC on wrong priority (retransmits)
- ECN disabled (silent drops under load)
- MTU mismatch (silent fragmentation)`,
  },
  {
    id: 'cmd-show-interface-counters',
    title: 'show interface counters',
    summary: 'Per-interface packet/byte counters and PFC pause stats — the first command to run when investigating throughput degradation on a switch.',
    relatedCommands: ['show interface counters'],
    relatedConcepts: ['pfc', 'rocev2'],
    content: `## Usage (Cumulus Linux switch)

    show interface counters

## Key columns

    swp5   rx_bytes  tx_bytes  rx_drops  tx_drops  pfc_rx  pfc_tx

## Decision tree

rx_drops > 0 → not lossless, something dropping. Check ECN config.
pfc_rx > 0   → switch receiving pauses. Is it expected? Or pause storm?
All zeros    → no drops, no pauses. Problem may be higher up (NCCL, load balancing).

## Lab 6 usage

On leaf-rail5, swp7 shows:
  rx_pfc_pause_frames = 14, rising
  rx_drops = 0
  port = Active
This pattern = marginal physical link causing PFC pauses without drops.`,
  },
  {
    id: 'cmd-show-pfc-pause-stats',
    title: 'show pfc pause-stats',
    summary: 'Per-interface PFC pause frame counts with timestamps — shows exactly when pauses started, useful for correlating with other monitoring layers.',
    relatedCommands: ['show pfc pause-stats'],
    relatedConcepts: ['pfc'],
    content: `## Usage

    show pfc pause-stats

## Output

    Interface  Priority  rx_pause_frames  tx_pause_frames  last_pause_timestamp
    swp7       3         14               0                2026-03-26 14:22:06 UTC

## Lab 6 usage

The timestamp on swp7's pause frames (14:07 UTC) aligns with the UFM alarm
onset (14:07 UTC) and the ML engineer's complaint (14:10 UTC, ~3 min lag).
This timestamp correlation confirms that one event caused all three observations.`,
  },
  {
    id: 'cmd-show-interface-swp',
    title: 'show interface swp7',
    summary: 'Detailed single-interface stats including FEC counters — pre-FEC BER, corrected symbols, and connector status.',
    relatedCommands: ['show interface swp7', 'show interface swp5'],
    relatedConcepts: ['pfc'],
    content: `## Usage

    show interface swp7       # inspect specific switch port

## Key section: FEC counters

    fec_mode:          RS-FEC (enabled)
    pre_fec_ber:       8.9e-12   ← elevated 4 orders of magnitude above baseline
    post_fec_ber:      0.0       ← FEC correcting all errors
    corrected_symbols: 1,847

## The FEC paradox (Lab 6)

post_fec_ber = 0 looks healthy. But RS-FEC correcting thousands of symbols/sec
adds ~100-200ns of latency jitter per hop. This jitter causes:
  → Intermittent PFC pauses
  → AllReduce barrier elongation (+45%)
  → Training slowdown (~12%)
  → No visible drops anywhere

The link appears Active and healthy — but physics are degraded.`,
  },
  {
    id: 'cmd-show-ecmp',
    title: 'show ecmp load-balance',
    summary: 'Displays ECMP hash policy and current spine link utilisation — key for diagnosing uneven load balancing.',
    relatedCommands: ['show ecmp load-balance'],
    relatedConcepts: ['ecmp', 'load-balancing'],
    content: `## Usage

    show ecmp load-balance

## What to look for

    Hash policy: src-ip, dst-ip, src-port, dst-port, protocol
    Spine uplinks: 8 links, utilisation: [12%, 11%, 67%, 68%, 13%, 12%, 11%, 10%]

If spine links are unevenly loaded (some at 60%+ while others are at 10%)
you have a hash collision — many flows mapping to the same spine.

## Fix (Lab 3)

Low-entropy RoCEv2 flows (fixed src/dst IP) hash to the same spine link.
Solution: enable adaptive routing or flowlet switching so flows are
redistributed over time rather than pinned by hash.`,
  },
  {
    id: 'cmd-show-topology',
    title: 'show topology',
    summary: 'Full cluster rail map — NIC state, switch port state, and GUID for every GPU rail across all nodes.',
    relatedCommands: ['show topology', 'show rdma links'],
    relatedConcepts: ['rocev2'],
    content: `## Usage

    show topology

## Output (Lab 0)

    Rail  NIC     NIC state  Switch      Switch port  Status
    0     mlx5_0  Active     leaf-rail0  swp2         UP
    3     mlx5_3  Active     leaf-rail3  swp5         ERR-DISABLED  ← fault

## Key insight

The NIC (mlx5_3) reports Active because it cannot see the switch port state.
The switch (leaf-rail3 swp5) reports Err-Disabled due to a link-flap event.
This disagreement between NIC and switch is the finding.

## When to use

First command in any rail-level diagnosis. Gives the full picture in one output.`,
  },
  {
    id: 'cmd-show-switch-port',
    title: 'show switch port railN',
    summary: 'Detailed port status on a specific leaf switch rail — shows Err-Disabled reason, link flap count, and cable/optic details.',
    relatedCommands: ['show switch port rail3', 'show switch port rail5'],
    relatedConcepts: ['rocev2'],
    content: `## Usage

    show switch port rail3    # inspect Rail 3 switch port (Lab 0)
    show switch port rail5    # inspect Rail 5 switch port

## Output (Lab 0)

    Port: swp5
    State: Err-Disabled
    Reason: link-flap (exceeded threshold in 60s window)
    Down count: 7
    Connected to: DGX-Node-A mlx5_3

## Err-Disabled causes

| Reason | Likely cause |
|---|---|
| link-flap | Bad cable, marginal connector, dirty fibre |
| bpdu-guard | STP BPDU received (misconfigured device) |
| port-security | MAC violation |

Lab 0 fault: link-flap from a failed DAC cable on Rail 3.`,
  },
  // ── NCCL / application layer commands ───────────────────────
  {
    id: 'cmd-nccl-debug',
    title: 'nccl-debug --transport',
    summary: 'Checks which transport NCCL has selected — "net" (RDMA via IB/RoCEv2) or "socket" (TCP fallback). Socket means NCCL is not using RDMA.',
    relatedCommands: ['nccl-debug --transport'],
    relatedConcepts: ['nccl', 'rocev2'],
    content: `## Usage

    nccl-debug --transport

## Output: RDMA (correct)

    NCCL transport: net (RDMA)
    Active HCA: mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7

## Output: Socket fallback (Lab 5 fault)

    NCCL transport: socket (TCP)
    Reason: No RDMA devices matched NCCL_IB_HCA

If you see "socket" transport, check NCCL_IB_HCA and NCCL_SOCKET_IFNAME.
TCP socket fallback causes busbw to drop from ~146 GB/s to ~3 GB/s.`,
  },
  {
    id: 'cmd-show-nccl-env',
    title: 'show nccl env',
    summary: 'Displays current NCCL environment variable settings — the most common source of transport misconfiguration.',
    relatedCommands: ['show nccl env', 'set nccl ib-hca', 'set nccl socket-ifname'],
    relatedConcepts: ['nccl'],
    content: `## Usage

    show nccl env

## Lab 5 fault state

    NCCL_IB_HCA=mlx5_bond_0       ← WRONG: bond device doesn't exist on DGX
    NCCL_SOCKET_IFNAME=eth0        ← WRONG: eth0 is the compute NIC, not management

## Correct values for DGX H100

    NCCL_IB_HCA=mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7
    NCCL_SOCKET_IFNAME=eno1        ← management interface for coordination traffic

## Fix commands

    set nccl ib-hca mlx5_0,...    ← simulator
    set nccl socket-ifname eno1   ← simulator

In production: export NCCL_IB_HCA=... before launching the training job.`,
  },
  {
    id: 'cmd-run-nccl-tests',
    title: 'run nccl-tests',
    summary: 'Runs NCCL bandwidth benchmark — busbw is the key metric. Expected ~146 GB/s at 128 GPUs over 8-node RoCEv2. Socket fallback gives ~3 GB/s.',
    relatedCommands: ['run nccl-tests'],
    relatedConcepts: ['nccl'],
    content: `## Usage

    run nccl-tests

## Interpreting busbw

busbw (bus bandwidth) = the effective AllReduce bandwidth per GPU, accounting
for the ring-AllReduce overhead factor.

| Scenario | Expected busbw |
|---|---|
| 128 GPUs, RoCEv2 RDMA | ~146 GB/s |
| 128 GPUs, TCP socket | ~0.1–3 GB/s |
| 256 GPUs, RoCEv2 | ~280 GB/s |

busbw << expected → NCCL not using RDMA, or fabric bottleneck.
First check: nccl-debug --transport. If socket, fix NCCL_IB_HCA.`,
  },
  // ── UFM commands ─────────────────────────────────────────────
  {
    id: 'cmd-show-ufm-ports',
    title: 'show ufm ports',
    summary: 'Cluster-wide port counter table from UFM — shows SymbolErrorRate and PFC pause counts for every port pair. First command in monitoring-layer diagnosis.',
    relatedCommands: ['show ufm ports', 'show ufm alarms', 'show ufm events'],
    relatedConcepts: ['ufm-monitoring', 'symbol-errors'],
    content: `## Usage (UFM server terminal)

    show ufm ports

## What to look for

The table shows both ends of every link side by side.

    Rail  Port   Device A      SER-A    Device B      SER-B    PFC  LFR
    5     swp7   leaf-rail5    1,847 ▲  mlx5_5 DGX   1,831 ▲  14   0

SER = SymbolErrorRate (errors/second). Both ends rising = physical layer issue.
One end rising = could be NIC or switch transceiver.
PFC > 0 with no drops = marginal link causing pause frames without full congestion.

## Key principle

Two-ended degradation on the same link = physical layer between the two devices.
If only one end shows errors, suspect the transceiver or NIC port on that side.`,
  },
  {
    id: 'cmd-show-ufm-alarms',
    title: 'show ufm alarms',
    summary: 'Active UFM alarms — severity, port, and alarm type. Shows WARNING before a link fails, giving time for proactive remediation.',
    relatedCommands: ['show ufm alarms', 'show ufm events'],
    relatedConcepts: ['ufm-monitoring'],
    content: `## Usage

    show ufm alarms

## Severity levels

| Severity | Meaning |
|---|---|
| WARNING | Threshold exceeded but link still Active |
| CRITICAL | Link down or SM rerouting active |
| INFO | Informational — topology change, LID assignment |

## Lab 6 alarms

    WARNING  leaf-rail5 swp7   SymbolErrorRate > 500/sec threshold
    WARNING  DGX mlx5_5 p1    SymbolErrorRate > 500/sec threshold

Two WARNING alarms on the same physical link = early physical degradation.
Act now — the link will eventually Err-Disable if BER continues rising.`,
  },
  {
    id: 'cmd-show-ufm-port-detail',
    title: 'show ufm port leaf-rail5 swp7',
    summary: 'Detailed per-port UFM counter history — counter snapshots over time reveal whether a problem is new, stable, or escalating.',
    relatedCommands: ['show ufm port leaf-rail5 swp7'],
    relatedConcepts: ['ufm-monitoring', 'symbol-errors'],
    content: `## Usage

    show ufm port leaf-rail5 swp7

## Counter history output

    Timestamp       SymbolErrors  Pre-FEC BER   Post-FEC BER   rx_pfc_pause
    13:52:07        0             1.2e-15        0              0
    14:07:33        847           3.4e-12  ▲     0 (FEC)        2
    14:22:07        1,847         8.9e-12  ▲     0 (FEC)        14

## Reading the pattern

Pre-FEC BER rising 4 orders of magnitude = serious physical degradation.
Post-FEC BER = 0 means RS-FEC is correcting all errors — so RDMA sees no drops.
But FEC correction adds ~100-200ns latency jitter per correction event.
This jitter → intermittent PFC pauses → AllReduce straggler → training slowdown.`,
  },
  // ── DCGM commands ────────────────────────────────────────────
  {
    id: 'cmd-show-dcgm-gpu',
    title: 'show dcgm gpu5',
    summary: 'DCGM metrics for a specific GPU — GPU utilisation, AllReduce barrier duration, NIC bandwidth, and PFC pause counts from the GPU perspective.',
    relatedCommands: ['show dcgm gpu5', 'show dcgm all'],
    relatedConcepts: ['dcgm-monitoring'],
    content: `## Usage

    show dcgm gpu5            # specific GPU
    show dcgm all             # all GPUs side by side

## Key metrics

| Metric | Baseline | Lab 6 fault state |
|---|---|---|
| GPU utilisation | 97% | 91% ← straggler |
| AllReduce barrier p99 | 7.8ms | 11.3ms ← +45% |
| RDMA rx bandwidth | 31 GB/s | 21.7 GB/s |
| rx_pfc_pause_frames | 0 | 14 ← rising |

## The straggler effect

1 GPU at AllReduce barrier 45% longer = all 127 other GPUs waiting.
With 8 GPUs per node: 1 straggler → whole node runs at ~91% efficiency.
12% training slowdown from one marginal DAC connector.

## Correlation with network

rx_pfc_pause_frames in DCGM = same counter as ethtool rx_prio3_pause.
Cross-reference with UFM SymbolErrorRate and switch pfc-pause-stats timestamps.`,
  },
  // ── Remediation commands ─────────────────────────────────────
  {
    id: 'cmd-reseat-connector',
    title: 'reseat connector leaf-rail5 swp7',
    summary: 'Issues a remediation action to reseat the DAC connector on the identified degraded port — first fix for rising SymbolErrorRate.',
    relatedCommands: ['reseat connector leaf-rail5 swp7'],
    relatedConcepts: ['symbol-errors'],
    content: `## Usage (UFM server terminal)

    reseat connector leaf-rail5 swp7

## When to use

Rising pre-FEC BER on a DAC cable with no other changes = marginal connector.
Reseat both ends of the DAC cable. If errors persist → replace the cable.

## Production procedure

1. Notify ML team: brief Rail 5 interruption (~2–5 seconds)
2. Physically reseat DAC at leaf-rail5 swp7 (and/or DGX end)
3. Clean connector with IPA if contaminated
4. Monitor UFM for 5 min: SymbolErrorRate should return to 0
5. If errors persist after reseat → replace cable

## Verification

After reseat:
  show ufm port leaf-rail5 swp7   → SymbolErrors = 0
  show dcgm gpu5                  → AllReduce barrier p99 restored to ~7.8ms`,
  },
]
