import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showDcbEts(): CommandResult {
  const { topology, markVerified, setCondition } = useLabStore.getState();
  const { ecnEnabled } = topology;

  // Verify ECN when student checks ETS config after enabling ECN
  if (ecnEnabled) {
    setCondition("ecnVerified", true);
    markVerified("ecnVerified");
  }

  return {
    output: `ETS Configuration — Spectrum-X SN5600 (global policy)
  Traffic class  Priority  Bandwidth  Algorithm
  TC0            0,1,2     30%        ETS
  TC3 (RoCE)     3         50%        Strict Priority
  TC7 (mgmt)     7         20%        ETS

  ECN marking:  ${ecnEnabled ? "enabled (DSCP 26)" : "disabled"}
  DCQCN:        ${ecnEnabled ? "active" : "inactive -- congestion unmanaged"}`,
    conceptId: "ecn",
    type: "info",
  };
}
