# Lesson 1B — How ordinary TCP moves our bytes

## 2.1 Why use a socket instead of directly programming the NIC?

### Learner copy

Consider a web browser, an SSH session and our Python sender running on Server A at the same time. They may all use the same network card. How would the card know which application owns a connection, what should happen if packets are lost, and which process should receive an incoming message?

Linux provides a shared networking service. Its TCP/IP stack tracks connections, reliable delivery, routing and buffering; its network drivers coordinate access to the hardware. Applications normally request this service through sockets rather than manipulating NIC registers or transmit rings themselves. This gives applications a portable interface and prevents them from indiscriminately controlling a shared device. Specialized interfaces, such as RDMA or userspace packet-processing frameworks, can change this arrangement, but they still require controlled setup and access.

A socket is an operating-system communication endpoint. The Python socket object is a user-space handle to a kernel-managed socket; on Linux the process refers to it through a file descriptor, a small integer indexing that process’s file-descriptor table. The socket is not a physical port on the NIC, and a file descriptor is not a TCP port number.

### Visual and interaction

Three process boxes sharing one NIC, each has a logical handle; Linux socket objects and connection state are separate from physical components. Select **Create a TCP socket** to reveal a new handle and kernel object, not a packet. Compare physical NIC port, TCP port, and process-local FD in a small legend. No transfer arrow until connection or data submission.

## 2.2 Create the endpoint and choose a peer

### Learner copy

Python includes a standard-library module called `socket`. We import it to request Linux networking services. The following expression creates an IPv4 stream socket; for this combination, TCP is the default transport. It does not by itself connect to anyone or send HELLO.

```python
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
```

`AF_INET` selects IPv4 addressing. `SOCK_STREAM` selects a reliable byte-stream interface when used with TCP. The variable `s` is our Python handle to the socket. The kernel now has an endpoint to manage.

We need two cooperating programs. The receiving service on Server B asks Linux to listen at a chosen local IP address and TCP port. The sender on Server A asks to connect to that address and port.

```python
# Server B: prepare a listening socket
listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
listener.bind(("10.10.10.2", 5001))
listener.listen(1)

# Server A: establish a connection
s.connect(("10.10.10.2", 5001))
```

Port 5001 is an arbitrary teaching choice. Both programs must agree on it. Linux normally selects a suitable local source address and ephemeral source port for the client when it connects. The listening socket does not hold the data of every client connection in a single stream.

### Visual and interaction

Start B listener before A connect. Show listener `B:5001`, A source port `{{tcp.small.client_port}}` only in the recorded view; illustrative view uses `ephemeral port`. Show four-tuple for a connection: A IP, A port, B IP, B port; explain transport/protocol context. A second connected client example (conceptual) illustrates same B port but different connection. Show state of socket object and FD, not globally fixed FD. **Connect to Server B** reveals handshake.

## 2.3 The TCP handshake and accept()

### Learner copy

When Server A calls `connect()`, the TCP implementations in the two kernels establish a connection. TCP uses sequence numbers so the endpoints can keep track of data. A SYN, SYN-ACK and ACK establish the connection and exchange the initial sequence information and supported options. The sender can then write to the connected socket. Server B uses `accept()` to obtain a separate connected socket for this particular client.

```python
conn, peer = listener.accept()
```

`conn` is the socket handle for this connection. `peer` describes the remote address and port. The listener remains available for other connections. A blocking `accept()` can wait until a connection is available. On Linux the kernel can establish and queue an incoming connection before the receiving application actually calls `accept()`; the three-way handshake does not require the application to handle each individual packet.

### Visual and interaction

Show actual TCP handshake capture from small case with selected rows, direction, SYN/ACK flags, relative or absolute sequence numbers labelled. Use the genuine capture and `{{tcp.small.handshake_frames}}`. Reveal each actual row with the matching syscall/event. Include listening and accepted socket objects on B. Show `connect()` completion and `accept()` return as local observations, not a fabricated globally exact ordering.

### Reveal/feedback

The handshake establishes TCP transport state. It does not register application memory or give Server A access to Server B's process addresses. The connection identifies an ordered byte stream in each direction.

## 2.4 What is a byte stream?

### Learner copy

Suppose the sender writes `HE` and then `LLO`. TCP offers an ordered sequence of bytes, so the receiving application sees the sequence `H E L L O`. It does not promise that each write becomes a packet, or that each write is returned by one receive call. There is no built-in application-message boundary in a TCP stream.

