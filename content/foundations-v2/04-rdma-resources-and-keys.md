# Lessons 3 and 4 — Prepare memory, describe work, create endpoints

## 4.1 A buffer is not yet an RDMA Memory Region

### Learner copy

Return to our 16-byte buffer at the illustrative virtual address `0x1000`. The first five bytes contain HELLO. The program can read and write that buffer using ordinary CPU instructions because it has a valid writable mapping in its process address space. But the buffer has not yet been made available to an RDMA implementation.

We need to establish which memory an RDMA provider can use, how to find it, how long the access arrangement remains valid and what operations are allowed. This is memory registration. The application requests registration through an RDMA verb. The operating system and provider establish the required access information and mappings. The result is an RDMA Memory Region (MR), an object describing access to a range of memory. The original buffer still holds the bytes; the MR is not a second copy of the buffer.

In a conventional hardware registration, the provider may pin pages and establish device-visible mappings and translation information. Other models, such as on-demand paging, can handle residency differently. RXE provides the same verbs-level registration and access model using software. The diagram does not claim RXE installs hardware translation tables in an RNIC.

### Visual and interaction

Show the CPU writing HELLO to allocated memory before registration. Device access overlay initially absent. Action **Prepare this region for RDMA** reveals a logical registration object connected to the existing buffer with base and length; no data moved, no packet. Toggle representative hardware mapping vs RXE software association as optional detail. Do not show an MR or keys before registration.

### Reveal/feedback

Allocation gives the application memory to use. Registration establishes an RDMA access relationship for a chosen range. They are separate operations.

## 4.2 Who is involved in registration?

### Learner copy

Our Python program asks to use a particular RDMA device. In the FabricLab source, a helper opens the device context. That context represents the application's access to the device through the RDMA software interface. The application then creates a Protection Domain (PD), a resource association that helps ensure that compatible communication and memory resources belong together.

The Protection Domain is not a piece of RAM and does not create a private physical memory partition. The operating system and provider use it as part of enforcing which resources can interact. A Memory Region is associated with a PD; a Queue Pair is associated with a PD. A Completion Queue is created from a device context and can be associated with Queue Pairs, not nested inside the PD as if the CQ were part of a memory permission range.

The program supplies the PD, a buffer address, a length and access flags to the registration interface. On success the provider returns an MR object with information needed for subsequent operations. If setup or registration fails, the program must handle the error; a valid registration cannot be assumed merely because a buffer exists.

### Visual and interaction

Show one process -> Pyverbs/library -> selected device context; logical PD boundary containing MR and future QP association placeholders. CQ outside PD with later association. Highlight calls in sequence using actual source excerpts from `python/exp_a_resources.py` and `python/rdma_common.py` via existing evidence snapshots. At this point show only context, PD and MR; do not render QP/CQ acronym-filled placeholders in beginner view. Reveal arrows `application asks`, `provider establishes access`, `MR returned`.

### Inspect

The C verbs interface expresses registration as `ibv_reg_mr(pd, addr, length, access)`. FabricLab uses Pyverbs and a helper that registers an existing buffer. Show the exact helper body from the embedded snapshot; do not invent Pyverbs constructor signatures. [S14–S16]

## 4.3 Addresses, offsets and lengths

### Learner copy

A registration describes a starting address and a number of bytes. For our conceptual 16-byte region, addresses from `0x1000` through `0x100f` are included. `0x1010` is outside the range. A request can reference a subrange of the registration. For instance, eight bytes starting at `0x1004` occupy addresses `0x1004` through `0x100b`. Those fit. Eight bytes starting at `0x100c` would extend through `0x1013`, crossing the boundary.

The address in this lesson is a virtual address in the process owning the buffer, as used by the lab's ordinary registration model. It is not the IP address, the NIC's MAC address, or a global physical memory address. An RDMA provider interprets the address within its registered memory context. Some registration interfaces allow different I/O address conventions; our lab uses its recorded buffer addresses.

### Visual and interaction

Use 24 cells with offset labels 0–23 and address labels on endpoints/boundary, registered 0–15 highlighted. **Inspect eight bytes from offset 4**, then **Inspect eight bytes from offset 12**. Draw start, end and length, show selected bytes and out-of-range cells. Feedback distinguishes `offset + length <= registered length` for this bounded nonnegative example. No keys required yet. Keep the region visible when explaining permissions.

