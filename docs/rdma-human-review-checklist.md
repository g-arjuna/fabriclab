# RDMA From First Principles — Human Learner Review Checklist

Use this checklist with real learners after the implementation is merged or preview-approved. Do not treat completion of the guided sequence as proof of comprehension. A developer walkthrough is not independent educational validation.

## Recommended maintainer review path

Use a clean browser profile or cleared local storage. Review these states in order before inviting learners:

1. **Lesson 3, memory permissions** — the address-cell access exercise.
2. **Lesson 4, instruction construction** — the single HELLO buffer and unposted illustrative Work Request.
3. **Lesson 4, Queue Pair and peer endpoint** — the two-endpoint preparation view and TCP control channel.
4. **Lesson 5 opening** — laboratory topology, control/data separation and preparation checklist.
5. **Lesson 5 SEND states** — receive posting, SEND posting, packet, completion and memory verification.
6. **Lesson 6 WRITE states** — instruction/payload separation, RETH fields, empty target-CQ evidence and memory verification.
7. **Lesson 7 READ states** — request direction, response direction and reader-owned completion.
8. **Lesson 8 code-to-packet correlation** — select remote address, RKEY, transfer length, WR ID and LKEY/local memory.
9. **Lesson 8 operational investigation** — payload length, padding, captured data length and frame length.
10. **390 × 844 mobile SEND, WRITE and READ states** — confirm that both hosts and the active operation are visible before detailed evidence commentary.

The reviewer should verify that conceptual illustrations, recorded evidence and causal reconstructions remain visibly distinct.

## Session setup

- Ask the learner to think aloud. Do not coach unless they are blocked.
- Record qualitative observations, points of confusion and exact screen/state references.
- Do not collect names, contact details, employer information or other unnecessary personal information.
- Do not show the answer panels before asking the corresponding question.

## Learner explanation prompts

Ask the learner to explain, without reading the displayed answer:

1. What are the two applications trying to accomplish?
2. What changes when using RDMA?
3. Why does memory registration exist?
4. What does a Work Request contain?
5. How does an instruction reach the RDMA provider?
6. Why does SEND require appropriate receive work?
7. Why can ordinary WRITE change memory without a normal target receive completion?
8. Why do READ request and payload-response directions differ?
9. How does a Python operation correspond to a real packet?
10. What does a capture prove, and what requires application evidence?

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
