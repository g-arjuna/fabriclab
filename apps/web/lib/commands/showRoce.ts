import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showRoce(): CommandResult {
  const { topology, markVerified, setCondition } = useLabStore.getState();

  if (topology.ecnEnabled) {
    setCondition("ecnVerified", true);
    markVerified("ecnVerified");
  }

  return {
    output: `RoCE Configuration -- eth0
  RoCE version:   RoCEv2
  State:          ${topology.nic.state === "up" ? "active" : "down"}
  PFC:            ${
    topology.pfcEnabled
      ? "enabled (priority 3)"
      : "DISABLED -- retransmissions possible"
  }
  ECN:            ${
    topology.ecnEnabled
      ? "enabled -- DCQCN active"
      : "DISABLED -- no congestion control"
  }
  DSCP marking:   ${
    topology.ecnEnabled ? "26 (RoCE traffic)" : "not configured"
  }
  MTU:            9000
  GID:            fe80::506b:4b03:00a1:b200`,
    conceptId: "ecn",
    type: "info",
  };
}
