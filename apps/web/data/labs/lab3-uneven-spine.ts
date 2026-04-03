import type { LabConfig, LabDevice } from "@/types";

export const lab3Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "eth0 - 400G RoCEv2",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: ["rdma link show", "ethtool -S eth0", "help", "hint"],
    position: { x: 90, y: 60 },
    status: "up",
  },
  {
    id: "leaf-sw",
    type: "leaf-switch",
    label: "Leaf Switch",
    sublabel: "Cumulus Linux - swp51-swp54 ECMP uplinks",
    prompt: "cumulus@leaf:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show interface swp51 link stats",
      "nv show interface swp52 link stats",
      "nv show interface swp53 link stats",
      "nv show interface swp54 link stats",
      "nv show router adaptive-routing",
      "nv show interface swp51 router adaptive-routing",
      "nv set interface swp51 router adaptive-routing enable on",
      "nv set interface swp52 router adaptive-routing enable on",
      "nv set interface swp53 router adaptive-routing enable on",
      "nv set interface swp54 router adaptive-routing enable on",
      "nv config apply",
      "help",
      "hint",
    ],
    position: { x: 320, y: 190 },
    status: "up",
  },
  {
    id: "spine-1",
    type: "spine-switch",
    label: "Spine Switch 1",
    sublabel: "Cumulus Linux - downlink swp1",
    prompt: "cumulus@spine-1:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: ["nv show interface swp1 link stats", "help", "hint"],
    position: { x: 80, y: 340 },
    status: "up",
  },
  {
    id: "spine-2",
    type: "spine-switch",
    label: "Spine Switch 2",
    sublabel: "Cumulus Linux - downlink swp1",
    prompt: "cumulus@spine-2:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: ["nv show interface swp1 link stats", "help", "hint"],
    position: { x: 240, y: 340 },
    status: "up",
  },
  {
    id: "spine-3",
    type: "spine-switch",
    label: "Spine Switch 3",
    sublabel: "Cumulus Linux - downlink swp1",
    prompt: "cumulus@spine-3:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: ["nv show interface swp1 link stats", "help", "hint"],
    position: { x: 400, y: 340 },
    status: "up",
  },
  {
    id: "spine-4",
    type: "spine-switch",
    label: "Spine Switch 4",
    sublabel: "Cumulus Linux - downlink swp1",
    prompt: "cumulus@spine-4:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: ["nv show interface swp1 link stats", "help", "hint"],
    position: { x: 560, y: 340 },
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
    + "The cluster uses 4-way ECMP from the leaf to Spine 1-4. The\n"
    + "current workload has large RoCE flows with the same UDP dst-port,\n"
    + "so static hashing may be pinning traffic to a subset of spines.\n\n"
    + "Your task:\n"
    + "  1. Check leaf and spine interface counters for traffic skew\n"
    + "  2. Confirm adaptive routing is currently disabled\n"
    + "  3. Enable adaptive routing on all four leaf uplinks\n"
    + "  4. Verify spine utilisation has equalised",
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
      text: "Compare leaf swp51-swp54 link stats and each spine's swp1 link stats. If only Spine 1 and Spine 2 are carrying the load, inspect adaptive routing on the leaf uplinks.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "Run 'nv show router adaptive-routing' and 'nv show interface swp51 router adaptive-routing' on the leaf. If adaptive routing is off, stage it on swp51-swp54.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "Enable adaptive routing on swp51, swp52, swp53, and swp54 with 'nv set interface <port> router adaptive-routing enable on', run 'nv config apply', then recheck the spine swp1 counters.",
    },
  ],
};
