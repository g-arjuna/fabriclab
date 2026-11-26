# Devin — Implement the authored remaining RDMA lessons (Operations V2)

## Assignment and baseline

Continue PR #11 (`feat/rdma-first-principles` → `preview`) in `g-arjuna/fabriclab` from accepted Foundations V2 closeout commit `46cd691bd72563f94d9565e21ef208b71d7b31f2`. The first four lessons have undergone independent source review and are accepted for this phase. No broad changes to Lessons 1–4 are authorized. The maintainer wants to review the entire new eight-lesson curriculum together after this implementation; do not merge PR #11 or publish to production.

This package contains the complete authoritative teaching copy and interaction design for Lessons 5–8. Your role is implementation. Do not generate educational prose, decide a different curriculum, create a design proposal or replace specified interactions with generic boxes/step counters. The supplied material answers the questions that emerged in the maintainer's walkthrough: what happens inside hosts, why setup exists, how the local and remote instructions use memory, who supplies data, what packets contain, and what application completion actually means.

Use the following canonical source documents:

- `05-send-receive.md` — lesson 5 (9 sections: 5.1–5.9)
- `06-rdma-write.md` — lesson 6 (8 sections: 6.1–6.8)
- `07-rdma-read.md` — lesson 7 (7 sections: 7.1–7.7)
- `08-packets-and-ai-fabrics.md` — lesson 8 (12 sections: 8.1–8.12)
- `09-visual-and-evidence-contract.md` — binding, visual, lifecycle and acceptance requirements
- `10-research-notes.md` — annotated documentation and original tutorial references
- `evidence-anchors.json` — expected evidence identities and numerical checks, NOT runtime display constants
- `section-manifest.json` — authored sequence and stable IDs

Place canonical documents in a separate `content/operations-v2/` directory or equivalent established content structure without modifying `content/foundations-v2/`. Preserve the Markdown bytes, or document any mechanical line-ending normalization. Continue using the deterministic authored-content architecture introduced in Foundations V2. Extend it or implement a parallel small generator with explicit IDs and schema validation. Render `Learner copy`, `Reveal/feedback`, and `Inspect` as supplied; `Visual and interaction` is implementation specification. Tables in visual specifications that are explicitly described as learner-visible should be rendered as authored. Render cited references with optional links to the appropriate notes. Do not expose internal implementation instructions in the UI. Do not silently summarize away essential details or turn source excerpts into invented Python. UI control labels and short mechanical state labels may be implemented from the specifications; no unsupervised educational writing. If a genuine factual issue is found in the supplied content, report exact wording and source; do not fabricate a correction.

## 1. Preserve Foundations V2 and verified evidence

Before changes, verify remote PR head and clean checkout. Capture baseline hashes for canonical foundations files, RDMA and TCP JSONs, original capture bundles and public PCAP files. Preserve current visual state isolation, Markdown renderer, TCP selection/FIN corrections, existing progress migration, evidence integrity, advanced execution explorer, Chapter 16 WRITE semantics, auth/publication controls and security baseline.

Reference RDMA evidence digest: `c4feb017e809cb1e7ac4ceb8fc007adec72cd31a2a57018ccc227f715aa7bd9e`.
Reference JSON SHA-256: `f143ebcadf676e4505ca8d897dca95f4d11191d677f1f4c0f16c9b703eca1f25`.
TCP JSON SHA-256: `c6cb497efbb1e91ac295c4215494273d797838a57ef6d046102769fb6a77c3e6`.

No new experiment is required. The actual reference SEND, WRITE and READ cases already provide the packet, work request, resource, completion, synchronization and memory evidence needed. Do not regenerate captures, change evidence digests, add a privileged execution service or create synthetic recorded failure cases. The optional conceptual scenarios in the content are explanatory, not observations. No production change. No additional Vercel deletion is authorized; retain current working Foundations V2 deployment `dpl_j6hP2RsbjB4PdhXuRj2hez27mTY6`, accepted baseline and shared preview/production deployments. After deployment, inventory obsolete feature deployments and list candidates separately only; do not delete without maintainer approval and verified alias/rollback safety.

