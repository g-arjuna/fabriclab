# Claude Content Review Tracker

Purpose: track factual, logical, visualisation, and packaging concerns chapter by chapter.

Ownership:
- Final content decisions remain with Claude.
- Codex is using this file to log second-pass review findings, contradictions, completed cleanup work, and follow-up items.

Scope:
- Chapters `ch0` through `ch18`
- Educational prose, internal logic, linked visualisations, and chapter packaging/navigation
- Platform/runtime issues belong elsewhere and should not be tracked here

Legend:
- `Pending` = not yet reviewed in this pass
- `Reviewed` = chapter reviewed in the current pass, with remaining findings captured below
- `No issues yet` = reviewed in the current pass, with no substantive remaining findings

## Review Status Overview

| Chapter | Slug | Status | Notes |
|---|---|---|---|
| 0 | `ch0-hardware-foundations` | Reviewed | Main prose is aligned, but `DPUExplainerViz.tsx` still contradicts the H100/H200 adapter model and linked visuals retain learner-visible text artifacts |
| 1 | `ch1-os-platforms` | Reviewed | Prose and navigation are aligned, but several linked visuals still contain learner-visible mojibake-like text artifacts |
| 2 | `ch2-why-different` | No issues yet | Packaging cleaned; no substantive remaining concerns from the current pass |
| 3 | `ch3-the-cli` | No issues yet | Chapter 3 packaging corruption was fixed; no major remaining chapter-body issue isolated |
| 4 | `ch4-infiniband-operations` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 5 | `ch5-pfc-ecn-congestion` | No issues yet | Chapter-end polish and the one real checklist-viz encoding issue are now corrected |
| 6 | `ch6-efficient-load-balancing` | No issues yet | Packaging cleaned; no substantive remaining concerns from the current pass |
| 7 | `ch7-topology-design` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 8 | `ch8-nccl-performance` | No issues yet | Chapter MDX encoding normalized; no substantive remaining concern isolated in the current pass |
| 9 | `ch9-optics-cabling` | Reviewed | H200/B200 800G framing conflicts with current NVIDIA platform docs |
| 10 | `ch10-storage-fabric` | Reviewed | Prose corrected earlier; linked storage-path visuals still look stale |
| 11 | `ch11-monitoring-telemetry` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 12 | `ch12-nvlink-switch-system` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 13 | `ch13-alternative-topologies` | No issues yet | Chapter MDX encoding normalized; no substantive remaining chapter-body issue isolated |
| 14 | `ch14-gpu-hardware-generations` | Reviewed | Stale continue slug remains; linked visuals still leak BF3/B200 assumptions and visible mojibake |
| 15 | `ch15-ip-routing-ai-fabrics` | Reviewed | Main issue is stale next-chapter navigation slug |
| 16 | `ch16-gpu-compute-network-packet-anatomy` | Reviewed | Contains a real H200/BF3 regression and packet-path consistency problems |
| 17 | `ch17-storage-network-packet-path` | Reviewed | NVMe/RDMA transport details conflict across prose, visuals, and diagnostics |
| 18 | `ch18-oob-management-network` | Reviewed | OOB/storage boundary, SN2201 specs, B200 visual details, and terminal navigation all need correction |

---

## Cross-Chapter Packaging / Navigation Debt

These are not content-concept issues, but they are visible learner-facing defects:

1. Packaging cleanup completed in the current pass:
   - raw `</file>` markers were removed from the affected chapter MDX files
   - the embedded Chapter 8 block was removed from Chapter 3
   - chapter MDX files are now ASCII-normalized through Chapter 18

2. Several "Continue to Chapter ..." links are still stale or mismatched:
   - Chapter 14 continues to `/learn/ch15-ultra-ethernet-consortium`
   - Chapter 15 continues to `/learn/ch16-ultra-ethernet-consortium`
   - Chapter 18 continues to `/learn/ch19-ip-addressing-planning`, but no Chapter 19 exists in `apps/web/content/catalog.json`

---

## Cross-Chapter Encoding Status

Chapter MDX encoding cleanup is complete through Chapter 18.

