# Lesson 1A — Before networking: inside a computer

## 1.1 What is actually inside a server?

### Learner copy

<!-- guided-block: meet-the-physical-computer-instruction -->

Before discussing networking, we need to understand the computer that is sending or receiving data. A server contains a CPU that executes instructions, RAM that stores instructions and data, and a network interface that communicates with other computers.

<!-- guided-block: meet-the-physical-computer-observation -->

**What this demonstrates:** These are physical components. They do not become an application or an operating system by themselves. Software tells the computer what work to perform.

<!-- guided-block: introduce-application-and-kernel-software-instruction -->

The same computer runs different kinds of software. Applications perform tasks for users. The operating-system kernel manages shared resources and provides services that applications need, including memory management and access to devices.

<!-- guided-block: introduce-application-and-kernel-software-observation -->

**What changed:** We have added a view of the software running on the computer. The physical CPU, RAM and network interface are still the same.

<!-- guided-block: follow-an-application-instruction-explanation -->

Suppose an application wants to read a value from its memory. The CPU executes the application's instruction and accesses the appropriate memory through the computer's memory system.

<!-- guided-block: follow-an-application-instruction-observation -->

**What this demonstrates:** Application instructions execute on the CPU. The application does not have a separate processor inside its software box.

This is a simplified logical memory-access illustration. A CPU load may be served by caches rather than directly accessing physical DRAM.

<!-- guided-block: follow-a-kernel-instruction-explanation -->

Applications sometimes need services they cannot perform directly. For example, an application may ask the operating system to establish a network connection. The CPU then executes kernel instructions that perform the privileged parts of that service.

<!-- guided-block: follow-a-kernel-instruction-observation -->

**What changed:** The CPU is now executing kernel code rather than application code. We have changed the software being executed, not the physical processor.

| Application execution | Kernel execution |
|---|---|
| Executes application instructions | Executes operating-system instructions |
| Normally runs with user-mode privileges | Performs privileged operating-system work |
| Requests services when needed | Manages and protects shared resources |
| Uses the computer's CPU and memory | Uses the same computer's CPU and memory |

The kernel is software running on the CPU. It is not another physical device between the application and memory.

### Visual and interaction

Start with one server, not two. Show CPU cores, caches (small label), RAM, a NIC and an interconnect. Connect CPU to RAM bidirectionally via memory system; NIC to RAM via interconnect. Network cable leaves NIC. A second logical overlay shows user applications and Linux kernel above the hardware; no arrows between software boxes suggesting physical wiring. Toggle **Show hardware / Show software responsibilities**, preserving the same physical machine. Highlight CPU when either application or kernel code is executing. Show three brief labels: `CPU executes`, `RAM stores`, `NIC transmits/receives`.

### Reveal/feedback

The kernel and the application are different pieces of software that can execute on the same CPU core at different times. They can also execute on different cores concurrently. The distinction is one of responsibility and privilege, not two separate machines inside the server.

### Inspect

On a real server there may be several CPU sockets, memory controllers, caches, NUMA nodes and multiple NICs. We use one simplified host to teach the data path. [S1–S3]

## 1.2 From a program on disk to a running process

### Learner copy

<!-- guided-block: a-python-script-or-a -->

A Python script or a compiled executable stored on disk is a program. When we run it, Linux creates or prepares an executing instance called a process. For example, starting `python3 sender.py` launches a Python interpreter that executes the script inside a process. Linux tracks that process, its execution state, open files and address space. A process can contain several threads; threads in one process ordinarily share its address space.

<!-- guided-block: the-operating-system-gives-a -->

The operating system gives a process a virtual address space. Think of it as the set of memory addresses that the process can use, subject to mappings and permissions. It contains things such as executable code, stack memory for calls and local state, and dynamically allocated objects. Some regions can be shared deliberately with other processes. Most private writable application memory is not automatically accessible to another process.

<!-- guided-block: the-process-does-not-get -->

The process does not get a whole separate physical RAM chip. Linux maps parts of the process's virtual address space onto physical memory. It can create mappings when a program starts and change or populate them as it runs and allocates memory. Some mapped pages need not be resident until accessed.

