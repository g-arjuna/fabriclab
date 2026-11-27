# Implementation contract — Lessons 5–8

## Scope and precedence

The canonical prose is in files 05–08. The Visual and interaction blocks specify the mechanism; Reveal/feedback and Inspect contain actual display copy. This file supplies cross-cutting layout, data binding, evidence and testing requirements. It is not a lesson displayed to learners. In any conflict use the genuine evidence for recorded values and the authored copy for intended explanation; report technical contradictions rather than silently inventing replacements.

Baseline reviewed: `g-arjuna/fabriclab` PR #11, `46cd691bd72563f94d9565e21ef208b71d7b31f2`. The first four lessons are the accepted Foundations V2 implementation. Preserve their authored files, interactions and TCP evidence. Do not rerun the RDMA lab merely to obtain different numbers or a more convenient screenshot.

## 1. Common visual grammar

Use a stable bench across lessons 5–7: Server A on left, Server B on right, top lane application CPU executing program; application memory alongside, not inside a queue; local verbs/resource layer; provider/interface; separate cross-host network paths. The compact active mechanism should be visible before a large explanatory article, especially on mobile. Learners must be able to see two hosts together. Label physical versus software relationships explicitly. Existing host, TCP and RDMA primitives are the preferred basis; no new visualization framework.

Four distinguishable paths are essential:

| Path | Appearance | Meaning |
|---|---|---|
| Instruction | dashed arrow labelled post/describe | CPU submits work or describes a memory reference; not the message bytes |
| Payload | solid arrow with byte count or active byte range | provider accesses memory, packet transports message, provider places bytes |
| Control | dashed separate network lane labelled TCP | endpoint metadata, ready and done messages; no RDMA payload |
| Completion | dotted local arrow provider → CQ → app | reports outcome of local work; not a network ACK |

Use separate transport request/ACK/response arrows with explicit labels and direction. A READ request has zero application bytes; its response arrow is the payload path. A label is required, not just color. Provide keyboard focus and screen-reader descriptions of selected states. Avoid auto-advancing states, looping counters and generic play. Every control needs a named, observable state change. Keep text copy in its own readable column/section and reveal the relevant diagram near that copy. Don't create a separate card for each sentence.

An ideal operation state includes: objective, active source excerpt, active instruction (when relevant), two hosts, compact active packet and memory observation, and one meaningful action. Full source, MR inventory, decoded tree and raw bytes can be expandable. Keep line numbers visible and not clipped. In compact byte views label what is shown (e.g. first 16 of 53 bytes); provide full accessible hex/ASCII and explicit newline representation. Never use abbreviation as proof of full equality; compare full bytes in code.

## 2. State machine and evidence provenance

Each section has a stable ID (5.1 … 8.12). Keep state local to section or scope persistent operation state by experiment, section and revision. Navigating to a different experiment must reset that operation state. Back/forward/review/refresh should behave consistently and never leak selected QPN, RKEY, packet or prediction across experiments. If direct access is allowed, initialize only the minimal prerequisites and clearly identify recap, not falsely claim that earlier actions were observed. Optional feedback should be skippable; skipping must not count as mastery. Completion callbacks must mark completed lessons only according to the established guided rules; direct reference links must not bypass progress or produce a 404.

Use three distinct categories, visible in concise labels and an explanatory legend:

- **Recorded:** exact packet, event log, resource metadata, memory snapshot, verification. Preserve original identifiers and artifact links.
- **Source-derived:** code establishes e.g. allocation zero-initialization, local payload write, control call ordering. Not an independently sampled memory location or packet.
- **Conceptual:** queue occupancy, placement mechanism, CPU/device execution, access checks, missing receive, multi-packet/recovery, GPU paths. Not a measured time trace or a failed experiment.

All causal arrows must obey recorded local order and source control dependencies. `events.sequence` is local per host/role, not a global clock. Do not compare absolute cross-host timestamps to infer ordering. PCAP order at the capture point is separate. In SEND, B posts receive then sends ready; A receives ready then submits SEND. B polls then reads and verifies. A polls independently: do not assert which poll happened first. In WRITE, A's successful poll precedes its `write_done` send; B records receiving that message, then zero-entry poll, then memory read/verify. In READ, A's successful poll precedes local data verification, which precedes `read_done`; B receives that then polls. Control packets are not present in the isolated data capture. Source code and events establish control dependencies, not captured TCP frames in this RDMA experiment.

Distinguish pending conceptual WR, executed/consumed history, conceptual CQ entry pending, retrieved WC and actual application evidence. The actual events are emitted after post/poll calls; do not claim queue hardware was sampled. A specific zero-entry poll is not proof of an always-empty queue. No target receive CQE for ordinary WRITE; no responder-side ordinary READ CQE for servicing that operation. Separate operation completion and target application consumption/persistence. Keep existing corrected Chapter 16 semantics.

## 3. Authoritative evidence binding

