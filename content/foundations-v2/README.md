# FabricLab | Foundations v2 — handoff package

**Scope:** replace/expand the foundational teaching sequence before the first full RDMA SEND/RECEIVE practical. This package supplies original, publication-ready instructional copy, exact visual behavior, a runnable TCP evidence experiment, source references and implementation instructions. No content generation is delegated to the implementation agent.

Read in order:

1. `01-host-architecture.md` — what a computer, process, CPU, kernel and memory actually are.
2. `02-tcp-from-application-to-wire.md` — sockets, connecting, sending, buffering, segmentation, receiving, loopback and real captures.
3. `03-dma-rdma-soft-roce.md` — DMA and the distinction between representative hardware RDMA and the actual RXE path.
4. `04-rdma-resources-and-keys.md` — verbs, registered memory, local/remote access, keys, WR, QP, CQ and setup.
5. `05-visual-and-evidence-contract.md` — visual grammar, capture assets, exact binding rules and tests.
6. `06-research-notes.md` — annotated original references and technical scope.
7. `07-devin-implementation-prompt.md` — executable handoff.
8. `lab/tcp_foundation.py` and `lab/README.md` — controlled TCP experiment supplied for Devin to execute and capture.

## Content contract

In files 01–04, `Learner copy` is the exact text intended for the guided lesson. `Visual and interaction` is an implementation specification, not visible prose; `Reveal/feedback` is additional exact learner copy. `Inspect` is optional learner-visible detail. Reference identifiers in square brackets refer to file 06, and can appear as small optional reference links rather than inline footnotes on every screen. Do not present these documents as one long wall of text. A screen may contain a main explanation and a learner-controlled reveal; keep the actual copy intact, split paragraphs into local explanatory callouts only where appropriate.

`{{...}}` denotes a runtime binding to a recorded artifact. Never substitute invented values. Evidence-dependent sentences appear only when validation proves their prerequisites. All other numbers in explicitly conceptual diagrams are illustrative, not observations. Existing RDMA evidence must remain unchanged. New TCP artifacts are a separate evidence set and do not imply hardware measurements.

## Integration scope and navigation

Keep the existing eight lesson routes/IDs where possible. Map 01 and 02 to an expanded Lesson 1, 03 to Lesson 2, 04 sections 4.1–4.9 to Lesson 3 and 4.10–4.14 to Lesson 4. Use sub-section navigation within those lessons rather than an intimidating flat count. Preserve existing Lesson 5–8 and the advanced explorer except for compatibility links and stable progress migration. No work on later lesson content in this pass. The foundational expansion is intentionally deeper; the user can read or resume one sub-section at a time. Keep current reviewer/learner access restrictions.

## Review baseline and limits

GitHub PR #11 was open and unmerged at `28092ad6222907dfbbc39397f3224f963acf6b1c` when this package was researched. The Vercel team scope had denied direct access in prior review; this package does not assert live deployment inventory or authorize deletions. See the deployment-cleanup gate in file 07. No new TCP capture has been produced here; the implementation agent must run the supplied experiment in the isolated environment and produce verified assets. The reference RDMA source was inspected through GitHub, including the resource, SEND and WRITE experiment files and evidence JSON. Research is based on accessible documentation and webinar/video descriptions; no claim of having watched complete videos.
