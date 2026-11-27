# Lesson 6 — Ordinary RDMA WRITE: choosing the remote destination

Canonical learner copy and visual specifications. Preserve subsection IDs and the original distinction between conceptual examples and the actual reference run.

## 6.1 The question that SEND leaves unanswered

### Learner copy

<!-- guided-block: in-the-preceding-experiment-b -->

In the preceding experiment, B's application chose the destination buffer before A submitted its SEND. B posted receive work and the receiving provider consumed that work when the message arrived. Each application observed a local completion for its own request.

<!-- guided-block: what-if-the-two-applications -->

What if the two applications agree in advance on a region of memory that A is allowed to update? Instead of asking B to supply a new receive description for every message, A could name an authorized destination inside that region. That is the ordinary RDMA WRITE operation we will study now.

<!-- guided-block: the-word-ordinary-is-important -->

The word ordinary is important. We mean RDMA WRITE without immediate data, not every possible WRITE variant. The target still needs a prepared endpoint and a registered region with appropriate access. The target application must cooperate in establishing that access and coordinating use of the buffer. It simply does not need to post a receive WR for each ordinary WRITE.

<!-- guided-block: one-sided-does-not-mean -->

One-sided does not mean that only one computer exists, that no target setup is required, or that the target CPU does nothing for the entire program. It describes the interface for this data operation: the initiator can request access to already authorized remote memory without the target application submitting a matching receive instruction for that operation.

<!-- guided-block: we-will-compare-the-same -->

We will compare the same basic objective — data in A's memory appears in B's memory — using a separate, genuine WRITE run.

### Visual and interaction

Reuse stable two-host layout. Start with compact **Recall SEND** diagram (B chooses destination via RQ). **Compare ordinary WRITE** swaps destination-selection relation: A names region on B, B RQ has no receive posted for this operation. Use only illustrative HELLO in this comparison, explicitly not the two recorded runs. Distinct instruction and payload paths; no packet or result before setup. Then **Open the recorded WRITE experiment** switches to `write` run, with role labels writer/target. Show new evidence badge and distinct run ID; no mixing of QPNs or keys across runs.

### Reveal/feedback

The difference is not that SEND cannot place data in registered memory. Both operations can do that. The difference is who supplies the destination description and whether matching receive work is required.

## 6.2 Prepare B's memory and advertise only what A needs

### Learner copy

<!-- guided-block: the-actual-write-program-exp -->

The actual WRITE program, `exp_c_write.py`, runs a writer on A and a target on B. It creates its resources in much the same way as the SEND program. There is one important addition: the target initializes its buffer with dots before registration, so later it can demonstrate that its contents have changed.

<!-- guided-block: b-records-the-first-64 -->

B records the first 64 bytes of this initial buffer. The dots are actual ASCII bytes (`0x2e`), not empty or unallocated memory. The full buffer has room for 4,096 bytes. B registers the range using the helper we saw earlier; the fixture enables local write, remote write and remote read access. It also prepares QP access attributes. In a real application, access should be limited to what the operation requires.

<!-- guided-block: during-the-tcp-metadata-exchange -->

During the TCP metadata exchange, both hosts share their endpoint identity. In addition, B shares its registered address, RKEY and available length. A does not need B's local key to issue a remote WRITE. B's local key and remote key happen to have equal numeric values in this reference run; equality is not a protocol requirement and the two fields have different roles.

<!-- guided-block: the-programs-then-prepare-their -->

The programs then prepare their RC endpoints. B sends `ready` over the control socket. This readiness tells A that the target has prepared the necessary resources; it does not mean B posted a Receive Work Request. In this experiment it never posts one for the ordinary WRITE.

### Visual and interaction

Evidence `write.endpoints`, `c:memory:hostb:before`, `c:hostb:exp-c-target:2–4`, `c:hosta:exp-c-writer:2–4`. **Inspect target before** displays first 64 captured snapshot bytes, address/capacity; remainder not sampled. **Share destination information** highlights `exp_c_write.py:57–69,106–109`; actual B→A tuple address/RKEY/length on dashed TCP lane, both endpoint tuples in expandable detail. **Prepare endpoints and signal readiness** uses lines 111–122,152–157, actual A `peer_ready`. Show B RQ with no receive WR for this experiment, as supported by source/WR evidence, not a continuously sampled empty queue. Source `rdma_common.py:131–151,166–191` for MR/QP access and CQ associations; inspect actual `ACCESS` constant from embedded source using exact symbol match, not invented flags. Primary **Build A's WRITE instruction**.

### Inspect

Registration relates an address range to a PD and access keys. Remote access also depends on endpoint configuration and provider checks. The target's address is meaningful in its registered-memory context; A's CPU cannot simply load or store through that virtual address. [R4, R5, R8]

