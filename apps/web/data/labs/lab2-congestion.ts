import type { LabConfig, LabDevice } from "@/types";

export const lab2Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "eth0 - 400G RoCEv2",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: ["ibstat", "rdma link show", "ethtool -S eth0", "help", "hint"],
    position: { x: 160, y: 40 },
    status: "up",
  },
  {
    id: "spectrum-sw",
    type: "leaf-switch",
    label: "Spectrum-X SN5600",
    sublabel: "Cumulus Linux - swp1/swp2 to DGX A/B",
    prompt: "cumulus@switch:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show interface swp1 counters qos pfc-stats",
      "nv show qos congestion-control default-global",
      "nv show qos congestion-control default-global traffic-class 3",
      "nv set qos congestion-control default-global traffic-class 3 ecn enabled",
      "nv config apply",
      "help",
      "hint",
    ],
    position: { x: 160, y: 180 },
    status: "up",
  },
  {
    id: "dgx-node-b",
    type: "dgx",
    label: "DGX H100 Node B",
    sublabel: "eth0 - 400G RoCEv2",
    prompt: "dgx-node-b:~$",
    osLabel: "DGX OS",
    allowedCommands: ["ibstat", "rdma link show", "ethtool -S eth0", "help", "hint"],
    position: { x: 160, y: 340 },
    status: "up",
  },
];

export const lab2: LabConfig = {
  id: "lab2-congestion",
  title: "Diagnose fabric congestion",
  difficulty: "intermediate",
  expectedMinutes: 15,
  scenario:
    "GPU training throughput has dropped 40% across this node's RoCEv2 links.\n"
    + "Monitoring shows elevated buffer utilisation on the leaf downlinks, but\n"
    + "the team cannot explain why throughput is falling when packet drops are 0.\n\n"
    + "Traffic pattern context: synchronized AllReduce bursts are arriving at\n"
    + "the leaf, PFC is absorbing congestion with pause frames, but ECN is not\n"
    + "marking packets early enough for DCQCN to back hosts off.\n\n"
    + "DGX Node A eth0 connects to switch swp1 and DGX Node B eth0 connects to\n"
    + "switch swp2.\n\n"
    + "Use CLI tools to confirm this congestion story, then enable ECN for the\n"
    + "RoCE traffic class alongside PFC.",
  initialTopology: {
    pfcEnabled: true,
    ecnEnabled: false,
    congestionDetected: false,
    silentCongestion: true,
    bufferUtilPct: 87,
  },
  requiredConditions: ["congestionChecked", "ecnEnabled", "ecnVerified"],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start with DGX 'ethtool -S eth0' and switch 'nv show interface swp1 counters qos pfc-stats'. High PFC pauses with zero drops point to pause-driven congestion.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "ECN signals congestion before buffers overflow. Check 'nv show qos congestion-control default-global'.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "Run 'nv show interface swp1 counters qos pfc-stats' to diagnose, stage ECN with 'nv set qos congestion-control default-global traffic-class 3 ecn enabled', apply it, then verify the TC3 ECN state.",
    },
  ],
};
