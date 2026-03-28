import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showInterfaceCounters(): CommandResult {
  const { topology, markVerified, setCondition } = useLabStore.getState();
  const rails = topology.rails ?? [];
  const isRailTopology = rails.length > 0;

  const hasSilentCongestion = topology.silentCongestion ?? false;
  const unevenSpine = topology.unevenSpine ?? false;
  const lbMode = topology.lbMode ?? "hash";

  if (topology.congestionDetected || hasSilentCongestion) {
    setCondition("congestionChecked", true);
    markVerified("congestionChecked");
  }

  if (isRailTopology) {
    const activeDeviceId = useLabStore.getState().activeDeviceId;
    const activeLeafRail = activeDeviceId?.startsWith("leaf-rail")
      ? Number(activeDeviceId.replace("leaf-rail", ""))
      : null;
    const faultedRail = rails.find((rail) => rail.switchPort === "error-disabled");
    const showFaultOnThisLeaf = faultedRail !== undefined && activeLeafRail === faultedRail.id;
    const faultPortName = useLabStore.getState().lab.labId === "lab9-errdisable-recovery" && faultedRail?.id === 2
      ? "swp3"
      : "swp5";

    return {
      output: `Interface  RX packets      TX packets      RX drops  TX drops  PFC rx  Buffer util
---------  --------------  --------------  --------  --------  ------  -----------
swp1       6,234,918,441   6,198,441,223   0         0         847     18%
swp2       6,228,341,892   6,201,884,112   0         0         912     19%
swp3       6,241,002,341   6,194,773,221   0         0         833     17%
swp4       6,229,441,002   6,199,223,441   0         0         889     18%
${showFaultOnThisLeaf
  ? `${faultPortName}       0               0               0         0         0       0%  ← ERR-DISABLED (no traffic)`
  : `swp5       6,237,441,223   6,202,331,891   0         0         856     18%`}
swp6       6,231,002,331   6,198,441,002   0         0         901     19%
swp7       6,228,441,113   6,200,113,441   0         0         878     18%
swp8       6,240,221,003   6,197,882,331   0         0         844     17%
...
swp16      6,235,441,223   6,201,002,113   0         0         862     18%

Spine uplinks (swp33-swp64): All UP, 0 drops, buffer util 12-22%

${showFaultOnThisLeaf
  ? `NOTICE: swp5 shows 0 traffic — port may be down.\nRun 'show switch port rail${faultedRail.id}' to check port state.`
  : `All 16 downlink ports healthy. Switch fabric operating normally.`}`,
      conceptId: "rocev2",
      type: showFaultOnThisLeaf ? "info" : "success",
    };
  }

  if (topology.congestionDetected) {
    return {
      output: `Interface swp1 (→ DGX Node A)
  Input packets:     1,847,293,441
  Output packets:    1,847,104,219
  Output drops:      47,291           ← drops: no PFC backpressure
  PFC pause frames:  0                ← PFC disabled, no PAUSE frames sent
  Buffer util:       ${topology.bufferUtilPct}%

Interface swp2 (→ DGX Node B)
  Input packets:     1,843,112,887
  Output packets:    1,843,009,441
  Output drops:      44,118           ← drops on both DGX-facing ports
  PFC pause frames:  0
  Buffer util:       ${topology.bufferUtilPct}%`,
      conceptId: "rocev2",
      type: "info",
    };
  }

  if (hasSilentCongestion) {
    return {
      output: `Interface swp1 (→ DGX Node A)
  Input packets:     1,847,293,441
  Output packets:    1,847,104,219
  Output drops:      0                ← PFC preventing drops
  PFC pause frames:  4,823            ← PFC active: senders being paused
  Buffer util:       ${topology.bufferUtilPct}%

Interface swp2 (→ DGX Node B)
  Input packets:     1,843,112,887
  Output packets:    1,843,009,441
  Output drops:      0
  PFC pause frames:  4,291
  Buffer util:       ${topology.bufferUtilPct}%`,
      conceptId: "rocev2",
      type: "info",
    };
  }

  if (unevenSpine && lbMode === "hash") {
    return {
      output: `Interface swp1 (→ DGX Node A)
  Input packets:     2,104,771,223
  Output packets:    2,104,550,992
  Output drops:      0
  PFC pause frames:  847
  Buffer util:       ${topology.bufferUtilPct}%`,
      conceptId: "rocev2",
      type: "info",
    };
  }

  if (lbMode === "per-packet") {
    return {
      output: `Interface swp1 (→ DGX Node A)
  Input packets:     2,104,771,223
  Output packets:    2,104,550,992
  Output drops:      0
  PFC pause frames:  112
  Buffer util:       ${topology.bufferUtilPct}%`,
      conceptId: "rocev2",
      type: "info",
    };
  }

  return {
    output: `Interface swp1 (→ DGX Node A)
  Input packets:     1,847,293,441
  Output packets:    1,847,104,219
  Output drops:      0
  PFC pause frames:  0
  Buffer util:       12%`,
    conceptId: "rocev2",
    type: "info",
  };
}
