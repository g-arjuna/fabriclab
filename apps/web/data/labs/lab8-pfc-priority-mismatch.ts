import type { LabConfig, LabDevice } from '@/types'

// ── lab8-pfc-priority-mismatch ──────────────────────────────────────────────
//
// Fault: PFC is enabled on the switch — but on priority 0 (management
//        traffic) instead of priority 3 (RoCEv2 traffic).
//
// Symptom chain:
//   Application: RDMA retransmissions, training throughput down 45%.
//   NIC:         ethtool -S eth0 → tx_discards_phy > 0 (drops happening)
//                                  rx_prio3_pause = 0  (no PFC on priority 3)
//   Switch:      show dcb pfc → "PFC: enabled" ← looks correct at a glance!
//                But priority = 0, not 3.
//   Root cause:  PFC enabled on wrong CoS queue. RoCEv2 traffic uses
//                DSCP 26 → mapped to priority 3. PFC on priority 0 only
//                pauses management traffic — completely useless for RDMA.
//
// The trap: "show dcb pfc" says enabled. The learner may conclude PFC is
//            fine and look elsewhere. They must read the priority field.
//
// Learner must:
//   1. Check NIC drops (ethtool -S eth0) → tx_discards_phy > 0
//   2. Check PFC state (show dcb pfc) → enabled, but on priority 0
//   3. Check RoCEv2 config (show roce) → DSCP 26 → priority 3 → PFC=disabled
//   4. Recognise the mismatch: PFC enabled on wrong priority
//   5. Fix: enable pfc priority 3
//   6. Verify: show dcb pfc confirms priority 3, ethtool confirms drops stop
//
// Devices: DGX Node A, Spectrum-X leaf switch
// Chapter links: Ch3 (PFCCommandViz), Ch5 (PFC mechanics), traffic classes
// Difficulty: intermediate   Expected: 18 min

export const lab8Devices: LabDevice[] = [
  {
    id: 'dgx-node-a',
    type: 'dgx',
    label: 'DGX H100 Node A',
    sublabel: 'DGX OS (Ubuntu 22.04)',
    prompt: 'dgx-node-a:~$',
    osLabel: 'DGX OS',
    allowedCommands: [
      'ibstat',
      'rdma link show',
      'ethtool -S eth0',
      'help',
      'hint',
    ],
    position: { x: 160, y: 40 },
    status: 'up',
  },
  {
    id: 'spectrum-sw',
    type: 'leaf-switch',
    label: 'Spectrum-X SN5600',
    sublabel: 'Cumulus Linux',
    prompt: 'spectrum-sw #',
    osLabel: 'Cumulus Linux',
    allowedCommands: [
      'show interface counters',
      'show dcb pfc',
      'show dcb ets',
      'show roce',
      'enable pfc',
      'enable pfc priority 3',
      'disable pfc',
      'help',
      'hint',
    ],
    position: { x: 160, y: 200 },
    status: 'up',
  },
]

export const lab8: LabConfig = {
  id: 'lab8-pfc-priority-mismatch',
  title: 'Fix the PFC priority mismatch',
  difficulty: 'intermediate',
  expectedMinutes: 18,
  scenario:
    'RDMA training traffic is dropping packets. The team just\n'
    + 'completed a switch config migration and believes PFC is\n'
    + 'configured correctly.\n\n'
    + 'AllReduce latency has spiked 45% and RDMA retransmission\n'
    + 'counters are climbing. But "show dcb pfc" was checked and\n'
    + 'shows Priority Flow Control: enabled.\n\n'
    + 'Your task:\n'
    + '  1. Confirm drops are occurring on the NIC\n'
    + '  2. Inspect the full PFC configuration — not just enabled/disabled\n'
    + '  3. Cross-reference with the RoCEv2 traffic class configuration\n'
    + '  4. Identify the misconfiguration and apply the correct fix\n'
    + '  5. Verify the fabric is lossless again',
  initialTopology: {
    nic: { name: 'eth0', speed: 400, state: 'up' },
    pfcEnabled: true,
    ecnEnabled: false,
    congestionDetected: true,
    silentCongestion: false,
    pfcPriority: 0,
    bufferUtilPct: 78,
  },
  requiredConditions: [
    'dropsConfirmed',
    'pfcPriorityInspected',
    'mismatchIdentified',
    'pfcPriorityFixed',
    'pfcVerified',
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 90,
      text: "Drops are happening even though PFC shows 'enabled'. Run ethtool -S eth0 on the DGX to confirm tx_discards_phy > 0, then look more carefully at the full 'show dcb pfc' output — not just the enabled/disabled field.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 210,
      text: "PFC enabled on priority 0 means PAUSE frames are only sent for priority 0 traffic (management). RoCEv2 uses DSCP 26 which maps to priority 3. Run 'show roce' to confirm the priority mapping, then compare with 'show dcb pfc'.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "The fix is 'enable pfc priority 3' — this reconfigures PFC to pause on the correct CoS queue for RoCEv2. Then verify with 'show dcb pfc' (should show priority 3) and 'ethtool -S eth0' (tx_discards_phy should drop to 0).",
    },
  ],
}