<!-- guided-block: both-processes-have-a-virtual -->

Both processes have a virtual memory range that has not yet been populated with physical backing in our illustration. Having a virtual range does not necessarily mean that physical memory has already been assigned to every page in that range.

<!-- guided-block: now-process-a-accesses-a -->

Now Process A accesses a byte in its own demand-allocation range. If the access is valid but its page is not yet resident, the CPU can raise a page fault. Linux can establish the required backing and update the mapping so that execution can continue.

<!-- guided-block: in-our-example-only-process -->

In our example, only Process A accesses the range. Process C has not accessed its corresponding range.

<!-- guided-block: a-s-illustrated-mapping-is -->

A's illustrated mapping is now populated, while C's independent mapping remains unpopulated. The same numerical virtual address in another process does not automatically refer to the same physical page.

<!-- guided-block: demand-allocation-is-associated-with -->

Demand allocation is associated with a particular memory mapping and access context. This is a conceptual example of independent private mappings, not a rule that every valid page fault allocates a completely new physical page.

### Visual and interaction

Action **Start a program**: show a file `sender.py` and interpreter on storage; reveal process A with code, stack, heap/data, shared library mapping and unmapped gaps. RAM stays a single physical object. Draw mappings to selected physical pages, including a demand-populated page as dotted until touched. Action **Start another program** creates process C with independent mappings to the same RAM. Show identical virtual address `0x1000` in A and C mapping to different illustrative physical frames; optionally one shared read-only library page. Never imply all threads or all mapped pages are private.

### Reveal/feedback

A virtual address has meaning in a particular address-space context. Two applications can use the same numerical address and refer to different bytes. An address on another server is not an address that your CPU can simply dereference.

### Inspect

`/proc/<pid>/maps` on Linux describes mapped virtual ranges and their permissions. It does not reveal every physical page location. A process ID identifies a running process; it is not an address or a socket number. [S1–S3]

## 1.3 How the CPU finds a byte

### Learner copy

<!-- guided-block: a-byte-is-eight-bits -->

A byte is eight bits. To read or change a byte, the CPU executes a load or store instruction using an address. On a typical modern Linux server, the address generated by the instruction is virtual. The CPU's memory management unit (MMU) translates it using mappings managed by Linux and checks access permissions. Recent translations can be cached in the translation lookaside buffer (TLB).

<!-- guided-block: for-this-illustration-suppose-a -->

For this illustration, suppose a process has a writable page mapped at virtual address `0x1000`. The address `0x1002` refers to the third byte in that page. If the page is not currently mapped or the operation violates permissions, the CPU can raise a fault. Linux handles valid cases such as demand allocation and can reject invalid accesses.

<!-- guided-block: the-cpu-is-executing-a -->

The CPU is executing a load instruction in Process A. The instruction references virtual address `0x1002`.

<!-- guided-block: address-translation-identifies-frame-p7 -->

Address translation identifies frame P7, byte offset 2, and establishes that the requested access is permitted.

<!-- guided-block: the-cpu-then-obtains-the -->

The CPU then obtains the byte through its cache and memory system. In our illustrative memory state, that byte contains hexadecimal value `0x48`, which represents the character H in ASCII.

<!-- guided-block: the-load-returns-0x48-to -->

The load returns `0x48` to the CPU for use by the running application.

<!-- guided-block: address-translation-did-not-copy -->

Address translation did not copy the application buffer. It established which memory location the instruction refers to and whether the access is permitted. Obtaining the byte is the memory-access part of the instruction.

<!-- guided-block: the-diagram-shows-logical-values -->

The diagram shows logical values. It does not establish whether the load reached physical DRAM or was satisfied by a cache.

<!-- guided-block: the-cpu-normally-accesses-data -->

The CPU normally accesses data through its caches and the memory system. The latest value may reside in a cache rather than having just been written to a RAM chip. Our diagram follows logical memory values, not electrical bus transactions or cache-line timings.

<!-- guided-block: process-a-executes-an-instruction -->

Process A executes an instruction using virtual address `0x1002`. Now consider Process C executing an instruction using exactly the same numerical address.

<!-- guided-block: a-virtual-address-is-interpreted -->

