# RDMA From First Principles — Human Learner Review Checklist

Use this checklist with real learners after the implementation is merged or preview-approved. Do not treat completion of the guided sequence as proof of comprehension.

## Session setup

- Use a clean browser profile or cleared local storage.
- Ask the learner to think aloud. Do not coach unless they are blocked.
- Record qualitative observations, points of confusion and exact screen/state references.
- Do not collect names, contact details, employer information or other unnecessary personal information.

## Prompts

1. After the opening screen, ask: “What are we trying to accomplish?”
2. After the DMA demonstration, ask the learner to explain DMA without repeating the displayed definition.
3. Before SEND execution, ask: “What is missing if the receiver has not posted receive work?”
4. During ordinary WRITE, ask the learner to predict the target Completion Queue result before revealing it.
5. After ordinary WRITE, ask: “Why can memory change without a normal target receive completion?”
6. Show a genuine READ response and ask: “Who requested this data, and why is the response direction different?”
7. During packet analysis, ask: “What does this packet prove, and what requires application evidence?”
8. At the end, ask the learner to trace one operation from application memory through the Work Request, endpoint, packet, memory placement and completion observation.
9. Ask where they first became confused, what they ignored, and whether any diagram appeared to contradict a previous lesson.

## Observation notes

For each prompt record:

- Learner answered independently / needed prompting / could not answer.
- Whether the learner cited a mechanism or repeated a label.
- Any incorrect causal claim, especially ACK versus completion or memory placement versus application observation.
- Navigation, mobile-layout or readability problems.
- Exact lesson and step identifier where confusion occurred.

A successful review is evidence about the learner experience, not a score. Multiple learners reporting the same confusion should be treated as a curriculum defect even if browser tests pass.