The application must decide how to interpret the stream. It might agree on a fixed message length, include a length prefix, use a delimiter, or read until the peer closes its sending direction. For our first experiment both programs agree to exchange exactly five payload bytes. That agreement belongs to the application, not TCP.

### Visual and interaction

Three rows: application writes `HE | LLO`, continuous numbered byte stream `H E L L O`, possible receives `H | EL | LO` or `HE | LL | O`. A separate line marked **Illustrative alternative** shows different packet grouping. Learner chooses two possible read chunkings, both yield HELLO. Do not claim these alternatives were captured. Use a different boundary pattern for each row; do not use same colors to imply equality of write, segment and read boundaries.

### Reveal/feedback

A write call describes bytes to submit; a TCP segment is a transport unit; a receive call returns available ordered bytes. These are three different boundaries. TCP can split or combine writes, retransmit data, and deliver an application a different grouping of bytes.

## 2.5 What happens when Python calls sendall()?

### Learner copy

We already have a connected socket and a buffer containing five meaningful bytes. Python provides a method named `sendall()` on socket objects. It is a convenience method that keeps attempting to submit the supplied bytes until all are accepted through the socket interface, or an error occurs. A single underlying `send()` can accept fewer bytes than requested; the convenience method handles repeated submission.

```python
buf = bytearray(16)
buf[:5] = b"HELLO"
s.sendall(memoryview(buf)[:5])
```

`memoryview(buf)[:5]` describes the first five bytes without making a Python slice-copy of the payload. It does not promise that the kernel avoids copying. Python executes on the CPU in user mode; when it requests a send operation, Linux executes kernel code on a CPU. In the ordinary buffered socket path used as our model, the kernel obtains the submitted bytes from user memory and copies them into kernel-managed send storage. This is not the application placing a frame directly on the wire.

The kernel's TCP implementation retains the necessary state and data for reliable delivery. If send storage fills up because transmission or acknowledgement progress is slow, a blocking send may need to wait. Successful `sendall()` means the bytes have been accepted for sending. It does not establish that they have already left the NIC, reached the other host, or been read by its application.

### Visual and interaction

Use the same physical host diagram from 01 with RAM split into mapped user buffer and logical kernel-managed send storage. Step **Submit the five bytes**: CPU runs Python call, enters system call, CPU reads permitted user memory and writes kernel-owned memory; source stays HELLO. Indicate CPU activity, not a kernel-to-memory hardware arrow. Draw copy arrow between memory locations via CPU/cache, with separate control arrow for syscall. Socket buffer depicted as ordered ranges/queued storage and metadata, not necessarily a contiguous byte array. After return keep TCP state visible; never imply exact send-queue occupancy without evidence.

### Inspect

The exact Linux internal structures and copy path vary; data may reside in socket-associated `sk_buff` structures and page fragments. Specialized zero-copy interfaces are different. Our diagram is the ordinary buffered path, not a trace of all internal instructions. [S4–S9]

## 2.6 TCP processing: turn a stream into segments

### Learner copy

TCP is responsible for transferring an ordered sequence of bytes across a network that can lose, duplicate or reorder packets. The kernel assigns sequence numbers to bytes, keeps track of what has been acknowledged, limits transmission using the receiver's advertised window and congestion-control state, and retransmits when necessary.

TCP sends portions of the stream in segments. Each segment carries a TCP header with source and destination ports, sequence information, flags and other control fields, followed by its data if present. The IP layer supplies source/destination IP addresses and determines the next hop and egress interface. Ethernet frames carry the resulting IP packets across a link. The Ethernet destination MAC may be a router's MAC on a routed path, not the final server's MAC.

Our HELLO payload may fit into one segment, but large data requires multiple segments. The maximum segment size (MSS) and path constraints influence the amount of TCP data in a segment. An Ethernet MTU of 1500 does not mean every TCP packet carries exactly 1500 payload bytes: IP/TCP headers and options consume space. TCP is free to send smaller segments. IP fragmentation is a different mechanism from TCP segmentation.

### Visual and interaction

Use observed recorded large-case chunks; do not combine counts from different examples. Preferred default actual large capture `{{tcp.large.payload_segments}}`, sort by TCP sequence for unique byte ranges; show first few actual ranges and total. For simple conceptual step use 2500 bytes with capacity 1000 -> 1000,1000,500. Explicitly label examples. At each segment add TCP, IP, Ethernet header layers using bracketed sizes from actual capture only. Highlight sequence number as first byte of that segment, ACK as next expected byte. Show a toy out-of-order arrival where second range waits for first; no invented observed loss. Action **Inspect a real segment** opens matching Wireshark screenshot and field table.