## 4.4 What does local write mean? Who is local?

### Learner copy

The words local and remote are relative to the host that owns a particular registered region. Suppose the region belongs to Server B. Server B's CPU can write to its ordinary writable application buffer through its process mapping, whether or not that buffer has RDMA local-write permission. That is a CPU memory operation, not an RDMA operation.

For an MR, local write is permission for the local RDMA device/provider to write the registered memory as part of RDMA work. Examples include Server B receiving an RDMA SEND into its registered buffer, or a local RDMA READ initiator receiving returned data into its own registered buffer. Local read access by the RDMA provider is enabled for registered memory in the ordinary verbs model, so a local source buffer can be read for a SEND or WRITE.

Remote write allows an authorized peer to initiate a WRITE into the region. Remote read allows an authorized peer to initiate a READ from it. Those are separate permissions. For ordinary verbs registrations, remote-write permission also requires local-write permission. Remote access additionally depends on endpoint access configuration and operation-specific checks. Enabling a flag does not allow arbitrary hosts to access the region.

### Visual and interaction

Use one B buffer with three selectable paths. (1) `B CPU → B memory` through CPU/MMU; note CPU writable mapping, not MR flag. (2) `B provider → B memory` with local-write flag check, conceptual incoming SEND. (3) `A initiates WRITE → B provider → B memory` with remote-write and other access checks. Add separate remote READ path with B memory -> B provider -> network. Show arrows and correct actor at each path. Do not conflate local write with a WRITE opcode: local write is a permission, not a network operation.

### Reveal/feedback

A CPU writing its own buffer and an RDMA provider writing a registered buffer are different access mechanisms. The MR flags govern RDMA access. They do not replace the CPU's virtual-memory protections.

## 4.5 A local key identifies registered access

### Learner copy

Imagine the application has registered several buffers. Later, when it asks the provider to access one of them, giving an address and length alone does not fully identify the registered access relationship it intends to use. Registration returns a local key, usually written LKEY (local key), which the application includes in a local buffer description for a Work Request.

A local buffer description typically contains its address, length and LKEY. This is called a Scatter/Gather Entry (SGE). A Work Request can reference one or more such entries, depending on the operation and device capabilities. In this introductory example we use one. The provider checks that the specified range and key are valid for the operation and associated resources. It then knows which registered memory access to use.

The local key is supplied by the application on the same host that owns the local buffer. It is used by that host's provider. The LKEY is not a TCP port or a network authentication password, and it is not a field transmitted in the RoCEv2 SEND header.

### Visual and interaction

Show local registration table with conceptual MR1 at `0x1000` length 16 LKEY `0x11`, MR2 at `0x2000` length 16 LKEY `0x22`. Mark numbers illustrative. Construct SGE `[addr 0x1000, length 5, lkey 0x11]`, provider matches local MR, range highlighted. Toggle wrong LKEY `0x22` with same address; show conceptual invalid association, no fabricated error packet/code. Toggle operation local write versus local read; check permissions only when applicable. Explain this is a simplified model, not the implementation's literal lookup data structure.

### Reveal/feedback

An LKEY references local registered memory access. It helps the provider interpret the memory description supplied by its local application. It is not an address and does not specify a number of bytes.

## 4.6 A remote key is for an authorized remote operation

### Learner copy

Now imagine Server A wants to perform an ordinary RDMA WRITE into Server B's buffer. Server A cannot use its own local key to refer to Server B's memory. Server B first registers its own region with appropriate remote access permission. Registration returns a remote key, written RKEY (remote key). The owner can share the relevant remote address, RKEY and available length with a cooperating peer through an application-defined mechanism.

Server A uses its own local address, length and LKEY to describe its source memory. It uses Server B's remote address and RKEY to name the remote destination. The provider on Server A prepares the transport operation, and Server B's provider validates the remote access against its registered resources, range, permissions and endpoint context before allowing the memory operation. Server A's CPU is not dereferencing Server B's virtual address.

The RKEY is an access identifier used as part of RDMA protection. It is not encryption, general host authentication or sufficient authorization by itself. Applications must decide which peers receive such information and manage its lifetime. When an MR is deregistered or access is changed, old remote access information must no longer be assumed valid.

### Visual and interaction

