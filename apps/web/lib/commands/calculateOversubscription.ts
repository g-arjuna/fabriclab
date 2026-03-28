import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function calculateOversubscriptionA(): CommandResult {
  const { setCondition, markVerified, setTopology, topology } = useLabStore.getState();

  setTopology({ ...(topology as object), proposalACalculated: true } as typeof topology);
  setCondition("oversubscriptionCalculated", true);
  markVerified("oversubscriptionCalculated");

  return {
    output: `Oversubscription calculation — Proposal A
==========================================

Input (per leaf switch):
  Downlinks (-> DGX nodes):    16 x 400G = 6,400 Gb/s
  Uplinks (-> spine):          16 x 400G = 6,400 Gb/s

Formula:
  Oversubscription = Total downlink BW / Total uplink BW
                   = 6,400 / 6,400
                   = 1:1

Result: NON-BLOCKING ✓

At 1:1, every server-facing port has exactly one uplink port backing it.
During AllReduce, all 64 DGX nodes can transmit simultaneously at full
400G rate without any link becoming the bottleneck.

Bisection bandwidth check:
  32 nodes per half x 8 NICs x 400G = 102.4 Tb/s required
  32 leaf switches x 16 uplinks x 400G = 204.8 Tb/s available
  Each half gets 102.4 Tb/s -> full bisection bandwidth met ✓

Verdict: Proposal A supports 64 DGX nodes at full AllReduce bandwidth.
         Non-blocking. Meets all requirements.`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function calculateOversubscriptionB(): CommandResult {
  const { setTopology, topology } = useLabStore.getState();

  setTopology({ ...(topology as object), proposalBCalculated: true } as typeof topology);

  return {
    output: `Oversubscription calculation — Proposal B
==========================================

Input (per leaf switch):
  Downlinks (-> DGX nodes):    32 x 400G = 12,800 Gb/s
  Uplinks (-> spine):          32 x 400G = 12,800 Gb/s
  Ratio per switch:            1:1 (each switch is internally non-blocking)

BUT — capacity problem detected:
  8 leaf switches x 32 downlinks = 256 NIC ports available
  64 DGX nodes x 8 NICs each    = 512 NIC ports required

  256 ports available ≠ 512 ports required
  → Only 32 of 64 DGX nodes can connect. 32 nodes are left with no port.

Port utilisation:
  Ports used:     256 / 512 = 50% utilisation
  Ports wasted:   256 of 512 spine ports sit idle (no leaf to connect to)
  Spine waste:    32 switches × (8-port radix — only 4 ports usable) = 50% waste

Economic analysis:
  Proposal B: $0.9M → supports 32 DGX nodes
  Cost per DGX node: $0.9M / 32 = $28,125 per node

  Proposal A: $1.2M → supports 64 DGX nodes
  Cost per DGX node: $1.2M / 64 = $18,750 per node

  Proposal B is not cheaper — it is 50% more expensive per connected node,
  and it delivers a cluster that cannot run at its intended scale.
  The $0.3M headline saving is economically irrational: you pay $0.9M
  for 50% of a cluster instead of $1.2M for the full one.

Verdict: Proposal B fails to meet the 64-node requirement.
         Insufficient leaf switches. 75% of spine port capacity wasted.
         Economically irrational — higher cost per node than Proposal A.`,
    conceptId: "rocev2",
    type: "error",
  };
}
