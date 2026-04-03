import type { LabConfig, LabDevice } from "@/types"

export const lab11Devices: LabDevice[] = [
  {
    id: "workstation",
    type: "ufm-server",
    label: "NetQ Workstation",
    sublabel: "NetQ CLI - BGP health checks",
    prompt: "engineer@workstation:~$",
    osLabel: "Ubuntu Workstation + NetQ CLI",
    allowedCommands: ["netq check bgp", "help", "hint"],
    position: { x: 110, y: 60 },
    status: "up",
  },
  {
    id: "leaf1",
    type: "leaf-switch",
    label: "Leaf 1",
    sublabel: "Ingress leaf - receives both paths",
    prompt: "cumulus@leaf1:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show vrf default router bgp address-family ipv4-unicast route 10.2.0.0/16",
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
    sublabel: "Leaf2-facing link down - wrong ASN",
    prompt: "cumulus@spineA:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show vrf default router bgp address-family ipv4-unicast route 10.2.0.0/16",
      "nv show vrf default router bgp neighbor 10.0.0.2",
      "nv set router bgp autonomous-system 65000",
      "nv config apply",
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
    prompt: "cumulus@spineB:~$",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "nv show interface swp4 link stats",
      "nv set router bgp autonomous-system 65000",
      "nv config apply",
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
    + "find the root cause in the BGP routing design, and implement the correct fix. "
    + "This lab intentionally includes a non-standard SpineA-SpineB eBGP peering so you can observe "
    + "how mismatched spine ASNs let a failed-spine detour route survive.",
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
  hints: [
    {
      level: 1,
      text: "Use NetQ first to scope the BGP failure, then inspect Leaf1's route to 10.2.0.0/16.",
      triggerAfterMistakes: 1,
      triggerAfterSeconds: 30,
    },
    {
      level: 2,
      text: "On SpineA, inspect the same prefix and the SpineA-SpineB neighbor. The detour exists because the two spines are in different ASNs.",
      triggerAfterMistakes: 2,
      triggerAfterSeconds: 90,
    },
    {
      level: 3,
      text: "Stage ASN 65000 on both spines with nv set router bgp autonomous-system 65000, apply it on each spine, then re-check Leaf1's route.",
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 180,
    },
  ],
}
