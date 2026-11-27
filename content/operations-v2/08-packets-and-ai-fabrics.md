# Lesson 8 — From Python instructions to packets, and from packets back to the application

The goal of this lesson is interpretation, not header memorization. All packet cases use the original reference evidence unless explicitly labelled conceptual. Field values rendered in the browser must be resolved from that evidence rather than copied as constants.

## 8.1 What exactly are we looking at in a packet capture?

### Learner copy

<!-- guided-block: we-have-followed-three-real -->

We have followed three real operations. We know where the data starts, which application submits work and how the result is observed. Now we will look at the same experiments from the point of view of a network engineer who sees packets but may not have access to the application.

<!-- guided-block: start-with-the-familiar-part -->

Start with the familiar part of the captured SEND packet. An Ethernet header identifies the local link delivery. The IPv4 header identifies the network source and destination. Its protocol field says the payload is UDP. The UDP destination port is 4791, the registered port for RoCEv2. This tells us how the RDMA transport is encapsulated for IP networking.

<!-- guided-block: udp-is-not-providing-the -->

UDP is not providing the reliable connection semantics that TCP provides. In our experiment the Reliable Connected RDMA transport carries its own sequencing, acknowledgement and retry mechanisms inside the UDP payload. The data path is not a TCP stream. The TCP control socket we used for setup is a separate conversation.

<!-- guided-block: a-network-device-that-forwards -->

A network device that forwards this IP traffic need not interpret every RDMA header. The outer addresses and other forwarding information can be sufficient. At the destination, the RDMA transport interprets the inner header and directs the operation to the appropriate endpoint.

<!-- guided-block: we-will-use-fabriclab-s -->

We will use FabricLab's packet inspector, which displays fields decoded from genuine captured traffic. It is not a screenshot of Wireshark. You can download the original PCAP and open it in Wireshark to inspect the same frames yourself.

### Visual and interaction

Open `b:packet:3` by default. Show actual Ethernet II, IPv4, UDP and BTH header strips in byte order; clicking a strip reveals the corresponding existing `protocolTree` fields and points to relevant byte spans in `rawHex` when verified offsets are available. **Follow Ethernet delivery**, **Follow IP delivery**, **Open UDP encapsulation**, **Inspect the RDMA header** progressively highlight the selected layer, preserving outer context. For actual captured Ethernet/IPv4 header sizes verify bytes (EtherType, IPv4 IHL etc.) rather than assume all networks have the same header size. Show data/control topology inset. Link actual PCAP. No invented GUI screenshot. Primary **Understand endpoint and operation fields**.

### Inspect

RoCEv1 uses a different Ethernet encapsulation; RoCEv2 adds IP and UDP so it can be routed at Layer 3. This curriculum focuses on the IPv4 RoCEv2 RC evidence, not every InfiniBand transport service. [R9–R13]

## 8.2 How does the receiving transport know what to do?

### Learner copy

<!-- guided-block: immediately-after-the-udp-header -->

Immediately after the UDP header we encounter the Base Transport Header, or BTH. Think of it as the common part of the RDMA transport packet. It identifies the operation and contains information the transport needs to interpret and sequence that packet.

<!-- guided-block: start-with-the-destination-qpn -->

Start with the destination QPN. We learned in the resource lesson that a Queue Pair has an endpoint number. In the SEND capture, this field names B's QP. In the reverse acknowledgement it names A's QP. It is not the local WR ID or a TCP port. For RC, the endpoint has been prepared with peer information; a receiving provider knows which context to use for the arriving packet. There is no independent source-QPN field in the ordinary RC BTH of these packets. Use the endpoint metadata and operation context to identify the peer, not an imaginary field.

<!-- guided-block: the-opcode-tells-the-transport -->

