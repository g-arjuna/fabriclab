import type { KnowledgeConcept } from '@/types'

export const monitoringConcepts: KnowledgeConcept[] = [
  {
    id: 'ufm-monitoring',
    title: 'UFM — Unified Fabric Manager',
    summary: 'NVIDIA\'s fabric management platform — monitors all ports cluster-wide, raises alarms before failures, tracks counter trends, and manages IB Subnet Manager.',
    relatedCommands: ['show ufm ports', 'show ufm alarms', 'show ufm events', 'show ufm port leaf-rail5 swp7', 'show ufm topology'],
    relatedConcepts: ['symbol-errors', 'dcgm-monitoring'],
    content: `## What UFM does

UFM (Unified Fabric Manager) is NVIDIA's fabric management platform for both
InfiniBand and RoCEv2 clusters. It provides:

- **Port counter polling** — all links every 60s, trend detection
- **Alarm management** — WARNING before failure, CRITICAL on failure
- **Subnet Manager** (IB mode) — LID assignment, path records, adaptive routing
- **REST API** — programmatic counter access (GET /ufmRest/v2/ports)
- **Event log** — timestamped history of every fabric event

## UFM vs per-device CLI

| | UFM | CLI (ibstat, ethtool) |
|---|---|---|
| Scope | All ports, all devices | One device at a time |
| History | Time-series counter snapshots | Current value only |
| Alerts | Threshold-based alarms | None (you must check manually) |
| Best for | Proactive monitoring, trend detection | Reactive diagnosis, fault isolation |

## The monitoring gap without UFM

Labs 0–5 are reactive — you diagnose a fault you already know exists.
Lab 6 is proactive — UFM alarms tell you something is wrong before the port
fails. The ML engineer notices slowness 3 minutes after UFM's first alarm.

## UFM alarm thresholds (typical)

| Alarm | Threshold | Severity |
|---|---|---|
| SymbolErrorRate | > 500/sec | WARNING |
| LinkFlap | > 3 in 60s | WARNING → CRITICAL |
| Port down | Any | CRITICAL |
| BER above threshold | Pre-FEC BER > 1e-10 | WARNING |`,
  },
  {
    id: 'symbol-errors',
    title: 'Symbol errors and pre-FEC BER',
    summary: 'Physical layer degradation metric — rising symbol errors indicate a bad connector, dirty fibre, or degraded cable before the port fails completely.',
    relatedCommands: ['show ufm ports', 'show ufm port leaf-rail5 swp7', 'show interface swp7', 'ethtool -S eth5'],
    relatedConcepts: ['ufm-monitoring'],
    content: `## Symbol errors vs bit errors

A **symbol error** occurs when the receiver cannot decode a transmitted symbol.
At 400G (PAM-4 modulation), 4 bits per symbol. Symbol errors compound — one
bad symbol = up to 4 bit errors.

**Pre-FEC BER** = bit error rate before Forward Error Correction.
**Post-FEC BER** = bit error rate after FEC correction (what RDMA sees).

## The FEC paradox

RS-FEC (Reed-Solomon Forward Error Correction) can correct many symbol errors:
  Pre-FEC BER = 8.9e-12 (elevated, 4 orders above baseline)
  Post-FEC BER = 0.0    (FEC corrects everything)

The RDMA layer sees post-FEC BER = 0, so it reports no errors.
But FEC correction adds **~100–200 ns latency jitter** per correction event.
Over thousands of corrections per second, this jitter accumulates into
intermittent PFC pauses and AllReduce barrier elongation.

## Symbol error trend = impending failure

Symbol errors don't stay constant. They grow as a connector degrades:

    14:07  847/sec  ← onset
    14:09  1,204/sec ↑
    14:15  1,612/sec ↑
    14:22  1,847/sec ↑

A rising monotonic trend = act now. The port will eventually Err-Disable.
Reseat or replace the cable before that happens.

## Baseline vs elevated

| BER | Meaning |
|---|---|
| < 1e-14 | Normal — excellent physical layer |
| 1e-12 to 1e-10 | Elevated — investigate |
| > 1e-10 | Critical — imminent failure |`,
  },
  {
    id: 'dcgm-monitoring',
    title: 'DCGM — Data Center GPU Manager',
    summary: 'NVIDIA\'s GPU telemetry agent — collects per-GPU utilisation, memory, power, NVLink bandwidth, and AllReduce barrier timing. Exposed via Prometheus exporter.',
    relatedCommands: ['show dcgm gpu5', 'show dcgm all'],
    relatedConcepts: ['ufm-monitoring'],
    content: `## What DCGM measures

DCGM (Data Center GPU Manager) is a daemon running on each DGX node.
It exports metrics to Prometheus via dcgm-exporter.

## Key metrics for fabric diagnosis

| Metric | Normal | Fault indicator |
|---|---|---|
| DCGM_FI_DEV_GPU_UTIL | 95–98% | Drop without workload change |
| AllReduce barrier p99 | 7–9ms | > 10ms = straggler |
| RDMA rx bandwidth | ~30 GB/s | Drop = fabric issue |
| rx_pfc_pause_frames | 0 | Any non-zero = pause problem |
| NVLink bandwidth util | ~60–70% | Drop = intra-node issue |

## AllReduce barrier duration — the key training metric

Barrier duration = time from AllReduce start to AllReduce complete.
If one GPU is slow (straggler), all others wait at the barrier.

p99 barrier duration is more useful than average — a 45% p99 increase
while average is normal indicates intermittent straggler events.

## DCGM + UFM correlation (Lab 6)

    UFM: leaf-rail5 swp7 SymbolErrors rising from 14:07 UTC
    DCGM GPU-5: AllReduce barrier p99 rises from 7.8ms to 11.3ms from 14:07 UTC
    DCGM GPU-5: rx_pfc_pause_frames = 14 (rising)

Same timestamp on both = same root cause.
Network degradation → PFC pauses → AllReduce straggler → training slowdown.`,
  },
  {
    id: 'cross-layer-correlation',
    title: 'Cross-layer correlation methodology',
    summary: 'How to connect symptoms across physical, fabric, GPU, and application layers — aligning timestamps from UFM, DCGM, switch counters, and training logs.',
    relatedCommands: ['show ufm events', 'show dcgm gpu5', 'show pfc pause-stats', 'show interface swp7'],
    relatedConcepts: ['ufm-monitoring', 'dcgm-monitoring', 'symbol-errors'],
    content: `## Why cross-layer correlation matters

Every symptom has a layer:
- Physical: bad connector, dirty fibre, bad DAC cable
- Link: Err-Disabled port, link flap, symbol errors
- Transport: PFC pause storm, ECN misconfiguration, drops
- Application: NCCL transport fallback, wrong env vars
- GPU: AllReduce straggler, utilisation drop

A symptom at one layer causes observable effects at every layer above it.
The diagnosis is the chain, not a single data point.

## The Lab 6 chain

    Physical layer:   Marginal DAC connector → rising pre-FEC BER
    ↓
    Link layer:       RS-FEC correcting errors → FEC latency jitter
    ↓
    Transport layer:  Jitter → intermittent PFC pause frames on swp7
    ↓
    GPU layer:        PFC pauses → GPU-5 AllReduce barrier elongation (+45%)
    ↓
    Application:      AllReduce straggler → 12% training throughput loss

## Timestamp alignment technique

Collect first-occurrence timestamps from each layer:
    UFM alarm (leaf-rail5 swp7):    14:07:33 UTC
    Switch pfc-pause-stats (swp7):  14:07:06 UTC (first pause)
    DCGM AllReduce barrier spike:   14:07–14:08 UTC (estimated from p99 rise)
    ML engineer Slack message:      14:10:22 UTC (3 min reporting lag)

All timestamps cluster around 14:07 UTC = single event, one root cause.

## General approach

1. Start with the highest-level symptom (slow training, throughput drop)
2. Pull UFM cluster-wide overview (show ufm ports) to find the anomaly
3. Drill into the specific port (show ufm port ...) for counter history
4. Correlate GPU-side (show dcgm gpu5) to confirm which GPU is affected
5. Check switch-side counters (show interface counters / pfc-pause-stats)
6. Align timestamps — if they match, you have your root cause
7. Issue remediation, verify recovery`,
  },
  {
    id: 'alert-thresholds',
    title: 'Alert threshold calibration',
    summary: 'Setting monitoring thresholds too tight creates alert fatigue; too loose misses real problems. Each counter has a different calibration principle.',
    relatedCommands: ['show ufm alarms'],
    relatedConcepts: ['ufm-monitoring', 'dcgm-monitoring'],
    content: `## Why thresholds matter

Alert fatigue = operations team ignores alerts = real failures go unnoticed.
Too loose = problems detected late = extended impact.

## Per-counter calibration principles

**SymbolErrorRate (UFM)**
  Alert: > 500/sec for 2+ consecutive samples
  Rationale: Transient EMI can cause brief spikes. Sustained = real problem.
  False positive risk: None — any sustained rate > 500 requires investigation.

**AllReduce barrier duration (DCGM)**
  Alert: p99 > 150% of 7-day baseline
  Rationale: Absolute threshold wrong — varies by model size and GPU count.
  Use relative threshold to catch stragglers regardless of workload.

**rx_pfc_pause_frames (DCGM / ethtool)**
  Alert: > 0 sustained for > 30s
  Rationale: Brief pauses during burst absorption are normal.
  Sustained pauses = upstream problem that won't self-resolve.

**Link flap count (UFM)**
  Alert: > 3 in 60s window
  Rationale: 1-2 flaps can be transient. Repeated = physical problem.

**Buffer utilisation (switch)**
  Alert: > 70% sustained
  Rationale: 90%+ means drops are imminent. Alert at 70% gives time to act.`,
  },
]