### Reveal/feedback

The segments are made from the stream. The stream is not made from application message boundaries. Captured segments and returned receive chunks can have different lengths. An ACK for a sequence range is TCP transport evidence, not confirmation that the receiving Python process read it.

## 2.7 How does the NIC get the bytes?

### Learner copy

The kernel's network stack prepares transmit data and metadata. A typical NIC driver arranges buffers and transmit descriptors so the device knows which memory to access and what work to do. With a physical DMA-capable NIC, the NIC can read the prepared data from memory through the interconnect and transmit a frame. The CPU does not have to execute a store instruction for every byte sent onto the cable.

The kernel and CPU still have important work: managing protocol state, preparing transmission and handling results. Some NICs also perform checksum calculation or TCP segmentation offload. The exact boundary between software processing and hardware work depends on the system configuration.

### Visual and interaction

Show logical stack -> driver descriptor metadata (pointer, length, flags, illustrative) -> NIC; separate payload route RAM -> NIC via interconnect -> Ethernet. Do not draw payload flowing through the descriptor ring. Highlight CPU in kernel mode for driver setup, NIC active for DMA transfer. Use a callout **Representative physical NIC**. If using virtual machines, explain that virtual device/hypervisor paths are not evidence of physical DMA or exact hardware activity. Capture screenshot proves packet content, not this hardware diagram.

## 2.8 Follow the frame through the receiving host

### Learner copy

At Server B, the NIC receives a frame. On a representative physical system, the driver has already prepared receive buffers for the NIC. The device can place received data into those buffers using DMA and report receive work. Linux may process incoming work in batches, for example through NAPI polling. This processing runs on CPUs, often outside the receiving application's execution context.

The kernel checks and interprets the protocol headers. IP identifies local delivery, and TCP identifies the appropriate connected socket using addresses and ports, validates transport state and tracks sequence ranges. If a segment arrives out of order, TCP can retain data until missing bytes are available. Only the contiguous ordered stream is exposed to the application. It may also acknowledge data and update receive-window information. These operations can occur even while the receiving application is not executing a receive call.

The kernel associates available bytes with the socket's receive storage. It need not literally assemble them into one contiguous array at that moment. This storage and its accounting are kernel-managed, not the Python destination buffer.

### Visual and interaction

Receiver mirrored physical diagram: wire -> NIC -> kernel-owned RX buffers (DMA path representative), CPU executing driver/IP/TCP -> socket-associated ordered ranges. Highlight demultiplex by four-tuple into correct socket among two. Show out-of-order toy ranges only when requested. Show receiver user buffer still zeros and source unchanged. **Inspect the socket before the application reads** reveals recorded late-reader `ss` and local app log (see lab). No claim that every NIC interrupt maps to one packet or every internal move copies bytes. [S7–S10]

## 2.9 Where does recv() come from, and what does it do?

### Learner copy

The `recv()` method belongs to a connected Python socket, just as `sendall()` does. It asks Linux for up to a specified number of bytes from that socket's incoming stream. The already connected socket determines which peer and connection we are reading from. We do not pass a remote IP address to each `recv()` call.

```python
part = conn.recv(5)
```

This returns a new Python bytes object containing up to five bytes. It can return fewer than five. An empty bytes object means end of the stream when the call asked for a positive length. If there are no bytes available and the connection remains open, an ordinary blocking receive waits; a nonblocking receive instead reports that the operation would block.

For our visual experiment we want to see bytes enter a specific mutable application buffer, so we use a closely related method, `recv_into()`. It lets the program supply a destination buffer. Linux's normal buffered receive path copies available data from socket-associated kernel storage into user memory. The CPU executes the necessary kernel instructions and returns the number of bytes copied. The Python application can then inspect the bytes.

```python
buf = bytearray(5)
received = 0
while received < len(buf):
    n = conn.recv_into(memoryview(buf)[received:])
    if n == 0:
        raise EOFError("connection ended before the message was complete")
    received += n
```

The loop is required because TCP does not guarantee that one receive call returns the entire agreed message. Each iteration selects the unused part of the destination buffer. The total reaches five only when all five bytes have been read.

### Visual and interaction

