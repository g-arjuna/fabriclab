// lab8Handlers.ts
// New command handlers required for lab8-pfc-priority-mismatch.
//
// Requires:
//   1. TopologyState extended with:  pfcPriority?: number  (default 3)
//   2. New conditions in formatters.ts:
//        dropsConfirmed, pfcPriorityInspected, mismatchIdentified,
//        pfcPriorityFixed, pfcVerified (already exists)
//   3. New command 'enable pfc priority 3' added to:
//        commandCatalog.ts KNOWN_COMMANDS array
//        mutations.ts runMutation() switch cases
//        commandHandler.ts EXACT_HANDLERS

import type { CommandResult } from '@/types'
import { useLabStore } from '@/store/labStore'

// ── showDcbPfc with pfcPriority awareness ───────────────────────────────────
// Replace the relevant section of the existing showDcbPfc.ts with this logic:
// When pfcPriority === 0 → PFC shows "enabled" but on wrong priority.
// When pfcPriority === 3 → fully correct.

export function showDcbPfcWithPriority(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const pfcPriority = (topology as any).pfcPriority ?? 3
  const pfcEnabled = topology.pfcEnabled

  setCondition('pfcPriorityInspected', true)
  markVerified('pfcPriorityInspected')

  if (!pfcEnabled) {
    setCondition('pfcMissing', true)
    markVerified('pfcMissing')
    return {
      output: `Interface swp1-32 (server-facing)
  Priority Flow Control:  disabled  ← WARNING: fabric is NOT lossless
  PFC enabled priorities: none
  Pause quanta:           N/A
  Watchdog:               disabled`,
      conceptId: 'pfc',
      type: 'info',
    }
  }

  if (pfcPriority === 0) {
    setCondition('mismatchIdentified', true)
    markVerified('mismatchIdentified')
    return {
      output: `Interface swp1-32 (server-facing)
  Priority Flow Control:  enabled
  PFC enabled priorities: 0 (cos0)  ← WARNING: priority 0 = management traffic
  Pause quanta:           0xffff
  Watchdog:               enabled
  Watchdog interval:      200ms

PROBLEM DETECTED:
  PFC is enabled, but on priority 0 — not priority 3.

  Priority 0 carries management/default traffic.
  RoCEv2 RDMA traffic uses DSCP 26, which maps to priority 3.

  PFC on priority 0 will PAUSE management frames.
  PFC does NOT protect priority 3 (RoCEv2).
  Result: RDMA traffic drops under congestion — no lossless guarantee.

  Cross-check: run 'show roce' to confirm the expected priority mapping.
  Fix: enable pfc priority 3`,
      conceptId: 'pfc',
      type: 'error',
    }
  }

  // pfcPriority === 3 — correct after fix
  setCondition('pfcVerified', true)
  markVerified('pfcVerified')
  return {
    output: `Interface swp1-32 (server-facing)
  Priority Flow Control:  enabled
  PFC enabled priorities: 3 (cos3)  ← Correct: matches RoCEv2 traffic class
  Pause quanta:           0xffff
  Watchdog:               enabled
  Watchdog interval:      200ms

PFC correctly configured on priority 3.
RoCEv2 traffic (DSCP 26 → cos3) is now protected by lossless PFC.`,
    conceptId: 'pfc',
    type: 'success',
  }
}

// ── ethtool -S eth0 for priority mismatch lab ───────────────────────────────
// tx_discards_phy > 0 because PFC is not protecting priority 3.
// After fix: discards drop to 0.

