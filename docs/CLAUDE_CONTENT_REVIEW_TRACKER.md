# Claude Content Review Tracker

Purpose: track factual, logical, visualisation, and packaging concerns chapter by chapter.

Ownership:
- Final content decisions remain with Claude.
- Codex is using this file to log second-pass review findings, contradictions, completed cleanup work, and follow-up items.

Scope:
- Chapters `ch0` through `ch16`
- Educational prose, internal logic, linked visualisations, and chapter packaging/navigation
- Platform/runtime issues belong elsewhere and should not be tracked here

Legend:
- `Pending` = not yet reviewed in this pass
- `Reviewed` = chapter reviewed in the current pass, with remaining findings captured below
- `No issues yet` = reviewed in the current pass, with no substantive remaining findings

## Review Status Overview

| Chapter | Slug | Status | Notes |
|---|---|---|---|
| 0 | `ch0-hardware-foundations` | No issues yet | Prose and linked visuals now aligned on H100/H200 storage/in-band management |
| 1 | `ch1-os-platforms` | No issues yet | Prose, supporting visuals, and chapter navigation are now aligned for H100/H200 foundational framing |
| 2 | `ch2-why-different` | No issues yet | Packaging cleaned; no substantive remaining concerns from the current pass |
| 3 | `ch3-the-cli` | No issues yet | Chapter 3 packaging corruption was fixed; no major remaining chapter-body issue isolated |
| 4 | `ch4-infiniband-operations` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 5 | `ch5-pfc-ecn-congestion` | No issues yet | Chapter-end polish and the one real checklist-viz encoding issue are now corrected |
| 6 | `ch6-efficient-load-balancing` | No issues yet | Packaging cleaned; no substantive remaining concerns from the current pass |
| 7 | `ch7-topology-design` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 8 | `ch8-nccl-performance` | No issues yet | Chapter MDX encoding normalized; no substantive remaining concern isolated in the current pass |
| 9 | `ch9-optics-cabling` | Reviewed | H200/800G generation wording still needs fact check; chapter MDX encoding is now clean |
| 10 | `ch10-storage-fabric` | Reviewed | Prose corrected earlier; linked storage-path visuals still look stale |
| 11 | `ch11-monitoring-telemetry` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 12 | `ch12-nvlink-switch-system` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 13 | `ch13-alternative-topologies` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 14 | `ch14-gpu-hardware-generations` | Reviewed | Prose mostly corrected; linked visuals still need audit; stale continue slug remains |
| 15 | `ch15-ip-routing-ai-fabrics` | Reviewed | Main issue is stale next-chapter navigation slug |
| 16 | `ch16-gpu-compute-network-packet-anatomy` | Reviewed | Contains a real H200/BF3 regression and packet-path consistency problems |

---

## Cross-Chapter Packaging / Navigation Debt

These are not content-concept issues, but they are visible learner-facing defects:

1. Packaging cleanup completed in the current pass:
   - raw `</file>` markers were removed from the affected chapter MDX files
   - the embedded Chapter 8 block was removed from Chapter 3
   - chapter MDX files are now ASCII-normalized through Chapter 16

2. Several "Continue to Chapter ..." links are still stale or mismatched:
   - Chapter 14 continues to `/learn/ch15-ultra-ethernet-consortium`
   - Chapter 15 continues to `/learn/ch16-ultra-ethernet-consortium`
   - Chapter 5 renders a broken label: `Continue to Chapter 6 ?`

---

## Cross-Chapter Encoding Status

Chapter MDX encoding cleanup is complete through Chapter 16.

What that means:
- the chapter source files no longer contain raw `</file>` packaging markers
- the chapter source files no longer contain the visible mojibake-like punctuation that was confusing first-pass review
- remaining encoding debt, if any, is now primarily in older linked visualisation components rather than the chapter MDX bodies

---

## Cross-Chapter Hardware Model Debt

The following hardware model is the one the content should consistently follow unless a chapter is explicitly about a different platform family:

- DGX H100: storage/in-band management uses dual-port ConnectX-7
- DGX H200: storage/in-band management uses dual-port ConnectX-7
- DGX B200: storage/in-band management uses BlueField-3
- DGX GB200: storage/management uses BlueField-3

Likely stale files that still attach BlueField-3 too broadly or too early:

