import type { LabConfig, LabDevice } from "@/types";

export const lab6Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "mlx5_0-7 - 8x 400G RoCEv2",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS (Ubuntu 22.04)",
    allowedCommands: [
      "ibstat",
      "rdma link show",
      "dcgmi dmon -i 5 -c 1 -e 1001,1004,1005",
      "ethtool -S eth5",
      "env | grep '^NCCL_'",
      "help",
      "hint",
    ],
    position: { x: 60, y: 40 },
    status: "up",
  },
  {
    id: "leaf-rail5",
    type: "leaf-switch",
    label: "Leaf Switch Rail 5",
    sublabel: "SN5600 - Cumulus Linux",
    prompt: "cumulus@leaf-rail5:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show interface swp7 link",
      "ethtool -S swp7",
      "nv show interface swp7 counters qos pfc-stats",
      "help",
      "hint",
    ],
    position: { x: 320, y: 220 },
    status: "degraded",
    railId: 5,
  },
  {
    id: "ufm-server",
    type: "ufm-server",
    label: "UFM Server",
    sublabel: "UFM Enterprise REST API + site runbook",
    prompt: "ufm-server:~$",
    osLabel: "Ubuntu + UFM Enterprise",
    allowedCommands: [
      "curl -ks 'https://ufm-server/ufmRest/resources/ports?high_ber_only=true&active=true'",
      "curl -ks 'https://ufm-server/ufmRest/resources/ports?system=leaf-rail5&active=true'",
      "help",
      "hint",
    ],
    position: { x: 560, y: 120 },
    status: "up",
  },
];

export const lab6: LabConfig = {
  id: "lab6-alert-triage",
  title: "Triage a silent fabric degradation",
  difficulty: "advanced",
  expectedMinutes: 25,
  scenario:
    "An ML engineer messages you: 'Training is about 12% slower than yesterday.\n"
    + "No errors in the NCCL logs. GPU utilisation looks normal in the dashboard.'\n\n"
    + "At a quick glance:\n"
    + "  - All 8 rails report Active in ibstat\n"
    + "  - No ports are Down or Disabled in the UFM active-port view\n"
    + "  - PFC is enabled, ECN is enabled\n"
    + "  - No RDMA retransmit counters are incrementing\n\n"
    + "Nothing is obviously broken, but training is measurably slower.\n\n"
    + "Your task:\n"
    + "  1. Use UFM's REST API to find which active port is flagged for high BER\n"
    + "  2. Identify the degrading port pair on both ends of the link\n"
    + "  3. Confirm the GPU-side symptom from DCGM and the NIC counters\n"
    + "  4. Correlate that host view with the leaf-side FEC/PFC counters\n"
    + "  5. Determine the root-cause layer (physical / transport / application)\n"
    + "  6. Use the Physical Infra panel to request the connector reseat",
  initialTopology: {
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 22,
    unevenSpine: false,
  },
  requiredConditions: [
    "ufmPortsChecked",
    "offendingPortIdentified",
    "dcgmCorrelated",
    "timestampsCorrelated",
    "rootCauseLayerIdentified",
    "remediationIssued",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text:
        "Start on the UFM server with `curl -ks 'https://ufm-server/ufmRest/resources/ports?high_ber_only=true&active=true'` and look for the port whose high_ber_severity is not N/A.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 270,
      text:
        "After UFM points at leaf-rail5 swp7, pull the system-scoped port view from UFM, then check `dcgmi dmon -i 5 -c 1 -e 1001,1004,1005` and `ethtool -S eth5` on the DGX node.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 420,
      text:
        "Sequence: UFM high-BER REST query -> UFM leaf-rail5 active-port query -> dcgmi dmon -i 5 -c 1 -e 1001,1004,1005 -> ethtool -S eth5 -> nv show interface swp7 link -> ethtool -S swp7 -> nv show interface swp7 counters qos pfc-stats -> Physical Infra panel: reseat the DAC on leaf-rail5 swp7",
    },
  ],
};
