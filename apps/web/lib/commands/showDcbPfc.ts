import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showDcbPfc(): CommandResult {
  const { topology, markVerified, setCondition } = useLabStore.getState();

  if (!topology.pfcEnabled) {
    setCondition("pfcDisabled", true);
    markVerified("pfcDisabled");
    setCondition("pfcVerified", true);
    markVerified("pfcVerified");
  }

  return {
    output: topology.pfcEnabled
      ? `Interface eth0
  Priority Flow Control:  enabled
  PFC enabled priorities: 3 (cos3)
  Pause quanta:           0xffff
  Watchdog:               enabled
  Watchdog interval:      200ms`
      : `Interface eth0
  Priority Flow Control:  disabled
  PFC enabled priorities: none
  Pause quanta:           N/A
  Watchdog:               disabled`,
    conceptId: "pfc",
    type: "success",
  };
}
