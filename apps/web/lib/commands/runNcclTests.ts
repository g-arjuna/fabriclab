import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function runNcclTests(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState();
  const transport = (topology as any).ncclTransport ?? "net";
  const fixed = (topology as any).ncclTestsFixed ?? false;

  setCondition("transportChecked", true);
  markVerified("transportChecked");

  if (transport === "socket" && !fixed) {
    return {
      output: `NCCL_DEBUG=INFO mpirun -np 128 -N 8 /opt/nccl-tests/build/all_reduce_perf -b 8G -e 8G -f 2 -g 1

dgx-node-a:32391:32391 [0] NCCL INFO Bootstrap : Using eth0:10.10.8.11<0>
dgx-node-a:32391:32391 [0] NCCL INFO NET/Socket : Using [0]eth0:10.10.8.11<0>
dgx-node-a:32391:32391 [0] NCCL INFO NET/IB : No device found matching NCCL_IB_HCA=mlx5_bond_0
dgx-node-a:32391:32391 [0] NCCL WARN NET/IB : No transport found, falling back to NET/Socket

# nThread 1 nGpus 1 minBytes 8589934592 maxBytes 8589934592 step: 2(factor)
# Using devices
# Rank  0 Group  0 Pid 32391 on dgx-node-a device  0 [0000:08:00.0] NVIDIA H100-SXM5-80GB
#
#      size         count      type   redop    root     time   algbw   busbw  #wrong
  8589934592   2147483648     float     sum      -1  2.86e+06    3.00    3.00       0

Result: busbw 3.00 GB/s with NET/Socket fallback.`,
      conceptId: "rocev2",
      type: "error",
    };
  }

  setCondition("ncclVerified", true);
  markVerified("ncclVerified");

  return {
    output: `NCCL_DEBUG=INFO mpirun -np 128 -N 8 /opt/nccl-tests/build/all_reduce_perf -b 8G -e 8G -f 2 -g 1

dgx-node-a:32391:32391 [0] NCCL INFO Bootstrap : Using eno1:10.1.0.11<0>
dgx-node-a:32391:32391 [0] NCCL INFO NET/IB : Using [0]mlx5_0:1/RoCE [1]mlx5_1:1/RoCE [2]mlx5_2:1/RoCE [3]mlx5_3:1/RoCE
dgx-node-a:32391:32391 [0] NCCL INFO NET/IB : Using [4]mlx5_4:1/RoCE [5]mlx5_5:1/RoCE [6]mlx5_6:1/RoCE [7]mlx5_7:1/RoCE
dgx-node-a:32391:32391 [0] NCCL INFO 128 coll channels, 128 collnet channels, 0 nvls channels

# nThread 1 nGpus 1 minBytes 8589934592 maxBytes 8589934592 step: 2(factor)
# Using devices
# Rank  0 Group  0 Pid 32391 on dgx-node-a device  0 [0000:08:00.0] NVIDIA H100-SXM5-80GB
#
#      size         count      type   redop    root     time   algbw   busbw  #wrong
  8589934592   2147483648     float     sum      -1  5.86e+04  146.59  146.59       0

Result: busbw 146.59 GB/s with NET/IB over mlx5_0..mlx5_7.`,
    conceptId: "rocev2",
    type: "success",
  };
}