What that means:
- the chapter source files no longer contain raw `</file>` packaging markers
- the chapter source files no longer contain the visible mojibake-like punctuation that was confusing first-pass review
- remaining encoding debt is now primarily in linked visualisation components rather than the chapter MDX bodies
- active examples still showing learner-visible mojibake-like sequences include:
  - `apps/web/components/visualisations/DPUExplainerViz.tsx`
  - `apps/web/components/visualisations/IndustryEvolutionViz.tsx`
  - `apps/web/components/visualisations/SoftwareStackViz.tsx`
  - `apps/web/components/visualisations/ConnectivityMapViz.tsx`
  - `apps/web/components/visualisations/StorageTopologyViz.tsx`
  - `apps/web/components/visualisations/GH200ArchViz.tsx`

---

## Cross-Chapter Hardware Model Debt

The following hardware model is the one the content should consistently follow unless a chapter is explicitly about a different platform family:

- DGX H100: storage/in-band management uses dual-port ConnectX-7
- DGX H200: storage/in-band management uses dual-port ConnectX-7
- DGX B200: storage/in-band management uses BlueField-3
- DGX GB200: storage/management uses BlueField-3

Likely stale files that still attach BlueField-3 too broadly or too early:

- `apps/web/components/visualisations/DPUExplainerViz.tsx`
- `apps/web/components/visualisations/DGXNetworkInterfacesViz.tsx`
- `apps/web/components/visualisations/StorageDataPathViz.tsx`
- `apps/web/components/visualisations/StorageSeparationViz.tsx`
- `apps/web/components/visualisations/StorageTopologyViz.tsx`
- `apps/web/components/visualisations/GPUFormFactorViz.tsx`
- `apps/web/components/visualisations/IndustryEvolutionViz.tsx`
- `apps/web/components/visualisations/BF3ManagementArchViz.tsx`
- `apps/web/content/knowledge/rocev2.ts`

Primary sources checked in the current pass:

- NVIDIA DGX BasePOD reference architecture (latest H100/H200/B200 release)
- NVIDIA DGX B200 user guide
- NVIDIA DGX GB200 networking guide
- NVIDIA SN2201 management switch manual
- NVM Express TCP transport specification revision 1.1


---

## Chapter 0 -- `ch0-hardware-foundations`

Status: `Reviewed`

### Current pass summary

1. Chapter MDX remains packaging-clean and ASCII-clean.
2. Two linked hardware-reference visuals are now aligned with the H100/H200 model:
   - `DGXAnatomyViz.tsx` labels the storage/in-band management adapters as dual-port ConnectX-7
   - `FullWiringViz.tsx` labels the storage fabric attachment as Slot1/Slot2 ConnectX-7 on H100/H200
3. `DPUExplainerViz.tsx` is still internally contradictory.
   - its explainer text says H100/H200 use dual-port ConnectX-7 for storage/in-band management
   - its "DGX H100 network adapters" table still lists `BlueField-3 x 2` in Slot1 / Slot2
4. Linked visuals still contain learner-visible mojibake-like sequences rather than being fully text-clean.

### Current verdict

- Chapter 0 prose is in better shape than its linked visuals.
- The remaining blocker is the still-contradictory `DPUExplainerViz.tsx` plus residual visual text cleanup.


---

## Chapter 1 -- `ch1-os-platforms`

Status: `Reviewed`

### Current pass summary

1. Chapter MDX remains packaging-clean and byte-clean.
2. The stale chapter-end navigation link has been corrected to Chapter 2.
3. The supporting visualisations were lightly harmonized in the current pass:
   - `SoftwareStackViz.tsx` now scopes the BlueField adapter workflow to later platforms such as DGX B200 rather than teaching it as part of the default H100/H200 stack.
   - `ConnectivityMapViz.tsx` now describes the storage fabric as the Slot1/Slot2 dual-port ConnectX-7 path, matching the chapter prose.
   - `FirstAccessViz.tsx` now frames the BlueField access flow as a later-platform/B200-class path rather than a standard H100/H200 bring-up step.
4. The chapter prose and device-role framing are directionally aligned, but several linked visuals still contain learner-visible mojibake-like sequences such as `â†’` and `â€”`.
   - examples: `SoftwareStackViz.tsx`, `ConnectivityMapViz.tsx`

### Current verdict