- `apps/web/components/visualisations/DPUExplainerViz.tsx`
- `apps/web/components/visualisations/DGXAnatomyViz.tsx`
- `apps/web/components/visualisations/FullWiringViz.tsx`
- `apps/web/components/visualisations/DGXNetworkInterfacesViz.tsx`
- `apps/web/components/visualisations/StorageDataPathViz.tsx`
- `apps/web/components/visualisations/StorageSeparationViz.tsx`
- `apps/web/components/visualisations/StorageTopologyViz.tsx`
- `apps/web/content/knowledge/rocev2.ts`


---

## Chapter 0 -- `ch0-hardware-foundations`

Status: `No issues yet`

### Current pass summary

1. Chapter MDX remains packaging-clean and ASCII-clean.
2. The linked visual alignment issues were corrected in the current pass:
   - `DPUExplainerViz.tsx` no longer claims DGX H100/H200 have BlueField-3 storage adapters
   - `DGXAnatomyViz.tsx` now labels the storage/in-band management adapters as dual-port ConnectX-7
   - `FullWiringViz.tsx` now labels the storage fabric attachment as Slot1/Slot2 ConnectX-7 on H100/H200
3. The remaining non-ASCII characters in the visual files are normal punctuation and arrows, not mojibake corruption.

### Current verdict

- Chapter 0 is in good shape after the current pass.
- No substantive remaining Chapter 0 blocker is isolated at this time.


---

## Chapter 1 -- `ch1-os-platforms`

Status: `No issues yet`

### Current pass summary

1. Chapter MDX remains packaging-clean and byte-clean.
2. The stale chapter-end navigation link has been corrected to Chapter 2.
3. The supporting visualisations were lightly harmonized in the current pass:
   - `SoftwareStackViz.tsx` now scopes the BlueField adapter workflow to later platforms such as DGX B200 rather than teaching it as part of the default H100/H200 stack.
   - `ConnectivityMapViz.tsx` now describes the storage fabric as the Slot1/Slot2 dual-port ConnectX-7 path, matching the chapter prose.
   - `FirstAccessViz.tsx` now frames the BlueField access flow as a later-platform/B200-class path rather than a standard H100/H200 bring-up step.
4. Byte-level inspection showed that the suspected visual "mojibake" was normal Unicode punctuation and arrows, not actual encoding corruption.

### Current verdict

- Chapter 1 is in good shape after the current pass.
- No substantive remaining Chapter 1 blocker is isolated at this time.

---

## Chapter 2 -- `ch2-why-different`

Status: `No issues yet`

### Current pass summary

1. Chapter MDX remains packaging-clean and ASCII-clean.
2. The linked visualisations checked in the current pass:
   - `AllReduceBarrierViz.tsx`
   - `TailLatencyViz.tsx`
   remain logically aligned with the chapter's barrier/tail-latency framing.
3. Byte-level inspection showed the visual files contain normal Unicode math / dash symbols rather than actual mojibake corruption.

### Current verdict

- Chapter 2 is in good shape after the current pass.
- No substantive remaining Chapter 2 blocker is isolated at this time.

---

## Chapter 3 -- `ch3-the-cli`

Status: `No issues yet`

### Current pass summary

1. The structural packaging corruption found in the first pass remains fixed.
   - Chapter 3 no longer carries an embedded copy of Chapter 8.
   - The chapter now ends on its own Lab 0 transition as intended.
2. The chapter body remains directionally coherent after the recent switch-side `swp*` corrections.
3. Byte-level inspection across the linked visualisation set found normal Unicode arrows/dashes but no actual mojibake corruption.
4. No broken next-chapter navigation or packaging artifact is present in the current pass.

### Current verdict

- Chapter 3 is in good shape after the current pass.
- No substantive remaining Chapter 3 blocker is isolated at this time.

---

## Chapter 4 -- `ch4-infiniband-operations`

Status: `No issues yet`

### Current pass summary

1. Chapter MDX remains packaging-clean and its chapter-end navigation to Chapter 5 is intact.
2. Linked visualisations checked in the current pass:
   - `IBvEthernetMindsetViz.tsx`
   - `ONYXNavigationViz.tsx`
   - `IBPortStatusViz.tsx`
   - `IBCountersViz.tsx`
   - `CounterRootCauseViz.tsx`
   - `SubnetManagerViz.tsx`
   - `RoutingAlgorithmViz.tsx`
   - `IBDiagnetOutputViz.tsx`
   - `UFMEventLogViz.tsx`
3. Byte-level inspection of the linked visuals showed normal Unicode arrows/dashes/symbols but no chapter-level packaging or navigation defect that needs a minor cleanup pass right now.

