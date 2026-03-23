import type { LabConfig, LabDevice } from "@/types";

export const lab5Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "8x ConnectX-7 · RoCEv2",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: [
      "ibstat",
      "rdma link show",
      "nccl-debug --transport",
      "show nccl env",
      "run nccl-tests",
      "set nccl ib-hca",
      "set nccl socket-ifname",
      "help",
      "hint",
    ],
    position: { x: 80, y: 40 },
    status: "up",
  },
  {
    id: "leaf-sw",
    type: "leaf-switch",
    label: "Leaf Switch",
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
    position: { x: 240, y: 180 },
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
    position: { x: 240, y: 340 },
    status: "up",
  },
];

export const lab5: LabConfig = {
  id: "lab5-nccl-diagnosis",
  title: "Diagnose NCCL transport fallback",
  difficulty: "intermediate",
  expectedMinutes: 20,
  scenario:
    "A 16-node DGX H100 cluster shows 3 GB/s busbw instead of 380 GB/s.\n" +
    "All hardware checks are green: links up, PFC active, ECN active,\n" +
    "and no drops visible on the fabric.\n\n" +
    "Your task:\n" +
    "  1. Check which transport NCCL selected\n" +
    "  2. Verify RDMA devices are present on the DGX\n" +
    "  3. Identify the misconfigured NCCL environment variables\n" +
    "  4. Correct NCCL_IB_HCA and NCCL_SOCKET_IFNAME\n" +
    "  5. Re-run nccl-tests and verify RDMA busbw is restored",
  initialTopology: {
    pfcEnabled: true,
    ecnEnabled: true,
    congestionDetected: false,
    silentCongestion: false,
    bufferUtilPct: 18,
    unevenSpine: false,
    ncclTransport: "socket",
    ncclIbHca: "mlx5_bond_0",
    ncclSocketIfname: "eth0",
    ncclTestsBusbw: 0.1,
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
      triggerAfterSeconds: 120,
      text: "Start on the DGX node. Check what transport NCCL actually selected before touching any switch settings.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text: "If NCCL says socket transport, compare that with 'rdma link show' and then inspect the NCCL environment variables.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text: "Sequence: nccl-debug --transport → rdma link show → show nccl env → set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7 → set nccl socket-ifname eno1 → run nccl-tests",
    },
  ],
};
