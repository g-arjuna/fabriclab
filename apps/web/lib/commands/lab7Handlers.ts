// lab7Handlers.ts
// New command handlers required for lab7-pause-storm.
// Add these to commandHandler.ts EXACT_HANDLERS and wire the mutations.
//
// Also requires:
//   1. TopologyState extended with:  pauseStorm?: boolean
//   2. New conditions registered in formatters.ts:
//        switchCountersChecked, nicPauseConfirmed,
//        ecnMissingIdentified, ecnEnabled (already exists), ecnVerified (already exists)
//   3. New catalog entries in commandCatalog.ts (already present for ethtool, ecn)

import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'

// ── showInterfaceCounters override for pause storm lab ─────────────────────
// When pauseStorm is true: switch-side view shows only 14 PFC pause frames
// (looks benign). This is the trap — the switch counts PFC pause *events*,
// not the continuous byte-stream of pauses landing at the NIC.

export function showInterfaceCountersPauseStorm(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const pauseStorm = (topology as any).pauseStorm ?? false
  const ecnEnabled = topology.ecnEnabled

  setCondition('switchCountersChecked', true)
  markVerified('switchCountersChecked')

  if (ecnEnabled) {
    return {
      output: `Interface  RX packets      TX packets      RX drops  TX drops  PFC rx  Buffer util
---------  --------------  --------------  --------  --------  ------  -----------
swp1       6,234,918,441   6,198,441,223   0         0         2       12%
swp2       6,228,341,892   6,201,884,112   0         0         1       11%
swp3       6,241,002,341   6,194,773,221   0         0         0       10%

All ports healthy. ECN is active — senders are rate-limiting via DCQCN.
PFC pause rate has dropped to near zero. Buffer utilisation nominal.`,
      conceptId: 'ecn',
      type: 'success',
    }
  }

  if (pauseStorm) {
    return {
      output: `Interface  RX packets      TX packets      RX drops  TX drops  PFC rx  Buffer util
---------  --------------  --------------  --------  --------  ------  -----------
swp1       6,234,918,441   6,198,441,223   0         0         14      89%
swp2       6,228,341,892   6,201,884,112   0         0         11      87%
swp3       6,241,002,341   6,194,773,221   0         0         9       84%

NOTE: rx_drops = 0 on all ports (PFC preventing drops — lossless).
PFC rx counts = 14, 11, 9 — small numbers, looks normal at a glance.

Buffer utilisation is elevated (84–89%). This is the congestion signal.
The switch is using PFC to prevent drops — but how often is it pausing?
→ Check the NIC side: 'ethtool -S eth0' on DGX Node A for the NIC's view.`,
      conceptId: 'pfc',
      type: 'info',
    }
  }

  // Healthy baseline (post-fix, non-pauseStorm state)
  return {
    output: `Interface  RX packets      TX packets      RX drops  TX drops  PFC rx  Buffer util
---------  --------------  --------------  --------  --------  ------  -----------
swp1       6,234,918,441   6,198,441,223   0         0         0       12%
swp2       6,228,341,892   6,201,884,112   0         0         0       11%
swp3       6,241,002,341   6,194,773,221   0         0         0       10%

All ports healthy. No drops, no PFC pauses, buffer utilisation nominal.`,
    conceptId: 'rocev2',
    type: 'success',
  }
}

// ── ethtool -S eth0 for pause storm lab ────────────────────────────────────
// This is the KEY diagnostic output. Unlike the switch which shows only 14
// PFC "events", the NIC counter shows the actual pause frames landing.
// 50,847/sec = NIC is nearly continuously halted.

export function ethtoolStatsPauseStorm(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const pauseStorm = (topology as any).pauseStorm ?? false
  const ecnEnabled = topology.ecnEnabled

  if (pauseStorm && !ecnEnabled) {
    setCondition('nicPauseConfirmed', true)
    markVerified('nicPauseConfirmed')
    setCondition('ecnMissingIdentified', true)
    markVerified('ecnMissingIdentified')

    return {
      output: `NIC statistics (ConnectX-7 · eth0):
  rx_prio3_pause:       50,847   ← WARNING: 50,847 pause frames/sec
  tx_prio3_pause:       0
  rx_ecn_marked_pkts:   0        ← ECN disabled — no marks being sent
  tx_discards_phy:      0        ← no drops (PFC preventing them)
  link_speed:           400Gb/s
  link_state:           up

ANALYSIS:
  The switch showed 14 PFC events. The NIC received 50,847 pause frames/sec.

  These numbers are not contradictory — they measure different things:
    Switch PFC rx:    counts distinct PFC pause "events" (PAUSE frame bursts)
    NIC rx_prio3_pause: counts every individual 802.3x PAUSE frame received

  50,847 frames/sec = the NIC is nearly continuously paused.
  This is a PFC pause storm masking severe fabric congestion.

  Root cause: ECN is disabled. The switch has no mechanism to signal
  senders to slow down before buffers fill. Buffers fill → switch issues
  continuous PFC pauses → NIC halted → throughput collapses 35%.

  Fix: enable ECN so DCQCN can signal senders to rate-limit BEFORE
  buffers overflow. This breaks the pause storm cycle.
  → Run: 'enable ecn' on the switch, then verify with 'show dcb ets'`,
      conceptId: 'pfc',
      type: 'error',
    }
  }

  if (ecnEnabled) {
    return {
      output: `NIC statistics (ConnectX-7 · eth0):
  rx_prio3_pause:       3        ← Dramatically reduced — near zero
  tx_prio3_pause:       0
  rx_ecn_marked_pkts:   2,847    ← ECN marks active — senders rate-limiting
  tx_discards_phy:      0
  link_speed:           400Gb/s
  link_state:           up

ECN is now active. Senders are receiving CE marks and reducing injection
rate via DCQCN before buffers fill. PFC is now a rare backstop, not a
continuous storm. Training throughput should recover.`,
      conceptId: 'ecn',
      type: 'success',
    }
  }

  // Healthy baseline (no pause storm)
  return {
    output: `NIC statistics (ConnectX-7 · eth0):
  rx_prio3_pause:       0
  tx_prio3_pause:       0
  rx_ecn_marked_pkts:   0
  tx_discards_phy:      0
  link_speed:           400Gb/s
  link_state:           up`,
    conceptId: 'pfc',
    type: 'info',
  }
}

// ── enable ecn mutation for pause storm lab ─────────────────────────────────
// When ecn is enabled in pauseStorm context, also clear the pauseStorm flag.
// The existing 'enable ecn' mutation in mutations.ts only patches ecnEnabled
// and congestion state — it doesn't know about pauseStorm.
// Solution: extend the existing enable ecn case in mutations.ts to also
// patch pauseStorm to false and set bufferUtilPct to 12.

// PATCH to apply inside runMutation() in mutations.ts, inside case "enable ecn":
//
//   case "enable ecn":
//     store.setTopology({
//       ecnEnabled: true,
//       congestionDetected: false,
//       silentCongestion: false,
//       pauseStorm: false,      ← ADD THIS LINE
//       bufferUtilPct: 12,      ← change from 31 to 12 (lower after ECN active)
//     });
//     store.setCondition("ecnEnabled", true);
//     store.markVerified("ecnEnabled");
//     return {
//       output: "ECN enabled. DCQCN is now active.\n"
//         + "Senders are receiving CE marks and reducing injection rate.\n"
//         + "PFC pause storm should subside within seconds.\n"
//         + "Verify with: show dcb ets  and  ethtool -S eth0",
//       conceptId: "ecn",
//       type: "success",
//     };
