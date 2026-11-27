# Lesson 2 — From CPU copying to DMA, hardware RDMA and Soft-RoCE

## 3.1 A local memory transfer without CPU copying every byte

### Learner copy

<!-- guided-block: we-saw-a-cpu-copy -->

We saw a CPU copy bytes by executing instructions that read a source and write a destination. Devices also need to exchange data with memory. Suppose a network device has received HELLO and needs to place those bytes into system memory. A CPU could repeatedly read device data and copy it into memory, but modern devices commonly support direct memory access (DMA).

<!-- guided-block: dma-allows-a-suitably-configured -->

DMA allows a suitably configured device to initiate memory reads or writes without the CPU executing the corresponding data-copy instructions for every byte. Software still has to prepare buffers, configure access and arrange the work. It may also need to handle completion, synchronization and cache-coherency requirements. The device performs the data transfer through the machine's interconnect and memory system.

### Visual and interaction

Reuse physical host from 01. Three discrete states: (1) CPU configures device with a destination range and length (dashed instruction/control path); (2) device writes HELLO into destination RAM (solid payload path), CPU not shown copying; (3) device reports done and software observes status. Compare CPU copy state from 01. Show destination before/after. Label no measured throughput or CPU load. Do not show a CPU completely inactive for the duration.

## 3.2 Why the device needs an address it can use

### Learner copy

<!-- guided-block: earlier-the-cpu-used-a -->

Earlier, the CPU used a process virtual address and the MMU translated it. A device cannot generally treat an arbitrary process pointer as its own usable DMA address. It needs a valid device-accessible mapping to the relevant memory and permission to perform the operation. A system may use an I/O memory management unit (IOMMU) to translate device DMA addresses into physical memory addresses and restrict access.

<!-- guided-block: a-driver-and-operating-system -->

A driver and operating system arrange the necessary mappings and lifetime of buffers. We do not need to study every IOMMU or PCIe detail here. The important distinction is between an application's virtual pointer, a CPU physical address and the address used by a device. They may refer to the same underlying storage through different address spaces; they need not be numerically identical.

### Visual and interaction

Illustrative process VA `0x1000`, physical page `P7`, DMA address `D42` (symbolic), arrows to same RAM page. CPU/MMU and device/IOMMU or direct mapping lanes separately. Show software establishes mapping before device access. Toggle **CPU reads** / **Device writes**. Explain real hardware and provider variations. [S2, S10]

## 3.3 Conventional NICs already use DMA — why RDMA?

### Learner copy

<!-- guided-block: our-tcp-data-path-already -->

Our TCP data path already included a NIC that can use DMA. On the ordinary buffered path, however, the NIC generally transfers packet data to or from buffers managed by the networking stack. The kernel then processes TCP state and the receiving application asks to read bytes from its socket into user memory.

<!-- guided-block: the-question-rdma-addresses-is -->

The question RDMA addresses is not whether a NIC can perform DMA at all. It is whether the application can prepare its own memory for a transport that supports direct placement into appropriate application buffers and exposes operations other than a byte stream. In suitable hardware implementations, the RDMA-capable NIC executes much of the transport and memory movement, reducing the need for the conventional kernel socket data path.

<!-- guided-block: the-cpu-does-not-disappear -->

The CPU does not disappear. It runs application code, performs setup, submits work, checks results and coordinates when memory is safe to use. RDMA is not automatically faster for every workload, and an implementation can use software rather than hardware for the transport.

### Visual and interaction

Two aligned diagrams using same A/B HELLO objective. TCP: app buffer -> CPU copy into socket-associated storage -> conventional NIC DMA -> network -> conventional NIC DMA -> kernel receive storage -> CPU copy -> app buffer. Show the kernel processing roles separately from physical payload links. Hardware RDMA representative: app instructs RNIC, prepared application buffer -> RNIC memory access -> network -> peer RNIC memory access -> appropriate app buffer. Separate instruction and completion/control paths. Toggle same view, source/destination positions preserved. Caption **Representative buffered TCP and hardware RDMA; optimizations and operations vary**. No fixed copy count, no performance bars.

## 3.4 What does Remote Direct Memory Access actually mean?

### Learner copy

<!-- guided-block: remote-direct-memory-access-rdma -->

Remote Direct Memory Access (RDMA) is a communication and memory-access programming model. Applications prepare memory and communication endpoints, then describe operations for an RDMA implementation to execute.

<!-- guided-block: there-are-three-basic-operations -->

There are three basic operations we will study later. With SEND, the sending application supplies data and the receiving application supplies an appropriate receive buffer in advance. With ordinary WRITE, the initiating side names authorized remote memory into which it wants to place data. With READ, it requests data from authorized remote memory and places the returned bytes in a local buffer. For these operations we will use registered memory and Reliable Connected endpoints.

