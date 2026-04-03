import type { LabConfig, LabDevice } from "@/types"

export const lab14Devices: LabDevice[] = [
  {
    id: "rackb-node01",
    type: "dgx",
    label: "Rack B Node",
    sublabel: "Checkpoint source - path verification",
    prompt: "rackb-node01:~$",
    osLabel: "Ubuntu 22.04",
    allowedCommands: [
      "traceroute 10.100.0.1",
      "traceroute 10.20.0.11",
      "ping -6 2001:db8:0:spine02::1 -c 3",
      "ping -6 2001:db8:0:spine03::1 -c 3",
      "ping -6 2001:db8:0:lsrv::100 -c 3",
      "help",
      "hint",
    ],
    position: { x: 70, y: 160 },
    status: "up",
  },
  {
    id: "leaf-rackb",
    type: "leaf-switch",
    label: "Leaf RackB",
    sublabel: "SR-TE headend - colors storage BGP routes",
    prompt: "leaf-rackb#",
    osLabel: "Cumulus Linux 5.x / FRR",
    allowedCommands: [
      "show isis neighbor",
      "show isis segment-routing srv6 node",
      "show segment-routing srv6 sid",
      "show sr-te segment-list",
      "show sr-te policy",
      "show route-map SET_SR_POLICY",
      "sudo vtysh -f /etc/frr/checkpoint-segment-list.conf",
      "sudo vtysh -f /etc/frr/checkpoint-srte-policy.conf",
      "sudo vtysh -f /etc/frr/checkpoint-color-route-map.conf",
      "show mtu",
      "help",
      "hint",
    ],
    position: { x: 230, y: 160 },
    status: "up",
  },
  {
    id: "spine-01",
    type: "spine-switch",
    label: "Spine-01",
    sublabel: "NCCL collective spine - should stay free of checkpoint SRH",
    prompt: "spine-01#",
    osLabel: "Cumulus Linux 5.x / FRR",
    allowedCommands: [
      "show interface counters",
      "show segment-routing srv6 sid",
      "sudo tcpdump -ni swp1 'ip6 and ip6[6] == 43' -c 20",
      "help",
      "hint",
    ],
    position: { x: 390, y: 80 },
    status: "up",
  },
  {
    id: "spine-02",
    type: "spine-switch",
    label: "Spine-02",
    sublabel: "SR-TE checkpoint waypoint 1",
    prompt: "spine-02#",
    osLabel: "Cumulus Linux 5.x / FRR",
    allowedCommands: [
      "show interface counters",
      "show segment-routing srv6 sid",
      "sudo tcpdump -ni swp1 'ip6 and ip6[6] == 43' -c 20",
      "help",
      "hint",
    ],
    position: { x: 390, y: 200 },
    status: "up",
  },
  {
    id: "leaf-storage",
    type: "leaf-switch",
    label: "Leaf Storage",
    sublabel: "End.DT4 decap - VRF STORAGE",
    prompt: "leaf-storage#",
    osLabel: "Cumulus Linux 5.x / FRR",
    allowedCommands: [
      "show segment-routing srv6 sid",
      "show ip route vrf STORAGE",
      "help",
      "hint",
    ],
    position: { x: 560, y: 160 },
    status: "up",
  },
]

export const lab14: LabConfig = {
  id: "lab14-srv6-te-path-steering",
  title: "SRv6 TE path steering: separate checkpoint from NCCL",
  difficulty: "advanced",
  expectedMinutes: 40,
  scenario:
    "Two racks share a four-spine L3 fabric. Rack A runs NCCL All-Reduce toward 10.20.0.0/24, "
    + "while Rack B writes model checkpoints to the storage prefix 10.100.0.0/24. "
    + "Checkpoint flows are currently hashing through Spine-01, which NCCL also uses, and "
    + "training latency has increased by 35%. IS-IS SRv6 locators are already advertised, "
    + "but no SR-TE policy is installed at the Rack B headend.\n\n"
    + "Your task:\n"
    + "  1. Verify IS-IS SRv6 adjacency and SID reachability\n"
    + "  2. Configure segment-list CHECKPOINT-PATH: spine-02 -> spine-03 -> leaf-storage End.DT4\n"
    + "  3. Define SR-TE policy color 100, endpoint leaf-storage\n"
    + "  4. Attach a BGP route-map that sets SR-TE color 100 on the storage prefix route\n"
    + "  5. Verify traceroute to 10.100.0.1 follows spine-02 then spine-03\n"
    + "  6. Confirm Spine-01 receives zero checkpoint SRH packets while 10.20.0.11 still uses normal ECMP",
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: true,
    silentCongestion: false,
    bufferUtilPct: 78,
    srtePolicyActive: false,
    segmentListConfigured: false,
    routeMapApplied: false,
    isisAdjVerified: false,
  },
  requiredConditions: [
    "isisAdjVerified",
    "segmentListConfigured",
    "srtePolicyActive",
    "routeMapApplied",
    "tracerouteVerified",
    "spine01Clean",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start on leaf-rackb with 'show isis neighbor' and 'show isis segment-routing srv6 node', then ping the three SIDs from rackb-node01.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "Load the segment-list, SR-TE policy, and BGP color route-map snippets with the three 'sudo vtysh -f ...' commands on leaf-rackb.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 400,
      text: "After the route-map is active, run 'traceroute 10.100.0.1' from rackb-node01 and 'sudo tcpdump -ni swp1 'ip6 and ip6[6] == 43' -c 20' on spine-01.",
    },
  ],
}
