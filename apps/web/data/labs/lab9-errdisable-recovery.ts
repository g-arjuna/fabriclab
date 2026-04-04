import type { LabConfig, LabDevice } from "@/types";

export const lab9Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "mlx5_0-7 - 8x 400G RoCEv2",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: [
      "ibstat",
      "rdma link show",
      "ethtool -S eth2",
      "help",
      "hint",
    ],
    position: { x: 120, y: 40 },
    status: "up",
  },
  {
    id: "leaf-rail2",
    type: "leaf-switch",
    label: "Leaf Switch Rail 2",
    sublabel: "SN5600 - Cumulus Linux - swp3 to DGX Node A eth2",
    prompt: "cumulus@leaf-rail2:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show interface swp3 link",
      "sudo ip link set swp3 protodown_reason linkflap off",
      "sudo ip link set swp3 protodown off",
      "help",
      "hint",
    ],
    position: { x: 360, y: 220 },
    status: "error-disabled",
    railId: 2,
  },
  {
    id: "ufm-server",
    type: "ufm-server",
    label: "UFM Server",
    sublabel: "Topology mapping + site runbook",
    prompt: "ufm-server:~$",
    osLabel: "Ubuntu + UFM Enterprise",
    allowedCommands: [
      "show ufm topology",
      "help",
      "hint",
    ],
    position: { x: 600, y: 80 },
    status: "up",
  },
];

export const lab9: LabConfig = {
  id: "lab9-errdisable-recovery",
  title: "Recover the err-disabled rail",
  difficulty: "intermediate",
  expectedMinutes: 20,
  scenario:
    "A 16-node DGX H100 cluster is running distributed training and AllReduce\n"
    + "throughput has dropped to 87.5% of baseline. GPU 2 on DGX Node A is\n"
    + "contributing almost no network bandwidth, but the host still reports its\n"
    + "mlx5_2 port as Active.\n\n"
    + "Your task:\n"
    + "  1. Use the UFM mapping view to identify the Rail 2 leaf port for mlx5_2\n"
    + "  2. Compare the DGX host view against the Cumulus switch port state\n"
    + "  3. Confirm the switch port is protodown/linkflap protected\n"
    + "  4. Run the site-local optic replacement runbook\n"
    + "  5. Clear protodown on swp3 and verify Rail 2 is healthy again",
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 14,
    rails: [
      { id: 0, nicName: "mlx5_0", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b200" },
      { id: 1, nicName: "mlx5_1", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b201" },
      { id: 2, nicName: "mlx5_2", nicState: "up", switchPort: "error-disabled", guid: "0x506b4b0300a1b202" },
      { id: 3, nicName: "mlx5_3", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b203" },
      { id: 4, nicName: "mlx5_4", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b204" },
      { id: 5, nicName: "mlx5_5", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b205" },
      { id: 6, nicName: "mlx5_6", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b206" },
      { id: 7, nicName: "mlx5_7", nicState: "up", switchPort: "up", guid: "0x506b4b0300a1b207" },
    ],
    opticReplaced: false,
  },
  requiredConditions: [
    "railIdentified",
    "nicActiveTrapSeen",
    "errDisabledConfirmed",
    "opticReplaced",
    "portReenabled",
    "railVerified",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 100,
      text:
        "Start on the UFM server with 'show ufm topology' to map Rail 2 to leaf-rail2 swp3 and mlx5_2 / eth2 on DGX Node A. That summary is tutorial scaffolding, not literal UFM CLI output.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text:
        "Run 'ibstat' and 'rdma link show' on the DGX, then inspect 'nv show interface swp3 link' on leaf-rail2. The trap is that the NIC can still report Active while the switch has swp3 in protodown.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 400,
      text:
        "Use the Physical Infra panel to replace the OSFP on leaf-rail2 swp3, then clear linkflap protodown with 'sudo ip link set swp3 protodown_reason linkflap off' and 'sudo ip link set swp3 protodown off'. Verify with 'nv show interface swp3 link' and 'rdma link show'.",
    },
  ],
};
