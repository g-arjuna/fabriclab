import type { LabConfig, LabDevice } from "@/types";

export const lab1Devices: LabDevice[] = [
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
      "nv show qos roce",
      "nv show interface swp1 qos pfc",
      "nv show interface swp1 counters qos pfc-stats",
      "nv set qos roce",
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
    + "and the switch. DGX Node A eth0 connects to switch swp1 and DGX Node B\n"
    + "eth0 connects to switch swp2. They suspect the lossless mechanism is not\n"
    + "configured.\n\n"
    + "Your task:\n"
    + "  1. Check NIC counters to see if drops are occurring\n"
    + "  2. Confirm the current RoCE/PFC state on swp1\n"
    + "  3. Enable the RoCE lossless profile in NVUE\n"
    + "  4. Verify PFC state and PFC pause counters on swp1",
  initialTopology: {
    pfcEnabled: false,
    ecnEnabled: false,
    congestionDetected: true,
    bufferUtilPct: 94,
  },
  requiredConditions: ["nicDropsChecked", "pfcMissing", "pfcEnabled", "pfcVerified"],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start on the DGX host with ethtool counters, then inspect swp1 QoS state from NVUE on the switch.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "Use 'ethtool -S eth0' on the DGX and 'nv show interface swp1 qos pfc' on the Cumulus switch.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "After confirming PFC is disabled on swp1, run 'nv set qos roce', 'nv config apply', then verify with 'nv show interface swp1 qos pfc'.",
    },
  ],
};
