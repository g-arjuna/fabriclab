import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function rdmaLinkShow(): CommandResult {
  const {
    topology: { nic, pfcEnabled },
  } = useLabStore.getState();

  const warningLine =
    nic.state === "up" && !pfcEnabled
      ? "\n  WARNING: PFC disabled -- lossless operation not guaranteed"
      : "";

  return {
    output:
      nic.state === "up"
        ? `link mlx5_0/1 state ACTIVE physical_state LINK_UP
  type RoCE
  netdev eth0
  roce_mode: RoCEv2${warningLine}`
        : `link mlx5_0/1 state DOWN physical_state DISABLED
  type RoCE
  netdev eth0`,
    conceptId: "rocev2",
    type: nic.state === "up" ? "success" : "error",
  };
}