Read `apps/web/public/practical/rdma/reference-evidence.json` through existing typed loaders (`rdmaEvidence.ts`, `rdmaCorrelations.ts`) and use validated stable IDs. The reference source snapshots live in `sources[]` with path and numbered lines. Resolve the exact source lines from the embedded snapshot, not a changed checkout. Use actual source excerpts, with valid line boundaries and expected code tokens. No missing-source placeholder may appear in the UI. Use real `protocolTree`, `bth`, optional `reth`, `rawHex`, `payloadHex`, `dataHex`, `udp`, `frameLength`, `capturedLength`, `correlations`. Do not mutate or duplicate evidence as an independent frontend constant table. The following values are audit anchors checked at baseline, not display data. The companion `evidence-anchors.json` provides stable references and expected values for validation.

| Experiment | A QPN → B QPN | Request | Reverse packet | Actual payload | Request PSN |
|---|---|---|---|---|---|
| SEND `send-recv` | 18 → 19 | `b:packet:3`, SEND Only | `b:packet:4`, ACK to 18 | 50 bytes | 512 |
| WRITE `write` | 19 → 20 | `c:packet:7`, RDMA WRITE Only | `c:packet:8`, ACK to 19 | 53 bytes | 768 |
| READ `read` | 20 → 21 | `d:packet:3`, RDMA READ Request | `d:packet:4`, READ response Only to 20 | request 0, response 46 | 1024 |

Same numerical QPN across runs is not the same resource. Scope all packet, work, memory and completion selection by experiment. A reference-run frame number is not a universal packet index. Preserve exact original file names and download paths from each experiment. `resources` run is a separate setup experiment with no data WRs/packets. Do not use its QPNs for SEND. Host A data IP 10.10.10.1, control IP 192.168.100.1; B .2 on respective networks. Resolve from `hosts`. Environment is two Ubuntu 24.04 KVM/QEMU guests, with RXE software transport. Use exact environment metadata if displayed.

### Source excerpt audit (snapshot paths)

| Explanation | Source path and lines | Expected anchors |
|---|---|---|
| Context / resources | `python/exp_b_send_recv.py` 50–72, 76–99 | `create_string_buffer`, `new_memory_region`, `make_qp`, `open_ib`, `PD`, `CQ`, `exchange_and_connect` |
| MR and QP associations | `python/rdma_common.py` 131–151 | `MR`, `ctypes.addressof`, `IBV_QPT_RC`, `scq=cq`, `rcq=cq`, `sq_sig_all=1` |
| QP ready / reliability | same 155–191 | `qp_access_flags`, `to_init`, `dest_qp_num`, `rq_psn`, `to_rtr`, `retry_cnt`, `rnr_retry`, `sq_psn`, `to_rts` |
| Polling | same 194–224 | `cq.poll(1)`, `IBV_WC_SUCCESS`, `TimeoutError` |
| TCP metadata protocol | same 227–236 | `sendall`, JSON newline, `readline`, `json.loads` |
| SEND B | `python/exp_b_send_recv.py` 104–121 | `SGE`, `RecvWR`, `post_recv`, `ready`, `poll_one_cqe`, `buf.raw`, `verify` |
| SEND A | same 128–145 | `ctrl_recv`, `mr.write`, `SGE`, `IBV_WR_SEND`, `post_send`, `poll_one_cqe` |
| WRITE metadata | `python/exp_c_write.py` 57–69, 83–116 | `rkey`, `addr`, `length`, conditional `share_mr`, `bring_qp_to_rts` |
| WRITE A | same 121–150 | `mr.write`, `IBV_WR_RDMA_WRITE`, `set_wr_rdma`, `post_send`, `poll_one_cqe`, `write_done` |
| WRITE B | same 155–171 | `write_done_signal`, `cq.poll(1)`, `buf.raw[:len(PAYLOAD)]`, `payload_ok` |
| READ preparation | `python/exp_d_read.py` 61–106 | `memset`, `memmove`, `buffer_before`, `len(SECRET)`, `bring_qp_to_rts` |
| READ A | same 110–134 | `SGE`, `IBV_WR_RDMA_READ`, `set_wr_rdma`, `post_send`, `poll_one_cqe`, `read_complete`, `read_done` |
| READ B | same 137–144 | `ready`, `read_done_signal`, `cq.poll(1)`, `source_cq_poll` |

Other references in the lesson specifications are narrower ranges within these. Validate all additional exact lines or symbol searches. Keep source comments in snapshots but explain misleading comments in authored text rather than editing the immutable evidence. In particular `exp_c_write.py:131–132` is not a reason to say RETH is invisible to a capture. `mr.write()` is a local Pyverbs memory helper; the remote WRITE is the opcode submitted to the SQ. The helper requests a single SGE per WR; do not demonstrate a multi-SGE operation as recorded.

### Length and payload audit

| Packet | Unpadded application payload | Pad | Captured RDMA data portion | Recorded frame length |
|---|---:|---:|---:|---:|
| SEND `b:packet:3` | 50 | 2 | 52 | 110 |
| SEND ACK `b:packet:4` | 0 | 0 | 0 | 62 |
| WRITE `c:packet:7` | 53 | 3 | 56 | 130 |
| WRITE ACK `c:packet:8` | 0 | 0 | 0 | 62 |
| READ request `d:packet:3` | 0 | 0 | 0 | 74 |
| READ response `d:packet:4` | 46 | 2 | 48 | 110 |

