# Implementation-ready visual and evidence contract

This document specifies the visual work. The instructional copy in 01–04 is already written. The developer is responsible for implementation and recorded artifacts, not authoring new explanations.

## Persistent visual language

Use a small consistent set of reusable components rather than one new panel per paragraph. The learner must recognize the same host, buffers, and connection as they advance. Default visualization is a physical host plus a focused logical overlay, not multiple competing dashboards. Use text labels in addition to color. Prefer SVG/HTML with actual responsive layout and state, not static generated diagrams for mechanisms. Do not use image generation to create evidence. All diagrams with invented addresses, byte groupings or mappings say **Conceptual illustration**. All captures say **Recorded experiment**, and distinguish hardware illustrations from VM observations.

| Element | Display contract |
|---|---|
| CPU | physical processor; a badge identifies user or kernel instructions currently executing; never a separate 'kernel CPU' |
| Kernel | software responsibility/privilege layer; it executes on CPU and manages mappings, sockets, drivers |
| RAM | physical memory drawn once per host; logical views show process and kernel-managed ranges mapped into it |
| Byte cell | stable hex and ASCII where useful; offset labels; source unchanged after copy |
| Address | virtual, physical page, device address, IP and QPN each explicitly labelled |
| Payload movement | solid labelled arrow with direction between data-bearing nodes, via CPU or device as appropriate |
| Instruction/control | dashed labelled arrow; syscall, descriptor, WR, metadata exchange; never mistaken for payload |
| Address translation/reference | thin dotted mapping arrow with explicit label; not movement of bytes |
| Device | hardware NIC vs logical RXE provider separated; no invented hardware on VM |
| Socket | kernel object associated with FD and connection; send/receive storage is logical range accounting, not a guaranteed contiguous memory array |
| TCP segment | header + sequence range + actual payload; ACK not app consumption |
| MR | registration metadata associated with existing memory, not a copy |
| QP | logical SQ/RQ + endpoint state; CQ separate |
| WR | instruction; source/dest memory descriptions; history outside pending queue |
| Observed completion | separate app-observed result after poll; not still pending in CQ |

## Stage and layout contract

Use the section titles and learner copy in 01–04. Break long sub-sections into a main visible explanation and explicitly defined reveals, not arbitrary text-only states. In the initial host architecture lesson, no RDMA resource diagrams appear before host memory is established. Maintain one dominant action, plus Back, compact outline and optional Inspect. A learner should see the active explanation and relevant diagram in proximity; the original text can be placed at the exact node being explained. The main technical explanation must not be hidden behind Inspect. No autoplay. Visual changes persist until the next action. In mobile diagrams keep two hosts and active transfer direction visible together; avoid 9px explanatory copy where possible. Do not require a user to race an animation. Reduced motion uses discrete state changes. Provide accessible names for arrows, byte cells, state changes and controls. Preserve fixed footer safety, keyboard navigation and text legibility.

## Required evidence assets (actual capture; filenames suggested)

| Asset | What must be visible | Used in |
|---|---|---|
| `tcp-small-handshake.png` | SYN/SYN-ACK/ACK rows, connection tuple, relevant flags and sequence values | 2.3 |
| `tcp-small-payload.png` | Selected data frame, expanded Ethernet/IP/TCP, TCP length and highlighted HELLO hex/ASCII | 2.6, 2.12 |
| `tcp-small-ack.png` | Covering ACK and relative/absolute sequence convention; no claim of app read | 2.10, 2.12 |
| `tcp-small-unread-queue.png` or genuine terminal output | `ss` connected socket tuple and unread Recv-Q before gate release | 2.8, 2.10 |
| `tcp-small-read-log.png` or actual selectable log | actual requested counts, returned counts, offsets and verification | 2.9 |
| `tcp-early-read.png` or actual log extract | receiver read-enter, sender gate release and receiver local read-return; operator gate log | 2.10 |
| `tcp-large-segments.png` | multiple genuine forward segments with TCP payload lengths and sequence ranges | 2.6, 2.12 |
| `tcp-large-stream.png` | Wireshark Follow TCP Stream and selected connection; do not imply read boundaries | 2.12 |
| `tcp-loopback.png` | capture interface lo, loopback address tuple, payload | 2.11 |
| optional `tcp-syscall-trace.txt` | actual relevant calls and returns, separately run and labelled | 2.5, 2.9 |
| optional `rxe-devices.txt` | actual `rdma link show`/`ibv_devices` from same lab config, not inferred output | 3.5 |

