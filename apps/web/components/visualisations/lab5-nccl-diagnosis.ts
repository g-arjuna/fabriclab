// ═══════════════════════════════════════════════════════════════
// FILE: apps/web/data/labs/lab5-nccl-diagnosis.ts
// ═══════════════════════════════════════════════════════════════

import type { LabConfig, LabDevice } from "@/types";

export const lab5Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "16-node cluster · all links ACTIVE",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: [
      "rdma link show",
      "ibstat",
      "ethtool -S eth0",
      "show nccl env",
      "nccl-debug --transport",
      "run nccl-tests",
      "set nccl ib-hca",
      "set nccl socket-ifname",
      "help",
      "hint",
    ],
    position: { x: 80, y: 60 },
    status: "up",
  },
  {
    id: "leaf-sw",
    type: "leaf-switch",
    label: "Leaf Switch (Rail 0)",
    sublabel: "SN5600 · Cumulus Linux",
    prompt: "leaf-sw #",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show interface counters",
      "show dcb pfc",
      "show dcb ets",
      "show roce",
      "help",
      "hint",
    ],
    position: { x: 240, y: 200 },
    status: "up",
  },
  {
    id: "spine-sw",
    type: "spine-switch",
    label: "Spine Switch",
    sublabel: "SN5600 · Cumulus Linux",
    prompt: "spine-sw #",
    osLabel: "Cumulus Linux",
    allowedCommands: [
      "show interface counters",
      "help",
      "hint",
    ],
    position: { x: 240, y: 360 },
    status: "up",
  },
];

export const lab5: LabConfig = {
  id: "lab5-nccl-diagnosis",
  title: "Diagnose NCCL transport fallback",
  difficulty: "intermediate",
  expectedMinutes: 20,
  scenario:
    "A 16-node DGX H100 cluster has just been handed over.\n" +
    "All hardware checks pass. All 8 rails show ACTIVE.\n" +
    "PFC and ECN are correctly configured.\n\n" +
    "But nccl-tests shows 3.1 GB/s busbw.\n" +
    "Expected: ~380 GB/s for this cluster size.\n\n" +
    "The ML team is blocked. Training has not started.\n\n" +
    "Your task:\n" +
    "  1. Check which transport NCCL selected\n" +
    "  2. Identify which RDMA devices exist on the DGX\n" +
    "  3. Find the misconfigured NCCL env variable\n" +
    "  4. Fix both env variables\n" +
    "  5. Re-run nccl-tests and verify busbw recovers",
  initialTopology: {
    nic: { name: "mlx5_0", speed: 400, state: "up" },
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 12,
    // NCCL-specific state
    ncclTransport: "socket",
    ncclIbHca: "mlx5_bond_0",       // WRONG — IB bonded name on RoCEv2 system
    ncclSocketIfname: "eth0",         // WRONG — should be management NIC eno1
    ncclTestsBusbw: 3.1,              // GB/s — TCP socket fallback speed
    ncclTestsFixed: false,
  },
  requiredConditions: [
    "transportChecked",
    "rdmaDevicesChecked",
    "envVarIdentified",
    "hcaFixed",
    "socketFixed",
    "ncclVerified",
  ],
  hints: [
    {
      level: 1,
      triggerAfterMistakes: 3,
      triggerAfterSeconds: 90,
      text: "Start by checking what transport NCCL selected. Run: nccl-debug --transport on the DGX terminal.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 180,
      text: "After nccl-debug shows 'socket' transport, check what RDMA devices actually exist: rdma link show. Then check what NCCL_IB_HCA is set to: show nccl env.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 300,
      text: "Sequence: nccl-debug --transport → rdma link show → show nccl env (spot mlx5_bond_0 is wrong) → set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7 → set nccl socket-ifname eno1 → run nccl-tests",
    },
  ],
};
