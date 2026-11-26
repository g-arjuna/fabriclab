# Research foundation and further reading

This is a source map for original instructional content, not an anthology. Technical descriptions are synthesized for the specific FabricLab curriculum. No third-party image or screenshot is included. Use these links for optional reference. The cited videos were identified through their publisher pages and descriptions; full video transcripts were not reviewed. Links are to original publishers or documentation.

## Operating systems and memory

- **S1 — Remzi and Andrea Arpaci-Dusseau, Operating Systems: Three Easy Pieces.** https://research.cs.wisc.edu/wind/OSTEP/ — Read Processes, Limited Direct Execution, Address Spaces, Address Translation and I/O Devices. Best overall pedagogical model for first establishing the machine and then introducing abstractions. Supports 1.1–1.6.
- **S2 — Linux kernel, Page Tables.** https://docs.kernel.org/mm/page_tables.html — CPU virtual addresses, MMU/TLB, protection and faults. Supports 1.2–1.4, 3.2.
- **S3 — Linux kernel, Process Addresses.** https://www.kernel.org/doc/html/next/mm/process_addrs.html — VMAs and process mappings; deeper maintainer reference, not beginner reading. Supports 1.2–1.3. Also MIT OpenCourseWare, *16.2.2 Basics of Virtual Memory* (MIT 6.004), https://www.youtube.com/watch?v=8yO2FBBfaB0 — hardware perspective for optional viewing.

## Sockets, TCP and Linux network processing

- **S4 — Linux socket(7).** https://www.man7.org/linux/man-pages/man7/socket.7.html — authoritative Linux socket operations and relationship to kernel protocol stacks. Supports 2.1–2.3.
- **S5 — Python standard library socket.** https://docs.python.org/3/library/socket.html — `connect`, `accept`, `send`, `sendall`, `recv`, `recv_into`; exact semantics for 2.2–2.10.
- **S6 — Python Socket Programming HOWTO.** https://docs.python.org/3/howto/sockets.html — byte-stream framing, partial send/receive and blocking. Also Beej, *Guide to Network Programming*, https://beej.us/guide/bgnet/html/split/system-calls-or-bust.html — accessible sockets narrative; Julia Evans, *Why you should understand (a little) about TCP*, https://jvns.ca/blog/2015/11/21/why-you-should-understand-a-little-about-tcp/ — application-visible consequences of transport behavior. Supports 2.1–2.12.
- **S7 — IETF RFC 9293, Transmission Control Protocol.** https://www.rfc-editor.org/rfc/rfc9293.html — protocol authority for sequence space, acknowledgement, windows and state. Supports 2.3–2.10. The course deliberately omits advanced state-machine and congestion-control detail until needed.
- **S8 — Fraida Fund, Internet Architecture and Protocols, TCP sockets and TCP state diagram laboratory.** https://ffund.github.io/tcp-ip-essentials/lab-tcp/sockets.html — particularly useful example of connecting Python calls, `ss` and tcpdump to real traffic. Inspiration for a new original controlled FabricLab experiment, not copied lab content.
- **S9 — Packagecloud, Monitoring and Tuning the Linux Networking Stack: Receiving Data.** https://blog.packagecloud.io/monitoring-tuning-linux-networking-stack-receiving-data/ — detailed receive-path explanation; older kernel-oriented article, use current kernel docs to verify details. Linux NAPI: https://docs.kernel.org/networking/napi.html — event processing/polling. Linux segmentation offloads: https://docs.kernel.org/networking/segmentation-offloads.html — TSO, GSO and GRO nuance. Supports 2.5–2.8.
- **S10 — Linux kernel, Dynamic DMA Mapping Guide.** https://docs.kernel.org/6.8/core-api/dma-api-howto.html — distinguishes CPU virtual, physical and DMA addresses, optional IOMMU translation. Supports 1.3, 2.7–2.8, 3.1–3.3. Wireshark User's Guide: https://www.wireshark.org/docs/wsug_html/ and checksum offload explanation https://wiki.wireshark.org/tcp_checksum_verification — important for interpreting host captures without assuming physical wire segmentation or invalid checksums.

## RDMA and Soft-RoCE

