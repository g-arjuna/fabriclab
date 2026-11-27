# Lesson 5 — Our first real RDMA transfer: SEND and RECEIVE

This is canonical learner copy. Section IDs are stable. The **Visual and interaction** blocks are implementation instructions, not text to display verbatim. **Reveal/feedback** and **Inspect** are authored learner-facing content. Evidence identifiers in the visual blocks refer to the existing immutable reference run; see the companion evidence contract.

## 5.1 Where are our programs actually running?

### Learner copy

<!-- guided-block: we-have-spent-the-first -->

We have spent the first four lessons looking inside a computer. We know how a process obtains memory, how the CPU executes instructions, and how a conventional TCP connection moves bytes between processes. We have also seen how an RDMA provider prepares memory and communication resources.

<!-- guided-block: now-we-will-follow-two -->

Now we will follow two real Python programs through a complete transfer. We are not going to write a new program in the browser. Instead, we will examine an experiment that FabricLab has already run on two Linux virtual machines.

<!-- guided-block: on-server-a-hosta-the -->

On Server A (`hosta`), the Python process plays the sender. On Server B (`hostb`), another Python process plays the receiver. Both execute the same file, `exp_b_send_recv.py`, with different role arguments. They use Pyverbs to request RDMA operations through the Linux RDMA stack. Their RDMA device is the software device `rxe0`, associated with the data Ethernet interface. Remember: RXE executes the RDMA transport in software. A physical RNIC can implement much of this transport in hardware, but this experiment does not measure hardware offload.

<!-- guided-block: there-are-two-conversations-between -->

There are two conversations between the machines. The control connection uses ordinary TCP on the control network. The programs use it to tell each other which RDMA endpoints they created and when they are ready. The data network carries actual RoCEv2 traffic. These are separate interfaces in our laboratory, not a universal requirement for RDMA.

<!-- guided-block: we-will-follow-the-source -->

We will follow the source code, instructions, packets and memory observations. The browser lets us reveal the recorded execution at our own pace. An illustrated queue transition is our explanation of the mechanism; a packet or application log is what was actually recorded.

### Visual and interaction

Initial two-host bench, with visible A sender and B receiver, one CPU/RAM and provider/interface per host. Two separately labelled network links using `hosts.hosta/hostb.controlIp/dataIp`: TCP control and RoCEv2 data. Show actual device `rxe0`, associated `data0` interface, and guest Linux information from `environment`. Action **Inspect the two programs** reveals actual argument/role source lines `exp_b_send_recv.py:76–99` and an expandable link to the complete snapshot; no invented shell prompt. Action **Locate the capture** highlights the data path and links `send-recv.captureDownload.path`; no claim that TCP control was captured. Primary progression **Prepare the endpoints**.

### Reveal/feedback

The control path prepares the experiment. The data path carries the RDMA message. Both use Ethernet/IP in this lab, but the control messages travel through a conventional TCP socket and the RDMA operations use a different transport and programming interface.

## 5.2 What does a prepared connection actually contain?

### Learner copy

<!-- guided-block: before-either-program-can-transfer -->

Before either program can transfer a message, it needs a local RDMA device context, a protection domain (PD), a completion queue (CQ), a buffer associated with a memory region (MR), and a queue pair (QP). These are the objects we learned to build in the previous lesson.

<!-- guided-block: look-at-the-actual-setup -->

Look at the actual setup code. It opens the device and identifies a local GID, creates a PD and CQ, then calls a helper that allocates a buffer, registers it and creates a QP. The CQ is separate from the QP; this particular helper associates one CQ with both the send and receive queues. The two queues can hold multiple requests. Here we use only one send and one receive.

<!-- guided-block: a-newly-created-qp-is -->

A newly created QP is not ready to perform this transfer. Each process needs information about its peer. In this program the processes exchange a QPN, initial packet sequence number (PSN) and GID over TCP. The GID is a network identity used by the RDMA addressing machinery; in this lab it represents an IPv4-mapped address. It is not the QPN or an RKEY.

<!-- guided-block: the-helper-configures-the-qps -->

