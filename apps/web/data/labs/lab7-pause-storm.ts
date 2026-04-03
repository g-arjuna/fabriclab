import type { LabConfig, LabDevice } from "@/types";

export const lab7Devices: LabDevice[] = [
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
      "nv show interface swp1 counters qos pfc-stats",
      "nv show qos congestion-control default-global traffic-class 3",
      "nv set qos congestion-control default-global traffic-class 3 ecn enabled",
      "nv config apply",
      "help",
      "hint",
    ],
    position: { x: 160, y: 200 },
    status: "up",
  },
];

export const lab7: LabConfig = {
  id: "lab7-pause-storm",
  title: "Uncover the hidden pause storm",
  difficulty: "intermediate",
  expectedMinutes: 15,
  scenario:
    "Training throughput on the DGX Node A <-> swp1 RoCEv2 path is down about 35%.\n"
    + "The switch looks almost clean: no drops and only a small number of PFC\n"
    + "pause frames on swp1. The physical link is up and no hardware alarms are\n"
    + "present.\n\n"
    + "Your task:\n"
    + "  1. Check swp1's PFC counters on the Cumulus leaf\n"
    + "  2. Cross-check the DGX NIC-side pause counters on eth0\n"
    + "  3. Explain why those two views can differ by orders of magnitude\n"
    + "  4. Check whether ECN marking is enabled for RoCE traffic class 3\n"
    + "  5. Enable TC3 ECN, apply the config, and verify the pause storm drops",
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: false,
    congestionDetected: false,
    silentCongestion: false,
    pauseStorm: true,
    bufferUtilPct: 89,
  },
  requiredConditions: [
    "switchCountersChecked",
    "nicPauseConfirmed",
    "ecnMissingIdentified",
    "ecnEnabled",
    "ecnVerified",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 90,
      text:
        "Start on the switch with 'nv show interface swp1 counters qos pfc-stats'. If that looks mild, immediately compare it with 'ethtool -S eth0' on the DGX.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 180,
      text:
        "The switch and NIC counters are not counting the same thing. Once you confirm the NIC is receiving a huge number of priority-3 pauses, check TC3 ECN state with 'nv show qos congestion-control default-global traffic-class 3'.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 300,
      text:
        "If TC3 ECN is disabled, stage 'nv set qos congestion-control default-global traffic-class 3 ecn enabled', run 'nv config apply', then verify with the same NVUE show command and 'ethtool -S eth0'.",
    },
  ],
};
