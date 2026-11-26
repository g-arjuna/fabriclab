# RDMA From First Principles — Human Learner Review Checklist

Use this checklist with real learners after the implementation is merged or preview-approved. Do not treat completion of the guided sequence as proof of comprehension. A developer walkthrough is not independent educational validation.

## Recommended maintainer review path

Use a clean browser profile or cleared local storage. Review these states in order before inviting learners:

1. **Lesson 1 opening** — one-host CPU/RAM/kernel/NIC foundation.
2. **Lesson 1 TCP states** — socket endpoint/four-tuple, recorded handshake, byte-stream boundaries, large-transfer segmentation, receive-order comparison and loopback comparison.
3. **Lesson 2 DMA states** — CPU-copy comparison, device memory access and Soft-RoCE/software-provider explanation.
4. **Lesson 3, memory permissions** — the address-cell access exercise and real registration record.
5. **Lesson 4, instruction construction** — the single HELLO buffer and unposted illustrative Work Request.
6. **Lesson 4, Queue Pair and peer endpoint** — the two-endpoint preparation view and TCP control channel.
7. **Lesson 5 opening** — laboratory topology, control/data separation and preparation checklist.
8. **Lesson 5 SEND states** — receive posting, SEND posting, packet, completion and memory verification.
9. **Lesson 6 WRITE states** — instruction/payload separation, RETH fields, empty target-CQ evidence and memory verification.
10. **Lesson 7 READ states** — request direction, response direction and reader-owned completion.
11. **Lesson 8 code-to-packet correlation** — select remote address, RKEY, transfer length, WR ID and LKEY/local memory.
12. **Lesson 8 operational investigation** — payload length, padding, captured data length and frame length.
13. **320–430px mobile foundations and SEND/WRITE/READ states** — confirm that active observations appear before detailed narrative, remain readable and are not obscured by the fixed action area.

The reviewer should verify that conceptual illustrations, recorded evidence and causal reconstructions remain visibly distinct.

## Session setup

- Ask the learner to think aloud. Do not coach unless they are blocked.
- Record qualitative observations, points of confusion and exact screen/state references.
- Do not collect names, contact details, employer information or other unnecessary personal information.
- Do not show the answer panels before asking the corresponding question.


## Lesson-by-lesson comprehension objectives

Ask the learner to explain each mechanism in their own words. Do not require memorization of recorded memory addresses, keys, QPNs, WR IDs or packet sequence numbers; those values are examples for correlation, not the educational objective.

| Lesson | Learner should be able to explain |
|---|---|
| 1 | How application memory, CPU execution, kernel services and TCP communication relate |
| 2 | Why conventional NIC DMA differs from the RDMA programming model, and what RXE actually implements |
| 3 | Why memory registration exists and how address ranges, permissions, LKEY and RKEY relate |
| 4 | How a Work Request becomes submitted work and how the application retrieves a completion |
| 5 | Why the receiver supplies destination memory before ordinary SEND |
| 6 | How ordinary WRITE changes remote memory without producing a normal target receive completion |
| 7 | Why READ is submitted through the Send Queue even though the application payload returns in the reverse direction |
| 8 | How to reconstruct an application operation from packet fields, local work, completion and memory evidence |

During the review, record:

- Where an unfamiliar term first becomes confusing.
- Which visual relationship is unclear.
- Whether the learner can predict the next operation.
- Whether the learner understands why each resource exists.
- Whether the learner can distinguish recorded evidence from conceptual explanation.
- Whether the lesson contains unnecessary repetition.
- Whether mobile layout interferes with comprehension.

## Learner explanation prompts

Ask the learner to explain, without reading the displayed answer:

1. What are the two applications trying to accomplish?
2. How does conventional TCP networking move those bytes?
3. What changes when a device can access memory directly?
4. What changes when using RDMA?
5. Why does memory registration exist?
6. What does a Work Request contain?
7. How does an instruction reach the RDMA provider?
8. Why does SEND require appropriate receive work?
9. Why can ordinary WRITE change memory without a normal target receive completion?
10. Why do READ request and payload-response directions differ?
11. How does a Python operation correspond to a real packet?
12. What does a capture prove, and what requires application evidence?

Useful follow-up prompts:

- After the DMA demonstration, ask the learner to explain DMA without repeating the displayed definition.
- Before SEND execution, ask: “What is missing if the receiver has not posted receive work?”
- During ordinary WRITE, ask the learner to predict the target Completion Queue result before revealing it.
- At the end, ask the learner to trace one operation from application memory through the Work Request, endpoint, packet, memory placement and completion observation.
- Ask where they first became confused, what they ignored, and whether any diagram appeared to contradict a previous lesson.

## Observation notes

For each prompt record:

- Learner answered independently / needed prompting / could not answer.
- Whether the learner cited a mechanism or repeated a label.
- Any incorrect causal claim, especially ACK versus completion or memory placement versus application observation.
- Navigation, mobile-layout or readability problems.
- Exact lesson and step identifier where confusion occurred.

A successful review is evidence about the learner experience, not a score. Multiple learners reporting the same confusion should be treated as a curriculum defect even if browser tests pass.