## 2. Implement Lessons 5–7 as one coherent experimental bench

Reuse the existing visual primitives, evidence loaders, operation diagram and code-inspection infrastructure. The goal is not a new UI framework. Follow every authored section's specified actions. Keep A and B fixed; reveal only relevant active state, preserve memory/queue/provider relationships, and separate instruction, payload, control and completion paths. On mobile show the active A/B relationship together before long detail. Use actual snapshot source lines and validated correlations rather than hardcoded runtime keys. The sections build on the host model already taught in Foundations V2; don't reintroduce unexplained provider, kernel or memory assumptions.

### Lesson 5

Implement all nine subsections. Lab orientation shows actual two-host topology and same script with distinct roles. Resource ledger follows actual helper order and explains endpoint metadata/RC readiness. Receiver constructs and posts its local memory description first, then sends TCP ready. Provide the authored conceptual missing-receive example separately (not recorded RNR). Sender writes bytes locally (`mr.write` is not remote WRITE), constructs SGE and SEND WR, then submits. Show the actual captured SEND and ACK in both directions, destination QPNs and no RETH, receiver's conceptual consumption of its WR, and independent application completion polls. Show B's verified 50-byte message after completion, with 4096-byte capacity distinguished and newline retained. Never claim globally ordered A/B polls. End with the authored reasoning review and complete the lesson through the curriculum callback.

### Lesson 6

Implement all eight subsections. Compare destination selection with SEND before exposing a new run. The target starts with recorded dots; B shares destination MR address/RKEY/capacity via TCP. Construct actual local SGE and remote fields, submit ordinary WRITE, follow RETH and payload to target provider. Show valid conceptual access and no target RQ consumption. Inspect reverse ACK and writer completion. Delay prediction answer and target memory verification until writer completion, `write_done`, B's poll, then B's memory observation. Target poll returns zero; don't display a remote normal receive CQE. Compare exactly the common observed 53-byte range, not fictitious 64-byte after snapshot. Include authored optional conceptual WRITE-with-immediate distinction; no new capture. End with comparison and correct lesson completion.

### Lesson 7

Implement all seven subsections. Four role distinctions are central: initiator A, request A→B, data B→A, completion A. Show B source snapshot and 46-byte advertised valid length vs 4096-byte MR; A local destination. Explain why `post_send()` submits READ. Actual request has RETH and no payload; actual response carries 46 bytes in reverse direction, no RETH. No B application SendWR. Reader observes WC and verifies bytes, then sends `read_done`, then B source poll returns zero. Compare actual source prefix, response payload and reader result. Include the authored three-operation comparison. Preserve distinct QPNs and keys across runs.

## 3. Implement Lesson 8 as a genuine packet investigation

Use the existing packet explorer, correlation helpers and `packetLengthBreakdown`. Implement all twelve subsections. Start from familiar Ethernet/IP/UDP, distinguish UDP encapsulation from RC transport reliability, explain destination QPN, opcode and PSN, then optional RETH, payload/padding/frame length. Make actual packet selection and field selection synchronize with memory/WR/endpoint relationships. Do not assert RETH for SEND/ACK/READ response. Distinguish source of fields (peer configuration, WR opcode, local-only identifiers, transport-generated fields). Correctly show absence of local LKEY/WR ID on wire and that RC BTH does not contain a standalone source QPN.

Use the supplied conceptual multi-packet SEND (2500 bytes, illustrative 1024/1024/452, PSN 100/101/102) and recovery/RNR/access examples separately. Never imply these were captured or simulate exact provider timing/status. For AETH/ICRC, the existing protocol tree does not expose individual values; structural explanation is acceptable. Only if needed, add a separately labelled deterministic decoder artifact from the original immutable PCAPs with checksums, command and tool version. Do not change reference JSON. Do not invent decoded values or fake Wireshark GUI screenshots.

