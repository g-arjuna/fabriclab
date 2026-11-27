# RDMA guided-stage content gaps — resolved integration record

This document records the seven canonical instructional-content gaps identified during the prior review and the exact resolution now integrated into Foundations V2 / Operations V2. The guided runtime no longer compensates for missing prose by proportionally dividing a subsection according to stage count. Guided stages name stable canonical content blocks such as `1.3:the-load-returns-0x48-to`, and validation fails when a required instruction reference is missing or empty.

## Resolution summary

| Gap | Resolution | Guided binding |
|---|---|---|
| **1.2 — Demand allocation belongs to a process context** | Canonical section 1.2 now explains that both processes have unpopulated virtual ranges, Process A accesses its own range, only A's illustrative mapping becomes populated, and demand allocation is associated with a particular mapping/access context. It also states the conceptual-example boundary: not every valid page fault allocates a completely new private physical page. | Final demand-allocation stage binds `now-process-a-accesses-a`, `in-our-example-only-process`; its observation binds `a-s-illustrated-mapping-is`, `demand-allocation-is-associated-with`. |
| **1.3 — Same virtual address in two processes** | Canonical section 1.3 now states that `0x1002` is interpreted in the active address-space context, maps through frame P7 in A and P9 in C, and therefore refers to different underlying memory locations. Deliberately shared mappings are identified as a separate case. | Process-C comparison binds `a-virtual-address-is-interpreted`, `in-our-illustration-address-0x1000`; observation binds `the-numerical-address-has-not`, `this-is-one-reason-separate`. |
| **1.3 — What a load returns** | Canonical section 1.3 now states that translation identifies the permitted location, the illustrative memory access returns byte `0x48` (ASCII H), and translation did not copy the application payload or establish cache/DRAM behavior. | Load-result stage binds `the-cpu-then-obtains-the`, `the-load-returns-0x48-to`; observation binds `address-translation-did-not-copy`, `the-diagram-shows-logical-values`. |
| **1.5 — Continuous copy/reference history** | Canonical section 1.5 now uses the exact continuous sequence: HELLO → reference creation → mutation through the reference to XELLO → independent copy of current XELLO → independent-copy mutation to YELLO. The final distinction between references, copies, socket buffering, DMA and registered memory is retained. | Five stages bind the corresponding `original-sixteen-byte-buffer`, `create-a-second-reference`, `using-the-second-reference`, `now-we-allocate-a-different`, `we-replace-x-with-y` blocks. |
| **4.11 — SGE describes registered memory** | Canonical section 4.11 now ties address `0x1000`, length 5 and LKEY `0x11` to the existing registered HELLO buffer, presents the field table, states that HELLO remains in application memory, separates construction from transmission/posting, and distinguishes the illustrative logical order from the actual Pyverbs construction order. | SGE stage binds `recall-the-illustrative-sixteen-byte` through the SGE table; observation binds `the-provider-can-use-this`, `constructing-the-instruction-does-not`. |
| **8.4 — Compact six-packet comparison** | Canonical section 8.4 now explicitly compares SEND request, SEND ACK, WRITE request, WRITE ACK, READ request and READ response; includes the six-row byte table; distinguishes application bytes, padding, captured data portion and frame length; states the AETH export limitation; and explains why registered capacity, transfer length, packet payload and frame length answer different questions. | Final comparison stage binds the supplied explanatory blocks and byte table; observation binds the AETH limitation and final distinction blocks. |
| **8.7 — Configuration versus logging** | Canonical section 8.7 now shows immutable helper lines `attr.dest_qp_num`, `attr.rq_psn`, `attr.sq_psn`; contrasts them with `log.emit("qp_ready", ...)`; states that logging does not configure the endpoint; distinguishes configured endpoint/sequencing context from Work Request fields; and notes that subsequent packets need not retain the initial PSN. | Endpoint-context stage binds the supplied prose and source excerpts; observation binds the helper/logging and packet-correlation interpretation blocks. |

## Operations chronology corrections integrated

In addition to the seven gaps, the maintainer-supplied corrections are integrated canonically:

- **6.3 WRITE construction** follows: empty local source → `mr.write(...)` local memory operation → local source SGE → WRITE SendWR without remote fields → `set_wr_rdma(...)` attachment → `post_send(...)` submission. Constructing a Python object is not described as network transmission.
- **7.3 READ construction** follows: prepared endpoints → local destination SGE → READ SendWR → remote source attachment → submission through the Send Queue. Initiation direction and payload direction are explicitly distinguished.
- **6.6 WRITE target completion** asks the reflection question before synchronization/evidence reveal, then follows control-message synchronization, target poll and zero-entry result without generalizing that a target CQ must always be empty.

## Validation behavior

`apps/web/scripts/validate-rdma-curriculum-references.mjs` now validates that every declared guided stage has explicit instruction references and that every referenced block resolves in the deterministic generated canonical content. Empty, missing or dangling references are errors. Observation references are optional; when declared, they are validated by the same mechanism. Proportional sentence-window selection is not used as a production fallback.

## Remaining genuine content gaps

None are currently documented. The remaining risk is not absent canonical text but ordinary curriculum maintenance: when canonical prose is edited, reviewers must update or confirm the explicit slugs deliberately rather than allowing positional drift.