### Current verdict

- Chapter 4 is in good shape after the current pass.
- No substantive remaining Chapter 4 blocker is isolated at this time.

---

## Chapter 5 -- `ch5-pfc-ecn-congestion`

Status: `No issues yet`

### Current pass summary

1. The recent switch-side `swp*` corrections still look directionally right.
2. The chapter-end navigation label has been corrected to Chapter 6.
3. A real encoding defect in `RoCEv2ConfigChecklist.tsx` was corrected in the current pass:
   - broken checkbox / expander glyphs were replaced with clean Unicode symbols
4. The remaining non-ASCII characters in the linked visual set are normal arrows, dashes, and math/symbol characters rather than mojibake corruption.

### Current verdict

- Chapter 5 is in good shape after the current pass.
- No substantive remaining Chapter 5 blocker is isolated at this time.

---

## Chapter 6 -- `ch6-efficient-load-balancing`

Status: `No issues yet`

### Factual issues

- No substantive first-pass factual issues found after the recent `swp*` corrections.

### Logical issues

- No substantive first-pass logical issues found.

### Current verdict

- Content looks stable.
- The earlier packaging artifact has already been removed.

---

## Chapter 7 -- `ch7-topology-design`

Status: `No issues yet`

### Current verdict

- Chapter MDX encoding is now normalized to ASCII.
- No substantive factual or logical problem was isolated in the current pass.

---

## Chapter 8 -- `ch8-nccl-performance`

Status: `No issues yet`

### Factual issues

- No major NCCL concept contradiction was isolated in the current pass.

### Logical issues

1. The earlier Chapter 3 duplication problem has been fixed.
   - Chapter 8 is no longer embedded inside Chapter 3's source.

### Visualisation / packaging issues

1. Chapter MDX encoding cleanup is complete in the current pass.
   - The chapter body no longer has the mojibake-like punctuation that made the first-pass review hard to trust.

### Current verdict

- Chapter 8 is now packaging-clean and ASCII-normalized.
- No additional chapter-body issue was isolated in the current pass.

---

## Chapter 9 -- `ch9-optics-cabling`

Status: `Reviewed`

### Factual issues

1. The optics generation table appears to overstate DGX H200 port speed.
   - `apps/web/content/chapters/ch9-optics-cabling.mdx` lines ~88-114 frame:
     - `800G per port -- the H200 and B200 (Blackwell) era`
     - `DGX H200 ... 400G or 800G`
   - This is at least suspicious against the rest of the course, which treats DGX H200 as ConnectX-7 / 400G-era hardware.
   - Claude should decide whether H200 is being used here as a broad market-era label or whether the chapter should strictly stick to DGX H200 hardware reality.

2. The wording also blurs H200 and B200 into one "Blackwell-era" progression.
   - H200 is not a Blackwell product in the same sense B200 is.

### Visualisation / packaging issues

1. Chapter MDX encoding cleanup is complete in the current pass.
   - The earlier mojibake-like punctuation in the optics-generation section is now normalized.

### Current verdict

- Needs a targeted fact check on the H200/800G claims.
- Encoding cleanup is complete; the main remaining question is the H200/800G framing.

---

## Chapter 10 -- `ch10-storage-fabric`

Status: `Reviewed`

### Factual issues

1. The prose corrections from Patch R2 are directionally right.
   - The chapter now distinguishes:
     - H100/H200 host-CPU NVMe-oF initiator on CX7
     - B200 BF3 model

### Logical issues

1. The chapter prose and linked visuals are no longer aligned.
   - The text teaches the corrected H100/H200 storage model.
   - The linked visualisations still appear built around the older BF3-centered data path.

### Visualisation / packaging issues

1. Likely stale visualisation set:
   - `apps/web/components/visualisations/StorageDataPathViz.tsx`
   - `apps/web/components/visualisations/StorageSeparationViz.tsx`
   - `apps/web/components/visualisations/StorageTopologyViz.tsx`

### Current verdict

- Prose looks much better.
- Chapter 10 now mainly needs a dedicated storage-visual rewrite pass.

---

## Chapter 11 -- `ch11-monitoring-telemetry`

Status: `No issues yet`

### Current verdict

- Chapter MDX encoding is now normalized to ASCII.
- No substantive factual or logical problem was isolated in the current pass.

---

## Chapter 12 -- `ch12-nvlink-switch-system`