- Chapter 1 prose and navigation are in much better shape.
- The remaining issue is linked-visual text cleanup rather than chapter-body logic.

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

### Pass 3 corrections applied

1. **Lab route fixed** — `labLink` was `"/lab_2lab=lab5-nccl-diagnosis"` (packaging artifact corrupted `?`); corrected to `"/lab?lab=lab5-nccl-diagnosis"`.
2. **Throughput table aligned to NCCLTestOutputViz** — added `256 GPUs, 32 nodes (BasePOD)` row (130–160 GB/s, < 100 GB/s alarm) which matches the 32-node / 256-GPU viz data; relabelled the 32-GPU row as `32 GPUs, 4 nodes`; corrected hyphens to en-dashes throughout the table.

### Current verdict

- Chapter 8 is Clean after Pass 3 corrections.

---

## Chapter 9 -- `ch9-optics-cabling`

Status: `No issues yet`

### Factual issues

1. The optics generation table appears to overstate DGX H200 port speed.
   - `apps/web/content/chapters/ch9-optics-cabling.mdx` lines ~88-114 frame:
      - `800G per port -- the H200 and B200 (Blackwell) era`
      - `DGX H200 ... 400G or 800G`
   - Official NVIDIA DGX H100/H200 docs describe the H200 cluster cards as ConnectX-7 at up to 400Gbps and the storage/in-band cards as dual-port ConnectX-7 up to 400GbE.
   - The current wording reads as if DGX H200 itself exposes 800G NIC ports, which does not match the NVIDIA platform docs used elsewhere in the course.

2. The wording also blurs H200 and B200 into one "Blackwell-era" progression.
   - H200 is not a Blackwell product in the same sense B200 is.

3. The linked roadmap visuals repeat the same conflation.
   - `apps/web/components/visualisations/OpticsRoadmapViz.tsx` labels the 800G step as `B200 / H200 era`
   - `apps/web/components/visualisations/IndustryEvolutionViz.tsx` groups `DGX H200 / B200` under the same 800G/XDR step

### Visualisation / packaging issues

1. Chapter MDX encoding cleanup is complete in the current pass.
   - The earlier mojibake-like punctuation in the optics-generation section is now normalized.

### Pass 3 corrections applied

1. **CableSelectionViz speed selector** — `800G (DGX H200/B200)` corrected to `800G (DGX B200)`. DGX H200 uses 400G OSFP (ConnectX-7); only DGX B200 moves to 800G OSFP. Matches the correction applied to `FormFactorViz.tsx` in Pass 2.

### Current verdict

- Chapter 9 is Clean after Pass 3 correction. Remaining prose / roadmap-viz H200 claims are lower priority and tracked separately.

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
   - `apps/web/components/visualisations/StorageSeparationViz.tsx`
   - `apps/web/components/visualisations/StorageTopologyViz.tsx`

### Pass 3 corrections applied

1. **NVMeoFProtocolViz — description** (L68): removed "No host CPU involvement on the data path" and rewrote to accurately state CPU manages command queuing while CX7 handles data-path DMA. With GDS, data flows GPU HBM → CX7 → storage with no system RAM copies.
2. **NVMeoFProtocolViz — pros bullet** (L73): `"CX7 NIC handles all NVMe-oF data-path DMA without host CPU"` → `"CX7 NIC handles data-path DMA — host CPU manages command queuing only"`.
3. **StorageDataPathViz — beforeHops NIC label** (L13): `"DPU / NIC"` → `"ConnectX-7 NIC"`. H100/H200 storage path uses CX7 in NIC mode, not a DPU.

### Current verdict

- NVMeoFProtocolViz and StorageDataPathViz corrected. Remaining debt: `StorageSeparationViz.tsx` and `StorageTopologyViz.tsx` still need a BF3 model audit.

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
   - `GPUFormFactorViz.tsx` still says SXM platforms carry only CPU control traffic and BlueField-3 storage operations on PCIe, which is too broad for the H100/H200 baseline the prose now teaches.

### Visualisation / packaging issues

