# RDMA practical frontend

This document describes the evidence-driven implementation behind **RDMA From First Principles — From Python Code to Packets on the Wire**.

The practical is an interactive replay of a verified RDMA execution. It does not execute Python, Docker, KVM, RDMA, or packet-capture tooling in the browser or during the normal web build. It consumes a versioned static JSON bundle generated offline from the committed two-VM Soft-RoCE reference run.

## Architecture

```text
labs/rdma-basics/evidence/reference-run/
  hosta-events.jsonl
  hostb-events.jsonl
  verification.json
  environment.json
  packet-analysis.txt
  SHA256SUMS
  send-recv.pcap
  rdma-write.pcap
  rdma-read.pcap
        |
        v
labs/rdma-basics/scripts/export_browser_evidence.py
  - validates the evidence and checksum manifest
  - decodes pcaps with the shared validator/tshark helpers
  - parses both hosts' JSONL logs
  - correlates verbs events, work requests, packets, memory and completions
  - emits deterministic browser-evidence schema v1
        |
        v
apps/web/public/practical/rdma/reference-evidence.json
apps/web/public/practical/rdma/send-recv.pcap
apps/web/public/practical/rdma/rdma-write.pcap
apps/web/public/practical/rdma/rdma-read.pcap
        |
        v
apps/web/lib/practical/rdmaEvidence.ts
apps/web/components/practical/RdmaPractical.tsx
        |
        v
/practical and /practical/rdma
```

The static bundle and pcaps are committed so a normal Vercel build does not require Python, Docker, KVM, or tshark.

## Routes

- `/practical` — public landing page introducing practical protocol learning through code and recorded packets.
- `/practical/rdma` — interactive RDMA walkthrough. RDMA WRITE is the default experiment.

Supported deep links:

- `/practical/rdma?experiment=resources`
- `/practical/rdma?experiment=send-recv`
- `/practical/rdma?experiment=write`
- `/practical/rdma?experiment=read`

The public top navigation includes a **Practical** link. The routes are public and do not require Supabase credentials.

## Evidence schema

The generated bundle uses schema version `1`, documented in:

- `labs/rdma-basics/schemas/browser-evidence-v1.json`

Top-level fields include:

- `schemaVersion`
- `source` metadata and validation status
- `provenance`, including evidence and environment digests plus generation metadata
- `clockModel`
- `environment`
- `hosts`
- `sources`, including exact source snapshots used by the reference scripts
- `experiments`

Each experiment contains stable identifiers and records for:

- endpoints and asymmetric QPN/PSN direction
- memory regions, exact address/LKEY/RKEY representations, and before/after snapshots where evidence exists
- work requests, including WR IDs and local/remote memory metadata
- decoded packet records and protocol trees
- completions and WR-ID correlation
- control-channel metadata events
- verification status
- optional pcap download metadata
- a causal walkthrough used by the UI

Large integers and nanosecond timestamps are represented as decimal strings. Important integers also carry hexadecimal strings in an `exactInteger` object, avoiding JavaScript floating-point precision loss while preserving readable display values.

## Correlation model

The exporter derives relationships rather than copying display constants into React components.

For RDMA WRITE it correlates:

- the writer's posted work request
- the target/responder destination QPN in the WRITE request
- request PSN
- RETH remote virtual address
- RKEY
- DMA length
- target memory before/after evidence
- the writer's signalled completion
- the reverse ACK, using the writer/initiator destination QPN and acknowledged request PSN

For RDMA READ it correlates:

- the reader's posted READ work request
- the source/responder destination QPN in the READ request
- remote address and RKEY
- the READ response addressed back to the reader
- the response PSN relationship to the originating request
- the reader completion

For completions it correlates by host and WR ID, then records opcode, status, byte length, queue number and whether this is a target receive completion.

The frontend intentionally distinguishes:

- LKEY from RKEY
- local QPN from remote/destination QPN
- WR ID from PSN
- a CQE from a network packet
- a verbs work request from a provider-specific physical WQE representation

`wr_id` and LKEY are application/verbs metadata and are not presented as RoCEv2 wire-header fields.

## Clock and ordering limitations

The two reference VMs did not have precision-synchronized clocks. Therefore the UI does not merge Host A, Host B and packet timestamps into a claimed nanosecond-accurate global trace.

The exporter instead constructs a causal walkthrough of the recorded run using:

- per-process event order
- explicit control-channel metadata events
- protocol dependencies
- packet direction
- work-request relationships
- completion relationships
- memory before/after evidence

The interface labels the playback as a causal replay of a verified reference execution. The TCP control channel is represented only through application metadata events; the pcaps contain the RDMA data interface and do not include fabricated control-channel packets.

## Frontend structure

Primary files:

- `apps/web/app/practical/page.tsx` — practical landing page.
- `apps/web/app/practical/rdma/page.tsx` — RDMA route and metadata.
- `apps/web/components/practical/RdmaPractical.tsx` — interactive client component.
- `apps/web/lib/practical/rdmaEvidence.ts` — typed access to the generated bundle.
- `apps/web/public/practical/rdma/reference-evidence.json` — generated browser bundle.
- `apps/web/public/practical/rdma/*.pcap` — downloadable reference captures.
- `apps/web/components/layout/PublicTopNav.tsx` — public navigation integration.