<!-- guided-block: rdma-still-needs-a-network -->

RDMA still needs a network. RoCEv2 (RDMA over Converged Ethernet version 2) carries the RDMA transport using UDP/IP and Ethernet on our lab network. UDP supplies encapsulation; the RDMA transport supplies the operation and reliability semantics for our connected service. The UDP port alone does not identify an application's registered memory or communication endpoint.

### Visual and interaction

One compact preview, three choices with fixed memory locations: SEND `A data → B receiver-selected buffer`, WRITE `A data → B named authorized buffer`, READ `A request → B; data B → A`. Label these as upcoming mechanisms, not current actual experiments. No keys/headers until 04. Keep this preview one optional compare action, then introduce the real lab. [S11–S15]

## 3.5 What is Soft-RoCE and why are we using it?

### Learner copy

<!-- guided-block: a-hardware-rdma-capable-nic -->

A hardware RDMA-capable NIC includes logic that supports RDMA transport and memory access. We do not need that hardware to learn the programming model and inspect RoCEv2 packets. Linux has a software implementation called RXE, also known as Soft-RoCE. It exposes RDMA capabilities to applications using the Linux RDMA stack while implementing RDMA transport in software over an underlying network interface.

<!-- guided-block: our-two-linux-lab-hosts -->

Our two Linux lab hosts each have a data-network interface and an RXE RDMA device associated with it. A normal Ethernet interface provides network connectivity; the RXE device gives applications an RDMA endpoint and the corresponding programming interface. It is not an extra physical NIC. In RXE, CPUs execute the software transport and memory-access logic; packets are sent and received using Linux networking machinery. If the underlying network uses a physical NIC, that NIC can still do its ordinary DMA and offloads. In a VM, the virtual network path introduces other implementation details.

<!-- guided-block: the-application-does-not-call -->

The application does not call Python's ordinary TCP `sendall()` to issue an RDMA WRITE. Instead, our Python program uses Pyverbs, a Python binding to Linux's RDMA userspace interfaces. Those interfaces are backed by libibverbs and a provider appropriate to the RDMA device. With RXE, the provider and Linux kernel RDMA/RXE implementation arrange the work and execute the software RoCE transport. With a suitable hardware provider, some common work-submission and completion operations can use userspace-accessible queues and hardware interfaces; setup and memory management still involve the operating system.

### Visual and interaction

Show two side-by-side software/control stacks with physical hardware below: `Python → Pyverbs → libibverbs + device provider → Linux RDMA/RXE → Linux network stack → data0 (underlying interface) → network`. Contrast representative hardware stack `Python → Pyverbs → libibverbs + hardware provider → prepared RNIC resources → RNIC → network`; separate kernel control/setup arrows, not a claim that all WRs are syscalls or no kernel involvement. CPU highlight for RXE software; hardware RNIC for representative transport. Distinct physical NIC and logical RXE device boxes, connecting label `associated with data0`. Show actual lab host names/IPs from evidence, and explicit label that CPU/offload performance is not measured. [S12–S16]

### Inspect

For an isolated Linux machine, a typical setup uses `rdma link add rxe0 type rxe netdev data0` after the underlying interface is configured and the RXE driver is available. `rdma link show` and `ibv_devices` expose configured RDMA devices. Use actual lab setup and capture these outputs if available; otherwise display the commands as examples, not recorded outputs. The FabricLab runtime already has a validated Soft-RoCE setup; no live browser privilege is required.

## 3.6 How does an application initiate RDMA work?

### Learner copy

<!-- guided-block: with-a-tcp-socket-we -->

With a TCP socket, we connected the endpoints and called a method to submit bytes. RDMA also needs preparation before it can transfer data. The application opens the RDMA device and creates objects that describe the allowed memory and communication state. Then it describes a requested operation and submits it to an endpoint. The provider executes that work asynchronously, and the application observes the outcome through completion reporting.

<!-- guided-block: the-term-verbs-refers-to -->

The term **verbs** refers to the programming operations exposed by the RDMA interface: opening a device, registering memory, creating communication resources, posting work and polling completions. A verb is not a RoCEv2 packet. It is a local programming interface operation. Some verbs configure state; other verbs submit work that can cause packets to be generated. Pyverbs makes those operations available as Python classes, methods and functions.

<!-- guided-block: the-next-lesson-builds-these -->

The next lesson builds these objects from the same buffer we created earlier. We will find out exactly what is being registered, who returns a memory key, and why a peer cannot simply guess an address and write there.

### Visual and interaction

Four steps `Prepare memory/resources → Describe work → Submit to endpoint → Observe result`, each expands one plain-language sentence, no jargon list. Show an actual lab program filename as a label, no unexplained code dump. Link to 04. Keep RXE path context in a small optional legend, not permanently repeated.