The opcode tells the transport how to interpret what follows the BTH. The verbs opcode in a Work Request identifies the requested operation, while the packet opcode identifies a particular transport packet form. For example, a SEND Work Request can generate a SEND Only packet when its message fits in one packet, or a sequence of SEND First, Middle and Last packets for a longer message. The opcode also determines which extension headers are present.

<!-- guided-block: the-psn-is-a-24 -->

The PSN is a 24-bit packet sequence number. It helps the RC transport track packet progress. The applications configure an initial sequence value while preparing their endpoints; the provider uses transport sequencing during execution. A PSN is not an application byte offset and is not the application's WR ID.

### Visual and interaction

Show three linked selectable fields from the actual SEND request: **Destination QPN**, **Opcode**, **PSN**. QPN selection highlights B endpoint using validated correlation and B local QPN; **Switch to ACK** highlights A endpoint and actual reverse packet fields. Opcode links actual SEND WR vs wire SEND Only; ACK is a transport response, not a new application WR. PSN selection connects initial peer sequence setup to observed request and ACK, scoped to this single-packet run. Include decimal/hex toggle without losing labels. If P_Key, AckReq and pad count are shown, use the exact decoded fields; explain their roles in inspect panel rather than equate them with security credentials. Primary **Open remote memory fields**.

### Inspect

The BTH also carries such information as a partition key, a request-for-acknowledgement bit and a pad count. The partition key is a transport partition identifier, not an MR RKEY. AckReq is not the packet being an ACK. In these RC captures, the ACK packet's own opcode identifies acknowledgement. [R9–R12]

## 8.3 When does an RDMA packet contain a remote memory address?

### Learner copy

<!-- guided-block: compare-a-send-request-with -->

Compare a SEND request with a WRITE request. They both carry application bytes from A to B. Their BTH opcodes differ, and the WRITE request includes an extra header, the RDMA Extended Transport Header (RETH).

<!-- guided-block: a-write-needs-to-identify -->

A WRITE needs to identify an authorized destination. RETH contains a 64-bit virtual address, a 32-bit RKEY and a 32-bit DMA length. These fields describe the remote-memory operation in the context of the receiving endpoint and registered memory. The address is not a network IP address. The key is not a UDP port, encryption key or proof of general host identity.

<!-- guided-block: an-rdma-read-request-also -->

An RDMA READ Request also contains RETH, but its remote address names the source rather than the destination. Its length describes how much data is requested, even though the request carries no application message bytes. In the READ response we do not need to repeat RETH; the reader already has the outstanding operation context and its local destination description.

<!-- guided-block: a-send-request-does-not -->

A SEND request does not contain RETH because B has already supplied its own destination through receive work. A transport ACK does not contain RETH either. The particular extensions are determined by the packet opcode, not by the assumption that every RoCEv2 packet carries all possible fields.

### Visual and interaction

Four mutually exclusive packet selectors **SEND request**, **WRITE request**, **READ request**, **READ response**, plus **ACK**. Use `b:packet:3`, `c:packet:7`, `d:packet:3`, `d:packet:4`, `c:packet:8`. Show real `protocolTree` and optional `reth` field only when present. RETH selection highlights B memory interval for WRITE or READ, with operation-specific role. For SEND show B receive WR as the address source outside packet; for response show A local WR context; for ACK no memory field. Preserve run identity and A/B direction. Primary **Compare message length and packet length**.

### Reveal/feedback

A packet can carry payload without RETH (SEND or READ response), and it can carry RETH without payload (READ Request). The presence of a remote-memory description and the presence of message data are separate questions. [R1, R9–R12]

## 8.4 Count the bytes: buffer capacity, transfer length, padding and frame size

### Learner copy

<!-- guided-block: earlier-we-saw-a-4 -->

Earlier we saw a 4,096-byte registered buffer used for a 50-byte SEND. That is one of several different lengths that appear while inspecting a transfer.

<!-- guided-block: the-registered-length-bounds-memory -->