Two host tables. A conceptual local source `0x1000`, LKEY `0x11`, length 16; B conceptual destination `0x2000`, RKEY `0x42`, length 16, remote write enabled. B's application shares tuple `0x2000, 0x42, 16` via dashed TCP control path. A constructs source SGE and remote fields. In a later separate preview state, show abstract request with remote address/RKEY/transfer length on network; B checks tuple, range, permissions; no actual WRITE execution in this lesson. Color local A values differently from remote B values; labels always present. Do not show B sending its local key or use a shared color to imply LKEY=RKEY required.

### Reveal/feedback

For an RDMA SEND, the receiver chooses its own local receive buffer; the sender does not need its address and RKEY in the SEND operation. For ordinary WRITE or READ, the initiator needs the appropriate remote memory information. We will see the actual packets later.

## 4.7 How do keys and endpoint information get exchanged in this lab?

### Learner copy

RDMA memory registration is local. It does not automatically notify another server of a memory address or key. The two programs must communicate the information they need before issuing remote operations. In our laboratory they use a separate ordinary TCP connection on the control network. We already know how TCP sockets work, so this is no longer a mysterious extra connection.

During the resource and SEND experiments, the programs exchange information needed to prepare the communication endpoints, such as the endpoint number, transport sequence information and network identity. The SEND receiver does not need to advertise its memory address and RKEY as a destination for an ordinary SEND. In the WRITE experiment, the target additionally sends its registered buffer address, RKEY and length through the control connection. The initiator then uses those values when constructing its WRITE Work Request.

The control connection carries metadata and coordination messages. It does not carry the RDMA transfer payload. Our lab uses separate interfaces, but control and data communication need not universally use physically separate networks.

### Visual and interaction

Show A/B lab addresses from existing evidence: data 10.10.10.1/2, control 192.168.100.1/2, labels sourced from evidence. Toggle **SEND setup** / **WRITE setup preview**. SEND metadata tuple without remote MR fields; WRITE B -> A address/rkey/length. Use actual source from `exp_b_send_recv.py` metadata function and `exp_c_write.py` metadata function, including conditional sharing in WRITE. Label distinct reference experiments; never reuse resource-run QPNs with WRITE values as if same execution. The TCP control connection was not present in RDMA data captures. Show log/source evidence, not a fabricated packet screenshot. The new TCP experiment in 02 is separate.

### Inspect

Other implementations can use a connection manager or an application protocol to coordinate setup. The specific JSON/control message exchange is FabricLab's choice, not an RDMA wire requirement.

## 4.8 Test access requirements: one range, different operations

### Learner copy

Let's use our registered 16-byte region to test what we have learned. The illustrative owner has enabled remote read but not remote write. Assume the peer has the correct RKEY and a correctly configured endpoint unless we explicitly change those assumptions. We can now ask three separate questions about each operation: does it name the appropriate registration, does the requested range fit, and does the required access permission exist?

### Visual and interaction

Use same address grid as 4.3, not a new design. Four selectable cases with exact outcomes:

| Requested operation | Key | Range | Permission | Result under stated model |
|---|---|---|---|---|
| Read 8 bytes at 0x1004 | correct | fits | remote read present | Permitted |
| Write 8 bytes at 0x1004 | correct | fits | remote write absent | Rejected |
| Read 8 bytes at 0x100c | correct | crosses boundary | remote read present | Rejected |
| Read 8 bytes at 0x1004 | incorrect | fits | remote read present | Rejected |

Show checks individually and highlight region cells. No simulated completion status or observed failure capture. User selects each case, can retry/skip.

### Reveal/feedback

A correct key does not make an out-of-range request valid. A valid range does not grant missing write permission. A valid range and access flag do not replace the correct registration reference. RDMA access is the combination of these conditions and a suitable endpoint, not just knowledge of an address.

## 4.9 Look at the real registration record

### Learner copy

We now have enough background to read an actual FabricLab registration record. The resource-creation experiment allocates a buffer, registers it and records information from the resulting MR. The table below shows values from Server A in that particular run.

- Buffer address: `{{rdma.resources.hosta.address}}` — starting virtual address used by the program.
- Registered length: `{{rdma.resources.hosta.length}}` bytes — how much memory the registration describes, not how many bytes a future operation must transfer.
- LKEY: `{{rdma.resources.hosta.lkey}}` — used when describing local registered memory.
- RKEY: `{{rdma.resources.hosta.rkey}}` — relevant for permitted remote memory operations, if shared with an appropriate peer.