The helper configures the QPs in stages. In INIT it sets local port and access attributes. In RTR (Ready to Receive) it sets peer addressing, peer QPN and the expected incoming packet sequence. In RTS (Ready to Send) it sets outgoing sequence and retry attributes. These are local configuration actions, not a TCP three-way handshake. The lab takes both QPs through RTS before posting the SEND operation.

<!-- guided-block: the-numbers-here-belong-to -->

The numbers here belong to this SEND experiment. The QPNs we saw in the resource-only experiment belonged to a different run. A number that appears in two runs is not a guarantee that it identifies the same object.

### Visual and interaction

Progressive actual setup ledger: **Open device and create resources**, **Exchange endpoint metadata**, **Prepare the QPs**. Show source `exp_b_send_recv.py:50–72,88–99`, `rdma_common.py:131–151,155–191`. Show per-host actual MR/PD/CQ/QP associations from `send-recv` evidence; use `endpoints`, `resources`, `events` `resources`, `metadata_exchange`, `qp_ready`. Initial state shows no pending data WR. Reveal INIT/RTR/RTS in compact detail; local transitions conceptual/source-derived, ready event recorded. Do not invent independently recorded intermediate state events. GID/IP/QPN/PSN label chips with exact values; direction A's destination QPN = B's local QPN and vice versa. No remote buffer address/RKEY exchanged for SEND. Primary **Choose the destination buffer**.

### Inspect

The helper requests RC (Reliable Connected) QPs, one CQ for send and receive, capacity up to the requested eight send and eight receive WRs, one SGE per WR, and `sq_sig_all=1`. A provider may adjust actual capabilities. Those parameters are configuration, not counts of pending work. The ready log establishes preparation, not successful data transfer. [R1–R5]

## 5.3 Who decides where the message will land?

### Learner copy

<!-- guided-block: think-back-to-the-tcp -->

Think back to the TCP experiment. The receiver could delay calling `recv()`. The kernel's TCP socket could already contain unread bytes when we inspected it with `ss`.

<!-- guided-block: rdma-send-uses-a-different -->

RDMA SEND uses a different arrangement. Before a normal SEND arrives, the receiver needs to make suitable receive work available. The receiver chooses the memory in which the provider should place the incoming message. It describes that memory using its own local address, available length and LKEY. It then submits that description to its Receive Queue.

<!-- guided-block: in-this-run-the-buffer -->

In this run the buffer can hold 4,096 bytes. That does not mean the sender has to transmit 4,096 bytes. It means that the receiver has supplied space for a message within that capacity. Our sender will send a much shorter message.

<!-- guided-block: the-program-constructs-an-sge -->

The program constructs an SGE (scatter/gather entry). An SGE identifies a range of locally registered memory. It then wraps that description in a Receive Work Request (`RecvWR`) and gives the request a local identifier. The identifier allows the receiving application to recognize the completion later. It is not an address on the network.

<!-- guided-block: calling-qp-post-recv-rwr -->

Calling `qp.post_recv(rwr)` submits the receive instruction. It does not itself move any payload. There is no new data packet simply because the receiver has posted this request. Once the receiver has posted the request, it sends the sender a `ready` message over the TCP control connection. The sender waits for that message before it starts the SEND.

### Visual and interaction

Use actual B MR and receive WR `wr:b:hostb:exp-b-receiver:4`. Display a byte-buffer window with 4,096-byte capacity and zero-filled initial state labelled source-derived (`ctypes.create_string_buffer`), not a recorded initial snapshot. **Describe receive memory** highlights `exp_b_send_recv.py:104–106` and B address/LKEY/length. **Post receive request** highlights line 107 and places one instruction in B RQ; memory unchanged. **Tell A the receiver is ready** reveals line 112 and A `peer_ready` event `b:hosta:exp-b-sender:4`; dashed B→A TCP path. The posting log records submission, not queue occupancy measurements. No A SEND packet before this. Primary **Prepare the message on A**.

### Reveal/feedback

The receiver has prepared a destination. It has not received a message yet. The sender does not need to know B's destination virtual address or RKEY: B supplied that information locally through the receive request.

## 5.4 What if nobody has posted a receive?