The client component coordinates:

- experiment selection and deep-link initialisation
- start/previous/next/play/pause/restart controls
- playback speed
- direct step selection
- source snippets and line highlighting
- host/endpoint topology
- endpoint resource state
- event/packet/completion selection
- packet inspector protocol tree and capture-derived raw bytes
- memory before/after panels
- control-plane versus data-plane emphasis
- evidence provenance and pcap downloads

Panels use stable test ids for regression tests. Mobile layouts stack the workspace and prevent the source panel from forcing page-level horizontal scrolling.

## Guided experiments

1. **From Python Objects to RDMA Resources** (`resources`) — context, protection domain, memory registration, CQ, QP, GID metadata and RESET → INIT → RTR → RTS setup. It deliberately has no data-transfer pcap because no data work request is posted.
2. **Two-Sided RDMA: SEND and RECEIVE** (`send-recv`) — posted receive buffer, sender work request, genuine SEND and ACK packets, receiver payload verification and sender/receiver completions.
3. **One-Sided RDMA: Writing Directly Into Remote Memory** (`write`) — default demonstration. Shows target memory before, control-channel address/RKEY metadata, the posted WRITE, genuine WRITE Only and ACK packets, target memory after, and the writer-local completion.
4. **One-Sided RDMA: Reading Remote Memory** (`read`) — request/response semantics, genuine READ Request and READ Response Only packets, and reader verification.

For ordinary RDMA WRITE the UI explicitly teaches that the target does not post or consume a receive WR and does not receive a normal target receive CQE. The TCP control channel synchronises the applications; it neither carries the RDMA payload nor causes the memory mutation.

## Regenerating evidence

From the repository root:

```bash
python3 labs/rdma-basics/scripts/export_browser_evidence.py \
  --output apps/web/public/practical/rdma/reference-evidence.json
```

The exporter:

1. validates the reference evidence;
2. validates exact SHA256SUMS coverage and digest matches;
3. parses `hosta-events.jsonl` and `hostb-events.jsonl`;
4. decodes the three committed pcaps with `tshark`;
5. verifies verification status for the four experiments;
6. writes deterministic JSON and copies the pcaps beside it.

The command fails with a clear error if evidence is missing, malformed, unverified or checksum-inconsistent. Do not hand-edit the generated JSON.

## Validation commands

Evidence exporter and Python regression suite:

```bash
python3 -m unittest discover -s labs/rdma-basics/tests -v
python3 labs/rdma-basics/scripts/export_browser_evidence.py --output /tmp/reference-evidence-check.json --no-copy-assets
cmp /tmp/reference-evidence-check.json apps/web/public/practical/rdma/reference-evidence.json
```

Reference evidence validation and checksums:

```bash
cd labs/rdma-basics
./scripts/validate-evidence.sh evidence/reference-run --verify-checksums
cd evidence/reference-run
sha256sum -c SHA256SUMS
```

Web checks:

```bash
cd apps/web
npm ci
npx tsc --noEmit --project tsconfig.json
npm run build
npm start
npx playwright test tests/rdma.practical.smoke.spec.ts
```

The Playwright suite covers public access, bundle availability, experiment switching and deep links, playback controls, speed selection, code highlighting, packet-to-completion correlation, memory before/after, ordinary WRITE target-CQE semantics, capture downloads, mobile overflow and browser console/hydration errors.

## Source files

Runtime and evidence source:

- `labs/rdma-basics/python/rdma_common.py`
- `labs/rdma-basics/python/exp_a_resources.py`
- `labs/rdma-basics/python/exp_b_send_recv.py`
- `labs/rdma-basics/python/exp_c_write.py`
- `labs/rdma-basics/python/exp_d_read.py`
- `labs/rdma-basics/evidence/reference-run/`

Pipeline and tests:

- `labs/rdma-basics/scripts/export_browser_evidence.py`
- `labs/rdma-basics/scripts/validate_evidence.py`
- `labs/rdma-basics/schemas/browser-evidence-v1.json`
- `labs/rdma-basics/tests/test_browser_evidence_export.py`
- `apps/web/tests/rdma.practical.smoke.spec.ts`

## Known limitations

- Soft-RoCE is a software RoCE implementation. This evidence is not hardware-RNIC performance evidence.
- Transfers are deliberately small teaching transfers.
- QPNs, PSNs, memory addresses and keys are run-specific reference values, not reusable constants.
- Cross-host timestamps are not precision-synchronized.
- The control channel is separate TCP communication and is absent from the data-interface pcaps.
- The browser replays committed evidence; it does not execute Python or control the lab VMs.
- The packet inspector is Wireshark-like in presentation, but it is not a live Wireshark session.
- Experiment A intentionally has no data-transfer capture.

## Future improvements

- Add schema-aware TypeScript generation rather than maintaining parallel TypeScript interfaces.
- Add keyboard-only end-to-end assertions beyond focus visibility.
- Add richer glossary interactions and printable study notes.
- Add optional pcap frame comparisons against a user-opened capture in Wireshark.
- Add additional reference runs, including larger transfers and hardware RNIC evidence when available.