The registered length bounds memory access. An SGE describes the portion involved in the operation. The receiving application's completion or verification establishes how many bytes it actually obtained in our SEND example. The frame on the wire contains not only application bytes but protocol headers and other transport fields.

<!-- guided-block: not-every-packet-associated-with -->

Not every packet associated with an RDMA operation carries application data.

<!-- guided-block: our-send-and-ordinary-write -->

Our SEND and ordinary WRITE request packets carry the application message from A to B. The WRITE additionally contains a Remote Extended Transport Header, or RETH, identifying the remotely named destination and transfer length.

<!-- guided-block: the-read-request-also-contains -->

The READ request also contains RETH, but it carries no application payload. It asks B to return the specified bytes. The corresponding READ response carries those bytes back to A.

<!-- guided-block: the-reverse-acknowledgements-for-send -->

The reverse acknowledgements for SEND and WRITE carry transport acknowledgement information rather than application message bytes.

<!-- guided-block: recorded-packet-application-bytes-padding -->

| Recorded packet | Application bytes | Padding | Recorded data portion | Frame length |
|---|---:|---:|---:|---:|
| SEND request | 50 | 2 | 52 | 110 |
| SEND ACK | 0 | 0 | 0 | 62 |
| WRITE request | 53 | 3 | 56 | 130 |
| WRITE ACK | 0 | 0 | 0 | 62 |
| READ request | 0 | 0 | 0 | 74 |
| READ response | 46 | 2 | 48 | 110 |

<!-- guided-block: all-lengths-are-in-bytes -->

All lengths are in bytes.

<!-- guided-block: these-values-are-reference-run -->

These values are reference-run expectations. The runtime comparison must continue deriving the values from existing evidence.

<!-- guided-block: the-recorded-acknowledgement-packets-and -->

The recorded acknowledgement packets and single-packet READ response have an Acknowledgement Extended Transport Header, or AETH, in their protocol structure. The current reference export does not separately decode its individual fields.

<!-- guided-block: transport-headers-integrity-fields-and -->

Transport headers, integrity fields and padding contribute to packet or frame size but are not additional application message bytes.

<!-- guided-block: registered-capacity-operation-transfer-length -->

Registered capacity, operation transfer length, application payload in an individual packet and captured frame length answer different questions. A READ request can ask for 46 bytes while carrying zero application payload bytes. An ACK can acknowledge transport progress without containing the application message.

<!-- guided-block: roce-transport-may-add-padding -->

RoCE transport may add padding to align its data portion. Our SEND message contains 50 bytes, including a newline. The capture has two additional padding bytes in the data portion. The WRITE message is 53 bytes with three padding bytes. The READ response has 46 message bytes and two padding bytes. The padding is not part of the Python message, and it is not part of the registered memory write length. The READ request has no payload at all despite asking for 46 bytes.

<!-- guided-block: when-you-compare-a-captured -->

When you compare a captured frame with application memory, use the unpadded application payload. The last `0a` in these messages is a newline in the original bytes literal, not padding. A human-readable log may have stripped it from its text representation, so a comparison based only on the displayed string can give the wrong answer.

### Visual and interaction

Use existing `packetLengthBreakdown()` and actual evidence. One horizontal byte strip per selected packet, show headers, app payload, padding and transport integrity/other fields only when independently decoded or explicitly derived. Use actual captured frame length and captured length, not an assumed physical on-wire Ethernet preamble/FCS count. For SEND: verify expected app 50, pad 2, data 52, frame 110; WRITE 53/3/56/130; READ response 46/2/48/110; READ request app 0/pad 0/data 0/frame 74, requested length 46. These numbers are regression expectations, not constants for display. Use actual rawHex and `payloadHex`/`dataHex`, distinguish 0a from trailing zeros. **Show payload only** / **Show payload plus transport padding** toggles without altering evidence. **Compare with registered buffer** shows correct role/capacity. Primary **Understand how larger messages are sequenced**.

### Inspect

