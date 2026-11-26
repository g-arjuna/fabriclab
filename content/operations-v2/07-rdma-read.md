# Lesson 7 — RDMA READ: the request goes one way and the data returns

Canonical content; all evidence belongs to the separate READ run unless explicitly marked conceptual or comparison.

## 7.1 Change the question: who already has the data?

### Learner copy

In SEND and WRITE, A had the message and wanted to place it in B's memory. Suppose instead that B already has data which A needs. Perhaps B is holding a portion of an array and A wants to retrieve it into a local buffer.

One possible design is to send B a request message and have B's application issue a SEND reply. That is an application-level request/reply protocol. But if B has registered an authorized region for remote reads, A can request the data directly through an RDMA READ. B's provider services the request using the prepared transport and memory-access context; B's application does not have to submit a new SendWR for the response.

This gives us four separate roles to track. Which host initiates the operation? Which host contains the source data? Which host receives the data? Which application observes completion? In our READ experiment, A initiates, B supplies the data, A receives it, and A observes its READ completion.

The distinction matters because the first packet travels from A to B, whereas the data returns from B to A. A is using its Send Queue even though its local memory is the destination of the payload.

### Visual and interaction

Conceptual fixed A/B diagram: B contains HELLO, A zero buffer. **Compare application request/reply** shows two application-controlled SEND messages in illustration only. **Choose RDMA READ** shows A's instruction, request arrow A→B, response arrow B→A, A completion. Separate arrows labelled request / payload. Do not imply B executes `post_send()` for response. **Open the recorded READ experiment** switches to `read`, roles reader/source. New run scope and fresh resource metadata.

### Reveal/feedback

The word sender can be ambiguous in READ: A transmits the request, B transmits the response containing the data. Use reader/initiator and source/responder rather than calling both hosts sender.

## 7.2 Prepare a source and a destination

### Learner copy

Our actual program is `exp_d_read.py`. On B, the source process allocates a 4,096-byte buffer, fills it with `#` bytes, registers it and puts a known message into the beginning of the registered memory. That message contains 46 bytes including a newline. The recorded initial snapshot shows the message followed by hash characters.

On A, the reader allocates and registers its own 4,096-byte buffer. That is where the response data should land. In READ, A's local SGE will describe a destination rather than a source. The provider must be able to write into that local destination, so the applicable local-write access is important. B must have authorized remote-read access to the source. The shared registration helper enables both in the reference lab, along with remote-write access; a production design should grant only necessary access.

B shares the remote address, RKEY and the available data length with A over the control connection. This time the advertised length is the length of the valid message, not the full 4,096-byte registration. That is an application decision: the receiver of metadata needs to know how much meaningful data the source intends to expose. It must still keep requests within the registered range.

The programs prepare their QPs and B signals readiness. The resources are new for this READ run, so we will not reuse addresses or QPNs from the previous WRITE.

### Visual and interaction

**Inspect B's source** uses `d:memory:hostb:before`, displays 64 sampled bytes: first 46 message including newline, next 18 hashes. **Prepare A's destination** shows actual MR metadata and source-derived zero-initialized buffer (no recorded before snapshot A). **Exchange source metadata** shows `exp_d_read.py:90–106`, B `d:hostb:exp-d-source:3` shared length 46 vs MR length 4096, A peer data; dashed TCP lane. **Confirm readiness** uses source 137 and A event `d:hosta:exp-d-reader:4`. Show access roles local destination write on A, remote source read on B and QP access context. No B RQ or SQ WR submitted for servicing this operation. Primary **Describe a READ**.

### Inspect

Source code `exp_d_read.py:61–82` establishes allocation and source initialization. The B snapshot is observed after initialization; the A zero buffer is inferred from allocation, not independently sampled. Distinguish buffer capacity, advertised data length and requested length. [R4, R5]

## 7.3 Why does the reader use a Send Work Request?

### Learner copy

The name `SendWR` may seem odd now. We want A to receive data. Why would the reader use `SendWR` and call `post_send()`?

The Send Queue is the queue on which an application submits initiated operations. Those operations can send a message, write remote memory or request a remote read, depending on the opcode and QP type. The word Send in the API name is describing the queue, not necessarily the direction of the eventual payload.