export function ethtoolStatsPriorityMismatch(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const pfcPriority = (topology as any).pfcPriority ?? 3
  const pfcEnabled = topology.pfcEnabled

  const isFixed = pfcEnabled && pfcPriority === 3

  if (!isFixed) {
    setCondition('dropsConfirmed', true)
    markVerified('dropsConfirmed')
    return {
      output: `NIC statistics (ConnectX-7 · eth0):
  rx_prio3_pause:       0         ← no PFC pauses on priority 3 (PFC not protecting it)
  tx_prio3_pause:       0
  rx_ecn_marked_pkts:   0
  tx_discards_phy:      52,847    ← drops occurring — fabric is NOT lossless
  link_speed:           400Gb/s
  link_state:           up

tx_discards_phy > 0 confirms packets are being dropped at this NIC.
rx_prio3_pause = 0 confirms the switch is NOT sending PFC PAUSE frames
for priority 3 (the RoCEv2 priority class).

This means PFC is not protecting RoCEv2 traffic — even though
'show dcb pfc' says PFC is enabled.
→ Check which priority PFC is enabled on: 'show dcb pfc'`,
      conceptId: 'pfc',
      type: 'error',
    }
  }

  return {
    output: `NIC statistics (ConnectX-7 · eth0):
  rx_prio3_pause:       847       ← occasional pauses (normal backstop)
  tx_prio3_pause:       0
  rx_ecn_marked_pkts:   0
  tx_discards_phy:      0         ← drops stopped — fabric is lossless again
  link_speed:           400Gb/s
  link_state:           up

PFC is now protecting priority 3. Drops have stopped.
Lossless operation restored for RoCEv2 traffic.`,
    conceptId: 'pfc',
    type: 'success',
  }
}

// ── show roce for priority mismatch lab ─────────────────────────────────────
// When pfcPriority=0: show roce reveals the expected priority 3 mapping,
// making the mismatch visually obvious.

export function showRocePriorityMismatch(): CommandResult {
  const { topology } = useLabStore.getState()
  const pfcPriority = (topology as any).pfcPriority ?? 3
  const pfcEnabled = topology.pfcEnabled
  const isFixed = pfcEnabled && pfcPriority === 3

  return {
    output: `RoCE Configuration -- Spectrum-X SN5600 (swp1-32)
  RoCE version:   RoCEv2
  State:          active
  PFC:            ${isFixed
    ? 'enabled (priority 3)  ✓'
    : 'enabled (priority 0)  ← MISMATCH: RoCEv2 needs priority 3'}
  ECN:            disabled
  DSCP marking:   26 (RoCE traffic class)
  DSCP→priority:  DSCP 26 → cos3 (priority 3)  ← RoCEv2 traffic lands here
  MTU:            9000
  GID:            fe80::506b:4b03:00a1:b200

${!isFixed ? `CONFIGURATION MISMATCH DETECTED:
  RoCEv2 traffic uses DSCP 26 → mapped to priority 3 (cos3).
  PFC is enabled on priority 0 — a different traffic class.
  PFC PAUSE frames are sent for priority 0, NOT for priority 3.
  RoCEv2 traffic has no PFC lossless protection.
  Fix: 'enable pfc priority 3'` : 'RoCEv2 and PFC priority are aligned. Lossless.'}`,
    conceptId: 'pfc',
    type: isFixed ? 'success' : 'error',
  }
}

// ── enable pfc priority 3 mutation ──────────────────────────────────────────
// Add this case to runMutation() in mutations.ts:
//
//   case "enable pfc priority 3":
//     store.setTopology({
//       pfcEnabled: true,
//       pfcPriority: 3,
//       congestionDetected: false,
//       bufferUtilPct: 18,
//     });
//     store.setCondition("pfcPriorityFixed", true);
//     store.markVerified("pfcPriorityFixed");
//     store.setCondition("pfcEnabled", true);
//     return {
//       output: "PFC reconfigured to priority 3 (cos3).\n"
//         + "RoCEv2 traffic (DSCP 26 → cos3) is now protected by PFC.\n"
//         + "Verify with: show dcb pfc  and  ethtool -S eth0",
//       conceptId: "pfc",
//       type: "success",
//     };
//
// Also add "enable pfc priority 3" to:
//   commandCatalog.ts KNOWN_COMMANDS array
//   commandHandler.ts EXACT_HANDLERS:
//     "enable pfc priority 3": () => runMutation("enable pfc priority 3"),