The common reference frames use Ethernet II, IPv4 and UDP; the standard RC ACK and single-packet READ response have an AETH (acknowledgement extended header), and RoCE includes an invariant CRC. The current exported protocol tree does not separately decode AETH or ICRC. If showing a verified structural byte region, distinguish derived layout from decoded values; otherwise label these as conceptual protocol structure. Never fabricate syndrome, MSN or CRC values. The capture's recorded frame length is not a complete measurement of all physical-link overhead. [R9–R12]

## 8.5 One Work Request can produce more than one packet

### Learner copy

<!-- guided-block: our-actual-messages-are-deliberately -->

Our actual messages are deliberately short. Each request containing data in this reference run fits in one transport packet. That makes it easy to follow the relationship between one Work Request and the packet we see. It does not mean a Work Request always maps to one packet.

<!-- guided-block: the-transport-needs-to-respect -->

The transport needs to respect a configured path MTU. When a message is larger than the usable transport packet payload, the provider can break the operation into a sequence of packets. In an illustrative SEND with 2,500 application bytes and a 1,024-byte path-MTU payload, the data can be carried in 1,024, 1,024 and 452-byte portions. The transport packet forms are First, Middle and Last. A sufficiently small message uses Only instead. The receiver associates the packets with the same operation and its prepared destination, rather than treating each packet as a new receive WR.

<!-- guided-block: here-is-where-the-tcp -->

Here is where the TCP example helps. TCP sequence numbers describe positions in a byte stream; RC packet sequence numbers track transport packet sequencing. Do not apply the TCP rule of adding the payload byte count to an RDMA PSN. For a simple multi-packet SEND, successive packets use successive PSNs. ACKs and READ responses have operation-specific sequence semantics, and PSNs wrap in their 24-bit space. We will not generalize the simple SEND pattern to every packet form.

<!-- guided-block: our-small-reference-runs-do -->

Our small reference runs do not record this larger transfer. The diagram is a conceptual example to explain why the opcode and PSN exist.

### Visual and interaction

Conceptual example labelled continuously: one SEND WR (length 2500) → three packet cards, offsets 0–1023 / 1024–2047 / 2048–2499; PSNs 100, 101, 102 illustrative; First/Middle/Last labels, no invented capture frame numbers or packet hex. **Select each packet** highlights precise source/destination range; one B receive instruction is consumed for the message, one successful receiver completion after full message in this model. **Compare small captured SEND** restores `b:packet:3` actual Only/PSN. Use byte-aligned bars. No fake performance, ACK-per-packet promise or claim that Ethernet MTU equals RDMA path MTU. Primary **Consider reliability and retries**.

### Reveal/feedback

A WR describes an application operation; a packet is one transport unit used to carry out that operation. Packet sequence numbers are not the same as byte counts or completion IDs. [R1, R5, R9, R11]

## 8.6 Why is a reliable operation possible over UDP?

### Learner copy

<!-- guided-block: udp-encapsulation-does-not-make -->

UDP encapsulation does not make a transport reliable by itself. Our QPs use Reliable Connected transport. The RDMA transport tracks packet sequence progress, recognises acknowledgement or negative-acknowledgement information and can retry when appropriate. The provider implements this machinery: software RXE in our lab, representative hardware in an RNIC.

<!-- guided-block: imagine-that-one-packet-of -->

Imagine that one packet of a multi-packet SEND is lost. The receiver cannot treat a later packet as if the missing part of the operation had already arrived. Reliable transport uses its sequence and acknowledgement rules to detect and recover from problems. The exact response, retry and ordering behaviour depends on the transport and implementation. If required progress cannot be made, the application can observe an unsuccessful Work Completion or reach a timeout in its own wait logic.

<!-- guided-block: there-is-another-kind-of -->

There is another kind of delay that does not require a congested network: the receiver may have no posted receive work when a SEND arrives. The RNR mechanism tells us that endpoint readiness and network packet delivery are separate issues. An application may also fail to complete because an MR key, address range or permission is invalid.