The reader constructs an SGE using its own buffer address, length and LKEY. For a READ this is the local destination. It constructs a SendWR with opcode `IBV_WR_RDMA_READ`, a local WR ID and a request for completion reporting. Then it sets the remote source address and RKEY from the earlier metadata exchange.

Once A calls `qp.post_send(swr)`, its provider has enough information to request the remote data and place the returned bytes into the correct local region. The local destination address and LKEY stay part of A's local work context. B does not need to receive them to service the READ.

### Visual and interaction

Use `exp_d_read.py:110–124`, `wr:d:hosta:exp-d-reader:5`. **Describe local destination** highlights SGE and A memory; label arrow as destination reference (not outgoing payload). **Name remote source** shows `set_wr_rdma` with B address/RKEY. **Construct READ** reveals actual opcode, WR ID and length. **Submit to A's Send Queue** shows conceptual pending WR and keeps A buffer unmodified. Include same source lines as WRITE in optional compare but never mix actual runtime values. Primary **Follow the request to B**.

### Reveal/feedback

SEND and WRITE use the local SGE as a data source; READ uses the local SGE as a destination. All three are initiated through the Send Queue in this RC program. The opcode determines the operation. [R1, R4]

## 7.4 Follow the request: A asks, but sends no message payload

### Learner copy

The first captured READ packet goes from A to B. Its opcode says RDMA READ Request. It identifies B's QP and contains a RETH that names the remote source address, remote key and requested byte count.

This packet is unlike the SEND and WRITE request packets we have already seen. It contains a request for data, not the 46 bytes themselves. The amount requested is in RETH, even though the packet has no application payload.

At B, the provider uses the endpoint context and remote-memory description to check whether the requested region can be read. It can then obtain the data from the authorized source. In the actual Soft-RoCE lab, software performs this transport processing; in the representative hardware model, the RNIC performs the equivalent operation using device access to registered memory.

B does not have to wait for its application to notice the READ packet and manually construct a reply. The prepared transport handles the response. No ordinary receive WR is consumed by the READ request, and no new application SendWR is needed to produce the response.

### Visual and interaction

**Inspect captured READ request** uses `d:packet:3`. Display BTH, RETH, zero payload, requested length 46 derived from evidence. **Check remote source** highlights B MR and requested range, permission; label causal check not logged per step. A destination still not verified. Draw A→B request with dashed or explicitly labelled instruction/transport arrow; not a payload arrow. B source bytes stay unchanged in conceptual model (no post-read B memory sample claim). Primary **Follow the response back to A**.

### Reveal/feedback

A request can describe a 46-byte transfer without carrying any of those 46 bytes. Inspect the opcode and header structure before interpreting the packet's application data length. [R1, R9–R12]

## 7.5 Follow the response: B supplies data to A

### Learner copy

The second packet in our READ evidence is a response. It comes from B and is addressed to A's QP. The destination QPN has changed because the packet direction has changed. The response's opcode identifies a complete single-packet READ response.

It carries the data requested by A. It does not repeat the remote address and RKEY from the request as a RETH. A's provider has an outstanding READ context describing where to place the returned bytes. That context includes A's local SGE; the packet does not need to transmit A's local LKEY or destination virtual address.

The provider places the data into A's registered destination. Our diagram illustrates this memory placement. The subsequent completion and application verification are the recorded observations. We are not measuring the precise physical moment at which each cache line or memory location changes.

A READ does not mean moving the original object out of B's memory. It obtains a copy of bytes from the source. The initial source snapshot in this run contains the expected message; the reference does not record a later B-memory comparison, so we will not claim to have measured the entire unchanged source after the READ.

### Visual and interaction

**Inspect captured READ response** selects `d:packet:4`. Show B→A payload arrow distinct from previous A→B request; A QPN, opcode, PSN, AETH if exported, no RETH, payload including newline. **Place returned bytes** illustrates destination memory first 46 bytes; keep label causal until application reads. Compare payload hex to B initial snapshot prefix, not trailing hashes or padding. Show A's pending WR context linking response to local destination. No B application SEND instruction. Primary **Observe the reader's completion**.

