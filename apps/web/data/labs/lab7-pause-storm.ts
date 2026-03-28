import type { LabConfig, LabDevice } from '@/types'

// ── lab7-pause-storm ────────────────────────────────────────────────────────
//
// Fault: severe ECN-less congestion presenting as a PFC pause storm.
// The switch shows a *small* PFC pause frame count (looks benign).
// The DGX NIC ethtool reveals rx_pfc_pause_frames at 50,000/sec.
//
// Symptom chain:
//   Application: Training throughput down ~35% with no obvious errors.
//   Switch:      show interface counters → rx_drops=0, pfc_rx=14 → "looks fine"
//   DGX NIC:     ethtool -S eth0 → rx_prio3_pause=50,847/sec → PAUSE STORM
//   Root cause:  ECN disabled → buffers fill → switch issues continuous PFC
//               pauses → NIC halted → switch counter only sees burst-level
//               PFC events, not the continuous NIC-level storm.
//
// The trap: checking only the switch shows healthy-looking numbers.
//           Only the NIC-side counter reveals the storm.
//
// Learner must:
//   1. Check switch counters (show interface counters) → looks fine
//   2. Check NIC-side (ethtool -S eth0) → 50,000/sec pause storm visible
//   3. Understand the asymmetry: switch counts pause *events*, NIC counts
//      pause *frames received* (very different granularity)
//   4. Check whether ECN is configured (show dcb ets / show roce)
//   5. Enable ECN so senders rate-limit before buffers fill → pauses stop
//   6. Verify pause rate drops (ethtool -S eth0 confirms rx_prio3_pause
//      stops growing)
//
// Devices: DGX Node A, Spectrum-X leaf switch
// Chapter links: Ch2 (lossless scaling), Ch3 (CounterBothEndsViz), Ch5 (ECN)
// Difficulty: intermediate   Expected: 15 min

export const lab7Devices: LabDevice[] = [
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
      'enable ecn',
      'disable ecn',
      'help',
      'hint',
    ],
    position: { x: 160, y: 200 },
    status: 'up',
  },
]

export const lab7: LabConfig = {
  id: 'lab7-pause-storm',
  title: 'Uncover the hidden pause storm',
  difficulty: 'intermediate',
  expectedMinutes: 15,
  scenario:
    'Training throughput on this RoCEv2 link has dropped ~35%.\n'
    + 'The switch looks healthy — interface counters show zero drops\n'
    + 'and only a handful of PFC pause frames.\n\n'
    + 'The operations team has ruled out hardware failure. The link\n'
    + 'is active and physical counters are clean.\n\n'
    + 'Your task:\n'
    + '  1. Verify the switch-side view (show interface counters)\n'
    + '  2. Cross-check the NIC-side view (ethtool -S eth0)\n'
    + '  3. Identify the discrepancy — and what it means\n'
    + '  4. Determine why PFC pausing is occurring continuously\n'
    + '  5. Apply the correct fix and verify it works',
  initialTopology: {
    nic: { name: 'eth0', speed: 400, state: 'up' },
    pfcEnabled: true,
    ecnEnabled: false,
    congestionDetected: false,
    silentCongestion: false,
    pauseStorm: true,
    bufferUtilPct: 89,
  },
  requiredConditions: [
    'switchCountersChecked',
    'nicPauseConfirmed',
    'ecnMissingIdentified',
    'ecnEnabled',
    'ecnVerified',
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 90,
      text: "The switch says zero drops and only 14 PFC frames. Before concluding the fabric is healthy, check the same interface from the other end — the DGX NIC side.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 180,
      text: "Run 'ethtool -S eth0' on the DGX. The rx_prio3_pause counter tells you how many PFC PAUSE frames the NIC received — not how many the switch sent as events.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 300,
      text: "50,000 pause frames/sec means the NIC is nearly continuously halted. The root cause: ECN is disabled so there's no rate-limiting. The switch buffers fill, it issues continuous PFC pauses. Fix: 'enable ecn' on the switch, then verify with 'show dcb ets'.",
    },
  ],
}