### Learner copy

<!-- guided-block: suppose-a-submits-a-normal -->

Suppose A submits a normal RC SEND and B has no suitable receive request waiting. Where would B's provider put the incoming message? B has an RDMA endpoint, but it has not supplied a destination description for this operation.

<!-- guided-block: this-is-different-from-tcp -->

This is different from TCP's ordinary socket buffering. A normal RC SEND that needs a receive request can encounter Receiver Not Ready, often abbreviated RNR. The receiving transport can respond that it is not ready to accept the message. The initiating transport may retry after a delay according to its configuration. With finite configured retries, failure can eventually be reported. A request can also remain outstanding while the application itself stops waiting.

<!-- guided-block: in-fabriclab-s-actual-send -->

In FabricLab's actual SEND program, B posts receive work before notifying A. That deliberately avoids this situation. We have no recorded RNR packet in the successful reference run, so we will illustrate the possible problem rather than pretend that we measured it.

<!-- guided-block: there-is-another-separate-constraint -->

There is another separate constraint: if the receive work exists but the supplied destination space is too small for the message, the operation can fail rather than behaving like a series of TCP `recv()` calls. The application must arrange suitable receive capacity.

### Visual and interaction

Conceptual fork using five illustrative bytes only. Start with RQ empty. **Try SEND with no receive** shows "Receiver not ready" on the responder side, no successful placement or CQE, dashed reverse RNR explanation; no fake opcode/status/timing. **Prepare receive work** shows suitable local buffer description; **Return to recorded experiment** restores the real `send-recv` context. Optional **Inspect retry configuration** reveals helper lines 181,185–189 and explains `rnr_retry=7` permits indefinite RNR retries; the application helper has a finite wait timeout. No counter/timer simulation or fabricated failure capture. Primary **Construct the recorded SEND**.

### Reveal/feedback

A receive queue is not a store of arrived messages. It holds descriptions of where future eligible incoming messages may be placed. In the real run B prepares that description first. [R1, R3, R6]

## 5.5 How does A construct and submit the actual SEND?

### Learner copy

<!-- guided-block: now-the-receiving-side-is -->

Now the receiving side is ready. The sender can prepare its own memory. The real program defines a bytes literal ending in a newline. It writes the message into its registered local buffer using `mr.write(...)`.

<!-- guided-block: do-not-confuse-this-call -->

Do not confuse this call with an RDMA WRITE operation. Here `mr.write` is a local Pyverbs memory helper: the CPU executing the application puts bytes into the local buffer. There is no remote transfer yet. The actual RDMA operation is determined by the opcode in the Work Request that the application submits afterward.

<!-- guided-block: the-sender-s-sge-identifies -->

The sender's SGE identifies the local starting address, message length and LKEY. The SendWR says which operation to perform, associates that SGE with the request and asks for successful completion reporting. The WR ID is chosen by the local program. In our run the opcode is SEND. The request has no remote-memory address or RKEY because the receive request at B supplies the destination.

<!-- guided-block: finally-qp-post-send-swr -->

Finally, `qp.post_send(swr)` submits the instruction to A's Send Queue. The function is named for the queue; later we will use it for WRITE and READ as well. Submission is asynchronous: a successful return does not by itself establish that the bytes have reached the other host. The application must observe completion and check its status before treating the operation as finished.

### Visual and interaction

Use `exp_b_send_recv.py:43–45,128–145`. **Write bytes into A's buffer** shows true 50-byte payload from `b:packet:3.payloadHex` cross-checked with source bytes literal and B snapshot; label source contents reconstructed from code/packet, not a separately measured A memory snapshot. Display `\n` / hex `0a` explicitly; sender text log strips it. **Construct SEND instruction** highlights SGE fields and actual WR `wr:b:hosta:exp-b-sender:5`. **Submit to Send Queue** highlights line 139; constructed card moves to pending instruction state conceptually, source memory remains separate, B receive remains posted. Show no successful completion yet. Primary **Follow the data packet**.

### Inspect

