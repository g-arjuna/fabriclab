import type { LabConfig, LabDevice } from "@/types";

export const lab5Devices: LabDevice[] = [
  {
    id: "dgx-node-a",
    type: "dgx",
    label: "DGX H100 Node A",
    sublabel: "8x ConnectX-7 - RoCEv2",
    prompt: "dgx-node-a:~$",
    osLabel: "DGX OS",
    allowedCommands: [
      "ibstat",
      "rdma link show",
      "NCCL_DEBUG=INFO mpirun -np 128 -N 8 /opt/nccl-tests/build/all_reduce_perf -b 8G -e 8G -f 2 -g 1",
      "env | grep '^NCCL_'",
      "export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1",
      "export NCCL_SOCKET_IFNAME=eno1",
      "help",
      "hint",
    ],
    position: { x: 160, y: 160 },
    status: "up",
  },
];

export const lab5: LabConfig = {
  id: "lab5-nccl-diagnosis",
  title: "Diagnose NCCL transport fallback",
  difficulty: "intermediate",
  expectedMinutes: 20,
  scenario:
    "A 16-node DGX H100 cluster shows 3 GB/s busbw instead of the expected ~145 GB/s.\n"
    + "Fabric health looks clean: links are up, PFC and ECN are enabled,\n"
    + "and switch counters are not showing drops.\n\n"
    + "Your task:\n"
    + "  1. Check which transport NCCL selected during all_reduce_perf\n"
    + "  2. Verify RDMA devices are present on the DGX\n"
    + "  3. Identify the misconfigured NCCL environment variables\n"
    + "  4. Correct NCCL_IB_HCA and NCCL_SOCKET_IFNAME\n"
    + "  5. Re-run all_reduce_perf and verify RDMA busbw is restored",
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
    ncclTestsBusbw: 3.0,
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
      text:
        "Start on the DGX node. Run the all_reduce_perf command with NCCL_DEBUG=INFO and inspect whether NCCL is using NET/IB or socket transport.",
    },
    {
      level: 2,
      triggerAfterMistakes: 6,
      triggerAfterSeconds: 240,
      text:
        "If the benchmark output shows a socket path, compare that with 'rdma link show' and then inspect the NCCL variables with `env | grep '^NCCL_'`.",
    },
    {
      level: 3,
      triggerAfterMistakes: 10,
      triggerAfterSeconds: 360,
      text:
        "Sequence: NCCL_DEBUG=INFO mpirun -np 128 -N 8 /opt/nccl-tests/build/all_reduce_perf -b 8G -e 8G -f 2 -g 1 -> rdma link show -> env | grep '^NCCL_' -> export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1 -> export NCCL_SOCKET_IFNAME=eno1 -> rerun the all_reduce_perf command.",
    },
  ],
};
