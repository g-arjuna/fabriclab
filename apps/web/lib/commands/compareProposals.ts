import type { CommandResult } from "@/types";

export function compareProposals(): CommandResult {
  return {
    output: `Side-by-side comparison - 64-node DGX H100 cluster
====================================================

                        Proposal A      Proposal B
-------------------------------------------------
Switch radix            32-port         64-port
Leaf switches           32              8
Spine switches          16              32
Total switches          48              40
-------------------------------------------------
NIC ports available     512 OK          256 FAIL
DGX nodes supported     64  OK          32  FAIL
-------------------------------------------------
Oversubscription        1:1 OK          N/A (capacity fail)
Non-blocking            YES OK          CANNOT EVALUATE
Switch hops (one-way)   2               2
AllReduce traversals    4 links         4 links
-------------------------------------------------
Bisection BW            Full OK         Insufficient
Price                   $1.2M           $0.9M
-------------------------------------------------

SUMMARY:
Proposal A meets all requirements: 64 nodes, non-blocking,
full bisection bandwidth, correct hop count.

Proposal B fails at the capacity level - it cannot connect
all 64 DGX nodes regardless of oversubscription ratio.
The $0.3M saving is not a saving; it delivers an unusable fabric.

Use 'python3 fabric-sizing.py --recommend a' to submit your recommendation.`,
    conceptId: "rocev2",
    type: "info",
  };
}
