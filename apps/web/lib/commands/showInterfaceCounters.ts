import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showInterfaceCounters(): CommandResult {
  const { topology, markVerified, setCondition } = useLabStore.getState();

  if (topology.congestionDetected) {
    setCondition("congestionChecked", true);
    markVerified("congestionChecked");
  }

  return {
    output: topology.congestionDetected
      ? `Interface eth0
  Input packets:     1,847,293,441
  Input bytes:       2,847,193,047,552
  Output packets:    1,847,104,219
  Output drops:      47,291
  PFC pause frames:  12,847
  Buffer util:       ${topology.bufferUtilPct}%`
      : `Interface eth0
  Input packets:     1,847,293,441
  Input bytes:       2,847,193,047,552
  Output packets:    1,847,104,219
  Output drops:      0
  PFC pause frames:  0
  Buffer util:       12%`,
    conceptId: "rocev2",
    type: "info",
  };
}