1. Learner-visible mojibake still remains in the Chapter 14 visual set.
   - `apps/web/components/visualisations/GPUFormFactorViz.tsx`
   - `apps/web/components/visualisations/NVLinkGenerationViz.tsx`
   - `apps/web/components/visualisations/GH200ArchViz.tsx`
   - Current rendered strings still include mojibake in place of dash, arrow, multiply, and not-equal symbols.

### Logical issues

1. The chapter-end next link is stale.
   - `apps/web/content/chapters/ch14-gpu-hardware-generations.mdx` line ~192
   - `[Continue to Chapter 15 ->](/learn/ch15-ultra-ethernet-consortium)`
   - The current Chapter 15 slug is `ch15-ip-routing-ai-fabrics`

### Current verdict

- Prose largely improved.
- Remaining debt is stale navigation plus a targeted generation-viz cleanup.

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

3. The chapter intro overcounts the routed path mechanics relative to the walkthrough that follows.
   - `apps/web/content/chapters/ch16-gpu-compute-network-packet-anatomy.mdx` line ~11 promises four header rewrites and three routing decisions.
   - The rest of the chapter models three Ethernet rewrites across Leaf1, SpineC, and Leaf4.

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

## Chapter 17 -- `ch17-storage-network-packet-path`

Status: `Reviewed`

### Factual issues

1. The NVMe/RDMA transport details are internally inconsistent and do not line up with the linked diagnostics.
   - `apps/web/content/chapters/ch17-storage-network-packet-path.mdx` line ~97 teaches discovery on TCP port `8009` even though the chapter is framed as NVMe-oF over RDMA.
   - The same chapter and two linked visuals hardcode UDP destination port `4791` for the storage data path:
     - `apps/web/content/chapters/ch17-storage-network-packet-path.mdx` line ~211
     - `apps/web/components/visualisations/NVMeOFCapsuleViz.tsx`
     - `apps/web/components/visualisations/StorageFrameAnatomyViz.tsx`
   - Meanwhile `StorageDiagnosticsViz.tsx` already teaches `nvme discover -t rdma ... -s 4420`, so the current chapter package is mixing TCP-discovery defaults, generic RoCEv2 defaults, and NVMe/RDMA-specific defaults.

2. The data-transfer direction for the checkpoint write is not taught consistently.
   - Early acts describe the target issuing RDMA Read against the initiator MR and the initiator replying with RDMA Read Response frames.
   - Later acts, visuals, and summary tables repeatedly switch to "RDMA Write is the data path" as if that were the canonical path for the same example.

### Logical issues

1. The diagnostics section mixes Ethernet storage guidance with tools or labels that do not match what the surrounding text says.
   - `apps/web/content/chapters/ch17-storage-network-packet-path.mdx` line ~367 uses `perfquery` on the storage NIC in a RoCEv2/Ethernet chapter.
   - `apps/web/content/chapters/ch17-storage-network-packet-path.mdx` line ~392 labels `nv show qos interface swp1 pfc` as "ECN marking statistics" even though that command name and the follow-up explanation are about PFC state.

### Visualisation issues

1. `apps/web/components/visualisations/NVMeOFCapsuleViz.tsx`
   - hardcodes UDP port `4791`
   - labels Phase 2 as "RDMA Write" while its own detail text says the target may issue RDMA Read against the initiator MR

2. `apps/web/components/visualisations/StorageFrameAnatomyViz.tsx`
   - hardcodes UDP destination port `4791`
   - frames the data phase as RDMA Write while the SQE explanation says the target performs RDMA Read against the published RKEY

### Pass 3 corrections applied

1. **Ch17 prose stray `?`** (L111): `"moves separately ?"` → `"moves separately —"`. The `?` was a packaging artifact corrupting an em-dash separating the two-phase capsule/data description.
2. **ComputeVsStorageFabricViz payload label** (L65): `"RDMA Write data (4MB block)"` → `"RDMA Read data (target-pull, 4MB block)"`. NVMe-oF RDMA uses target-pull (RDMA Read); BTH opcodes are 0x0D–0x10 (Read Response), not 0x06–0x08 (Write). Now consistent with ch17 prose, NVMeOFCapsuleViz detail text, and StorageFrameAnatomyViz.

### Current verdict