These are real runtime values from one registration, not permanent identifiers. In this run the two key fields may display the same number. Their roles remain distinct; the verbs model does not require every provider or registration to produce different numerical values.

The source helper used by this lab enables local write, remote write and remote read access. That is the lab's registration choice for these demonstrations, not a recommendation to grant every permission in a production application. A production design should request only the access needed.

### Visual and interaction

Display actual `resources` experiment host A MR from existing evidence JSON, no hardcoded runtime values. Source excerpts from `python/exp_a_resources.py` at allocation/registration and `python/rdma_common.py` ACCESS and registration helper; highlight matching address/length/key fields. Bind and validate source references. Include separate illustrative address grid only when explicitly selected, not as same real address. Never imply MR contains copied bytes or that recorded keys are reusable on a live host.

### Inspect

At the reviewed baseline the resource experiment recorded a 4096-byte MR; the common helper defines `ACCESS` with `IBV_ACCESS_LOCAL_WRITE`, `IBV_ACCESS_REMOTE_WRITE` and `IBV_ACCESS_REMOTE_READ`, and the QP setup uses this access selection. Show the exact snapshot, including the actual helper call. The real SEND, WRITE and READ experiments create their own resources, so their identifiers differ from this resource-only run.

## 4.10 Why create communication resources before transferring anything?

### Learner copy

The application now has registered memory. But that only says what memory can be used, not what the application wants to do, where the peer is, or how it will learn whether the operation succeeded.

Consider our ordinary TCP example. Before transmitting, Linux had to create a socket, establish a connection and maintain state for its byte stream. In RDMA, applications prepare explicit resources that serve related purposes, but the programming model is different. A resource is an object and associated state maintained by the software/provider and, where applicable, the hardware. Resource creation sets up that state. It is not itself a transfer of the RDMA payload.

The application needs a communication endpoint, a place to submit work and a place to observe completion results. We will build those ideas one at a time. First, the program needs to express the desired work.

### Visual and interaction

Reuse single A host and registered HELLO memory. Three unresolved labels in plain language: `What task?`, `Where to submit it?`, `How to learn result?`. Do not display QPN or CQ until introduced. Action **Describe a task**.

## 4.11 Work Requests: a description of work, not data

### Learner copy

The program wants the provider to send the first five bytes of its registered buffer. It constructs a description of the task. In RDMA terminology this is a Work Request (WR). It contains information such as the operation to perform and the memory involved. For a SEND using one SGE, the local address, length and LKEY identify the source. A WR ID is an application-chosen identifier that helps the program recognize the result when it observes a completion.

Constructing the request only prepares the instruction in the application's software. Posting it is a separate operation: the program submits it through the verbs interface to an appropriate communication resource. The provider may translate it into an implementation-specific work queue entry (WQE). The request is not the network packet, and its local WR ID is not the packet sequence number.

### Visual and interaction

Create actual visible illustrative instruction with `operation SEND`, `SGE(addr 0x1000,length 5,lkey 0x11)`, `WR ID 7`, `request successful send completion` (signalled). Show source cells HELLO remain separate. The request stays constructed, not posted. Arrow from WR to SGE references memory; no payload inside queue. Optional inspection actual SEND SGE/SendWR source, clearly a separate run. Do not execute SEND before peer setup.

## 4.12 A queue, then a Queue Pair

### Learner copy

The provider may execute work asynchronously, so an application needs a way to submit instructions for it to handle. A work queue is a logical collection of submitted work entries. It is not an Ethernet switch packet queue. In our RDMA programming model, SEND, READ and WRITE are initiated through a Send Queue. Even READ starts from the Send Queue because the application initiates the operation, although the requested payload comes back toward it.

For incoming ordinary SEND messages, the local application needs to supply buffers where the arriving bytes can be placed. It posts receive Work Requests to a Receive Queue. Each receive request describes local destination memory. A Queue Pair (QP) combines these send and receive work-queue roles and transport endpoint state. Our lab uses a Reliable Connected (RC) QP, which is prepared to communicate with a specific peer endpoint.

### Visual and interaction