## 6.3 Build a WRITE instruction from two memory descriptions

### Learner copy

<!-- guided-block: a-already-has-registered-local -->

A already has registered local memory and B's previously exchanged remote metadata. The application has not yet written the message or submitted a WRITE.

<!-- guided-block: mr-write-puts-the-message -->

`mr.write(...)` puts the message into A's own registered buffer. This is a local memory operation, not a network RDMA WRITE.

<!-- guided-block: the-message-is-53-bytes -->

The message is 53 bytes including the newline.

<!-- guided-block: a-constructs-the-sge-using -->

A constructs the SGE using the local address, transfer length and LKEY. This describes the source bytes the provider will access.

<!-- guided-block: a-constructs-a-sendwr-containing -->

A constructs a SendWR containing the WRITE opcode, local identifier, SGE and completion-reporting request. The remote destination has not yet been attached.

<!-- guided-block: a-calls-swr-set-wr -->

A calls `swr.set_wr_rdma(...)` on the existing Work Request, supplying B's previously advertised address and RKEY.

<!-- guided-block: python-swr-set-wr-rdma -->

```python
swr.set_wr_rdma(rkey=peer["rkey"], addr=peer["addr"])
```

<!-- guided-block: a-calls-qp-post-send -->

A calls `qp.post_send(swr)`. The completed instruction is submitted to the provider. Successful submission does not establish successful completion.

<!-- guided-block: constructing-the-sendwr-prepares-the -->

Constructing the SendWR prepares the application-side instruction. Submitting the completed instruction through `post_send()` allows the provider to execute it, which can result in transmission of the corresponding RDMA packets.

<!-- guided-block: the-remote-key-and-address -->

The remote key and address come from the target's earlier metadata exchange. The transfer length comes from the local SGE, not from a second independent remote length parameter. The advertised target length is a useful bound for the application to respect; it is not automatically substituted for the number of bytes in this WRITE. The provider checks the actual registered range and permissions when carrying out the operation.

<!-- guided-block: the-wr-id-is-local -->

The WR ID is local to A. The local LKEY is used to describe A's registered source. Neither is a field that B needs to receive over the network in this ordinary WRITE. The remote address and RKEY, by contrast, are part of the request that the transport must deliver to the target.

### Visual and interaction

Use `exp_c_write.py:124–138` and `wr:c:hosta:exp-c-writer:5`. **Fill A's source buffer** displays `c:packet:7.payloadHex` with newline; source-derived/reconstructed not sampled A RAM. **Describe local source** reveals SGE and source address/LKEY/length. **Add remote destination** reveals `set_wr_rdma` source line and B's shared tuple, with different colors and explicit owner labels. **Construct WRITE instruction** reveals opcode, WR ID and signalled property; no pending SQ entry until submission. **Submit WRITE** highlights line 134 and adds pending conceptual instruction. No destination memory verification yet. Primary **Follow the WRITE packet**.

### Reveal/feedback

What changed from SEND? A added an operation code selecting WRITE and a remote-memory description. B did not supply receive work. A still uses its own local memory description; it does not use B's RKEY as a local LKEY.

## 6.4 What does the target provider do with the incoming request?

### Learner copy

<!-- guided-block: the-provider-on-a-has -->

The provider on A has the local data and prepared connection information. It constructs the transport request. Because the operation is WRITE, the request contains a remote-memory header in addition to the base transport header. We call that extension RETH, the RDMA Extended Transport Header.

<!-- guided-block: reth-identifies-the-remote-virtual -->

RETH identifies the remote virtual address, RKEY and transfer length. B's transport can use the destination QPN to find the receiving endpoint context, interpret the opcode and check whether the requested remote access is allowed. The request must match suitable registered memory and lie within its permitted range. A valid address alone is not sufficient, and a valid key alone is not sufficient.

<!-- guided-block: after-these-checks-the-target -->

After these checks, the target provider places the bytes into the specified portion of B's registered buffer. No ordinary receive WR is consumed. In the lab this is software RXE processing on B's CPU; the representative hardware-RNIC implementation performs the equivalent transport and memory-placement work in the device. Do not confuse the two implementations.

<!-- guided-block: the-captured-write-fits-in -->

The captured WRITE fits in one transport packet. The provider is not transferring the Python object itself or a copy of B's key table. It transfers the message and enough transport information for the target to perform the permitted memory access.

### Visual and interaction

Select actual `c:packet:7`. **Inspect WRITE request** displays outer network destination, BTH destination QPN/opcode/PSN and RETH address/RKEY/DMA length, payload and length breakdown. **Check target access** highlights corresponding B registration, requested byte interval `[address,address+length)` and MR/QP access flags from source; successful checks are causal explanation consistent with verified run, not independently logged per-check results. **Follow target placement** illustrates first 53 bytes becoming message; RQ unchanged; target observation explicitly "placement illustrated; actual buffer check not yet revealed". Do not draw the payload through SQ or RQ. No fabricated target CQE. Primary **Follow the reverse acknowledgement**.