- Act 3 prose artifact and ComputeVsStorageFabricViz direction corrected. Remaining open items: port-number consistency (4791 vs 4420) in NVMeOFCapsuleViz and StorageFrameAnatomyViz, and the perfquery/PFC label issues in the diagnostics section.

---

## Chapter 18 -- `ch18-oob-management-network`

Status: `Reviewed`

### Factual issues

1. The chapter body understates the SN2201 uplink capability.
   - `apps/web/content/chapters/ch18-oob-management-network.mdx` line ~235
   - The chapter says the SN2201 has `4 x 25GbE SFP28 uplinks`.
   - NVIDIA's SN2201 manual describes `4 x 100GbE QSFP28` interfaces, with 25GbE available via breakout or adapters rather than as the native uplink description.

2. The BMC credential guidance appears wrong.
   - `apps/web/content/chapters/ch18-oob-management-network.mdx` line ~519
   - The chapter says default BMC credentials are printed on service-tag labels.
   - NVIDIA DGX BMC documentation describes factory defaults such as `admin/admin` before first-boot hardening rather than service-tag printed credentials.

3. The B200 management visual understates the B200 compute-fabric card count.
   - `apps/web/components/visualisations/BF3ManagementArchViz.tsx` says DGX B200 uses `4x single-port CX7 HCA`.
   - The current NVIDIA DGX B200 user guide describes `4 x OSFP ports for 8 x ConnectX-7 Single Port Cards`, so the visual currently teaches a smaller compute-NIC footprint than the platform guide.

4. The B200 BlueField-3 CPU-core count is understated in both chapter text and the comparison visual.
   - `apps/web/content/chapters/ch18-oob-management-network.mdx` says each BF3 has `eight Cortex-A78 cores`
   - `apps/web/components/visualisations/BF3ManagementArchViz.tsx` repeats `8x ARM Cortex-A78 cores`
   - Current NVIDIA BlueField-3 architecture docs describe BlueField-3 as a `16 Arm Cortex-A78 cores` platform.

### Logical issues

1. The chapter contradicts itself on whether DCGM telemetry belongs to the OOB fabric.
   - Early chapter framing:
     - `apps/web/content/chapters/ch18-oob-management-network.mdx` lines ~43-45
     - `apps/web/components/visualisations/ThreeFabricMapViz.tsx`
   - Later chapter framing:
     - `apps/web/content/chapters/ch18-oob-management-network.mdx` lines ~400-403
   - The chapter intro and `ThreeFabricMapViz.tsx` place DCGM telemetry on the OOB fabric, but the later telemetry section correctly says DCGM scraping is in-band over the DGX Ethernet path.

2. The chapter-end navigation points to a route that does not exist in the repo or catalog.
   - `apps/web/content/chapters/ch18-oob-management-network.mdx` line ~592 links to `/learn/ch19-ip-addressing-planning`
   - `apps/web/content/catalog.json` currently ends at Chapter 18

### Visualisation issues

1. `ThreeFabricMapViz.tsx`
   - repeats the same OOB/DCGM misclassification as the chapter intro
   - teaches `DCGM` as part of the OOB fabric purpose even though the later chapter text correctly says telemetry is in-band

### Current verdict

- The chapter body direction looks workable, but it now has concrete OOB/storage-boundary and hardware-spec defects that need correction before it becomes the canonical management reference.
- The terminal navigation state also needs an explicit decision: add Chapter 19 or make Chapter 18 the current endpoint.

---

## Suggested Claude Priority Order

1. Chapter 17 NVMe/RDMA transport correction
   - align discovery/data-port teaching, RDMA Read vs RDMA Write direction, and storage diagnostics

2. H100/H200 vs BF3 visual harmonization
   - Chapters 10, 14, 16, 18

3. Chapter 16 packet-walk consistency
   - fix the rail mapping, identity-count mismatch, and TTL explanation

4. Navigation polish
   - Chapter 14 next slug
   - Chapter 15 next slug
   - Chapter 18 terminal link / endpoint decision

5. Chapter 9 hardware-generation correction
   - H200 vs B200 optics / 800G framing across prose and roadmap visuals

6. Residual visual cleanup
   - remove remaining broad BF3 assumptions from generation and hardware-reference visuals
   - clean remaining mojibake-like text artifacts in active linked visualisations
