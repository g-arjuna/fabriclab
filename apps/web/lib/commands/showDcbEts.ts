import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showDcbEts(): CommandResult {
  const {
    topology: { ecnEnabled },
  } = useLabStore.getState();

  return {
    output: `Interface eth0 -- ETS Configuration
  Traffic class  Priority  Bandwidth  Algorithm
  TC0            0,1,2     30%        ETS
  TC3 (RoCE)     3         50%        Strict Priority
  TC7 (mgmt)     7         20%        ETS

  ECN marking:  ${ecnEnabled ? "enabled (DSCP 26)" : "disabled"}
  DCQCN:        ${
    ecnEnabled ? "active" : "inactive -- congestion unmanaged"
  }`,
    conceptId: "ecn",
    type: "info",
  };
}
