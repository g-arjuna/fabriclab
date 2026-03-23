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
    output: `NCCL Environment Variables:

  NCCL_IB_HCA:          ${hca}${hcaWrong ? "  ← WARNING: IB bonded name on RoCEv2 system" : "  ✓"}
  NCCL_SOCKET_IFNAME:   ${socketIf}${socketWrong ? "  ← WARNING: RDMA interface used for control messages" : "  ✓"}
  NCCL_IB_GID_INDEX:    3
  NCCL_DEBUG:           WARN
  NCCL_IB_QPS_PER_CONNECTION: 1

${hcaWrong ? "Fix: set nccl ib-hca mlx5_0,mlx5_1,mlx5_2,mlx5_3,mlx5_4,mlx5_5,mlx5_6,mlx5_7" : ""}
${socketWrong ? "Fix: set nccl socket-ifname eno1" : ""}`,
    conceptId: "rocev2",
    type: hcaWrong || socketWrong ? "error" : "info",
  }
}
