import type { CommandResult } from "@/types"
import { useLabStore } from "@/store/labStore"

export function showNcclEnv(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState()
  const hca = (topology as any).ncclIbHca ?? "mlx5_0:1,..."
  const socketIf = (topology as any).ncclSocketIfname ?? "eno1"

  setCondition("envVarIdentified", true)
  markVerified("envVarIdentified")

  const hcaWrong = hca.includes("bond")
  const socketWrong = socketIf === "eth0"

  return {
    output: `dgx-node-a:~$ show nccl env    ← FabricLab simulator command

NCCL Environment Variables (current process):

  NCCL_IB_HCA:          ${hca}${hcaWrong ? "  ← WARNING: IB bonded name on RoCEv2 system" : "  ✓"}
  NCCL_SOCKET_IFNAME:   ${socketIf}${socketWrong ? "  ← WARNING: RDMA data interface used for control traffic" : "  ✓"}
  NCCL_IB_GID_INDEX:    3
  NCCL_DEBUG:           WARN
  NCCL_IB_QPS_PER_CONNECTION: 1
  NCCL_ALGO:            auto

${hcaWrong ? `Fix NCCL_IB_HCA:
  Simulator: set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7
  Production: export NCCL_IB_HCA=mlx5_0:1,mlx5_1:1,mlx5_2:1,mlx5_3:1,mlx5_4:1,mlx5_5:1,mlx5_6:1,mlx5_7:1` : ""}
${socketWrong ? `Fix NCCL_SOCKET_IFNAME:
  Simulator: set nccl socket-ifname eno1
  Production: export NCCL_SOCKET_IFNAME=eno1   (management NIC, not compute fabric)` : ""}

In production:
  env | grep '^NCCL_'
  Or inspect the launcher / Slurm submission environment for NCCL_IB_HCA and NCCL_SOCKET_IFNAME`,
    conceptId: "rocev2",
    type: hcaWrong || socketWrong ? "error" : "info",
  }
}
