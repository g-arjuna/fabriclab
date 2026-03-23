import type { LabConfig, LabDevice } from "@/types";

export const lab3Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "eth0 · 400G RoCEv2",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: ["rdma link show", "ethtool -S eth0", "help", "hint"],
    position: { x: 80, y: 40 },
    status: "up",
  },
  {
    id: "leaf-sw",
    type: "leaf-switch",
    label: "Leaf Switch",
    sublabel: "SN5600 · Cumulus Linux",
    prompt: "leaf-sw #",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show interface counters",
      "show dcb load-balance",
      "show ecmp load-balance",
      "enable load-balance per-packet",
      "show dcb pfc",
      "show dcb ets",
      "help",
      "hint",
    ],
    position: { x: 240, y: 180 },
    status: "up",
  },
  {
    id: "spine-sw",
    type: "spine-switch",
    label: "Spine Switch",
    sublabel: "SN5600 · Cumulus Linux",
    prompt: "spine-sw #",
    osLabel: "Cumulus Linux",
    allowedCommands: ["show interface counters", "help", "hint"],
    position: { x: 240, y: 340 },
    status: "up",
  },
];

export const lab3: LabConfig = {
  id: "lab3-uneven-spine",
  title: "Diagnose uneven spine utilisation",
  difficulty: "intermediate",
  expectedMinutes: 15,
  scenario:
    "AllReduce throughput has dropped 25% across the 16-node\n"
    + "training cluster. JCT has increased by 35%.\n\n"
    + "No packet drops are visible. PFC pause frames are present\n"
    + "but modest. No link failures. No alerts have fired.\n\n"
    + "Your task:\n"
    + "  1. Confirm no drops or PFC misconfiguration\n"
    + "  2. Check spine link utilisation\n"
    + "  3. Identify the load balancing mode\n"
    + "  4. Enable per-packet load balancing\n"
    + "  5. Verify spine utilisation has equalised",
  initialTopology: {
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 61,
    unevenSpine: true,
    lbMode: "hash",
  },
  requiredConditions: [
    "spineChecked",
    "lbModeIdentified",
    "lbEnabled",
    "spineVerified",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start on the leaf switch. Check what traffic is doing on the uplinks to the spine.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "After 'show interface counters' on the leaf, open the spine terminal and compare link utilisation across all uplinks. Then check the load balancing mode.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "Sequence: leaf 'show interface counters' -> spine 'show interface counters' (compare links) -> leaf 'show dcb load-balance' -> leaf 'enable load-balance per-packet' -> spine 'show interface counters' to verify.",
    },
  ],
};