Show actual small experiment read calls, each requested max two bytes; use actual `{{tcp.small.read_events}}` for counts, hex and cumulative buffer. Animate CPU user -> kernel -> copy from receive storage -> user mode; highlight destination offsets, not all memory. In the actual script the slice is capped by `--chunk`; explain the cap as a deliberate application choice. The general snippet above is conceptual and differs only in its requested chunk size. **Read the next available bytes** steps through actual records. Show EOF only if observed in separate test or explain conceptually; no false assertion that TCP packet boundaries caused read sizes.

### Reveal/feedback

Receiving a frame, acknowledging its TCP bytes, making bytes available to a socket, and the application actually reading those bytes are separate milestones. The network capture can establish some of them; the application log is needed to establish the last one.

## 2.10 Does the receiver have to call recv() before the sender sends?

### Learner copy

No. Once the TCP connection is established, the sender can submit data even when the receiving program has not called `recv()` yet. The receiving kernel can store incoming bytes and acknowledge them independently of whether the receiving application is ready to consume them. If the receiver does not drain its buffers, TCP flow control eventually limits the amount the sender may put into the network. This is not unlimited storage.

If the receiver calls `recv()` before data is available, a blocking call can wait for the data. The CPU does not need to keep running that application's thread continuously while it waits. Linux can schedule other work and wake the waiting thread when appropriate.

This is an important contrast with ordinary RDMA SEND: later we will see that the receiver needs to provide a suitable receive Work Request for that RDMA transport operation. A TCP receive call and a posted RDMA receive request are not interchangeable concepts.

### Visual and interaction

Two actual cases from supplied lab: **Receiver reads first** and **Sender sends first**. For early-read case sender is gated before send; receiver logs read-enter then blocks. Show gate release and actual receive-return. For late-read case receiver is gated before first read; sender sends, capture shows arrival/ACK; `ss` snapshot while receiver is gated shows receive queue with unread bytes, and app log shows zero-filled buffer before reading. Only make this claim if snapshot, capture and logs corroborate it. Use no cross-host timestamp claim unless synchronization supports it; use explicit human gate order and per-host logs. Show timeline lanes `sender app`, `sender TCP`, `receiver TCP`, `receiver app`, with known event order only.

## 2.11 Local sender versus remote sender

### Learner copy

The socket interface also works when the two processes run on the same Linux host. If a client connects to `127.0.0.1`, IP selects the loopback interface. The TCP implementations and socket buffering still exist, but the data does not need to travel through a physical Ethernet NIC or cable. It stays inside the host's networking implementation.

An ordinary TCP connection to another server uses the selected network route and network devices. A Unix-domain socket is yet another local communication interface, and shared memory can let cooperating processes access a shared region without sending the data through a TCP stream. These are different choices, not synonyms for loopback.

### Visual and interaction

Toggle **Same machine (loopback)** / **Two machines (Ethernet)**. Same machine has two process address spaces, one physical RAM and kernel; draw software loopback route. Remote path has separate NICs/memory. Inspect actual `lo` capture versus actual `data0` capture, not fabricated Ethernet link for localhost. Link-layer capture format on `lo` may differ; no assertion of physical frame transmission.

## 2.12 Read the evidence, then ask why RDMA is needed

### Learner copy

We have traced our five bytes from the sender's buffer through a connected TCP socket, through transport and network processing, into the receiver's socket and finally into the receiver's application buffer. We can now connect source code, kernel-managed state, packets and application observations.

In the captured small transfer, locate the data segment, compare its TCP data bytes with our HELLO buffer, and find the acknowledgement covering that range. Then compare the receiver's recorded read operations with the same data. The data might appear in one segment but be read in smaller chunks; our application decides the read size.

In the larger transfer, inspect how many distinct TCP byte ranges were carried in the recorded data segments. Compare them with the application's single `sendall()` call and repeated `recv_into()` calls. A large write can become multiple segments and many reads. None of those boundaries necessarily coincide.

Now consider an AI or HPC application that repeatedly transfers large buffers. What if a device could move data between prepared application buffers while taking on more of the transport and memory-placement work? To understand that, we first need to understand DMA itself.

### Visual and interaction

Show actual Wireshark screenshots (see file 05): handshake, small payload/hex, ACK, large data ranges, follow TCP stream, and `ss`/app log. User can click a packet and see relevant byte offsets and read events. Use optional detail for checksums/offloads. Final action **Understand DMA**. No RDMA acronyms before the question is motivated.