- **S11 — SNIA, Everything You Wanted to Know About RDMA But Were Too Proud to Ask (2025).** https://www.snia.org/educational-library/everything-you-wanted-know-about-rdma-were-too-proud-ask-2025 — original motivation for FabricLab; webinar covers RDMA objects, verbs and wire protocol. Official video: https://www.youtube.com/watch?v=6t041Lr5FCY (Michal Kalderon, Rohan Mehta, Erik Smith). Recommend after foundations, before/alongside actual RDMA experiments.
- **S12 — rdma-core, libibverbs documentation.** https://github.com/linux-rdma/rdma-core/blob/master/Documentation/libibverbs.md — userspace verbs, devices and resource access. Supports 3.5–3.6.
- **S13 — rdma-core, RXE documentation.** https://github.com/linux-rdma/rdma-core/blob/master/Documentation/rxe.md — software RDMA device setup. Linux RXE Kconfig: https://github.com/torvalds/linux/blob/master/drivers/infiniband/sw/rxe/Kconfig — describes software transport over Linux networking and provider. Supports 3.5. Do not claim the lab proves hardware offload.
- **S14 — rdma-core, Pyverbs documentation.** https://github.com/linux-rdma/rdma-core/blob/master/Documentation/pyverbs.md — Python binding to rdma-core; supports 3.5–4.2. Use the existing FabricLab source for exact constructors and helpers.
- **S15 — NVIDIA RDMA-aware Networks Programming Guide.** https://networking-docs.nvidia.com/doca/archive/3-5-0/rdma-aware-networks-programming-guide — comprehensive device/resource/verbs model. Supports 3.3–4.14. Scope beginner descriptions to ordinary non-inline host memory RC operations; do not treat every generic guide statement as universal across providers or all registration modes.
- **S16 — ibv_reg_mr(3).** https://man7.org/linux/man-pages/man3/ibv_reg_mr.3.html — MR arguments, flags, local read, remote-write prerequisite, keys and alternate registration models. Also RDMAmojo, *ibv_reg_mr()* https://www.rdmamojo.com/2012/09/07/ibv_reg_mr/ — accessible supplementary verbs explanation. Supports 4.1–4.9.
- **S17 — ibv_create_qp(3), ibv_post_send(3), ibv_post_recv(3).** https://man7.org/linux/man-pages/man3/ibv_create_qp.3.html ; https://man7.org/linux/man-pages/man3/ibv_post_send.3.html ; https://man7.org/linux/man-pages/man3/ibv_post_recv.3.html — association of QP with PD and CQs, work descriptions and SGEs. RDMAmojo supplemental discussions: https://www.rdmamojo.com/2013/01/26/ibv_post_send/ and https://www.rdmamojo.com/2013/02/02/ibv_post_recv/ — avoid generalizing hardware-specific submission behavior to RXE. Supports 4.10–4.13.
- **S18 — ibv_poll_cq(3).** https://man7.org/linux/man-pages/man3/ibv_poll_cq.3.html — completion retrieval, status and application fields. Supports 4.14.

## Project-specific grounding (GitHub inspection)

Reference baseline `28092ad6222907dfbbc39397f3224f963acf6b1c`:

- https://github.com/g-arjuna/fabriclab/blob/28092ad6222907dfbbc39397f3224f963acf6b1c/labs/rdma-basics/python/exp_a_resources.py — allocates PD, buffer, MR, CQ, QP; exchanges endpoint metadata and brings endpoint to RTS, no data WR.
- https://github.com/g-arjuna/fabriclab/blob/28092ad6222907dfbbc39397f3224f963acf6b1c/labs/rdma-basics/python/exp_b_send_recv.py — receiver posts receive WR and sends ready message; sender submits SEND; independent completion observations.
- https://github.com/g-arjuna/fabriclab/blob/28092ad6222907dfbbc39397f3224f963acf6b1c/labs/rdma-basics/python/exp_c_write.py — target conditionally shares RKEY, address, length; initiator assigns remote fields to WR; independent TCP synchronization.
- https://github.com/g-arjuna/fabriclab/blob/28092ad6222907dfbbc39397f3224f963acf6b1c/apps/web/public/practical/rdma/reference-evidence.json — authoritative source snapshots and run-specific values, including `python/rdma_common.py` access flags and QP setup.

## Limits of these teaching models

We assume Linux, ordinary buffered TCP sockets, ASCII demonstration payloads, conventional host memory, a simplified CPU/cache/memory interconnect, and the lab's RC RDMA operations. Hardware RNIC DMA is a representative explanation; RXE runs software RoCE. We do not teach that all memory must always be permanently pinned, that every send operation produces a CQE, that all NICs use the same rings and IRQ behavior, or that TCP read sizes correspond to captured segment sizes. Exact physical movement is not inferable from a PCAP or a user-space event log. New TCP captures must be produced and validated before they appear as recorded evidence.

## Additional visual learning references

- MIT OCW, Computation Structures, lecture notes list (lectures 15–20 cover caches, virtual memory, OS kernels/supervisor calls, devices and interrupts, and interconnects): https://ocw.mit.edu/courses/6-004-computation-structures-spring-2009/pages/lecture-notes/ . Annotated virtual-memory slides from 2017: https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c16/c16s1/ . These are useful for designing the host view; FabricLab should not reproduce their figures without checking applicable licenses.
- Packagecloud illustrated receive-path guide: https://blog.packagecloud.io/illustrated-guide-monitoring-tuning-linux-networking-stack-receiving-data/ . Useful for layout inspiration, not as an exact trace of our host.
- Chris Greer, *How TCP Works — Sequence Numbers*: https://www.youtube.com/watch?v=BWILgDt6jz0 ; *How TCP Sequence Numbers Work — TCP Deep Dive*: https://www.youtube.com/watch?v=9xfjN5AR99I . Original packet-analysis tutorials; useful examples of examining genuine packets rather than substituting abstract diagrams. The publisher's descriptions were inspected, not the full video content.