For the WRITE code-to-packet chain, selecting one field must highlight the actual source line, runtime value and packet field together, or clearly show no direct corresponding field. Use the supplied source line anchors. Keep actual byte equality incl. newline; do not compare `.strip()` logs. Use the three supplied packet investigations, with answer-specific feedback and evidence reveals. No repetitive examination or mastery scores. Include the authored host/GPU/AI fabric bridge, clearly conceptual and not a measured NCCL/GPU experiment. Verify existing chapter links before showing them. Finish with the authored causal troubleshooting checklist and completion callback.

## 4. Progress and fidelity

Keep eight lessons and existing public routes. Stable section IDs must be independent of ordering. Introduce an Operations V2 revision identifier for Lessons 5–8: prior short lesson completion must not mark substantially expanded lessons complete. Preserve current Foundations V2 progress/flags for Lessons 1–4, advanced explorer and unrelated site progress. If old state has no matching stable ID, offer revised lesson from the beginning or clear old completion with clear review action. Explicit deep links and review must work after refresh. Do not silently skip new prerequisite sections. Ensure transition from Foundations 4.14 into Lesson 5 can complete Lesson 4 when using guided primary action; if the existing direct link is retained, distinguish reference jump from guided completion and test both. Verify sequential 1→8 completion using a test account-free browser context; no requirement that optional reviews be passed for progress. Learners may read in reference mode without being marked mastered.

Each section must map to a specific visual component and meaningful actions. Avoid a universal counter or one unrelated diagram reused for distinct topics. If an actual visual requirement cannot be implemented, state it in the fidelity matrix; no silent substitutions. Do not use passing text-presence tests as proof that mechanics exist.

## 5. Acceptance tests and review

Extend tests and CI per `09-visual-and-evidence-contract.md`. Add semantic browser tests for every critical causal transition and actual data correlation. Test numeric range, padding and frame length using evidence-derived values and the supplied audit anchors; test real source references and expected tokens. Ensure reference-only selections never mix experiment IDs. Keep current evidence tests. Run complete exact-SHA regression: TypeScript, production build, source/section generator determinism, foundations semantic, curriculum smoke, new operations semantic, advanced explorer, correlation, public, Chapter 16, all Python/evidence tests, original/public PCAP checksums, deterministic exports, production/full audit, patch whitespace and GitHub CI. Do not weaken existing assertions. If final code changes, rerun full suite on new SHA.

Review complete rendered browser states at desktop and mobile, not merely text presence or cropped images. Prioritize: SEND receive preparation and source submission; WRITE remote tuple/RETH and no-target-CQE prediction; READ request versus response and local result; source-to-wire selected relation; payload vs padding; operational cases. Record representative actual full-viewport screenshots, with viewport and section IDs. No huge screenshot collection or generated faux captures. Run clean local production build and verify protected Vercel deployment exact source SHA. Keep protection enabled. Ensure remote branch, PR, CI and immutable deployment all refer to final clean commit; no dirty local CLI deployment reported as GitHub candidate.

## 6. Delivery and stopping condition

Update existing PR #11 in focused commits. Push to correct remote, verify independently accessible source and tests. No force-push or history rewrite. Return:

- Final local and remote head, PR status and exact-SHA GitHub Actions URL.
- Stable feature alias and immutable Vercel URL with exact deployment SHA/ID.
- Canonical source integrity and deterministic content generation results.
- A 36-row fidelity matrix: subsection ID, implemented mechanism, available actions, observed state change, evidence anchors, regression assertion, partial limitation if any.
- Representative actual desktop/mobile screenshots and complete test totals.
- RDMA/TCP evidence hashes and original/public capture integrity results.
- Material defects, documented deviations and optional deferred improvements; no claim of independent human learning validation.
- A concise learner review path spanning all eight lessons, including the previous Foundations V2 sections. Do not create new pedagogical content for this report.

Stop when the authored curriculum and its essential visual mechanisms are faithfully implemented, all integrity/regression gates pass, and no material implementation defect remains. This is a delivery for the maintainer's combined learner walkthrough, not authorization to merge or publish. No additional speculative redesign. The instructional material is already supplied; your job is to make it visible, interactive, accurate and independently reviewable.
