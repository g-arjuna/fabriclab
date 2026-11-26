# RDMA complete curriculum fidelity mapping

This mapping covers all 75 authored subsections currently integrated in PR #11. Canonical prose remains in `content/foundations-v2/` and `content/operations-v2/`; generated JSON is deterministic output of the checked-in builders. “Regression anchor” identifies the strongest focused browser coverage; every row is additionally exercised by the complete sequential curriculum traversal in `apps/web/tests/rdma.curriculum.smoke.spec.ts`.

| Section | Canonical title | Visual implementation | Interaction / mechanism focus | Regression anchor |
|---|---|---|---|---|
| 1.1 | What is actually inside a server? | `HostHardwareSoftwareVisual` | Show hardware / Show software responsibilities | foundations semantic: allocation/copy/translation suite; curriculum traversal |
| 1.2 | From a program on disk to a running process | `ProcessCreationVisual` | Start a program; Start another program | foundations semantic: allocation/copy/translation suite; curriculum traversal |
| 1.3 | How the CPU finds a byte | `AddressTranslationVisual` | Illustrative addresses; simplified cache behavior | foundations semantic: allocation/copy/translation suite; curriculum traversal |
| 1.4 | Allocate a buffer, then put data into it | `BufferAllocationVisual` | Allocate 16 bytes; Write HELLO | foundations semantic: allocation/copy/translation suite; curriculum traversal |
| 1.5 | What does it mean to copy data? | `CopyReferenceVisual` | Copy five bytes; Pass a reference instead | foundations semantic: allocation/copy/translation suite; curriculum traversal |
| 1.6 | Why does the kernel get involved at all? | `KernelServiceVisual` | Ask Linux for a service; Wait for device | foundations semantic: allocation/copy/translation suite; curriculum traversal |
| 1.7 | Now introduce two hosts | `TwoHostsObjectiveVisual` | Use the network | foundations semantic: allocation/copy/translation suite; curriculum traversal |
| 2.1 | Why use a socket instead of directly programming the NIC? | `SocketObjectsVisual` | Create a TCP socket | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.2 | Create the endpoint and choose a peer | `SocketObjectsVisual` | Connect to Server B | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.3 | The TCP handshake and accept() | `HandshakeVisual` | authored inspection/copy review | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.4 | What is a byte stream? | `ByteStreamVisual` | Illustrative alternative | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.5 | What happens when Python calls sendall()? | `TcpSendPathVisual` | Submit the five bytes | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.6 | TCP processing: turn a stream into segments | `SynchronizedTcpSegmentationInspection` | Inspect a real segment | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.7 | How does the NIC get the bytes? | `NicTransmitVisual` | Representative physical NIC | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.8 | Follow the frame through the receiving host | `NicReceiveVisual` | Inspect the socket before the application reads | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.9 | Where does recv() come from, and what does it do? | `ReceiveBytesVisual` | Read the next available bytes | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.10 | Does the receiver have to call recv() before the sender sends? | `ReceiveOrderingVisual` | Receiver reads first; Sender sends first | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.11 | Local sender versus remote sender | `LoopbackComparisonVisual` | Same machine (loopback); Two machines (Ethernet) | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 2.12 | Read the evidence, then ask why RDMA is needed | `TCP evidence comparison inspectors` | Understand DMA | foundations semantic: socket/segmentation/receive-order suite; curriculum traversal |
| 3.1 | A local memory transfer without CPU copying every byte | `DmaCopyVisual` | authored inspection/copy review | foundations semantic: DMA/RDMA transport comparison suite; curriculum traversal |
| 3.2 | Why the device needs an address it can use | `DmaAddressContextsVisual` | CPU reads; Device writes | foundations semantic: DMA/RDMA transport comparison suite; curriculum traversal |
| 3.3 | Conventional NICs already use DMA — why RDMA? | `TransferModelComparisonVisual` | Representative buffered TCP and hardware RDMA; optimizations and operations vary | foundations semantic: DMA/RDMA transport comparison suite; curriculum traversal |
| 3.4 | What does Remote Direct Memory Access actually mean? | `OperationPreviewVisual` | authored inspection/copy review | foundations semantic: DMA/RDMA transport comparison suite; curriculum traversal |
| 3.5 | What is Soft-RoCE and why are we using it? | `SoftRoceStackVisual` | authored inspection/copy review | foundations semantic: DMA/RDMA transport comparison suite; curriculum traversal |
| 3.6 | How does an application initiate RDMA work? | `RdmaInitiationVisual` | authored inspection/copy review | foundations semantic: DMA/RDMA transport comparison suite; curriculum traversal |
| 4.1 | A buffer is not yet an RDMA Memory Region | `RegistrationVisual` | Prepare this region for RDMA | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.2 | Who is involved in registration? | `RegistrationOwnershipVisual` | authored inspection/copy review | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.3 | Addresses, offsets and lengths | `RangeSelectionVisual` | Inspect eight bytes from offset 4; Inspect eight bytes from offset 12 | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.4 | What does local write mean? Who is local? | `AccessPathsVisual` | authored inspection/copy review | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.5 | A local key identifies registered access | `KeyExerciseVisual` | authored inspection/copy review | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.6 | A remote key is for an authorized remote operation | `RemoteKeyOwnershipVisual` | authored inspection/copy review | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.7 | How do keys and endpoint information get exchanged in this lab? | `MetadataExchangeVisual` | SEND setup; WRITE setup preview | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.8 | Test access requirements: one range, different operations | `AccessDecisionExerciseVisual` | authored inspection/copy review | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.9 | Look at the real registration record | `ActualRegistrationInspectionVisual` | authored inspection/copy review | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.10 | Why create communication resources before transferring anything? | `ResourcesQuestionVisual` | Describe a task | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.11 | Work Requests: a description of work, not data | `ConstructedWorkRequestVisual` | authored inspection/copy review | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.12 | A queue, then a Queue Pair | `QueueFormationVisual` | authored inspection/copy review | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.13 | What is the Queue Pair Number (QPN)? | `QpnEndpointVisual` | Inspect recorded endpoint setup | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 4.14 | Completion reporting and what the resource-only run proves | `CompletionAndResourceEvidenceVisual` | No data WR posted in this run; No RDMA data-operation packets recorded; Start the real SEND/RECEIVE practical | foundations semantic: registration/keys/queues suite; curriculum traversal |
| 5.1 | Where are our programs actually running? | `Lesson51` | Inspect the two programs; Locate the capture; Prepare the endpoints | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 5.2 | What does a prepared connection actually contain? | `Lesson52` | Open device and create resources; Exchange endpoint metadata; Prepare the QPs | operations semantic: staged QP readiness and TCP metadata classification |
| 5.3 | Who decides where the message will land? | `Lesson53` | Describe receive memory; Post receive request; Tell A the receiver is ready | operations semantic: constructed-versus-posted receive lifecycle |
| 5.4 | What if nobody has posted a receive? | `Lesson54` | Try SEND with no receive; Prepare receive work; Return to recorded experiment | operations semantic: conceptual RNR boundary |
| 5.5 | How does A construct and submit the actual SEND? | `Lesson55` | Write bytes into A's buffer; Construct SEND instruction; Submit to Send Queue | operations semantic: SEND construction/posting lifecycle |
| 5.6 | From local memory to a RoCEv2 packet | `Lesson56` | Inspect captured SEND; Follow placement at B; Inspect transport acknowledgement | operations semantic: captured SEND fields and placement boundary |
| 5.7 | The transport acknowledgement is not the application completion | `Lesson57` | Inspect the reverse ACK; Observe A's completion; Observe B's completion | operations semantic: independent completion evidence |
| 5.8 | Read the memory that B actually received | `Lesson58` | Read received bytes; Compare with TCP; Review the SEND experiment | operations semantic: exact byte equality |
| 5.9 | Review: reconstruct the SEND experiment | `Lesson59` | From RETH; From B's posted receive work; From UDP destination port | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 6.1 | The question that SEND leaves unanswered | `Lesson61` | Recall SEND; Compare ordinary WRITE; Open the recorded WRITE experiment | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 6.2 | Prepare B's memory and advertise only what A needs | `Lesson62` | Inspect target before; Share destination information; Prepare endpoints and signal readiness | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 6.3 | Build a WRITE instruction from two memory descriptions | `Lesson63` | Fill A's source buffer; Describe local source; Add remote destination | operations semantic: WRITE construction and posting lifecycle |
| 6.4 | What does the target provider do with the incoming request? | `Lesson64` | Inspect WRITE request; Check target access; Follow target placement | operations semantic: remote access validation |
| 6.5 | What did the writer actually learn from completion? | `Lesson65` | Inspect the ACK; Poll writer CQ; Predict how B learns the result | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 6.6 | Does B receive a normal completion when its memory changes? | `Lesson66` | not inspected yet; Will ordinary WRITE produce a normal receive completion at B?; Yes | operations semantic: prediction/synchronization/zero-poll ordering |
| 6.7 | Where did the data go if B's completion queue is empty? | `Lesson67` | Inspect before and after; Compare SEND and WRITE | operations semantic: exact target-memory verification |
| 6.8 | Compare SEND, WRITE and notification choices | `Lesson68` | SEND; Ordinary WRITE; Inspect WRITE with immediate (conceptual) | operations semantic/restart ownership quiz state |
| 7.1 | Change the question: who already has the data? | `Lesson71` | Compare application request/reply; Choose RDMA READ; Open the recorded READ experiment | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 7.2 | Prepare a source and a destination | `Lesson72` | Inspect B's source; Prepare A's destination; Exchange source metadata | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 7.3 | Why does the reader use a Send Work Request? | `Lesson73` | Describe local destination; Name remote source; Construct READ | operations semantic: READ construction and posting lifecycle |
| 7.4 | Follow the request: A asks, but sends no message payload | `Lesson74` | Inspect captured READ request; Check remote source; Follow the response back to A | operations semantic: zero-payload READ request and remote-read validation |
| 7.5 | Follow the response: B supplies data to A | `Lesson75` | Inspect captured READ response; Place returned bytes; Observe the reader's completion | operations semantic: response direction/payload placement |
| 7.6 | Observe completion and verify the actual local data | `Lesson76` | Poll reader CQ; Inspect verified reader memory; Signal READ done | operations semantic: completion/synchronization/zero-poll ordering |
| 7.7 | Put the three operations side by side | `Lesson77` | Trace one operation; A posts READ. Which direction does the payload move?; Investigate the packets on the wire | operations semantic: three-operation comparison |
| 8.1 | What exactly are we looking at in a packet capture? | `Lesson81` | Follow Ethernet delivery; Follow IP delivery; Open UDP encapsulation | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 8.2 | How does the receiving transport know what to do? | `Lesson82` | Destination QPN; Opcode; PSN | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 8.3 | When does an RDMA packet contain a remote memory address? | `Lesson83` | SEND request; WRITE request; READ request | curriculum smoke: authored structure/provenance plus full 75-step traversal |
| 8.4 | Count the bytes: buffer capacity, transfer length, padding and frame size | `Lesson84` | Show payload only; Show payload plus transport padding; Compare with registered buffer | operations semantic: transfer length/padding/frame audit |
| 8.5 | One Work Request can produce more than one packet | `Lesson85` | Select each packet; Compare small captured SEND; Consider reliability and retries | operations semantic: shared multi-packet byte range |
| 8.6 | Why is a reliable operation possible over UDP? | `Lesson86` | Illustrate missing packet; Illustrate transport recovery; Receiver not ready | operations semantic: retry/timeout distinction |
| 8.7 | A complete correlation: Python → WR → packet → memory → completion | `Lesson87` | Operation; Remote address; Remote key | operations semantic: complete code-to-packet chain |
| 8.8 | Investigation: where did the SEND land? | `Lesson88` | Case A — Find the destination buffer; Can this packet alone identify the destination virtual address?; Yes, the BTH contains it | operations semantic: case A reveal sequence |
| 8.9 | Investigation: does an ACK notify the target application? | `Lesson89` | Does the ACK prove that B's Python process has consumed the data?; Yes; No | operations semantic: case B ACK investigation |
| 8.10 | Investigation: who initiated this response? | `Lesson810` |  options ; , ; ,  | operations semantic: case C READ investigation |
| 8.11 | From this laboratory to an AI cluster | `Lesson811` | Compare host-memory path; Inspect possible GPU-memory path; Inspect fabric congestion | operations semantic: AI fabric topology/congestion/scope |
| 8.12 | A final investigation checklist | `Lesson812` | Objective; Preparation; Submission | curriculum smoke: authored structure/provenance plus full 75-step traversal |

## Structural totals

| Lesson | Subsections | Canonical package |
|---|---:|---|
| 1 · Computer architecture and conventional TCP | 19 | `foundations-v2` |
| 2 · DMA, RDMA and Soft-RoCE | 6 | `foundations-v2` |
| 3 · Memory registration, permissions and keys | 9 | `foundations-v2` |
| 4 · Work Requests, Queue Pairs and completions | 5 | `foundations-v2` |
| 5 · SEND/RECEIVE | 9 | `operations-v2` |
| 6 · Ordinary RDMA WRITE | 8 | `operations-v2` |
| 7 · RDMA READ | 7 | `operations-v2` |
| 8 · Packet interpretation and AI fabrics | 12 | `operations-v2` |

Total: 75 subsections. No ninth lesson or additional subsection was introduced.
