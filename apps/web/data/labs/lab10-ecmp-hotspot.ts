import type { LabConfig, LabDevice } from "@/types"

export const lab10Devices: LabDevice[] = [
  {
    id: "workstation",
    type: "dgx",
    label: "Engineering Workstation",
    sublabel: "Linux shell · control-plane checks",
    prompt: "engineer@workstation:~$",
    osLabel: "Ubuntu Workstation",
    allowedCommands: [
      "show fabric health",
      "help",
      "hint",
    ],
    position: { x: 120, y: 60 },
    status: "up",
  },
  {
    id: "leaf1",
    type: "leaf-switch",
    label: "Leaf 1",
    sublabel: "BGP edge · ECMP consumer",
    prompt: "leaf1#",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show bgp summary",
      "show bgp route 10.4.0.0/16",
      "show bgp route 10.4.0.0/16 detail",
      "show ip route 10.4.0.0/16",
      "help",
      "hint",
    ],
    position: { x: 300, y: 210 },
    status: "up",
  },
  {
    id: "spineB",
    type: "spine-switch",
    label: "Spine B",
    sublabel: "Reduced capacity · one Leaf4 link down",
    prompt: "spineB#",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show interface counters",
      "show interface counters after",
      "show bgp neighbors 10.0.0.1",
      "show bgp link-bandwidth",
      "set bgp link-bandwidth community 1200",
      "help",
      "hint",
    ],
    position: { x: 520, y: 90 },
    status: "degraded",
  },
]

export const lab10: LabConfig = {
  id: "lab10-ecmp-hotspot",
  title: "ECMP hotspot: BGP bandwidth community",
  difficulty: "advanced",
  expectedMinutes: 22,
  scenario:
    "You are the fabric engineer on call at 14:30. A training job on a 128-GPU cluster "
    + "has been reporting intermittent PFC pause storms and degraded AllReduce throughput "
    + "for the past 20 minutes. The job has not failed - it is just running at 60% of "
    + "its normal throughput. A Grafana alert fired: "
    + "'SpineB -> Leaf4 link utilisation 112% of capacity (impossible - check counters)'. "
    + "Your task: identify which spine is overloaded, why weighted ECMP is not active, "
    + "and configure the BGP Link Bandwidth Community to restore balanced forwarding.",
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: true,
    silentCongestion: false,
    bufferUtilPct: 71,
  },
  requiredConditions: [
    "fabricHealthChecked",
    "ecmpImbalanceIdentified",
    "bandwidthCommunityGapConfirmed",
    "bandwidthCommunityConfigured",
    "weightedEcmpVerified",
  ],
  hints: [],
}