<!-- guided-block: we-should-therefore-not-jump -->

We should therefore not jump from "a completion did not arrive" to "the switch must be dropping packets." First identify the operation and the evidence available at each layer. In a real AI cluster, congestion and loss are very important, but they are not the only reasons an operation may fail to progress.

### Visual and interaction

Conceptual three-packet SEND from 8.5. **Illustrate missing packet** marks one range missing, shows incomplete logical operation. **Illustrate transport recovery** reveals retry conceptually and completion eligible after required data/transport progress, no exact timing or fabricated NAK format. Separate selectable **Receiver not ready** and **Remote access rejected** cases return to 5.4 and 4.6 concepts, without mixing SEND with RETH access rejection: latter is separate WRITE/READ scenario. No actual fault packets in reference runs. **Inspect lab retry settings** shows `rdma_common.py:181,185–189,194–224` with actual retry/timeout config; avoid implying application timeout is transport retry exhaustion. Primary **Match code to the wire**.

### Reveal/feedback

A reachable IP address and an up Ethernet link do not prove that the correct QP is ready, that a receive is available or that an operation has completed successfully. [R1, R3, R5, R6]

## 8.7 A complete correlation: Python → WR → packet → memory → completion

### Learner copy

<!-- guided-block: let-us-put-everything-together -->

Let us put everything together with the actual WRITE program. The application first fills a registered local buffer. It then describes that buffer with an SGE, constructs a SendWR with the WRITE opcode and supplies the remote address and key. The provider uses the prepared endpoint information and that instruction to carry out the operation.

<!-- guided-block: look-at-the-corresponding-captured -->

Look at the corresponding captured WRITE request. Its BTH opcode reflects the transport packet form for the requested WRITE. The destination QPN comes from the prepared peer endpoint. The remote address and RKEY appear in RETH. The requested transfer length appears in RETH. The source payload bytes are present in the packet, with padding kept separate.

<!-- guided-block: some-packet-fields-come-from -->

Some packet fields come from the Work Request. Others come from the prepared Queue Pair and its transport state.

<!-- guided-block: when-the-program-prepares-its -->

When the program prepares its RC endpoint, the helper configures the peer's QPN and the initial send and receive packet sequence numbers.

<!-- guided-block: these-values-establish-communication-and -->

These values establish communication and sequencing context before the application submits the WRITE instruction.

<!-- guided-block: python-attr-dest-qp-num -->

```python
attr.dest_qp_num = peer["qpn"]
attr.rq_psn = peer["psn"]
attr.sq_psn = own_psn
```

<!-- guided-block: contrast-this-with -->

Contrast this with:

<!-- guided-block: python-log-emit-qp-ready -->

```python
log.emit("qp_ready", ...)
```

<!-- guided-block: the-helper-configures-endpoint-and -->

The helper configures endpoint and sequencing attributes. The application's later logging statement records information about the prepared endpoint; logging does not configure it.

<!-- guided-block: the-captured-write-packet-s -->

The captured WRITE packet's destination QPN reflects the prepared peer endpoint. Its PSN comes from the transport's send-sequencing state.

<!-- guided-block: in-this-particular-reference-exchange -->

In this particular reference exchange, the captured initial request can be correlated with the configured initial send PSN. Subsequent packets need not retain that initial PSN.

<!-- guided-block: text-work-request-operation-local -->

```text
Work Request
    ├── Operation
    ├── Local memory description
    └── Remote memory description

Prepared QP and transport state
    ├── Destination endpoint
    └── Packet sequencing context
```

<!-- guided-block: other-fields-are-local-a -->

Other fields are local. A's source virtual address and LKEY are used by A's provider to access the registered local buffer. A's WR ID helps the local application recognise a completed request. None is a corresponding transmitted field in this ordinary WRITE request. The local QPN in the successful WC identifies A's local work context, whereas the destination QPN in the forward packet identifies B. The PSN is transport sequence information.