### Reveal/feedback

The provider on B sends the response as part of servicing A's operation. The application that initiated the READ is still A. Packet source, data source and operation initiator are different roles.

## 7.6 Observe completion and verify the actual local data

### Learner copy

A polls its CQ and obtains a successful RDMA READ Work Completion. The local WR ID identifies the original request. The result tells the reader that the operation has completed. In this case the completion reports the transferred length, and the program uses that to read its own buffer.

Only after observing completion does the program read and compare the bytes with the expected message. The recorded `read_complete` event contains the data and a successful verification. Reading that Python buffer is ordinary local CPU memory access after the network transfer. The result is a local copy of bytes that were stored on the other machine.

Now consider B's application. It provided registered source memory and coordinated the experiment. Did it get a normal local completion for servicing A's ordinary READ? No matching local WR was submitted. The ordinary READ responder does not receive a normal CQE simply because a remote peer read its memory.

The actual program makes this observable: after A has verified the data, it sends `{"read_done": true}` over the TCP control connection. B receives it and polls its CQ once. That poll returns zero entries in this run. This is a distinct, later observation, not something we measured when the response packet was first seen.

### Visual and interaction

**Poll reader CQ** reveals `cqe:d:hosta:exp-d-reader:6`; no pending CQE after poll. **Inspect verified reader memory** uses `d:memory:hosta:read-result`, `d:hosta:exp-d-reader:7` and `exp_d_read.py:126–130`; compare response payload and source snapshot prefix with verified A bytes. **Signal READ done** reveals source line 134 and B `d:hostb:exp-d-source:5`. **Inspect source CQ** reveals `d:hostb:exp-d-source:6`, source lines 137–144; not before synchronization. Show B's poll returning zero at this point, no universal empty-queue assertion. Primary **Compare the three operations**.

### Inspect

The lab uses an explicit synchronization message to coordinate verification and shutdown. It does not carry the data or cause the READ response. Applications must keep source/destination memory valid for outstanding work and coordinate access and reuse. [R1–R4, R7]

## 7.7 Put the three operations side by side

### Learner copy

We can now describe the three operations without memorizing API class names. Ask who supplies the data, who selects the destination, what memory metadata is required and which application receives a local completion.

For ordinary SEND, A supplies the message and B chooses its destination with a posted receive description. For ordinary WRITE, A supplies data and names an authorized destination at B. For READ, A names an authorized source at B and supplies its own local destination. The request goes outward and the payload comes back.

The transport uses endpoint context for all three. It can acknowledge or respond as required by the operation. A local Work Completion is the application-facing result of eligible work, not a network packet. We used signalled operations and recorded successful completions in this lab; more advanced programs may use selective signalling and different CQ associations.

None of these facts tells us that every RDMA-based library uses one particular operation. A library can choose operations, queue layouts and synchronization strategies to meet its needs. But if you know these basic mechanisms, you have the tools to understand why a library might use them.

### Visual and interaction

Use this authored comparison, responsive rows with fixed A/B icons; use recorded counts separately and exact `write` ordinary semantics:

| Question | SEND | Ordinary WRITE | READ |
|---|---|---|---|
| Initiator in our lab | A | A | A |
| Application payload | A → B | A → B | B → A |
| Who describes destination? | B, posted receive | A, remote address and RKEY | A, local SGE |
| Matching target receive WR? | Yes | No | No |
| Remote address and RKEY in request? | No | Yes, destination | Yes, source |
| Local completions recorded | A SEND; B RECEIVE | A WRITE | A READ |
| Target application coordination | Posted receive, then observe receive completion | Explicit control notification in this run | Source readiness and done synchronization in this run |

Optional **Trace one operation** selector highlights initiator, request direction, payload direction, memory destination and completion ownership. Short prompt **A posts READ. Which direction does the payload move?** A→B / B→A / neither. Correct B→A. Primary **Investigate the packets on the wire** via curriculum completion callback.

### Reveal/feedback

The request direction follows the initiator. The payload direction follows where the bytes reside and where they must go. Next we will work backwards from packets to the operations that generated them.
