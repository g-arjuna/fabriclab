import type { LabConfig, LabDevice } from "@/types";

export const lab0aDevices: LabDevice[] = [
  {
    id: "ufm-server",
    type: "ufm-server",
    label: "UFM Server",
    sublabel: "Rail and endpoint mapping",
    prompt: "ufm-server $",
    osLabel: "UFM Enterprise",
    allowedCommands: ["show ufm topology", "help", "hint"],
    position: { x: 560, y: 40 },
    status: "up",
  },
  {
    id: "dgx-node-01",
    type: "dgx",
    label: "DGX Node 01",
    sublabel: "mlx5_0/eth0 + mlx5_1/eth1",
    prompt: "dgx-node-01:~$",
    osLabel: "DGX OS",
    allowedCommands: [
      "ibstat",
      "rdma link show",
      "ip link show eth0",
      "ip link show eth1",
      "ethtool -S eth0",
      "ethtool -S eth1",
      "help",
      "hint",
    ],
    position: { x: 280, y: 40 },
    status: "up",
  },
  {
    id: "leaf-rail0",
    type: "leaf-switch",
    label: "Leaf Rail 0",
    sublabel: "SN5600 | DGX-facing swp1",
    prompt: "cumulus@leaf-rail0:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: ["nv show interface swp1 link", "help", "hint"],
    position: { x: 160, y: 220 },
    status: "up",
    railId: 0,
  },
  {
    id: "leaf-rail1",
    type: "leaf-switch",
    label: "Leaf Rail 1",
    sublabel: "SN5600 | DGX-facing swp1",
    prompt: "cumulus@leaf-rail1:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: ["nv show interface swp1 link", "help", "hint"],
    position: { x: 420, y: 220 },
    status: "up",
    railId: 1,
  },
];

export const lab0a: LabConfig = {
  id: "lab0a-fabric-cli-orientation",
  title: "Lab 0A - Fabric CLI orientation",
  difficulty: "beginner",
  expectedMinutes: 12,
  scenario: `You are standing in front of a healthy two-rail RoCE fabric.
This is a calibration lab, not a failure lab.

Objective:
  Build a correct mental map before you troubleshoot incidents.

Topology:
  DGX Node 01 mlx5_0 / eth0 -> Rail 0 -> leaf-rail0 swp1
  DGX Node 01 mlx5_1 / eth1 -> Rail 1 -> leaf-rail1 swp1

Your task:
  1. Start on UFM and read the rail-to-endpoint mapping
  2. On the DGX, inspect the HCA inventory and RDMA-to-netdev mapping
  3. On Linux, verify eth0 and eth1 map to different rails
  4. On each Cumulus leaf, verify swp1 is up and cabled to DGX Node 01
  5. Use 'help' on each tab if you are unsure which command belongs to which platform`,
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 8,
    rails: [
      {
        id: 0,
        nicName: "mlx5_0",
        nicState: "up",
        switchPort: "up",
        guid: "0x506b4b0300a1b200",
      },
      {
        id: 1,
        nicName: "mlx5_1",
        nicState: "up",
        switchPort: "up",
        guid: "0x506b4b0300a1b201",
      },
    ],
  },
  requiredConditions: [
    "ufmRailMapChecked",
    "hcaInventoryChecked",
    "rdmaNetdevMapChecked",
    "eth0StateChecked",
    "eth1StateChecked",
    "leafRail0PortChecked",
    "leafRail1PortChecked",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 2,
      triggerAfterSeconds: 90,
      text:
        "Start on the UFM Server tab and run 'show ufm topology'. Then move to the DGX tab and compare 'ibstat' with 'rdma link show'.",
    },
    {
      level: 2,
      triggerAfterMistakes: 4,
      triggerAfterSeconds: 180,
      text:
        "On DGX Node 01, 'ibstat' gives you the HCA names and port GUIDs, while 'rdma link show' tells you which mlx5 device maps to eth0 or eth1.",
    },
    {
      level: 3,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 300,
      text:
        "Suggested sequence: UFM 'show ufm topology', DGX 'ibstat', 'rdma link show', 'ip link show eth0', 'ip link show eth1', 'ethtool -S eth0', 'ethtool -S eth1', then 'nv show interface swp1 link' on leaf-rail0 and leaf-rail1.",
    },
  ],
};
