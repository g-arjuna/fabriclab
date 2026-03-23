import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

export function runNcclTests(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const transport = (topology as any).ncclTransport ?? "net"
  const fixed = (topology as any).ncclTestsFixed ?? false

  if (transport === "socket" && !fixed) {
    return {
      output: `Running allreduce_perf on 128 GPUs (16 nodes Ã— 8 GPUs)...

  #    size    time(us)  algbw(GB/s)  busbw(GB/s)  #wrong
   536870912    9814221        0.05          0.10      0
  1073741824   19842441        0.05          0.10      0
  8589934592  159832441        0.05          0.10      0

busbw: 0.10 GB/s   â† CRITICAL: expected ~146 GB/s busbw for 16 nodes
NCCL transport: socket (TCP fallback)
Fix NCCL_IB_HCA to use RDMA transport.`,
      conceptId: "rocev2",
      type: "error",
    }
  }

  setCondition("ncclVerified", true)
  markVerified("ncclVerified")

  return {
    output: `Running allreduce_perf on 128 GPUs (16 nodes Ã— 8 GPUs)...

[0] NCCL INFO transport selected: NET
[0] NCCL INFO Using 8 channels, Double Binary Tree

  #    size       time(us)  algbw(GB/s)  busbw(GB/s)  #wrong
   134217728       4891.2        27.4         51.4      0
   536870912       9814.2        54.7        102.6      0
  1073741824      17234.8        62.3        116.8      0
  8589934592     109842.1        78.2        146.6      0

busbw: 146.6 GB/s at 8GB tensor size
(Expected range for 128 GPUs / 16 nodes: 120-160 GB/s) âœ“
#wrong: 0 âœ“  No data corruption detected.
NCCL transport: NET (RDMA active on mlx5_0 through mlx5_7)`,
    conceptId: "rocev2",
    type: "success",
  }
}