The lab logs a successful post call and uses a finite completion wait. A posting error and a later completion error are different failure stages. For this signalled non-inline operation, keep the registered buffer and relevant resources valid until completion is retrieved. The normal local key is not an RDMA transport-header field. [R1–R4, R7]

## 5.6 From local memory to a RoCEv2 packet

### Learner copy

<!-- guided-block: the-provider-now-has-an -->

The provider now has an instruction and a way to access the source bytes. It also has a prepared peer endpoint. In the actual lab, software RXE uses the local memory description and executes the Reliable Connected transport through the Linux network path.

<!-- guided-block: on-the-network-we-no -->

On the network we no longer see Python objects, addresses meaningful only to A's local CPU, or the local WR ID. We see a RoCEv2 request. The captured packet is addressed to B's data IP, uses UDP destination port 4791 and names B's destination QPN in its Base Transport Header (BTH).

<!-- guided-block: the-transport-opcode-says-that -->

The transport opcode says that this is a SEND message contained in one transport packet. The Packet Sequence Number (PSN) identifies its place in the transport's sequence. We will examine these fields in detail in Lesson 8. For now, the important point is that the packet identifies the communication endpoint and carries the message; it does not tell B an arbitrary virtual address to write to.

<!-- guided-block: on-b-the-provider-identifies -->

On B, the provider identifies the prepared QP, associates the SEND with the posted receive work, and places the message into the memory that B described. The receive work is consumed. This is a conceptual explanation of the transport mechanism; we did not instrument the exact moment a queue slot was retired or a RAM/cache location changed. The actual packet and later receive completion and buffer check are our evidence.

### Visual and interaction

Use `b:packet:3` and both MR/WR records. **Inspect captured SEND** selects packet and reveals actual source/destination IP, UDP destination, opcode, destination QPN, PSN, payload hex/text and length breakdown. Display source memory → provider → packet → B provider → B memory as solid payload arrows; application → SQ and RQ → provider as separate instruction paths. **Follow placement at B** shows conceptual filled first 50 bytes, RQ instruction moves into consumed history; no claim of independently measured memory before completion. Label recorded packet vs causal illustration. Offer compact packet fields and full inspector/download, not mandatory full packet dump. Primary **Inspect transport acknowledgement**.

### Reveal/feedback

Why can the SEND packet omit B's virtual memory address? Because B's provider can find the receiving endpoint using the destination QPN and use the receive description that B already posted. The packet does not carry A's local LKEY or WR ID either.

## 5.7 The transport acknowledgement is not the application completion

### Learner copy

<!-- guided-block: we-chose-reliable-connected-transport -->

We chose Reliable Connected transport. In our capture B responds to the SEND with a transport acknowledgement. The ACK travels from B to A, so its destination QPN identifies A, not B. It has no copy of the application message. The transport uses acknowledgement information to establish progress and support reliable delivery; it is not a Python message returned by `recv()`.

<!-- guided-block: a-completion-is-a-different -->

A completion is a different object. A provider reports the result of eligible local work in a Completion Queue. A polls its CQ to find out whether its SEND completed. B polls its own CQ to find out whether its posted RECEIVE completed. The two results refer to different locally chosen WR IDs and QPs, even though both relate to the same transfer.

<!-- guided-block: a-successful-send-completion-in -->

A successful SEND completion in this RC example is not a promise that B's application has already examined, processed or acted on the message. The receiving application's own completion and subsequent verification establish that part of the story. In particular, we should not arrange the two CQ polls on one global timeline unless the evidence establishes that order.

### Visual and interaction

**Inspect the reverse ACK** selects `b:packet:4`; reverse link, destination A QPN, ACK opcode, zero payload. Expand actual AETH fields if present in protocol tree. **Observe A's completion** reveals `cqe:b:hosta:exp-b-sender:6`. **Observe B's completion** independently reveals `cqe:b:hostb:exp-b-receiver:5`. Both controls independently available after transport stage. Show conceptual CQ entry → poll → observed WC outside CQ; actual log records retrieval, not queue occupancy. Each local timeline independent; no forced A-before-B ordering. Show real WR IDs, local QPNs, statuses, opcodes. Primary **Read B's verified memory** after B completion revealed (allow review/skip explanation without falsely marking evidence observed).

