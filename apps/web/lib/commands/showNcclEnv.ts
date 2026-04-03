import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showNcclEnv(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState();
  const hca = (topology as any).ncclIbHca ?? "mlx5_0:1,...";
  const socketIf = (topology as any).ncclSocketIfname ?? "eno1";

  setCondition("envVarIdentified", true);
  markVerified("envVarIdentified");

  return {
    output: [
      `NCCL_IB_HCA=${hca}`,
      `NCCL_SOCKET_IFNAME=${socketIf}`,
      "NCCL_IB_GID_INDEX=3",
      "NCCL_DEBUG=WARN",
      "NCCL_IB_QPS_PER_CONNECTION=1",
      "NCCL_ALGO=auto",
    ].join("\n"),
    conceptId: "rocev2",
    type: hca.includes("bond") || socketIf === "eth0" ? "error" : "success",
  };
}
