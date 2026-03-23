import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showSpineCounters(): CommandResult {
  const { topology, setCondition, markVerified } = useLabStore.getState();
  const unevenSpine = (topology as { unevenSpine?: boolean }).unevenSpine ?? false;
  const lbMode = (topology as { lbMode?: string }).lbMode ?? "hash";

  if (unevenSpine && lbMode === "hash") {
    setCondition("spineChecked", true);
    markVerified("spineChecked");

    return {
      output: `Spine Switch — Interface Counters

Interface swp1 (→ Leaf Rail 0):
  Input packets:    6,234,918,441
  Output drops:     0
  Buffer util:      72%          ← HOT

Interface swp2 (→ Leaf Rail 1):
  Input packets:    6,198,441,223
  Output drops:     0
  Buffer util:      68%          ← HOT

Interface swp3 (→ Leaf Rail 2):
  Input packets:    298,441
  Output drops:     0
  Buffer util:       8%          ← IDLE

Interface swp4 (→ Leaf Rail 3):
  Input packets:    312,003
  Output drops:     0
  Buffer util:       6%          ← IDLE

NOTE: swp1 and swp2 are handling ~97% of all AllReduce traffic.
swp3 and swp4 are nearly unused. This is a load balancing failure.`,
      conceptId: "rocev2",
      type: "info",
    };
  }

  setCondition("spineVerified", true);
  markVerified("spineVerified");

  return {
    output: `Spine Switch — Interface Counters

Interface swp1 (→ Leaf Rail 0):
  Input packets:    6,234,918,441
  Output drops:     0
  Buffer util:      31%          ← balanced

Interface swp2 (→ Leaf Rail 1):
  Input packets:    6,198,441,223
  Output drops:     0
  Buffer util:      29%          ← balanced

Interface swp3 (→ Leaf Rail 2):
  Input packets:    5,987,331,003
  Output drops:     0
  Buffer util:      28%          ← balanced

Interface swp4 (→ Leaf Rail 3):
  Input packets:    6,012,004,117
  Output drops:     0
  Buffer util:      27%          ← balanced

All spine links within 4% utilisation. Per-packet load
balancing is distributing AllReduce traffic evenly.`,
    conceptId: "rocev2",
    type: "success",
  };
}
