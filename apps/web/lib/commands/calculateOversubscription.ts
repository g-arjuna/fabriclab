import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function calculateOversubscriptionA(): CommandResult {
  const { setCondition, markVerified, setTopology, topology } = useLabStore.getState();

  setTopology({ ...(topology as object), proposalACalculated: true } as typeof topology);
  setCondition("oversubscriptionCalculated", true);
  markVerified("oversubscriptionCalculated");

  return {
    output: `Oversubscription calculation - Proposal A
==========================================

Input (per leaf switch):
  Downlinks (-> DGX nodes):    16 x 400G = 6,400 Gb/s
  Uplinks (-> spine):          16 x 400G = 6,400 Gb/s

Formula:
  Oversubscription = Total downlink BW / Total uplink BW
                   = 6,400 / 6,400
                   = 1:1

Result: NON-BLOCKING

At 1:1, every server-facing port has exactly one uplink port
backing it. During AllReduce, all 64 DGX nodes can transmit
simultaneously at full 400G rate without any link becoming
the bottleneck.

Bisection bandwidth check:
  32 nodes per half x 8 NICs x 400G = 102.4 Tb/s required
  32 leaf switches x 16 uplinks x 400G = 204.8 Tb/s available
  Each half gets 102.4 Tb/s -> full bisection bandwidth met

Verdict: Proposal A supports 64 DGX nodes at full AllReduce
         bandwidth. Non-blocking. Meets requirements.`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function calculateOversubscriptionB(): CommandResult {
  const { setTopology, topology } = useLabStore.getState();

  setTopology({ ...(topology as object), proposalBCalculated: true } as typeof topology);

  return {
    output: `Oversubscription calculation - Proposal B
==========================================

Input (per leaf switch):
  Downlinks (-> DGX nodes):    32 x 400G = 12,800 Gb/s
  Uplinks (-> spine):          32 x 400G = 12,800 Gb/s
  Ratio per switch:           1:1 (switch itself is non-blocking)

BUT - capacity problem detected:
  8 leaf switches x 32 downlinks = 256 NIC ports total
  64 DGX nodes x 8 NICs each    = 512 NIC ports required

  256 ports available != 512 ports required

  ERROR: Proposal B cannot connect all 64 DGX nodes.
  It would only support 32 DGX nodes (256 ports / 8 NICs).

To fix Proposal B for 64 nodes, leaf count would need to double
to 16 switches - but then uplink count (16 x 32 = 512) would
exceed spine port capacity (32 spines x 8 ports = 256 connections).
The design does not scale to 64 nodes without hardware changes.

Verdict: Proposal B FAILS to meet the 64-node requirement.
         The switch count is insufficient for the cluster size.`,
    conceptId: "rocev2",
    type: "error",
  };
}
