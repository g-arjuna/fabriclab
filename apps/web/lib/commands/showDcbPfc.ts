import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showDcbPfc(): CommandResult {
  const { topology, markVerified, setCondition } = useLabStore.getState();
  const rails = topology.rails ?? [];
  const isRailTopology = rails.length > 0;

  if (!topology.pfcEnabled) {
    setCondition("pfcMissing", true);
    markVerified("pfcMissing");
  }
  if (topology.pfcEnabled) {
    setCondition("pfcVerified", true);
    markVerified("pfcVerified");
  }

  if (isRailTopology) {
    const activeDeviceId = useLabStore.getState().activeDeviceId;
    const myRailId = activeDeviceId?.replace("leaf-rail", "") ?? "?";

    return {
      output: `Interface swp1-32 (DGX downlinks)
  Priority Flow Control:  enabled
  PFC enabled priorities: 3 (cos3)
  Pause quanta:           0xffff
  Watchdog:               enabled
  Watchdog interval:      200ms

Interface swp33-64 (spine uplinks)
  Priority Flow Control:  enabled
  PFC enabled priorities: 3 (cos3)
  Watchdog:               enabled

PFC is correctly configured on all ports.
The training degradation is not caused by a PFC misconfiguration.
Run 'show switch port rail${myRailId}' to check the physical port state.`,
      conceptId: "pfc",
      type: "info",
    };
  }

  return {
    output: topology.pfcEnabled
      ? `Interface swp1-32 (server-facing)
  Priority Flow Control:  enabled
  PFC enabled priorities: 3 (cos3)
  Pause quanta:           0xffff
  Watchdog:               enabled
  Watchdog interval:      200ms`
      : `Interface swp1-32 (server-facing)
  Priority Flow Control:  disabled  ← WARNING: fabric is NOT lossless
  PFC enabled priorities: none
  Pause quanta:           N/A
  Watchdog:               disabled

  NOTE: Without PFC, any congestion will cause packet drops.
  RDMA retransmissions will stall AllReduce operations.`,
    conceptId: "pfc",
    type: "success",
  };
}
