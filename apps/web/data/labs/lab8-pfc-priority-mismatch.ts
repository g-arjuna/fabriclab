import type { LabConfig, LabDevice } from "@/types";

export const lab8Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "eth0 / mlx5_0 - RoCEv2",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: [
      "ibstat",
      "rdma link show",
      "ethtool -S eth0",
      "help",
      "hint",
    ],
    position: { x: 160, y: 40 },
    status: "up",
  },
  {
    id: "spectrum-sw",
    type: "leaf-switch",
    label: "Spectrum-X SN5600",
    sublabel: "Cumulus Linux - swp1 to DGX Node A eth0",
    prompt: "cumulus@spectrum-sw:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show interface swp1 qos pfc",
      "nv show qos roce",
      "nv set qos roce",
      "nv config apply",
      "help",
      "hint",
    ],
    position: { x: 160, y: 200 },
    status: "up",
  },
];

export const lab8: LabConfig = {
  id: "lab8-pfc-priority-mismatch",
  title: "Fix the PFC priority mismatch",
  difficulty: "intermediate",
  expectedMinutes: 18,
  scenario:
    "RDMA training traffic is dropping packets after a switch config migration.\n"
    + "The team believes PFC is enabled on the DGX-facing downlink, but AllReduce\n"
    + "latency is up 45% and retransmit/drop counters are rising on the host.\n\n"
    + "Your task:\n"
    + "  1. Confirm drops are occurring on the DGX NIC\n"
    + "  2. Inspect swp1's PFC configuration, including the enabled priority\n"
    + "  3. Cross-check that priority against the RoCE DSCP/priority mapping\n"
    + "  4. Apply the RoCE QoS profile and commit the config\n"
    + "  5. Verify PFC is on switch-priority 3 and NIC drops stop",
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: false,
    congestionDetected: true,
    silentCongestion: false,
    pfcPriority: 0,
    bufferUtilPct: 78,
  },
  requiredConditions: [
    "dropsConfirmed",
    "pfcPriorityInspected",
    "mismatchIdentified",
    "pfcPriorityFixed",
    "pfcVerified",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 90,
      text:
        "Run 'ethtool -S eth0' on the DGX first. If tx_discards_phy is non-zero, inspect swp1 PFC state on the switch with 'nv show interface swp1 qos pfc'.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 210,
      text:
        "If swp1 PFC is enabled but on switch-priority 0, compare that with 'nv show qos roce'. RoCE traffic should map to switch-priority 3.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text:
        "Stage 'nv set qos roce', run 'nv config apply', then verify with 'nv show interface swp1 qos pfc' and 'ethtool -S eth0'.",
    },
  ],
};