Provide a small actual packet-list UI and downloadable PCAPs alongside screenshot excerpts. Highlight selection of an actual frame and field, and link to the appropriate full-size screenshot. No need to embed external videos or reproduce third-party diagrams; references are optional reading. No screenshot should be required to understand the main copy. Actual screenshots are important to establish that packet capture is a practical tool, not merely a made-up UI table.

## Runtime binding contract

Bind `{{tcp.small.client_port}}`, `{{tcp.small.handshake_frames}}`, `{{tcp.small.read_events}}`, `{{tcp.large.payload_segments}}` to the verified new TCP evidence. `small` means the late-reader case unless explicitly specified. Record early, late, large and loopback case identities independently. Bind `{{rdma.resources.hosta.address}}`, `length`, `lkey`, `rkey` from existing RDMA `resources` experiment host A endpoint or MR; preserve original data and format numeric exact values consistently. No unvalidated cross-experiment correlations. Real topology uses existing evidence hosts and capture interface labels. Render raw log/source excerpts by validated IDs or source path/line; no invented exact numbers. Fail validation if required evidence is missing. A development-only unavailable placeholder is acceptable during implementation; never silently publish an unfulfilled learner observation as if recorded.

## Evidence versus illustration

The TCP capture proves network-observed fields and payload bytes at the capture point. Application logs prove local method calls and returned bytes; `ss` proves sampled socket queue accounting. Neither proves every CPU load, DMA transaction, queue internal structure or globally ordered event across hosts. Hardware and memory illustrations are causal models. The actual RXE and VM runs do not establish physical RNIC bypass or throughput. Label packet and source correlation accurately. A successful TCP ACK is not evidence of remote application consumption; a completion is not the same as an ACK. Keep this distinction throughout later lessons.

## Acceptance checks

1. A first-time learner sees CPU, RAM, NIC and kernel/software relationship before the HELLO objective.
2. Same illustrative virtual address can map to different physical frames; unmapped/read-only accesses have explicit states.
3. Source buffer remains unchanged after copying; capacity vs payload length visible.
4. CPU executes both user and kernel code; memory paths show what is copied and by whom. No claim of fixed copies or physical DRAM timing.
5. Socket is created before connection; listener vs connected handle distinguished; four-tuple shown; receive reads connected stream without new remote IP argument.
6. TCP packet boundaries, read boundaries and application write boundaries independently represented; actual late-reader evidence validated; local loopback has no physical NIC link.
7. Capture screenshots and real decoded fields align with original PCAP and application logs; offloads and capture point documented.
8. Hardware DMA/RDMA and actual RXE visually separate; no CPU-offload performance claim.
9. Registration establishes access to an existing buffer; local CPU write is distinguished from MR local write; range, key and permission tests independent.
10. LKEY local, RKEY remote, address/length exchange over real control mechanism; no SEND remote address/RKEY fields implied. Equal numerical keys do not imply equal roles.
11. QPN introduced after QP; destination direction correct; no conceptual successful data operation during setup-only run.
12. Existing Lessons 5–8 and advanced explorer still work; existing reference evidence digest unchanged; progress schema migration preserves stable IDs or resets only changed lesson state with explanation.
13. Capture actual desktop/mobile viewport screenshots and walk through foundational subsections in sequence; inspect 320, 390, 768 and 1440 widths. No automated test claims independent comprehension.
