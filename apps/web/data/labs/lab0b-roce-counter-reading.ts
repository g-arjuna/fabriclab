import type { LabConfig, LabDevice } from "@/types";

export const lab0bDevices: LabDevice[] = [
  {
    id: "dgx-node-01",
    type: "dgx",
    label: "DGX Node 01",
    sublabel: "mlx5_0 / eth0",
    prompt: "dgx-node-01:~$",
    osLabel: "DGX OS",
    allowedCommands: [
      "ib_write_bw -d mlx5_0 --iters 5000 --size 65536 192.168.100.2",
      "ethtool -S eth0",
      "help",
      "hint",
    ],
    position: { x: 180, y: 60 },
    status: "up",
  },
  {
    id: "leaf-rail0",
    type: "leaf-switch",
    label: "Leaf Rail 0",
    sublabel: "SN5600 | swp1",
    prompt: "cumulus@leaf-rail0:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show interface swp1 qos roce status",
      "nv show interface swp1 counters qos pfc-stats",
      "nv show interface swp1 qos roce counters",
      "help",
      "hint",
    ],
    position: { x: 360, y: 220 },
    status: "up",
  },
];

export const lab0b: LabConfig = {
  id: "lab0b-roce-counter-reading",
  title: "Lab 0B - Read RoCE lossless counters",
  difficulty: "beginner",
  expectedMinutes: 15,
  scenario: `This is a healthy-link counter-reading drill.

Why this precursor lab exists:
  In incident labs, you will see PFC pauses, ECN marks, drops,
  and bandwidth changes under pressure. If those counters are not
  familiar yet, troubleshooting becomes guesswork.

Topology:
  DGX Node 01 mlx5_0 / eth0 -> leaf-rail0 swp1 -> remote peer 192.168.100.2

Known-good expectation for this drill:
  RoCE is enabled on swp1
  PFC is enabled on switch priority 3
  ECN marking is enabled for the RoCE traffic class
  A short ib_write_bw probe should run near line-rate with no packet loss
  Mild ECN marks and a small number of PFC pauses are acceptable under load

Your task:
  1. Check the leaf-side RoCE/PFC/ECN profile on swp1
  2. Run a short ib_write_bw probe from the DGX
  3. Read switch-side PFC counters
  4. Read switch-side RoCE counters and confirm no-buffer-discard is zero
  5. Read host-side NIC counters and confirm ECN marks may be present, but drops stay at zero`,
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 11,
    lab0bTrafficGenerated: false,
  },
  requiredConditions: [
    "roceCounterProfileChecked",
    "roceTrafficProbeRun",
    "switchPfcCountersRead",
    "switchRoceCountersRead",
    "hostNicCountersRead",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 2,
      triggerAfterSeconds: 90,
      text:
        "Start on leaf-rail0 and run 'nv show interface swp1 qos roce status'. Then run the ib_write_bw probe from the DGX and come back to the leaf counters.",
    },
    {
      level: 2,
      triggerAfterMistakes: 4,
      triggerAfterSeconds: 180,
      text:
        "Use the switch counters for fabric behavior and the DGX ethtool counters for host-side confirmation. A healthy lossless flow should show no-buffer-discard = 0 and tx_discards_phy = 0.",
    },
    {
      level: 3,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 300,
      text:
        "Suggested sequence: leaf 'nv show interface swp1 qos roce status', DGX 'ib_write_bw -d mlx5_0 --iters 5000 --size 65536 192.168.100.2', leaf 'nv show interface swp1 counters qos pfc-stats', leaf 'nv show interface swp1 qos roce counters', DGX 'ethtool -S eth0'.",
    },
  ],
};
