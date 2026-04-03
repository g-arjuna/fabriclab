import type { LabConfig, LabDevice } from "@/types"

// —— lab6-alert-triage ————————————————————————————————————————————————
//
// Fault: marginal optical connector on Rail 5 leaf switch port 7
// (DGX-Node-A → leaf-rail5 swp7).
//
// Symptom chain:
//   Physical:  rising pre-FEC bit errors → intermittent PFC pauses
//              (not enough to err-disable — port stays "Active")
//   Fabric:    UFM sees symbol error rate climbing on leaf-rail5 port 7
//              and DGX mlx5_5 port 1 — both ends, same trend
//   GPU:       DCGM shows DGX GPU-5 NVLink bandwidth drop + AllReduce
//              barrier elongation
//   Training:  ML engineer reports "training is ~12% slower than yesterday"
//              No obvious errors anywhere.
//
// Learner must:
//   1. Pull UFM port counters for the cluster (show ufm ports)
//   2. Identify the offending port pair by symbol error rate trend
//   3. Confirm on the DGX side (show dcgm gpu5) — GPU util drop + barrier
//   4. Check the switch-side counters (show interface counters on leaf-rail5)
//   5. Correlate timestamps across all three layers
//   6. Determine root cause = physical layer (not congestion, not NCCL)
//   7. Issue remediation command: reseat connector on leaf-rail5 swp7
//
// Devices: DGX Node A, leaf-rail5 switch, UFM server
// Difficulty: advanced  Expected: 25 min

export const lab6Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "mlx5_0–7 · 8× 400G RoCEv2",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS (Ubuntu 22.04)",
    allowedCommands: [
      "ibstat",
      "rdma link show",
      "show dcgm gpu5",
      "show dcgm all",
      "ethtool -S eth5",
      "show nccl env",
      "help",
      "hint",
    ],
    position: { x: 60, y: 40 },
    status: "up",
  },
  {
    id: "leaf-rail5",
    type: "leaf-switch",
    label: "Leaf Switch Rail 5",
    sublabel: "SN5600 · Cumulus Linux",
    prompt: "leaf-rail5 #",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show interface counters",
      "show interface swp7",
      "show dcb pfc",
      "show pfc pause-stats",
      "show roce",
      "help",
      "hint",
    ],
    position: { x: 320, y: 220 },
    status: "degraded",
    railId: 5,
  },
  {
    id: "ufm-server",
    type: "ufm-server",
    label: "UFM Server",
    sublabel: "UFM 6.8 · REST API",
    prompt: "ufm-server $",
    osLabel: "UFM 6.8",
    allowedCommands: [
      "show ufm ports",
      "show ufm alarms",
      "show ufm events",
      "show ufm port leaf-rail5 swp7",
      "show ufm topology",
      "reseat connector leaf-rail5 swp7",
      "help",
      "hint",
    ],
    position: { x: 560, y: 120 },
    status: "up",
  },
]

export const lab6: LabConfig = {
  id: "lab6-alert-triage",
  title: "Triage a silent fabric degradation",
  difficulty: "advanced",
  expectedMinutes: 25,
  scenario:
    "An ML engineer messages you: 'Training is about 12% slower than yesterday.\n" +
    "No errors in the NCCL logs. GPU utilisation looks normal in the dashboard.'\n\n" +
    "You check the cluster at a glance:\n" +
    "  - All 8 rails report Active in ibstat\n" +
    "  - No Err-Disabled ports in show topology\n" +
    "  - PFC is enabled, ECN is enabled\n" +
    "  - No retransmit counters incrementing\n\n" +
    "Nothing is obviously broken. But training is measurably slower.\n\n" +
    "Your task:\n" +
    "  1. Pull UFM port counters to find where errors are climbing\n" +
    "  2. Identify which port pair is degrading (both ends)\n" +
    "  3. Confirm the GPU-layer symptom with DCGM metrics\n" +
    "  4. Correlate timestamps across UFM, switch counters, and DCGM\n" +
    "  5. Determine the root cause layer (physical / transport / application)\n" +
    "  6. Issue the correct remediation command",
  initialTopology: {
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 22,
    unevenSpine: false,
  },
  requiredConditions: [
    "ufmPortsChecked",
    "offendingPortIdentified",
    "dcgmCorrelated",
    "timestampsCorrelated",
    "rootCauseLayerIdentified",
    "remediationIssued",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Nothing obvious at the RDMA or switch level — start one layer higher. Open the UFM server terminal and run 'show ufm ports' to get the full cluster port counter table. Look for a symbol error rate that is non-zero or trending.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 270,
      text: "UFM should show Rail 5 port 7 with rising SymbolErrors on both ends (leaf-rail5 and DGX mlx5_5). Two-ended degradation = physical layer between the devices. Now cross to the DGX terminal and run 'show dcgm gpu5' — what do the AllReduce barrier duration and NVLink bandwidth counters show?",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 420,
      text: "Correlation sequence: show ufm ports (Rail 5 port 7 SymbolErrors ↑) → show ufm port leaf-rail5 swp7 (timestamps) → show dcgm gpu5 (barrier duration ↑ from ~8ms to ~11ms) → show interface swp7 on leaf-rail5 (rx_pfc_pause_frames non-zero but port not Err-Disabled) → Root cause = marginal optical connector generating BER → PFC pause storms → slow AllReduce. Remediation: 'reseat connector leaf-rail5 swp7'",
    },
  ],
}