Use `packetLengthBreakdown()` (already fixed). Actual `payloadHex` includes final newline; `workRequests.payloadText` for SEND/WRITE is stripped text. Compare byte arrays or hex, not trimmed strings. Source bytes for A SEND/WRITE are source-derived/reconstructed, not independent memory snapshots. SEND B initial zero allocation is source-derived; after snapshot is 50 bytes. WRITE B initial snapshot is 64 dots; after event has key `first64` but actual 53-byte sample; compare common 53. READ B initial sample has 46 message bytes and 18 hashes; A result 46 bytes, no A before or B after measurement. The READ advertised length is 46, registration 4096. WRITE advertised length 4096, requested 53. Completion length from SEND/WRITE is a recorded RXE observation, not portable send-side WC semantics. Use WC status before other fields; distinguish `src_qp` validity (UD only) from actual RC local `qp_num`.

### Packet decoding boundaries

The existing `protocolTree` exposes Frame, Ethernet II, IPv4, UDP, BTH, optional RETH, optional RDMA data bytes. It does not separately decode AETH or ICRC. If an optional decoder detail is needed, derive from immutable original PCAP using installed TShark and validate byte offsets/fields against existing exports. Store additive separately labelled decoder artifact with checksum and exact TShark version/command; do not alter original RDMA reference JSON, original captures, digest or manifests. This is optional: no invented extension-field values. For known format conceptual header strips, explicitly label structural explanation vs observed decode. ACK and READ response Only use AETH in standard RC framing; no RETH. Avoid interpreting UDP checksum 0 as an Ethernet integrity failure. Avoid claiming FCS/preamble/interframe gap measured if absent.

## 4. Testing contract

Each section must have a real visual implementation mapped in a section fidelity matrix. Automated checks must inspect state or evidence values, not simply heading text. Use existing Playwright/CI pipeline and add operation-specific suite if needed; ensure it runs in GitHub Actions. Test complete guided flow, direct reference mode, restart/refresh, keyboard navigation and existing Foundations V2 regressions. Key assertions:

- SEND setup, B posted receive before A submits, B local description and A local source independent, no RETH in SEND, RQ consumed, A/B independent WC observations, B verified payload equals unpadded bytes including newline.
- No fake SEND before readiness; illustrative RNR scenario doesn't claim recorded packet or successful placement. No RNR counter/timestamp invented. Missing receive does not display a successful completion.
- WRITE source SGE length equals remote transfer length, remote tuple from B, RETH exact match, no target receive posted or consumed, A completion before TCP done, B poll then verification. B after sample has exactly 53 bytes and unobserved remainder. Prediction answer remains hidden until recorded poll; skip allowed, no mastery flag.
- READ A local destination B remote source, shared length 46 vs registration length 4096, request zero payload/RETH length 46, response reverse QPN and no RETH, source prefix/response/A verification exact match, A poll then verify then done then B zero-entry poll. No fake B application WR or CQE.
- WR and packet selectors use scoped identities, not raw QPN equality. Source selection updates runtime and corresponding packet field simultaneously; local-only fields show no corresponding transmitted field. Decimal/hex conversion exact (use string/BigInt for addresses where appropriate, never lossy JS Number for arbitrary 64-bit addresses).
- Packet inspector derived payload, padding, frame sizes match audit; RETH absent on SEND/ACK/READ response; actual raw/decoded fields; conceptual multi-packet range and PSN increments not mistaken for TCP byte numbering; no global cross-host timestamp inference.
- All investigation cases use genuine artifacts and answer-specific explanations; cannot accidentally show answer through hidden-state label; feedback after reveal or skip. No claims of learner mastery based on test results.
- No regressions in TCP or first four lessons; no modification to authored foundations sources. Verify all old deep links and advanced explorer.

Desktop (1440×900, 1280×800), tablet (768×1024) and mobile (390×844, 320/360 width) review: inspect full actual viewports, not just cropped components. Compact A/B + active arrow must be readable together; no clipped long values or footer overlap. Long source and packet hex may have clearly marked scroll/expand; no page-level overflow. Capture only representative screenshots for 5–8 with current commit, state, viewport in report. Test buttons produce meaningful changes. Use real content, no placeholder panels. Ensure primary next action is visible after core observation rather than advancing learner past unseen mechanism.

## 5. Evidence integrity and release stop

RDMA evidence digest `c4feb017e809cb1e7ac4ceb8fc007adec72cd31a2a57018ccc227f715aa7bd9e`; serialized RDMA JSON SHA-256 `f143ebcadf676e4505ca8d897dca95f4d11191d677f1f4c0f16c9b703eca1f25`; TCP JSON SHA-256 `c6cb497efbb1e91ac295c4215494273d797838a57ef6d046102769fb6a77c3e6`. Verify baseline and final checksums, deterministic export, public PCAP equality and existing tests. No new captures required. No new backend, privileged endpoints, live WR execution, production auth/publication configuration or production deployment. A preview is for human review, not proof of comprehension. This package does not include new PCAPs, source copies, visuals rendered as images or a deployed application. The existing evidence is already in the repo.
