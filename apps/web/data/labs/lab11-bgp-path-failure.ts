import type { LabConfig, LabDevice } from "@/types"

export const lab11Devices: LabDevice[] = [
  {
    id: "workstation",
    type: "dgx",
    label: "Engineering Workstation",
    sublabel: "Fabric overview · topology checks",
    prompt: "engineer@workstation:~$",
    osLabel: "Ubuntu Workstation",
    allowedCommands: [
      "show topology",
      "help",
      "hint",
    ],
    position: { x: 110, y: 60 },
    status: "up",
  },
  {
    id: "leaf1",
    type: "leaf-switch",
    label: "Leaf 1",
    sublabel: "Ingress leaf · receives both paths",
    prompt: "leaf1#",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show bgp route 10.2.0.0/16",
      "show bgp route 10.2.0.0/16 after",
      "show ip route 10.2.0.0/16",
      "help",
      "hint",
    ],
    position: { x: 300, y: 210 },
    status: "up",
  },
  {
    id: "spineA",
    type: "spine-switch",
    label: "Spine A",
    sublabel: "Failed Leaf2 downlink · wrong ASN",
    prompt: "spineA#",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show bgp route 10.2.0.0/16",
      "show bgp neighbors 10.0.0.2",
      "set bgp local-as 65000",
      "help",
      "hint",
    ],
    position: { x: 500, y: 80 },
    status: "degraded",
  },
  {
    id: "spineB",
    type: "spine-switch",
    label: "Spine B",
    sublabel: "Carrying direct + suboptimal traffic",
    prompt: "spineB#",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show interface counters",
      "set bgp local-as 65000 spineb",
      "help",
      "hint",
    ],
    position: { x: 700, y: 80 },
    status: "degraded",
  },
]

export const lab11: LabConfig = {
  id: "lab11-bgp-path-failure",
  title: "BGP suboptimal routing: spine ASN design",
  difficulty: "advanced",
  expectedMinutes: 24,
  scenario:
    "It is 02:15. An LLM training job on a 256-GPU cluster is experiencing 40% throughput "
    + "degradation and intermittent gradient synchronisation timeouts. The job started 6 hours "
    + "ago and is at 78% completion. Stopping it would waste ~18 hours of compute time. "
    + "A monitoring alert fired 20 minutes ago: 'SpineB -> Leaf2 link utilisation: 89%'. "
    + "Your task: determine why SpineB is overloaded despite no server-side changes, "
    + "find the root cause in the BGP routing design, and implement the correct fix.",
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: true,
    silentCongestion: false,
    bufferUtilPct: 89,
  },
  requiredConditions: [
    "failureScopeChecked",
    "suboptimalPathSeen",
    "sameAsnPrincipleIdentified",
    "spineAAsnUnified",
    "spineBAsnUnified",
    "postFixPathVerified",
  ],
  hints: [],
}
