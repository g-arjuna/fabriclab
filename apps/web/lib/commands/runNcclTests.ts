import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

export function runNcclTests(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const transport = (topology as any).ncclTransport ?? "net"
  const fixed = (topology as any).ncclTestsFixed ?? false

  if (transport === "socket" && !fixed) {
    return {
      output: `dgx-node-a:~$ run nccl-tests    ← FabricLab simulator command

Running allreduce_perf on 128 GPUs (16 nodes × 8 GPUs)...

  #    size    time(us)  algbw(GB/s)  busbw(GB/s)  #wrong
   536870912    9814221        0.05          0.10      0
  1073741824   19842441        0.05          0.10      0
  8589934592  159832441        0.05          0.10      0

busbw: 0.10 GB/s   ← CRITICAL: expected ~146 GB/s for 128 GPUs over RoCEv2
NCCL transport: socket (TCP fallback)

Fix: set NCCL_IB_HCA to the correct RDMA device names, then re-run.

In production:
  /opt/nccl-tests/build/all_reduce_perf -b 8G -e 8G -f 2 -g 1 \\
    --iters 10 --warmup_iters 5`,
      conceptId: "rocev2",
      type: "error",
    }
  }

  setCondition("ncclVerified", true)
  markVerified("ncclVerified")

  return {
    output: `dgx-node-a:~$ run nccl-tests    ← FabricLab simulator command

Running allreduce_perf on 128 GPUs (16 nodes × 8 GPUs)...

[0] NCCL INFO transport selected: NET
[0] NCCL INFO Using 8 channels, Double Binary Tree

  #    size       time(us)  algbw(GB/s)  busbw(GB/s)  #wrong
   134217728       4891.2        27.4         51.4      0
   536870912       9814.2        54.7        102.6      0
  1073741824      17234.8        62.3        116.8      0
  8589934592     109842.1        78.2        146.6      0   ← target

busbw: 146.6 GB/s at 8 GB tensor size
Expected range for 128 GPUs / 16 nodes: 120–160 GB/s ✓
#wrong: 0 ✓  No data corruption detected.
NCCL transport: NET (RDMA active on mlx5_0 through mlx5_7)

In production:
  /opt/nccl-tests/build/all_reduce_perf -b 128M -e 8G -f 2 -g 1 \\
    --iters 20 --warmup_iters 5 2>&1 | tail -10`,
    conceptId: "rocev2",
    type: "success",
  }
}
