# Research notes and technical reading map

Prepared for FabricLab on 26 November 2026. These are original teaching materials informed by the following primary API documentation, original practitioner tutorials and the actual reference-run source/evidence. The sources are not copied wholesale. Numbered references [R…] in the lesson documents refer to this file. Links and available written descriptions were reviewed; the entire videos were not watched, and the IBTA full normative specification was not independently retrieved. Treat the specification as the normative further-reading route rather than a source of unverified exact field assertions. The lab's immutable code and packet evidence are authoritative for what happened in that run, not vendor marketing statements or tutorial examples.

## Programming interface, lifecycle and memory

**R1 — Linux rdma-core manual, `ibv_post_send(3)`**  
https://man7.org/linux/man-pages/man3/ibv_post_send.3.html  
Primary API reference for the Send Queue, opcode, SGE list, signalling, remote address/RKEY and posting versus completion. Explains why the same queue-submission interface can initiate SEND, WRITE or READ. Use for 5.5, 6.3, 7.3, 8.7. Distinguish successful post from later work status and buffer reuse; non-inline reference fixture is the teaching case, not all possible verbs extensions.

**R2 — Linux rdma-core manual, `ibv_post_recv(3)`**  
https://man7.org/linux/man-pages/man3/ibv_post_recv.3.html  
Local receive descriptions and SGEs. Provides precise distinction between a receive buffer's capacity and the message ultimately received; contrast with TCP in 5.3 and 5.8. No implication that a receive request sends a packet by itself.

**R3 — Linux rdma-core manual, `ibv_poll_cq(3)`**  
https://man7.org/linux/man-pages/man3/ibv_poll_cq.3.html  
Defines returned completions, status, local WR ID and QP number, and removal of polled entries. On unsuccessful status only specified fields are valid. The `src_qp` field applies to UD, not a source QPN mapping for the RC runs. Use for 5.7, 6.5–6.7, 7.6. The send-side `byte_len` values in the reference are RXE observations, not a portable application byte count for SEND/WRITE.

**R4 — Linux rdma-core manual, `ibv_reg_mr(3)`**  
https://man7.org/linux/man-pages/man3/ibv_reg_mr.3.html  
Memory registration, PD, local/remote access flags, keys, addressing and optional registration models. Grounds the local source/destination permissions and remote authorization in 6.2 and 7.2. Local CPU writing a process buffer is not the same permission as a provider's RDMA local write.

**R5 — Linux rdma-core manual, `ibv_modify_qp(3)`**  
https://man7.org/linux/man-pages/man3/ibv_modify_qp.3.html  
QP transitions, destination QPN, SQ/RQ PSNs, path MTU, access flags, retry and outstanding read/atomic parameters. Use 5.2 and 8.5–8.6; show the actual helper rather than inventing a universal setup call order. The readiness exchange in this lab is application TCP coordination, not the QP state machine itself.

**R6 — NVIDIA RDMA-aware Networks Programming Guide; RDMAmojo practitioner notes**  
https://networking-docs.nvidia.com/doca/archive/3-5-0/rdma-aware-networks-programming-guide  
https://www.rdmamojo.com/2013/01/12/ibv_modify_qp/  
https://www.rdmamojo.com/2013/01/26/ibv_post_send/  
https://www.rdmamojo.com/2013/02/02/ibv_post_recv/  
NVIDIA's communication-operation overview and worked RC example provide a valuable cross-check on the distinction between SEND/RECEIVE and one-sided WRITE/READ. Dotan Barak's original explanations give implementation-level detail about RNR retry, receive capacity and WRITE with immediate data. Some web pages were accessible as indexed excerpts rather than full text; the normative verbs docs and actual source are used for claims. Avoid copying fixed performance claims or treating vendor descriptions as universal hardware behavior. `rnr_retry=7` permits indefinite RNR retry in the relevant model; the application's ten-second wait is a separate timeout, so do not invent a particular completion failure or duration.

**R7 — RDMAmojo, `ibv_poll_cq()` (original practitioner blog)**  
https://www.rdmamojo.com/2013/02/15/ibv_poll_cq/  
Useful for interpreting completion status, memory lifetime and which completion fields apply. Its older context is not a basis for universal latency or CPU behavior claims. Teach completion as a local result and not proof of target application processing. The exact lab polls are read from the snapshot.

**R8 — Linux rdma-core, Pyverbs and RXE documentation**  
https://github.com/linux-rdma/rdma-core/blob/master/Documentation/pyverbs.md  
https://github.com/linux-rdma/rdma-core/blob/master/Documentation/rxe.md  
Official project documentation for Python bindings and software device association with an Ethernet interface. Relevant to lab orientation, local memory helpers and distinction between actual software transport and representative hardware. The reference environment uses rdma-core/Pyverbs 50.0-2ubuntu0.2, Linux 6.8.0-151-generic, not necessarily current upstream behavior. Do not describe every WR post as a synchronous system call; provider-specific mechanisms vary.

## Transport and packet analysis

**R9 — NVIDIA MLNX_EN documentation, RDMA over Converged Ethernet**  
https://networking-docs.nvidia.com/mlnxenswum/23100550/rdma-over-converged-ethernet-roce  
Useful for RoCEv1 versus RoCEv2 encapsulation, routing, UDP source flow identifier for forwarding/ECMP and GID context. Note the hardware-offload context of the document; it is not a claim that our RXE path bypasses CPU/kernel software.

**R10 — IANA service name and transport protocol registry**  
https://www.iana.org/assignments/service-names-port-numbers?search=4791  
Verifies UDP destination port 4791 registration. The TCP entry is reserved; our separate TCP control protocol does not become RoCE because it coordinates RDMA. Use 8.1.

