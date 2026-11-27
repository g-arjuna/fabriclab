# FabricLab Operations V2 — authored continuation of Foundations V2

**Deliverable:** four complete lessons (36 authored subsections) for the existing RDMA From First Principles practical, plus a precise implementation contract, research notes, machine-readable evidence anchors and Devin's task prompt. No frontend implementation is included; Devin is responsible for faithfully implementing the provided teaching mechanisms. The content is original and grounded in the repository's actual verified source and evidence. It is not a request for Devin to write lesson copy.

**Baseline:** PR #11, `g-arjuna/fabriclab`, commit `46cd691bd72563f94d9565e21ef208b71d7b31f2`. GitHub PR status was independently verified as open, unmerged and mergeable. GitHub recorded CI and Vercel success at the final closeout SHA. Direct protected browser operation and independent test rerun were not performed. The preceding Foundations V2 revision is accepted for this phase, pending actual learner feedback on the combined curriculum.

## How to hand this off

Send the entire ZIP to Devin and give it `11-devin-implementation-prompt.md` as the task. It already contains scope, implementation requirements, progress rules, evidence integrity checks, deployment safeguards, review requirements and a stopping condition. Do not send earlier implementation prompts as additional tasks. The existing Foundations V2 canonical files and lessons must stay unchanged; the new package is a continuation, not a replacement of them.

| File | Contents |
|---|---|
| 05-send-receive.md | Lesson 5: two-host laboratory, exact resource setup, receive preparation, SEND construction, captured packets, independent completion and verified memory |
| 06-rdma-write.md | Lesson 6: remote memory selection, real metadata exchange, RETH, target provider, ACK/initiator completion vs target observation |
| 07-rdma-read.md | Lesson 7: initiator vs data source, request/response direction, local destination and verification, responder-side synchronization |
| 08-packets-and-ai-fabrics.md | Lesson 8: RoCEv2 layers, BTH/RETH, packet lengths, conceptual multi-packet/reliability examples, code-to-wire correlation and operational investigations, AI fabric bridge |
| 09-visual-and-evidence-contract.md | Shared visual grammar, provenance, exact source anchors, lifecycle, data binding and semantic acceptance tests |
| 10-research-notes.md | Annotated research sources and original expert tutorials; actual lab details checked |
| 11-devin-implementation-prompt.md | Complete implementation instruction |
| section-manifest.json | Stable authored IDs, lesson mapping and source document sequence |
| evidence-anchors.json | Expected reference-run packet/WR/MR/event identities and audit values, not runtime display constants |
| SHA256SUMS | Integrity manifest for the supplied content files |

## Reading order

Lessons 1–4 (existing Foundations V2) establish hardware/software, TCP, DMA/RDMA, Soft-RoCE, memory and queues. Lesson 5 uses those concepts in the first real transfer. Lesson 6 changes only the destination-selection rule and notification model. Lesson 7 changes who supplies data and therefore reverses the payload direction. Lesson 8 reconstructs those operations from real packet captures and connects them to AI networking.

Each source subsection contains **Learner copy** (finished display prose), **Visual and interaction** (implementation contract; not learner-visible verbatim), optionally **Reveal/feedback** and **Inspect** (finished contextual copy). Use authored tables specified as learner-visible. Keep the primary learning flow focused; detailed packet trees and source snippets can be inspected on demand. Source references [R1–R17] resolve to the research notes. Illustrative values are labelled as such. All recorded values come from the actual experiment evidence; never duplicate them as a separate mutable frontend dataset.

The new package does not include new captures, simulated error PCAPs, Wireshark screenshots, or executable lab changes. The existing immutable reference runs already establish the required observations. Optional illustrative larger SEND/RNR/retry examples and the AI fabric bridge are explicitly not measured experiments. Existing actual PCAPs and FabricLab/TShark inspector are used. Complete original videos were not viewed; available written documentation and tutorial descriptions were researched. Exact source/event/packet anchors were checked in the repository. Implementation, browser execution and new deployment are Devin's responsibility.

## Acceptance target

The learner should be able to explain the full path from their application memory through prepared resources and provider to network packet, and then back to application memory and completion evidence. They should know which facts a PCAP can prove and which require application evidence. No more speculative redesign; after implementing this package, deliver the combined eight lessons for the maintainer's actual learner review. PR stays unmerged. No production promotion or Vercel deletion is authorized by this package.