A virtual address is interpreted in the active address-space context. The CPU uses the mappings associated with that context when translating the address and checking access permissions.

<!-- guided-block: in-our-illustration-address-0x1000 -->

In our illustration, address `0x1000` in Process A maps to frame P7, while the same address in Process C maps to frame P9. Therefore, address `0x1002` refers to byte offset 2 in different underlying memory locations.

<!-- guided-block: the-numerical-address-has-not -->

The numerical address has not changed. The address-space context has changed, and therefore the resulting memory location can be different.

<!-- guided-block: this-is-one-reason-separate -->

This is one reason separate processes can use similar virtual addresses without accidentally sharing their writable memory. Deliberately shared mappings are a separate case.

### Visual and interaction

Show `load byte [0x1002]` and `store byte [0x1002] = 0x4c` at CPU, MMU translation, mapped frame, cache/memory system. Select same VA in process C and show different frame. Toggle read-only page and request store; show protection fault, not an unauthorized physical write. A thin note says **Illustrative addresses; simplified cache behavior**. Use distinct arrows for instruction execution, address translation, byte transfer. Do not animate a kernel box sitting between CPU and memory on every load.

### Reveal/feedback

A normal permitted load/store does not require the kernel to run for each byte. The kernel sets up the mappings and permissions; the CPU's hardware uses them. A fault or an operating-system service request is a different kind of event.

## 1.4 Allocate a buffer, then put data into it

### Learner copy

<!-- guided-block: suppose-our-program-wants-to -->

Suppose our program wants to hold a message. A buffer is simply a range of memory used to store data. It is not a new piece of hardware. When Python executes `buf = bytearray(16)`, the interpreter creates a mutable object with room for 16 data bytes and initializes them to zero. Its bookkeeping is separate from the bytes we are interested in. The interpreter's allocator uses memory available to the process and may obtain more mapped memory from the operating system when necessary; it does not need to request a new physical page for every small object.

<!-- guided-block: now-the-program-writes-five -->

Now the program writes five ASCII characters into that buffer. In the example below, `b` before the quotes indicates a Python bytes literal. The slice `[:5]` selects offsets 0 through 4. The remaining eleven bytes stay zero.

<!-- guided-block: python-buf-bytearray-16-buf -->

```python
buf = bytearray(16)
buf[:5] = b"HELLO"
```

<!-- guided-block: the-application-does-not-itself -->

The application does not itself consist of five bytes. It has code, data and runtime state. We are choosing five bytes within one buffer as the payload we will eventually send.

### Visual and interaction

Action **Allocate 16 bytes**: show virtual addresses `0x1000` to `0x100f`, illustrative, zero-filled cells. Action **Write HELLO**: highlight CPU executing the store/copy operation, then change cells 0–4 to `48 45 4c 4c 4f` hex with ASCII underneath. Show offsets separately from addresses and label 16-byte capacity versus five-byte meaningful payload. Include the memory range in the process address map. Keep the source bytes visible thereafter. Do not imply Python `id()` is a data buffer address.

### Reveal/feedback

A starting address and a length identify a range. A 16-byte buffer starting at `0x1000` ends at `0x100f` inclusive; `0x1010` is the first address outside it. The five-byte payload is only part of that range. This distinction will become important when we register RDMA memory and specify transfer sizes.

### Inspect

A writable Python buffer's address can be inspected with `ctypes.addressof(ctypes.c_char.from_buffer(buf))` while that object remains alive and is not resized. Such an address is a process virtual address, not a universal physical address. Our diagram's small addresses are invented teaching values, not output of this expression.

## 1.5 What does it mean to copy data?

### Learner copy

<!-- guided-block: our-original-sixteen-byte-buffer -->

Our original sixteen-byte buffer contains the five meaningful bytes HELLO. The remaining eleven bytes are initialized to zero. We will compare two ways another part of the program can access these bytes.

<!-- guided-block: we-create-a-second-reference -->

We create a second reference to the existing buffer. Both references identify the same underlying memory object. We have not created another copy of the sixteen bytes.

<!-- guided-block: using-the-second-reference-we -->

Using the second reference, we replace H with X. The underlying buffer now contains XELLO.

