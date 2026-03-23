import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function showProposalA(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState();

  setCondition("proposalAInspected", true);
  markVerified("proposalAInspected");

  return {
    output: `Proposal A - 32-port 400G switches, 2-stage leaf-spine
=======================================================

Switch model:   32-port 400G (16 downlinks + 16 uplinks per leaf)
Design:         2-stage leaf-spine (no core layer)

Leaf switches:
  Count:          32 switches
  Downlinks:      16 ports x 400G -> DGX nodes
  Uplinks:        16 ports x 400G -> spine switches
  Total downlink BW per leaf:   16 x 400G = 6.4 Tb/s
  Total uplink BW per leaf:     16 x 400G = 6.4 Tb/s

Spine switches:
  Count:          16 switches
  Ports:          32 x 400G (all downlinks to leaf)

Cluster capacity:
  DGX nodes supported:   32 leaf x 16 downlinks = 512 NIC ports
  At 8 NICs per DGX:     512 / 8 = 64 DGX nodes  OK
  Switch hops (one-way): 2 (DGX → Leaf → Spine)
  AllReduce traversals:  4 links per reduce-scatter round-trip
  Total switch count:    32 leaf + 16 spine = 48 switches

Vendor price:   $1.2M

Next: run 'calculate oversubscription a' to check the ratio.`,
    conceptId: "rocev2",
    type: "info",
  };
}

export function showProposalB(): CommandResult {
  const { setCondition, markVerified } = useLabStore.getState();

  setCondition("proposalBInspected", true);
  markVerified("proposalBInspected");

  return {
    output: `Proposal B - 64-port 400G switches, 2-stage leaf-spine
=======================================================

Switch model:   64-port 400G (32 downlinks + 32 uplinks per leaf)
Design:         2-stage leaf-spine (no core layer)

Leaf switches:
  Count:          8 switches
  Downlinks:      32 ports x 400G -> DGX nodes
  Uplinks:        32 ports x 400G -> spine switches
  Total downlink BW per leaf:   32 x 400G = 12.8 Tb/s
  Total uplink BW per leaf:     32 x 400G = 12.8 Tb/s

Spine switches:
  Count:          32 switches
  Ports:          8 x 400G (all downlinks to leaf, 1 per leaf)

Cluster capacity:
  DGX nodes supported:   8 leaf x 32 downlinks = 256 NIC ports
  At 8 NICs per DGX:     256 / 8 = 32 DGX nodes  FAIL  (need 64, have 32)
  AllReduce hops:        2 (same as Proposal A)
  Total switch count:    8 leaf + 32 spine = 40 switches

Vendor price:   $0.9M

Next: run 'calculate oversubscription b' to check the ratio.`,
    conceptId: "rocev2",
    type: "info",
  };
}
