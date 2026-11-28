import type { LabConfig, LabDevice } from "@/types";

const leafCommands = [
  "nv show interface swp5 link",
  "nv show interface swp5 link flap-protection",
  "nv show interface status",
  "help",
  "hint",
];

export const lab0Devices: LabDevice[] = [
  {
    id: "ufm-server",
    type: "ufm-server",
    label: "[SIM ONLY] Fabric inventory server",
    sublabel: "RoCE rail topology and rail mapping",
    prompt: "fabric-inventory $",
    osLabel: "NetQ-style inventory (simulated)",
    allowedCommands: ["show rail topology", "help", "hint"],
    position: { x: 570, y: 50 },
    status: "up",
  },
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "mlx5_0-7 | 8x 400G",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: [
      "ibstat",
      "rdma link show",
      "ethtool -S eth0",
      "ethtool -S eth3",
      "help",
      "hint",
    ],
    position: { x: 240, y: 30 },
    status: "up",
  },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `leaf-rail${index}`,
    type: "leaf-switch" as const,
    label: `Leaf Switch Rail ${index}`,
    sublabel: `SN5600 | Rail ${index}`,
    prompt: `cumulus@leaf-rail${index}:~$`,
    osLabel: "Cumulus Linux 5.x",
    allowedCommands: leafCommands,
    position: { x: 30 + index * 68, y: 220 },
    status: index === 3 ? ("error-disabled" as const) : ("up" as const),
    railId: index,
  })),
];

function rail(id: number, failed = false) {
  const suffix = id.toString(16).padStart(2, "0");
  return {
    id,
    nicName: `mlx5_${id}`,
    netdevName: `eth${id}`,
    leafId: `leaf-rail${id}`,
    // Node A occupies server-port position five on every rail leaf. The rail
    // changes the leaf identity; it must not change the node's downlink number.
    leafInterface: "swp5",
    adminState: "up" as const,
    nicState: failed ? ("down" as const) : ("up" as const),
    carrierState: failed ? ("down" as const) : ("up" as const),
    rdmaPortState: failed ? ("down" as const) : ("active" as const),
    switchPort: failed ? ("error-disabled" as const) : ("up" as const),
    switchAdminState: "up" as const,
    switchCarrierState: failed ? ("down" as const) : ("up" as const),
    protodownReason: failed ? ("linkflap" as const) : null,
    speedGbps: 400,
    guid: `0x506b4b0300a1b2${suffix}`,
    portGuid: `0x506b4b0300a1c2${suffix}`,
  };
}

export const lab0: LabConfig = {
  id: "lab0-failed-rail",
  title: "Identify the failed rail",
  difficulty: "beginner",
  expectedMinutes: 12,
  scenario: `A 16-node DGX H100 cluster is running distributed training across all 128 GPUs. The synthetic training workload has stalled and its launcher reports a communication-group timeout. That application symptom is the starting observation; it is not mathematically derived from a link-count percentage.

Fabric inventory reports that one 400G compute-rail attachment on DGX Node A has lost connectivity. Before the fault, that node had eight nominal 400G compute attachments (3.2 Tb/s of installed one-direction endpoint link capacity). With seven available it has 2.8 Tb/s, a 12.5% reduction in that node's installed compute-link capacity. Across all 128 node-facing compute attachments in the cluster, one failed attachment is 1/128 of installed endpoint link capacity. Neither percentage predicts collective throughput or application completion by itself.

The other nodes can have healthy physical links while still being affected if they participate in the same stalled communication group. NCCL topology, algorithm selection, timeout handling, and the launcher determine the application-wide consequence.

Cluster topology:
  16 DGX nodes x 8 GPUs = 128 GPUs
  8 leaf switches (one per GPU rail, Rail 0-7)
  Lab switch assumption: each SN5600 uses 32 non-breakout cages configured as 400G interfaces:
  16 active DGX downlinks + 16 active spine uplinks; the remaining 32 physical cages are unpopulated expansion capacity.
  swp names are a consistent lab abstraction. Node A is wired to server-port position swp5 on every rail leaf.

Your task:
  1. Identify which rail failed and map it to the switch port in the fabric inventory
  2. Inspect the DGX-side RDMA port state and the corresponding NIC statistics
  3. Inspect the corresponding Cumulus leaf interface
  4. Identify the switch-side protection mechanism and distinguish administrative, carrier, RDMA, forwarding, and application state`,
  initialTopology: {
    nic: { name: "eth0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    bufferUtilPct: 15,
    rails: [
      rail(0), rail(1), rail(2), rail(3, true),
      rail(4), rail(5), rail(6), rail(7),
    ],
  },
  requiredConditions: ["railIdentified", "rdmaEvidence", "nicEvidence", "faultIsolated"],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 120,
      text: "Start on the fabric inventory server. Run 'show rail topology' to identify the failed rail and map Node A's rail attachment to the correct leaf and swp interface.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "After the inventory identifies Rail 3, inspect both host-side evidence categories on the DGX: 'rdma link show' for RDMA port state and 'ethtool -S eth3' for NIC driver evidence. Then open leaf-rail3 and inspect swp5 with NVUE.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "Solution sequence: fabric inventory 'show rail topology' (Rail 3 -> leaf-rail3 swp5 -> mlx5_3/eth3), DGX 'rdma link show' and 'ethtool -S eth3', then leaf-rail3 'nv show interface swp5 link'. In this documented protodown/linkflap scenario, administrative state remains up while carrier and operational forwarding state are down. The host administrative flag can remain up even though carrier is lost.",
    },
  ],
};