### Inspect

The program's polling helper returns a WC only after SUCCESS, otherwise raises on error or after a timeout. Inspect `rdma_common.py:194–224`. Use the receive WC's `byte_len` to determine received message length. The fixture also records a send-side `byte_len`; label it as a recorded RXE result, not a portable SEND/WRITE completion-length contract. General software should not depend on send-side `byte_len` as proof of remote memory contents. [R3, R7]

## 5.8 Read the memory that B actually received

### Learner copy

<!-- guided-block: b-s-application-has-now -->

B's application has now retrieved its successful receive completion. It uses the received byte count to decide how many bytes to inspect in its buffer. Notice that this is not another socket `recv()` call. The RDMA provider has already placed the message in the memory B supplied. The program reads its own buffer using ordinary CPU memory access.

<!-- guided-block: the-actual-source-uses-bytes -->

The actual source uses `bytes(buf.raw[:n])`. In Python, producing this bytes object can itself involve a local copy. That is application processing after the RDMA operation, not another network transfer. The program compares the received bytes with the expected literal and records whether the lengths and contents match.

<!-- guided-block: our-evidence-shows-a-50 -->

Our evidence shows a 50-byte message, even though the receive buffer had capacity for 4,096 bytes. The packet carries exactly those message bytes, including the final newline. Transport padding is not part of the message. We have not captured every byte of the remaining destination buffer and should not present those bytes as independently measured.

<!-- guided-block: we-now-have-several-complementary -->

We now have several complementary observations: the request was submitted, the SEND packet was captured, the receiver reported a successful completion, and the application verified the resulting data. Together they establish what this experiment accomplished.

### Visual and interaction

Use `exp_b_send_recv.py:113–121` and `b:memory:hostb:received`, `b:hostb:exp-b-receiver:7`. **Read received bytes** shows actual memory snapshot with offsets, ASCII/hex toggle, newline visible. Compare full unpadded packet bytes with snapshot, show exact equality and 50/4096 distinction derived from evidence. Remaining buffer capacity shown as unobserved in snapshot, not drawn as captured zeros. Display local sequence B completion → read → verify, independent A SEND completion. **Compare with TCP** reveals the authored comparison below. Primary **Review the SEND experiment** advances to 5.9.

### Reveal/feedback

TCP gives an application an ordered byte stream; individual writes and reads may have different boundaries. In this RC SEND example, B prepared receive work for one message, and the receive completion identifies the received message length. Both can transport the same bytes, but the application interface and the way destination memory is supplied are different. Next we will let A name B's remote memory directly.

## 5.9 Review: reconstruct the SEND experiment

### Learner copy

<!-- guided-block: before-moving-on-see-if -->

Before moving on, see if you can explain the transfer without relying on the names of the API calls. B decided where to put the message. A decided which message to send. The providers used their prepared endpoints to communicate. The receiving provider placed the bytes in B's registered buffer, and both applications observed their own work completions.

<!-- guided-block: now-imagine-you-only-have -->

Now imagine you only have the captured SEND packet. Can you find B's application buffer address in it? Can you establish that B has actually consumed the data? We need more than the network capture to answer those questions.

### Visual and interaction

One compact review, no new timeline. Present `b:packet:3` without answer-bearing heading other than decoded fields. Question 1 options **From RETH**, **From B's posted receive work**, **From UDP destination port**. Correct: B's posted receive work. Question 2 options **SEND packet alone**, **B's successful completion and verified buffer**, **A's WR ID alone**. Correct: B's evidence. Allow **Reveal explanation** and **Skip review** without mastery claim. Show missing receive, local instruction, network request, observed completion and verified data in a single causal strip with labels. Final **Continue to ordinary RDMA WRITE** calls lesson completion. If direct-reference mode has unvisited sections, provide explicit review/reference navigation rather than marking lesson complete. 

### Reveal/feedback

There is no RETH in this captured ordinary SEND. The receiver's local instruction supplies the address. A packet can show a message crossing the capture point, but the receive completion and verified bytes are additional application evidence. We are ready to ask whether a sender could choose the remote destination instead.
