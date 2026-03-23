import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showDcbLoadBalance(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState();
  const lbMode = (topology as { lbMode?: string }).lbMode ?? "hash";

  setCondition("lbModeIdentified", true);
  markVerified("lbModeIdentified");

  if (lbMode === "hash") {
    return {
      output: `Load-balance mode:  hash
Adaptive:           disabled
Per-packet:         disabled
RSHP:               disabled

NOTE: Static ECMP. All RoCEv2 flows with dst port 4791
may hash to the same spine links. Use 'enable load-balance
per-packet' to distribute traffic across all paths.`,
      conceptId: "rocev2",
      type: "info",
    };
  }

  return {
    output: `Load-balance mode:  per-packet
Adaptive:           enabled
Per-packet:         enabled
RSHP:               enabled
Reorder tolerance:  200 microseconds`,
    conceptId: "rocev2",
    type: "success",
  };
}
