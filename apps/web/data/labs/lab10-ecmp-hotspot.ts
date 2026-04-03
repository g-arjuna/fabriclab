import type { LabConfig, LabDevice } from "@/types"

export const lab10Devices: LabDevice[] = [
  {
    id: "workstation",
    type: "ufm-server",
    label: "NetQ Workstation",
    sublabel: "NetQ CLI - ECMP health checks",
    prompt: "engineer@workstation:~$",
    osLabel: "Ubuntu Workstation + NetQ CLI",
    allowedCommands: ["netq show ecmp", "help", "hint"],
    position: { x: 120, y: 60 },
    status: "up",
  },
  {
    id: "leaf1",
    type: "leaf-switch",
    label: "Leaf 1",
    sublabel: "Ingress leaf - ECMP consumer",
    prompt: "cumulus@leaf1:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show vrf default router bgp address-family ipv4-unicast route 10.4.0.0/16",
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
    sublabel: "Reduced capacity - one Leaf4 uplink down",
    prompt: "cumulus@spineB:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show interface swp54 link stats",
      "nv show router policy route-map UCMP-LEAF4 rule 10 set",
      "nv set router policy route-map UCMP-LEAF4 rule 10 set ext-community-bw multipaths",
      "nv config apply",
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
    + "and configure the BGP Link Bandwidth extended community policy so SpineB's reduced "
    + "capacity is reflected in downstream UCMP route weights.",
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
  hints: [
    {
      level: 1,
      text: "Start with the NetQ ECMP summary on the workstation, then compare it with SpineB's swp54 counters.",
      triggerAfterMistakes: 1,
      triggerAfterSeconds: 30,
    },
    {
      level: 2,
      text: "Leaf1's BGP route to 10.4.0.0/16 should tell you whether the SpineB next hop still has equal weight.",
      triggerAfterMistakes: 2,
      triggerAfterSeconds: 90,
    },
    {
      level: 3,
      text: "On SpineB, inspect the UCMP route-map set clause, stage ext-community-bw multipaths, apply it, then re-check the Leaf1 route.",
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 180,
    },
  ],
}