First show one empty Send Queue next to constructed WR outside it, label where future submission goes. Reveal Receive Queue and one illustrative receive description (not posted). Enclose both queue roles in a QP logical boundary and show peer-state placeholder. Do not claim physical location of hardware queue entries. No actual packet. Keep source buffer separate from instruction path.

### Reveal/feedback

The queues contain instructions and memory descriptions. The provider accesses the referenced buffers through the applicable memory path. A SEND payload does not ordinarily travel through the queue itself as a separate physical intermediate buffer.

## 4.13 What is the Queue Pair Number (QPN)?

### Learner copy

A host can have multiple RDMA endpoints. The transport needs a way to identify which endpoint should handle an arriving RDMA packet. Creating a QP gives it a Queue Pair Number, or QPN. The number identifies an endpoint in the relevant RDMA device/transport context; it is not globally unique across all machines or all runs.

Consider a conceptual A endpoint numbered 17 and a B endpoint numbered 18. When preparing an RC connection, each side learns which peer endpoint it should communicate with, along with network addressing and initial transport sequence information. An A-to-B request will identify B's QPN as its destination QPN. A reverse-direction packet will identify A's QPN as its destination. This is distinct from the destination IP, which identifies the network destination, and the UDP port used by RoCEv2 encapsulation.

In our lab, the two applications exchange this setup information using TCP control messages. They then program their local QPs into the necessary ready states. RESET, INIT, RTR (Ready to Receive) and RTS (Ready to Send) are state names; these transitions establish local endpoint configuration. They are not the ordinary TCP handshake. The exact permitted posting and transition requirements depend on the verb and transport; this lab prepares both endpoints before its SEND data operation.

### Visual and interaction

One A with QP, reveal B with QP. Show conceptual QPN 17/18 or use *only* actual resource-run QPNs, clearly label. Toggle packet direction with a small illustrative BTH destination QPN field; no actual captured resource-run RDMA data packet. A->B target B, B->A target A. Separate dashed TCP metadata exchange from future data path. On **Inspect recorded endpoint setup**, show `resources` experiment local QPNs, destination QPNs and ready events from JSON. Show source lines for exchange and `bring_qp_to_rts` (optional). Explain PSN here only as initial transport packet sequence information; do not confuse TCP byte numbering or WR ID.

## 4.14 Completion reporting and what the resource-only run proves

### Learner copy

Submitting work does not by itself tell the application that the provider has finished it. The application associates its work queues with a separate Completion Queue (CQ). A completion entry records the outcome of work for which completion reporting applies, including status and information that helps the application identify the work. The application polls the CQ (or uses an appropriate notification mechanism) to retrieve the result. Polling removes the retrieved entries from the CQ. A local Work Completion is not a network acknowledgement.

A CQ is created separately and can be associated with more than one QP. The send and receive queues of a QP can use the same CQ or different ones. In this lab the programs create a CQ and associate it with the QP. The CQ is not one of the two queues inside the QP.

We can now explain why the resource-creation experiment is valuable even though it produces no RDMA data-operation packets. The program opens the device, creates its PD, allocates/registers memory, creates a CQ and QP, exchanges endpoint information and prepares the QP. It has established the ability to submit subsequent work. In this particular experiment it deliberately does not post a data Work Request. It therefore performs setup without a SEND, WRITE or READ transfer. The TCP control messages used for setup are on the control interface, outside the isolated data-interface captures.

In the next practical the two programs will actually post receive and send work and examine the packet and the resulting memory. We have already learned why each resource is needed. Nothing should appear without a purpose.

### Visual and interaction

First single endpoint: provider -> CQ conceptual entry -> app poll -> observed result outside CQ. Signalled successful send-side operation illustrated only generically; no claim all send WRs produce success CQEs. Then a compact setup ledger from `exp_a_resources.py` and its actual evidence: device open, PD, allocated buffer, MR, CQ, QP, metadata exchange, ready; exact order follows source. Show **No data WR posted in this run** and **No RDMA data-operation packets recorded** only if existing validation confirms. Avoid inventing packets, completion entries or empty-queue samples. Show event logs as real evidence; compare to future actual SEND run as distinct experiment. Primary action **Start the real SEND/RECEIVE practical** links existing Lesson 5.

### Inspect

A setup failure can occur even without a data packet. A successful resource setup is not evidence that an application transfer succeeded. When we debug RDMA later, we will examine setup, submitted work, transport and completion/verification evidence separately. [S11, S14–S18]