<!-- guided-block: the-local-wr-id-is -->

The local WR ID is application bookkeeping, not the transport PSN.

<!-- guided-block: we-can-follow-the-request -->

We can follow the request, the reverse ACK, A's observed completion, B's synchronization and B's verified memory. This is the entire causal story we have spent the practical building. The network capture tells us about transport packets, while the application log and verified bytes tell us about application-observed results.

### Visual and interaction

Use existing `WriteCodePacketCorrelation` as a basis, but authored copy here is authoritative. Show three aligned compact columns plus observation strip; at mobile, show one selected relationship stack. Select **Operation**, **Remote address**, **Remote key**, **Length**, **Destination QPN**, **PSN**, **Local address**, **LKEY**, **WR ID**. Each selection highlights exact source lines, relevant runtime evidence and actual packet field or explicit **No direct transmitted field**. Use `exp_c_write.py:124–140`, metadata lines 57–69 and QP setup 111–116, helper 155–191. Actual `wr:c:hosta:exp-c-writer:5`, `c:packet:7/8`, `cqe:c:hosta:exp-c-writer:6`, target events 5–7 and snapshots. For PSN show helper/ready attributes, not WR field. For QPN show peer metadata, not a fake WR destination-QPN member for RC. For WR ID link to local WC. Select **Inspect payload match** shows packet unpadded bytes equal target after snapshot. Source comments in immutable snapshot are not authoritative tutorial prose: do not teach the ambiguous comment at lines 131–132 as saying RETH isn't visible in captures. Show code without modifying it and explain that provider encodes the remote WR fields in RETH. Primary **Investigate a real packet**.

### Reveal/feedback

The same value can appear in more than one artifact for different reasons. It is the correlation within the same experiment, the endpoint identity and the operation context that establish the relationship, not mere numeric equality.

## 8.8 Investigation: where did the SEND land?

### Learner copy

<!-- guided-block: imagine-you-are-investigating-a -->

Imagine you are investigating a captured packet from a running application. You see an ordinary SEND addressed to one of the RDMA endpoints. You want to know where the application data was placed. Start with the actual decoded packet; do not assume the application used WRITE just because it uses RDMA.

<!-- guided-block: we-will-ask-you-to -->

We will ask you to separate what the packet tells you from what the receiving application must tell you. You may inspect the original packet fields, then reveal the relevant local work and verification evidence. There is no score; the purpose is to practice reasoning.

### Visual and interaction

Case A: actual `b:packet:3`, neutral heading **Case A — Find the destination buffer**. Show packet fields but withhold app WR and memory until requested. Question **Can this packet alone identify the destination virtual address?** Options **Yes, the BTH contains it**, **No, the destination comes from posted receive work**, **Yes, the UDP port identifies it**. Correct second. Question **Which additional record shows what arrived in B's application buffer?** Options **B's verified receive bytes**, **A's destination QPN alone**, **The captured Ethernet destination alone**. Correct first. **Reveal receive instruction** selects `wr:b:hostb:exp-b-receiver:4`; **Reveal completion and verified bytes** shows B completion and snapshot plus verification event. Explain wrong alternatives below; allow skip/review, no mastery claim. Primary **Investigate the WRITE acknowledgement**.

### Reveal/feedback

BTH selects the endpoint, not a particular application buffer. UDP 4791 identifies RoCEv2 encapsulation, not a memory address. The receive WR supplies the local buffer and the later receive completion and verified bytes establish what the receiving process obtained. The SEND packet establishes that the message was observed on the data path; it is not the entire application proof.

## 8.9 Investigation: does an ACK notify the target application?

### Learner copy

<!-- guided-block: a-network-engineer-may-see -->

A network engineer may see a WRITE packet followed by an ACK and conclude that the receiver application has received and processed the data. Is that conclusion supported by the packet capture?

<!-- guided-block: look-at-the-actual-write -->