### Inspect

For a multi-packet ordinary WRITE, not every packet has a RETH; the first (or only) WRITE packet carries the remote-memory description. Later packets belong to the same transport operation. Our capture has one WRITE Only packet. [R1, R9–R12]

## 6.5 What did the writer actually learn from completion?

### Learner copy

<!-- guided-block: b-sends-a-transport-acknowledgement -->

B sends a transport acknowledgement back to A. Like the ACK in SEND, it is addressed to A's QP, not B's QP. It is part of the RC transport, not a reply message constructed by B's Python application. The ACK does not carry the 53-byte application message.

<!-- guided-block: a-polls-its-cq-the -->

A polls its CQ. The recorded result is SUCCESS for the WRITE WR ID. In this particular RC host-memory experiment, it establishes successful completion of the requested transport operation from the initiator's point of view. It permits A to reuse the relevant source buffer according to the operation and registration lifetime rules.

<!-- guided-block: it-does-not-establish-that -->

It does not establish that B's Python application has read the destination, performed further computation or saved anything durably. Completion is not a general memory-persistence guarantee. Other memory types and relaxed-ordering or accelerator configurations may require additional ordering and synchronization mechanisms.

<!-- guided-block: this-distinction-is-easy-to -->

This distinction is easy to miss because the word complete sounds like the whole application workflow has finished. It has not. A knows its operation completed; B still needs a way to learn when it may use the incoming data.

### Visual and interaction

**Inspect the ACK** shows `c:packet:8` reverse direction and actual decoded AETH if available, no application payload or RETH. **Poll writer CQ** reveals `cqe:c:hosta:exp-c-writer:6`, then `c:hosta:exp-c-writer:7` write_complete. Show retrieved completion outside CQ, conceptual pending entry not claimed measured. Use `exp_c_write.py:140–145` and shared poll helper. Keep target CQ observation unrevealed, target memory verification unrevealed. Primary **Predict how B learns the result**.

### Reveal/feedback

If you were debugging only from the network, an ACK would be a valuable transport observation. It would not show the target application's later verification. The application and the transport have different responsibilities. [R1, R3, R7]

## 6.6 Does B receive a normal completion when its memory changes?

### Learner copy

<!-- guided-block: in-the-send-experiment-b -->

In the SEND experiment, B posted receive work and could observe its completion. In this ordinary WRITE experiment, B did not post a Receive Work Request.

<!-- guided-block: before-continuing-consider-whether-b -->

Before continuing, consider whether B will receive a normal receive completion simply because A writes bytes into its registered memory.

<!-- guided-block: a-observes-successful-completion-of -->

A observes successful completion of its WRITE and sends an explicit `write_done` message over the TCP control connection. This is the application-level coordination mechanism used by our reference program.

<!-- guided-block: after-receiving-that-control-message -->

After receiving that control message, B polls its own Completion Queue. We are now examining the target application's observation, not another network acknowledgement.

<!-- guided-block: the-recorded-poll-returned-zero -->

The recorded poll returned zero entries. Ordinary WRITE does not complete normal receive work merely because it places data in remote memory.

<!-- guided-block: the-target-memory-may-have -->

The target memory may have changed even though no corresponding target receive completion was generated. We will establish the actual memory result by inspecting B's recorded verification in the next subsection.

<!-- guided-block: the-memory-being-updated-and -->

The memory being updated and the application being notified are two distinct events. A provider can perform a remote memory operation without completing a local receive instruction. The mechanism for telling B's application that it is safe to inspect the data must be part of the application protocol.

<!-- guided-block: b-could-have-unrelated-cq -->

B could have unrelated CQ entries in a more complex program; the zero-entry observation here is one specific poll in a controlled run.

### Visual and interaction

Show B registered destination, no receive WR for operation, B CQ **not inspected yet**, no recorded after snapshot. Prompt **Will ordinary WRITE produce a normal receive completion at B?** Options **Yes**, **No**, **Not sure**; optional **Skip prediction**. Do not reveal correct answer on selection. Store choice scoped to subsection/revision. **Follow the synchronization message** reveals A source line 150 only after writer completion (recap prerequisite even on direct section access); B receives `c:hostb:exp-c-target:5` on dashed TCP lane. **Poll B's CQ** reveals `c:hostb:exp-c-target:6` actual `npolled=0`, line 161; no global claim that all future polls are empty. Feedback below follows observation. Primary **Read B's buffer**.

### Reveal/feedback