**R11 — IBTA specification access; original RDMAmojo QP transport discussion**  
https://www.infinibandta.org/ibta-specifications-download/  
https://www.rdmamojo.com/2013/06/01/which-queue-pair-type-to-use/  
IBTA architecture is the normative source for the transport formats and reliable sequencing. Full normative specification was not fetched in this session; the original practitioner discussion and actual decoded packets are useful teaching cross-checks. Restrict numerical examples to the simple conceptual multi-packet SEND and recorded single-packet operations; do not generalize ACK/READ sequence rules or invent exact failure packet formats.

**R12 — Wireshark InfiniBand display-filter reference**  
https://www.wireshark.org/docs/dfref/i/infiniband.html  
Official decoder field catalogue, including BTH opcode, PSN, RETH DMA length and RKEY. Use to guide inspection, not to assume a field was observed in an export that does not contain it. The existing FabricLab protocol tree does not include individual AETH or ICRC fields; any added decoder detail must be derived from original PCAP and independently checked. No synthetic Wireshark screenshots. Actual PCAP downloads remain available.

**R13 — Original expert talks and tutorials (recommended viewing)**  
- SNIA, Michal Kalderon and Rohan Mehta, *Everything You Wanted to Know About RDMA But Were Too Proud to Ask*, 26 March 2025. https://www.snia.org/educational-library/everything-you-wanted-know-about-rdma-were-too-proud-ask-2025 — https://www.youtube.com/watch?v=6t041Lr5FCY — follow-up written Q&A https://www.snia.org/blog/2025/rdma-qa . Useful broad explanation of RDMA and relationship to AI/HPC networking; use to connect motivation to fabric rather than substitute for code-level teaching.
- Netdev 0x16, Roland Dreier and Jason Gunthorpe, *RDMA programming tutorial*, https://netdevconf.info/0x16/sessions/tutorial/rdma-programming-tutorial.html — https://www.youtube.com/watch?v=JtT0uTtn2EA . This is especially relevant to a Linux networking audience: asynchronous work and completion queues, two-sided versus one-sided operations, memory registration, RC example. Use as deeper follow-up after the learner understands the mechanism. The session description and index were reviewed; no claims about unviewed timestamps or slides.
- SNIA, *RDMA: Tech in a Nutshell*, https://www.youtube.com/watch?v=GnBy5F1TCoQ . Short optional recap identified from available description; not a prerequisite.

## AI network bridge

**R14 — CUDA GPUDirect RDMA, Overview and synchronization/memory ordering**  
https://docs.nvidia.com/cuda/gpudirect-rdma/index.html  
Important caveat that GPU memory access, synchronization and ordering have hardware/software constraints. Do not assume a GPU kernel immediately sees a network write or that the host-memory experiment demonstrates GDR. Use in 8.11.

**R15 — NCCL Networking Troubleshooting**  
https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting/networking_troubleshooting.html  
Current vendor troubleshooting reference on interfaces, RDMA/GID configuration, host vs GPU memory tests and fabric issues. Use to motivate multi-layer debugging rather than attribute every stall to switching. Do not prescribe version-specific environment variables or claim all NCCL transfers use ordinary WRITE.

**R16 — NCCL GPU troubleshooting**  
https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting/gpu_troubleshooting.html  
Device interconnect and GPU/NIC constraints, useful optional link. No instruction to alter platform security settings as part of the practical.

**R17 — NVIDIA Cumulus Linux RoCE configuration documentation**  
https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-515/Layer-1-and-Switch-Ports/Quality-of-Service/RDMA-over-Converged-Ethernet-RoCE/  
Documents distinct configurations for lossless and lossy RoCE and roles of PFC/ECN. Use only the conceptual distinction in 8.11: priority pause is local to links; ECN marks IP congestion; CNP informs sender transport. Configuration depends on platform/fabric requirements. No universal threshold, lossless mandate or assertion that lab measured congestion.

## Research tied to the actual FabricLab source

Reviewed using GitHub integration at commit `46cd691bd72563f94d9565e21ef208b71d7b31f2`:

- `apps/web/public/practical/rdma/reference-evidence.json`: all four experiments, packet IDs, protocol tree, raw/payload bytes, host topology, source snapshots and local event sequences.
- Embedded Python snapshots: `python/rdma_common.py`, `python/exp_b_send_recv.py`, `python/exp_c_write.py`, `python/exp_d_read.py`. Exact line anchors appear in 09 and the lesson files.
- Final closeout changes to `foundationTcpVisuals.tsx`, `foundationRdmaVisuals.tsx`, `GuidedLesson.tsx`, `RdmaCurriculum.tsx`, and the semantic test suite. The reviewed PR was open, mergeable, and GitHub recorded CI and Vercel success.

Critical distinctions established from this source, not assumed from generic articles:

1. The receiver explicitly posts `RecvWR` and sends ready before the sender writes payload and posts SEND. There are two independent local completions; no global cross-host order is claimed.
2. The WRITE target shares its MR address/RKEY/capacity; writer completes then sends `write_done`, target polls zero then verifies 53 bytes. The recorded field `first64` in the after event is misleadingly named; the source slice establishes its actual size.
3. The READ source advertises 46 bytes of valid data within a 4096-byte MR; A uses a local destination SGE and posts through SQ. A completes and verifies before `read_done`; source then polls zero. The capture records READ request and response, not a B application SEND.
4. The human-readable SEND and WRITE logs call `.strip()`; the captured and verified byte sequences retain newline. The exact unpadded bytes, not the stripped text, are the correlation authority.
5. The reference protocol trees don't separately decode AETH or ICRC. All new structural detail must be labelled or independently decoded; no fabricated packet field values.
6. These are small host-memory software RoCE experiments, not GPU, hardware performance, loss or congestion experiments.
