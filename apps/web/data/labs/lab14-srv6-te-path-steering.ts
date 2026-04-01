import type { LabConfig, LabDevice } from "@/types"

export const lab14Devices: LabDevice[] = [
  {
    id: "rackb-node01",
    type: "dgx",
    label: "Rack B Node",
    sublabel: "checkpoint source - traceroute6 verification",
    prompt: "rackb-node01:~$",
    osLabel: "Ubuntu 22.04",
    allowedCommands: [
      "show topology",
      "traceroute6 checkpoint dscp10",
      "traceroute6 nccl dscp26",
      "ping6 spine02 sid",
      "ping6 spine03 sid",
      "ping6 storage sid",
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
    sublabel: "headend - SR-TE policy applied here",
    prompt: "leaf-rackB#",
    osLabel: "Cumulus Linux 5.x / FRR",
    allowedCommands: [
      "show isis neighbor",
      "show isis srv6 node",
      "show segment-routing srv6 sid",
      "show sr-te segment-list",
      "show sr-te policy",
      "show ip policy",
      "show route-map STEER-CHECKPOINT",
      "configure segment-list",
      "configure sr-te policy",
      "configure route-map dscp10",
      "apply route-map swp1-4",
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
    sublabel: "NCCL collective spine - watch for checkpoint SRH",
    prompt: "spine-01#",
    osLabel: "Cumulus Linux 5.x / FRR",
    allowedCommands: [
      "show interface counters",
      "show srv6 packets",
      "tcpdump srh swp1",
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
      "show srv6 packets",
      "tcpdump srh swp1",
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
    "Two racks share a four-spine fat-tree. Rack A runs NCCL All-Reduce (DSCP 26). "
    + "Rack B runs model checkpoint-to-storage (DSCP 10, 50 GB flows). "
    + "Checkpoint is flooding Spine-01, which NCCL also uses. Training latency "
    + "has increased by 35%. ib_write_bw between Rack A nodes is healthy in isolation, "
    + "but degrades when checkpoint runs at the same time.\n\n"
    + "IS-IS is up. SRv6 locators are pre-assigned. No SR-TE policies exist yet.\n\n"
    + "Your task:\n"
    + "  1. Verify IS-IS SRv6 adjacency and SID reachability\n"
    + "  2. Configure segment-list: spine-02 -> spine-03 -> leaf-storage decap\n"
    + "  3. Define SR-TE policy: color 100, endpoint leaf-storage\n"
    + "  4. Apply DSCP 10 -> SR-TE color 100 route-map on leaf-rackB swp1-4\n"
    + "  5. Verify traceroute6 DSCP 10 transits spine-02 then spine-03\n"
    + "  6. Confirm spine-01 receives zero checkpoint SRH traffic",
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
      text: "Start on leaf-rackB. Run 'show isis neighbor' to confirm IS-IS is up, then 'show isis srv6 node' to see the pre-assigned SIDs for spine-02, spine-03, and leaf-storage.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "Configuration sequence: (1) 'configure segment-list', (2) 'configure sr-te policy', (3) 'configure route-map dscp10', (4) 'apply route-map swp1-4'.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 400,
      text: "After applying the route-map, go to rackb-node01 and run 'traceroute6 checkpoint dscp10'. You should see spine-02 at hop 2 and spine-03 at hop 3. Then switch to spine-01 and run 'tcpdump srh swp1' - it should show zero SRH packets for checkpoint traffic.",
    },
  ],
}