The recorded poll returned zero entries. Ordinary WRITE does not produce a normal target receive completion just because data was placed in memory. The successful initiator completion and the explicit control message are what allow this test program to coordinate its verification. B could have unrelated CQ entries in a more complex program; the observation here is one specific poll in a controlled run.

## 6.7 Where did the data go if B's completion queue is empty?

### Learner copy

<!-- guided-block: now-look-at-b-s -->

Now look at B's memory. Its initial snapshot contains dots. After A observes its successful WRITE completion, it sends the small JSON message `{"write_done": true}` on the TCP control connection. B receives that message, polls its CQ once and then reads the beginning of its own buffer.

<!-- guided-block: the-control-message-does-not -->

The control message does not carry the WRITE payload and does not cause the placement. It tells the target application that the writer has completed the operation and that the test may inspect the memory. The data was transferred through the RDMA data network. This is why we keep the control and data paths separate.

<!-- guided-block: the-actual-program-reads-exactly -->

The actual program reads exactly the number of expected payload bytes. It compares them against the expected literal and records a successful match together with the zero-entry target CQ observation. We can now see the message in B's memory even though there was no ordinary receive completion on B.

<!-- guided-block: the-before-event-contains-the -->

The before event contains the first 64 bytes. Despite the field name `first64` in the after event, the program actually records 53 bytes after the WRITE because it slices to the payload length. We must compare the common observed range, not claim that the after log sampled the remaining eleven bytes. This is a good example of why reading the program matters when interpreting a log.

### Visual and interaction

Evidence `c:memory:hostb:before`, `c:memory:hostb:after`, `c:hostb:exp-c-target:5,6,7`; source `exp_c_write.py:147–171`. **Inspect before and after** displays aligned byte cells for common 53-byte range; before includes expandable extra sampled 11 dots, after beyond 53 labelled not observed. Compare after hex against `c:packet:7.payloadHex` including newline. Show target local order signal → poll zero → memory verification. Display actual result `payload_ok`, `target_cqe_count`, `ok`. Keep ordinary CPU read path distinct from RDMA memory placement. Primary **Compare SEND and WRITE**.

### Reveal/feedback

If the target application only waited for an ordinary receive CQE, it would not receive notification of this WRITE through that mechanism. Software must agree on how to signal ownership and readiness of the buffer. [R1, R3, R7]

## 6.8 Compare SEND, WRITE and notification choices

### Learner copy

<!-- guided-block: we-have-now-seen-two -->

We have now seen two ways to place a message in B's memory. In both cases A submits work on its Send Queue and the transport moves application data from A to B. The most important difference is the destination-selection rule.

<!-- guided-block: in-send-b-chooses-where -->

In SEND, B chooses where incoming data goes by posting receive work. A does not include a remote address and RKEY for that operation. A's SEND and B's RECEIVE each produce the corresponding local completion in our signalled experiment.

<!-- guided-block: in-ordinary-write-a-names -->

In ordinary WRITE, A names an authorized region on B. A includes a remote address and RKEY, and B does not need a matching receive WR for that operation. The successful initiator completion does not become a normal receive completion at B. Our lab uses a separate TCP notification after completion so B can inspect the result.

<!-- guided-block: there-are-other-ways-for -->

There are other ways for applications to arrange notification. For example, WRITE with immediate data is a distinct operation that can supply a receive completion carrying immediate information on the target side, and requires suitable posted receive work there. The WRITE payload still goes to the named remote region, not to the receive WR's data buffer as if it were a SEND. That is not the operation we captured. Another design might use a follow-up message or carefully designed shared-memory signaling protocol. Such designs must respect ordering, synchronization and memory visibility rules.

<!-- guided-block: for-this-lesson-remember-the -->

For this lesson, remember the simplest distinction: **remote memory placement does not automatically imply remote application notification**.

### Visual and interaction

Two-column comparison with fixed A/B host positions, selector **SEND**, **Ordinary WRITE**, **Inspect WRITE with immediate (conceptual)** (optional expansion only). Display actual SEND/WRITE reference results separately, no mixed QPNs. Show destination selection, matching receive requirement, transmitted RETH, local completion ownership, target notification. For immediate variant show conceptual RQ consumption and immediate metadata in receive WC, no fabricated opcode or capture. Short prediction: **Which evidence proves B's bytes matched?** options ACK alone / B's buffer verification / A's LKEY. Correct B buffer verification. Final **Continue to RDMA READ** via curriculum completion callback.

### Reveal/feedback

SEND lets the receiver choose the buffer for a message. Ordinary WRITE lets the initiator name a permitted destination. WRITE with immediate is a different operation and cannot be used to explain the observed zero target CQEs in our ordinary WRITE run. [R1–R3, R6]