Look at the actual WRITE request and its reverse ACK. The target's registered address and RKEY are visible in the request, and the opcode identifies ordinary WRITE. The ACK is a transport response, not an application response. We need to work out which part of the communication story these packets establish and which part must be investigated elsewhere.

### Visual and interaction

Case B: `c:packet:7` and `c:packet:8`, selectable rows; show real RETH and reverse QPN. Question **Does the ACK prove that B's Python process has consumed the data?** Options **Yes**, **No**. Correct No. Question **What does B observe when it polls after the synchronization signal in this run?** Options **Ordinary receive completion**, **Zero entries**, **A copy of the ACK packet**. Correct zero. Withhold answer until evidence reveal. **Reveal writer completion**, **Reveal B's control signal and CQ poll**, **Reveal B's buffer comparison** in causal order; source exact lines. Wrong feedback: CQ entries are local work results not packets; ordinary WRITE does not complete a receive WR; ACK alone does not prove application verification. Primary **Investigate a READ response**.

### Reveal/feedback

The recorded result is a successful initiator completion, a target poll returning zero entries, and a verified target memory prefix. The explicit TCP control message coordinates application observation. We can reconstruct that story from several evidence sources, not from the ACK alone.

## 8.10 Investigation: who initiated this response?

### Learner copy

<!-- guided-block: this-time-begin-with-a -->

This time begin with a packet travelling from B to A. It carries application bytes. If you identify the sender only by the packet's source IP, you may think B initiated the data operation. But the opcode identifies a READ response. What request would explain this packet?

<!-- guided-block: consider-the-four-roles-we -->

Consider the four roles we learned earlier: operation initiator, request transmitter, payload source and local completion owner. In READ, the responder sends the data, but the original Work Request belongs to the reader. To establish this from real evidence, we must examine the related request and the application work context.

### Visual and interaction

Case C opens `d:packet:4` first. Question **Given this decoded RC READ response and its prepared A/B endpoint context, which host initiated the associated READ?** options **A**, **B**, **Both submitted a READ**; correct A, with explicit note that packet direction alone would be insufficient. **Which endpoint does this response target?** options A local QPN / B local QPN; correct A, use actual values. **Which application should observe READ completion?** A/B/both; correct A. **Find the earlier request** reveals `d:packet:3` with RETH and zero payload. **Inspect originating work** reveals A WR. **Inspect data and completion** reveals B before prefix, response payload, A WC and verified data; B source poll only after read_done, as in lesson 7. No fabricated inference of a new B SEND WR. Primary **Connect this to an AI fabric**.

### Reveal/feedback

A reverse-direction response can be part of work initiated at the opposite endpoint. The opcode and endpoint context matter more than the informal word sender. In the actual run the reader on A submits the WR, B supplies the bytes and A observes the successful READ completion.

## 8.11 From this laboratory to an AI cluster

### Learner copy

<!-- guided-block: so-far-we-have-used -->

So far we have used very small buffers so we could follow the bytes. The same mental model helps explain why high-performance computing and AI workloads care about communication efficiency. Imagine two training processes each holding part of a large tensor. At some point a communication library needs to exchange data with another process, perhaps as part of a collective operation such as an all-reduce.

<!-- guided-block: the-application-may-use-a -->

The application may use a library such as NCCL. That library can select communication paths based on the available hardware and topology. A network transport may use registered memory and RDMA communication resources, and submit work to an RNIC. The packets can cross a RoCEv2 Ethernet fabric through leaf and spine switches. The provider and software coordinate the result so the application can continue its computation.

<!-- guided-block: in-a-hardware-supported-gpudirect -->

In a hardware-supported GPUDirect RDMA path, the RNIC can access suitably registered GPU memory over an appropriate device interconnect instead of always staging data through host memory. This requires support from the GPU, NIC, drivers, platform and registration mechanisms; synchronization and ordering are particularly important. We cannot assume that a CPU or GPU can consume a buffer immediately merely because a packet was seen. Our host-memory RXE experiment neither runs NCCL nor transfers GPU memory. It is the foundation for understanding those mechanisms.

