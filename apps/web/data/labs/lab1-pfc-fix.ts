import type { LabConfig, LabDevice } from "@/types";

export const lab1Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "eth0 · 400G RoCEv2",
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
    sublabel: "Cumulus Linux · Rail 0",
    prompt: "spectrum-sw #",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show dcb pfc",
      "show dcb ets",
      "show interface counters",
      "show roce",
      "disable pfc",
      "enable pfc",
      "enable ecn",
      "disable ecn",
      "clear counters",
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
    sublabel: "eth0 · 400G RoCEv2",
    prompt: "dgx-node-b:~$",
    osLabel: "DGX OS",
    allowedCommands: ["ibstat", "rdma link show", "ethtool -S eth0", "help", "hint"],
    position: { x: 160, y: 340 },
    status: "up",
  },
];

export const lab1: LabConfig = {
  id: "lab1-pfc-fix",
  title: "Fix the PFC misconfiguration",
  difficulty: "beginner",
  expectedMinutes: 10,
  scenario:
    "A RoCEv2 training workload across DGX Node A and DGX Node B is\n"
    + "experiencing packet drops and RDMA retransmissions. AllReduce latency\n"
    + "has increased by 40% and GPU utilisation has dropped across the cluster.\n\n"
    + "The operations team has confirmed the physical links are up on both nodes\n"
    + "and the switch. They suspect the lossless mechanism is not configured.\n\n"
    + "Your task:\n"
    + "  1. Confirm the current PFC state on the switch\n"
    + "  2. Check NIC counters to see if drops are occurring\n"
    + "  3. Enable PFC to restore lossless operation\n"
    + "  4. Verify the fix with show dcb pfc",
  initialTopology: {
    pfcEnabled: false,
    ecnEnabled: false,
    congestionDetected: true,
    bufferUtilPct: 94,
  },
  requiredConditions: ["pfcMissing", "pfcEnabled", "pfcVerified"],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start by checking the current state of Priority Flow Control on the switch interface.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "The 'dcb' command family manages Data Center Bridging. Try 'show dcb pfc'.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "Run 'show dcb pfc' to confirm PFC is missing, then 'enable pfc' to restore it, then verify with 'show dcb pfc'.",
    },
  ],
};