Status: `No issues yet`

### Current verdict

- Chapter MDX encoding is now normalized to ASCII.
- No substantive factual or logical problem was isolated in the current pass.

---

## Chapter 13 -- `ch13-alternative-topologies`

Status: `No issues yet`

### Current verdict

- Chapter MDX encoding is now normalized to ASCII.
- No substantive factual or logical problem was isolated in the current pass.

---

## Chapter 14 -- `ch14-gpu-hardware-generations`

Status: `Reviewed`

### Factual issues

1. The prose corrections from Patch R2 are mostly aligned with the H100/H200 vs B200 distinction.

2. Remaining review risk is concentrated in linked generation visuals rather than the main prose.
   - Likely audit targets:
     - `apps/web/components/visualisations/IndustryEvolutionViz.tsx`
     - `apps/web/components/visualisations/GPUFormFactorViz.tsx`
     - `apps/web/components/visualisations/GH200ArchViz.tsx`

### Logical issues

1. The chapter-end next link is stale.
   - `apps/web/content/chapters/ch14-gpu-hardware-generations.mdx` line ~192
   - `[Continue to Chapter 15 ->](/learn/ch15-ultra-ethernet-consortium)`
   - The current Chapter 15 slug is `ch15-ip-routing-ai-fabrics`

### Current verdict

- Prose largely improved.
- Remaining debt is stale navigation plus linked visual audit.

---

## Chapter 15 -- `ch15-ip-routing-ai-fabrics`

Status: `Reviewed`

### Factual issues

- No major first-pass factual issues found in the main routing-protocol content.
- The earlier storage-fabric wording in Flex Algo 129 appears corrected toward Slot1/Slot2 storage cards.

### Logical issues

1. The chapter-end next link is stale.
   - `apps/web/content/chapters/ch15-ip-routing-ai-fabrics.mdx` line ~214
   - `[Continue to Chapter 16 ->](/learn/ch16-ultra-ethernet-consortium)`
   - The actual Chapter 16 slug is `ch16-gpu-compute-network-packet-anatomy`

### Current verdict

- Routing content appears stable in the current pass.
- Navigation still needs correction.

---

## Chapter 16 -- `ch16-gpu-compute-network-packet-anatomy`

Status: `Reviewed`

### Factual issues

1. H200 is incorrectly grouped with GB200 as introducing BlueField-3 storage/management.
   - `apps/web/content/chapters/ch16-gpu-compute-network-packet-anatomy.mdx`
   - `apps/web/components/visualisations/DGXNetworkInterfacesViz.tsx`
   - This conflicts with the H100/H200 hardware model already established elsewhere in the course.

2. The section on ConnectX-7 dual-mode behavior overstates the relationship between the switch and NIC mode selection.
   - The wording says the switch determines the mode and the NIC adapts.
   - The surrounding explanation and `mlxconfig` usage imply explicit NIC-side configuration.

### Logical issues

1. The packet journey breaks its own rail-optimized mapping.
   - Early chapter rule: GPU `n` / HCA `n` maps to Leaf `n`
   - Later example path:
     - source HCA0 appears on `Leaf1`
     - destination HCA0 appears behind `Leaf4`

2. The chapter says DGX H100 has four distinct network identities, but the main visualisation models only three.
   - Prose separates:
     - compute
     - OOB/storage
     - host management
     - BMC
   - Viz collapses this into three tabs

3. TTL accounting is inconsistent.
   - Final TTL is given as 61
   - Some text describes that as two decrements
   - Other supporting explanation implies three routed decrements

### Visualisation issues

1. `DGXNetworkInterfacesViz.tsx`
   - repeats the H200 -> BF3 storage claim
   - also presents three identities where the prose presents four

2. `WiresharkCaptureViz.tsx`
   - capture path labels encode the same leaf-number inconsistency as the prose
   - TTL / hop count commentary also appears internally inconsistent


---

## Suggested Claude Priority Order

1. H100/H200 vs BF3 visual harmonization
   - Chapters 0, 1, 10, 14, 16

2. Chapter 16 packet-walk consistency
   - fix the rail mapping, identity-count mismatch, and TTL explanation

3. Navigation polish
   - Chapter 1 next link
   - Chapter 5 label
   - Chapter 14 next slug
   - Chapter 15 next slug

4. Follow-up fact check
   - Chapter 9 H200/800G framing

5. Older visualisation encoding cleanup
   - especially Chapter 1 linked visuals