<!-- guided-block: a-real-cluster-has-many -->

A real cluster has many simultaneous transfers. Queuing, congestion and drops can affect transport progress and application completion. PFC is a link-level priority pause mechanism; ECN marks congestion in IP packets, and RoCE congestion notification can inform the sender to reduce injection rate. These mechanisms have different purposes and design tradeoffs. RoCE fabrics can use different congestion and loss-management configurations; do not equate the UDP encapsulation with a universal requirement for one specific switch policy.

<!-- guided-block: when-someone-tells-you-an -->

When someone tells you an AI job is stalled, you now have a more useful question than "is the link up?" Ask whether the applications prepared their endpoints, submitted the right work, whether the transport made progress, and whether the application observed and acted on the completion.

### Visual and interaction

Conceptual only: two AI hosts, application/library, host or supported GPU memory, RDMA resources, representative RNIC, leaf/spine fabric; show switch path distinct from memory and application instructions. **Compare host-memory path** / **Inspect possible GPU-memory path** with separate CPU control and memory payload arrows; no performance numbers, no NCCL opcode mapping claim. Optional **Inspect fabric congestion** shows one queue building, ECN mark and conceptual receiver-to-sender CNP, PFC link-local pause separately; no observed congestion in lab. Show short troubleshooting layers with links to existing chapter slugs only after verifying they resolve (including Chapter 16). Primary **Review the complete mental model**.

### Inspect

Use actual NCCL networking troubleshooting and CUDA GPUDirect RDMA documentation for further reading. These describe real hardware and software constraints outside our Soft-RoCE evidence. [R14–R17]

## 8.12 A final investigation checklist

### Learner copy

<!-- guided-block: we-began-by-looking-at -->

We began by looking at a single CPU and some memory. We learned how a process obtains a buffer, how the kernel and CPU participate in TCP, how DMA and RDMA change the data-transfer model, and why RDMA resources exist. We have now followed three real operations all the way to network packets and application-observed results.

<!-- guided-block: you-do-not-need-to -->

You do not need to memorise every acronym to make use of this knowledge. When investigating RDMA, work in the following order.

<!-- guided-block: first-establish-the-application-objective -->

First establish the application objective. Which process owns the source and destination, and which operation is supposed to occur? Then establish preparation: device and endpoint configuration, registered ranges, access permissions and any required receive work. Next look at submission: was the instruction constructed and accepted, and what did it request? Then look at the transport: which endpoint did the packet target, which opcode and sequence information does it carry, and did the expected responses appear? Finally examine local completion status, memory verification and any application synchronization.

<!-- guided-block: a-missing-observation-is-not -->

A missing observation is not the same as a failed observation. A packet capture cannot reveal every CPU instruction or memory write. A successful completion cannot prove that every downstream application task has happened. A test's verified memory comparison is evidence about the bytes it actually examined, not all of RAM. Keep these distinctions and you can reason about a complex communication path without guessing.

### Visual and interaction

One compact causal map with five selectable areas: **Objective**, **Preparation**, **Submission**, **Transport**, **Application observation**. Each expands the corresponding paragraph above and links to relevant existing lesson. Optional **Review one real run** shows SEND/WRITE/READ evidence links and original PCAP downloads; no new simulation. Completion must distinguish visited/completed/reviewed, not subject mastery. Primary **Complete practical** uses existing curriculum progress callback. Optional **Open advanced execution explorer** and **Download lab materials** remain available, not required for completion.

### Reveal/feedback

If you can explain the difference between a local WR, a network packet, an ACK, a Work Completion and verified application bytes, you have the foundation needed to understand the remaining AI networking chapters. The next step is to use these ideas on a real trace and ask which layer the evidence points to.
