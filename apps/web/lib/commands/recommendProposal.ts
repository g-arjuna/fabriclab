import type { CommandResult } from "@/types";
import { useLabStore } from "@/store/labStore";

export function recommendProposalA(): CommandResult {
  const { setCondition, markVerified, setTopology, topology } = useLabStore.getState();

  setTopology({ ...(topology as object), recommendationMade: true } as typeof topology);
  setCondition("correctProposalIdentified", true);
  markVerified("correctProposalIdentified");

  return {
    output: `Recommendation submitted: PROPOSAL A
======================================

Recommendation accepted. Proposal A is correct.

Justification:
  - Supports all 64 DGX H100 nodes (512 NIC connections)
  - 1:1 non-blocking fabric - AllReduce runs at full NIC line rate
  - Full bisection bandwidth - no bottleneck during simultaneous AllReduce
  - 2-stage leaf-spine - 2 switch hops one-way, 4 link traversals per AllReduce round-trip
  - 48 switches total at $1.2M

Proposal B was eliminated because:
  - 8 leaf switches x 32 downlinks = only 256 NIC ports
  - 64 nodes x 8 NICs = 512 ports required
  - The fabric physically cannot connect all nodes

The $0.3M cost difference would result in a cluster that can
only run at 50% of its intended scale. Not a valid trade-off.

Lab complete. Purchase order: Proposal A.`,
    conceptId: "rocev2",
    type: "success",
  };
}

export function recommendProposalB(): CommandResult {
  const { incrementMistake } = useLabStore.getState();
  incrementMistake();

  return {
    output: `Recommendation: Proposal B - INCORRECT
==========================================

Proposal B cannot connect all 64 DGX nodes.

  8 leaf switches x 32 downlinks = 256 NIC ports
  64 DGX nodes x 8 NICs         = 512 NIC ports required

The fabric is physically undersized. Even at $0.3M less,
it delivers a cluster that only works at half scale.

Run 'calculate oversubscription b' again and compare
the NIC ports available vs required.

Then use 'recommend proposal a' to submit the correct choice.`,
    conceptId: "rocev2",
    type: "error",
  };
}
