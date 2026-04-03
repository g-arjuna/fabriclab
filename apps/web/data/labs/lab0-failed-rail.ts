import type { LabConfig, LabDevice } from "@/types";

export const lab0Devices: LabDevice[] = [
  {
    id: "ufm-server",
    type: "ufm-server",
    label: "UFM Server",
    sublabel: "Fabric topology and rail mapping",
    prompt: "ufm-server $",
    osLabel: "UFM Enterprise",
    allowedCommands: ["show ufm topology", "help", "hint"],
    position: { x: 570, y: 50 },
    status: "up",
  },
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "mlx5_0-7 | 8x 400G",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: [
      "ibstat",
      "rdma link show",
      "ethtool -S eth0",
      "ethtool -S eth3",
      "help",
      "hint",
    ],
    position: { x: 240, y: 30 },
    status: "up",
  },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `leaf-rail${index}`,
    type: "leaf-switch" as const,
    label: `Leaf Switch Rail ${index}`,
    sublabel: `SN5600 | Rail ${index}`,
    prompt: `cumulus@leaf-rail${index}:~$`,
    osLabel: "Cumulus Linux",
    allowedCommands: [
      `nv show interface swp${index + 2} link`,
      "help",
      "hint",
    ],
    position: { x: 30 + index * 68, y: 220 },
    status: index === 3 ? ("error-disabled" as const) : ("up" as const),
    railId: index,
  })),
];

export const lab0: LabConfig = {
  id: "lab0-failed-rail",
  title: "Identify the failed rail",
  difficulty: "beginner",
  expectedMinutes: 12,
  scenario: `A 16-node DGX H100 cluster is running distributed
training across all 128 GPUs. Throughput has dropped
to 87.5% of baseline - exactly 7/8 of expected.

GPU 3 (mlx5_3 / eth3) on DGX Node A is no longer contributing
to AllReduce. The other 15 nodes are unaffected.

Cluster topology:
  16 DGX nodes x 8 GPUs = 128 GPUs
  8 leaf switches (one per GPU rail, Rail 0-7)
  Each leaf (SN5600 64-port): 16 active DGX downlinks
    + 16 active spine uplinks (32 ports unused -
    cluster is sized for 16 nodes today)

Your task:
  1. Identify which rail failed and map Rail 3 to the switch port in UFM
  2. Confirm DGX-side RDMA and NIC state with native host commands
  3. Determine NIC side vs switch side fault
  4. Find the exact fault type on the Cumulus leaf interface`,
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    bufferUtilPct: 15,
    rails: [
      { id: 0, nicName: "mlx5_0", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b200" },
      { id: 1, nicName: "mlx5_1", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b201" },
      { id: 2, nicName: "mlx5_2", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b202" },
      { id: 3, nicName: "mlx5_3", nicState: "up", switchPort: "error-disabled", guid: "0x506b4b0300a1b203" },
      { id: 4, nicName: "mlx5_4", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b204" },
      { id: 5, nicName: "mlx5_5", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b205" },
      { id: 6, nicName: "mlx5_6", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b206" },
      { id: 7, nicName: "mlx5_7", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b207" },
    ],
  },
  requiredConditions: ["railIdentified", "linkConfirmed", "faultIsolated"],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text:
        "Start on the UFM server. Run 'show ufm topology' to identify the failed rail and map Rail 3 to the leaf-side swp interface and the DGX-side mlx5/eth interface.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text:
        "After UFM identifies Rail 3, run 'rdma link show' and 'ethtool -S eth3' on the DGX host. Then open the leaf-rail3 terminal and inspect swp5 with NVUE.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text:
        "Sequence: UFM 'show ufm topology' (Rail 3 -> leaf-rail3 swp5 -> mlx5_3/eth3), DGX 'rdma link show' and 'ethtool -S eth3' (NIC still reports active), then leaf-rail3 'nv show interface status' and 'nv show interface swp5 link'. The NIC and switch disagree; the switch-side interface is in protodown due to linkflap.",
    },
  ],
};
