import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

export function ncclDebugTransport(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const transport = (topology as any).ncclTransport ?? "net"
  const hca = (topology as any).ncclIbHca ?? "mlx5_0:1,mlx5_1:1,..."

  setCondition("transportChecked", true)
  markVerified("transportChecked")

  if (transport === "socket") {
    return {
      output: `dgx-node-a:~$ nccl-debug --transport    ← FabricLab simulator command

[0] NCCL INFO Channel 00: transport selected: socket
[0] NCCL INFO No IB devices found matching NCCL_IB_HCA=${hca}
[0] NCCL INFO Falling back to socket transport (TCP)
[0] NCCL WARN Socket transport active — busbw will be ~2-4 GB/s
[0] NCCL INFO If you expected RDMA transport, check NCCL_IB_HCA
[0] NCCL INFO Available RDMA devices: run 'rdma link show' to check

In production:
  NCCL_DEBUG=INFO torchrun --nproc_per_node=8 train.py 2>&1 | grep "NCCL INFO.*transport"
  Or: NCCL_DEBUG=TRACE torchrun ... 2>&1 | grep "Using.*transport"`,
      conceptId: "rocev2",
      type: "info",
    }
  }

  return {
    output: `dgx-node-a:~$ nccl-debug --transport    ← FabricLab simulator command

[0] NCCL INFO Channel 00: transport selected: NET
[0] NCCL INFO Using 8 channels, Double Binary Tree
[0] NCCL INFO 128 GPUs connected, all paths verified
[0] NCCL INFO RDMA transport active on mlx5_0:1 through mlx5_7:1

In production:
  NCCL_DEBUG=INFO torchrun --nproc_per_node=8 train.py 2>&1 | grep "NCCL INFO.*transport"`,
    conceptId: "rocev2",
    type: "success",
  }
}