<!-- guided-block: reading-through-either-reference-returns -->

Reading through either reference returns the changed value because both references identify the same memory.

<!-- guided-block: now-we-allocate-a-different -->

Now we allocate a different buffer and copy the current five meaningful bytes into it.

<!-- guided-block: the-source-currently-contains-xello -->

The source currently contains XELLO, so the new copy must also contain XELLO. We are continuing the same example, not restoring the earlier HELLO state.

<!-- guided-block: we-replace-x-with-y -->

We replace X with Y in the independent copy. The destination now contains YELLO, while the original remains XELLO.

<!-- guided-block: the-two-buffers-contain-independently -->

The two buffers contain independently stored byte values. Changing one does not change the other.

<!-- guided-block: a-reference-provides-another-way -->

A reference provides another way to access an existing memory object. A copy creates corresponding byte values at a different location. This distinction matters when we later examine socket buffering, DMA and registered memory.

### Visual and interaction

Two ranges at illustrative `0x1000` and `0x2000`, both mapped. Action **Copy five bytes**: CPU read source -> transient register/cache representation -> CPU store destination; five destination cells become HELLO; source persists. Action **Pass a reference instead**: show second logical handle pointing to source, no destination copy. Keep the two demonstrations independent/resettable. Use stable colors for memory, instruction, byte transfer, and metadata.

### Reveal/feedback

A copy creates another set of byte values at another location. Passing a reference does not. TCP and RDMA both transfer information, not the original memory object or ownership of the source buffer.

## 1.6 Why does the kernel get involved at all?

### Learner copy

<!-- guided-block: applications-normally-execute-in-user -->

Applications normally execute in user mode. This limits what they can do directly to protect the rest of the machine. For instance, if every process could freely program every device, it could interfere with another process's network traffic or overwrite memory belonging to someone else.

<!-- guided-block: linux-provides-controlled-entry-points -->

Linux provides controlled entry points called system calls. When an application needs a service such as opening a socket, it invokes an operating-system interface; the CPU enters kernel mode and executes the appropriate kernel code on its behalf. When that operation is ready to return, the CPU resumes user-mode execution. If the operation must wait for an event, Linux can suspend the waiting thread and let another thread run.

<!-- guided-block: the-kernel-can-also-run -->

The kernel can also run in response to device events and scheduled processing, not only system calls. A NIC may signal that receive work is ready, and the kernel may then process a batch of received packets. The same physical CPU hardware is involved; the executing code and context are different.

### Visual and interaction

Use time lane `CPU executing user code → system-call entry → CPU executing kernel code → return to user code`. Below show one hardware CPU and the same RAM. Action **Ask Linux for a service** highlights mode switch. Action **Wait for device** shows thread sleep and another runnable thread, then wakeup. Separate asynchronous device notification from synchronous call. No fake timing or claim that mode switch necessarily switches process.

### Reveal/feedback

Kernel involvement means that privileged Linux code is being executed by a CPU, or that kernel-managed resources are involved. CPU involvement is broader: application code also runs on a CPU. Those two expressions are not opposites.

## 1.7 Now introduce two hosts

### Learner copy

<!-- guided-block: we-can-finally-state-our -->

We can finally state our networking problem precisely. On Server A, a running Python process has allocated a buffer and written HELLO into its first five bytes. On Server B, another running Python process will allocate a destination buffer. The processes have independent address spaces, and the servers have independent physical memory.

<!-- guided-block: server-a-cannot-access-server -->

Server A cannot access Server B's memory using an ordinary CPU load or store. Instead, the two processes will communicate using a network interface provided by Linux. Our objective is to make the five byte values appear in Server B's buffer while leaving Server A's source unchanged.

### Visual and interaction

Duplicate the single-host architecture; show process A buffer in its RAM, process B buffer in its RAM, distinct physical machines joined by NICs and Ethernet. Start with both processes, empty destination (zero values, not unspecified physical contents). Action **Use the network** leads to 02. No RDMA, keys or queues on this opening view.

### Reveal/feedback

We know where the bytes live, what a copy is and why software requests controlled access to a device. We can now follow an ordinary TCP transfer without treating the operating system as a black box.
