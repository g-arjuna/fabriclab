"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { Callout, EvidenceNote, TwoServerVisual } from "./visuals";

function conventionalVisual(active: boolean) {
  return (
    <TwoServerVisual
      caption="Representative conventional socket networking. Conventional NICs also use DMA and hardware offloads; this diagram shows participation and responsibility, not a claim that the CPU copies every byte."
      transfer={{
        active,
        direction: active ? "a-to-b" : "none",
        packet: active ? <span>TCP/IP packets carrying copies of buffer data</span> : undefined,
        label: "Conventional socket traffic",
      }}
      a={{
        emphasis: active ? ["application", "memory", "os", "nic"] : ["application", "os"],
        application: "repeatedly sends large buffers",
        memory: "large application buffer",
        memoryTone: "source",
        os: "TCP state, socket buffers, protocol processing, retransmission and receive delivery",
        nic: "uses device DMA/offloads as applicable, under kernel network-stack control",
      }}
      b={{
        emphasis: active ? ["nic", "os", "memory"] : ["os"],
        application: "repeatedly receives large buffers",
        memory: "receive buffer",
        memoryTone: "ready",
        os: "protocol processing, ordering, reassembly, socket buffering and application delivery",
        nic: "receives frames and transfers them to system memory using DMA",
      }}
    />
  );
}

function rdmaVisual(active: boolean) {
  return (
    <TwoServerVisual
      caption="Representative hardware RDMA data path after communication resources have been configured. The CPU still performs setup and posts work; the data placement itself can be performed by the RDMA device."
      transfer={{
        active,
        direction: active ? "a-to-b" : "none",
        packet: active ? <span>RoCEv2 packets describing an RDMA operation</span> : undefined,
        label: "RDMA operation over an Ethernet/IP network",
      }}
      a={{
        emphasis: active ? ["memory", "nic"] : ["application", "nic"],
        application: "posts work describing the operation",
        memory: "registered source or destination buffer",
        memoryTone: "locked",
        os: "setup and control involvement; not the per-payload protocol copy path",
        nic: "reads or writes registered memory using DMA and executes RDMA transport operations",
      }}
      b={{
        emphasis: active ? ["nic", "memory"] : ["nic"],
        application: "can be unaware of each ordinary one-sided data placement",
        memory: "registered target buffer",
        memoryTone: active ? "changed" : "locked",
        os: "not required to socket-process every payload byte for an ordinary one-sided operation",
        nic: "places or retrieves data in the registered memory region",
      }}
    />
  );
}

function comparison() {
  const rows = [
    {
      component: "Application responsibility",
      conventional: "Calls socket operations such as send and recv; the socket API hides most transport detail.",
      rdma: "Registers memory, creates endpoints, posts explicit Work Requests and polls completions.",
    },
    {
      component: "Memory model",
      conventional: "Application buffers interact with kernel socket buffers and protocol state; implementation-specific copies and zero-copy optimizations may apply.",
      rdma: "Specific registered memory regions are described by address, length, permissions and memory keys.",
    },
    {
      component: "CPU and operating system",
      conventional: "Maintain TCP state, acknowledgements, retransmission, socket demultiplexing, ordering and application delivery for every stream.",
      rdma: "Still perform setup, protection, work posting and completion handling, while selected per-payload placement work can be performed by the device.",
    },
    {
      component: "Network interface",
      conventional: "Uses DMA and hardware offloads as applicable, but under the kernel networking stack’s socket/transport model.",
      rdma: "Uses DMA to access registered memory and executes RDMA transport operations after endpoints are programmed.",
    },
    {
      component: "Network meaning",
      conventional: "Packets carry byte-stream data that the receiving kernel must turn back into socket-readable data.",
      rdma: "RoCEv2 packets carry transport operations that can describe remote memory placement or retrieval.",
    },
  ];
  return (
    <div data-testid="rdma-comparison">
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[820px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-900/85 text-xs uppercase tracking-[0.14em] text-slate-400">
            <tr>
              <th className="border-b border-white/10 px-4 py-3">Component</th>
              <th className="border-b border-white/10 px-4 py-3">Representative socket networking</th>
              <th className="border-b border-white/10 px-4 py-3">Hardware RDMA model</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.component} className="align-top odd:bg-slate-950/35 even:bg-slate-900/25">
                <th className="w-48 px-4 py-3 font-semibold text-slate-200">{row.component}</th>
                <td className="px-4 py-3 leading-6 text-slate-300">{row.conventional}</td>
                <td className="px-4 py-3 leading-6 text-cyan-100/85">{row.rdma}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4 text-sm leading-7 text-amber-100/90">
        The accurate comparison is not “conventional NICs copy every byte.” Conventional NICs also use DMA and substantial hardware offload. RDMA changes which memory, work and completion model the application can use, and can reduce selected CPU and operating-system participation once setup has occurred.
      </p>
    </div>
  );
}

export function Lesson2WhyRdma({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "scale-problem",
      title: "Five bytes are trivial; repeated large transfers are not",
      actionLabel: "Follow conventional networking",
      body: (
        <>
          <p>Return to the same two servers and the same memory-to-memory objective. For five bytes, almost any mechanism is adequate. AI and high-performance computing systems instead move large buffers again and again: model activations, gradients, checkpoint data, storage blocks and intermediate results.</p>
          <p>At that scale, the cost is not just raw bandwidth. CPU involvement, memory movement, latency, jitter and the efficiency with which communication overlaps computation all matter.</p>
        </>
      ),
      visual: conventionalVisual(false),
      evidence: <EvidenceNote kind="Problem">The problem is not “TCP exists.” The problem is repeated high-volume memory-to-memory transfer where the conventional application/kernel/socket participation can consume CPU time, memory bandwidth and latency budget.</EvidenceNote>,
    },
    {
      id: "cpu-work",
      title: "Conventional networking makes the host participate in every stream",
      actionLabel: "Explore DMA",
      body: (
        <>
          <p>In a socket model the CPU and operating system have real work to do: execute the application call, maintain TCP state, manage socket buffers, process acknowledgements and retransmission, demultiplex incoming packets and deliver data to the receiving application.</p>
          <p>Memory copying means moving bytes from one memory location to another, for example between application buffers and kernel-managed buffers. Copies consume memory bandwidth and cache capacity even when they are optimized or avoided in selected paths.</p>
          <p>Conventional NICs are not passive serial ports. They commonly use DMA and offload segmentation, checksums and other work. The accurate comparison is therefore not “TCP CPU copies; RDMA magic.” It is a question of which data-transfer model the device and network stack expose.</p>
        </>
      ),
      visual: conventionalVisual(true),
      inspect: <p><strong className="text-slate-100">Offload nuance:</strong> TCP segmentation offload, checksum offload, receive coalescing and zero-copy techniques reduce work. They do not turn a socket stream into a remote-memory access programming model.</p>,
    },
    {
      id: "dma",
      title: "DMA lets a hardware device access memory without the CPU moving every byte",
      actionLabel: "Follow the RDMA data path",
      body: (
        <>
          <p>Direct Memory Access, usually shortened to DMA after the idea is clear, means that a hardware device can read from or write to system memory through the memory/interconnect machinery without requiring the CPU to execute a copy loop for every byte.</p>
          <p>The device still needs rules: which address, how many bytes, which direction, and whether access is permitted. A DMA-capable device is powerful precisely because it can touch memory. That power must be constrained.</p>
          <p>RDMA applies this idea across a network: a network device can participate in reading or writing memory on a remote host according to explicitly prepared permissions and operations.</p>
        </>
      ),
      visual: rdmaVisual(false),
      evidence: <EvidenceNote kind="Terminology introduced after the mechanism">DMA = Direct Memory Access. The acronym names the mechanism you have just seen: device-mediated access to memory rather than CPU-mediated copying of every byte.</EvidenceNote>,
    },
    {
      id: "rdma-path",
      title: "RDMA extends the memory-access model across the network",
      actionLabel: "Compare CPU involvement",
      body: (
        <>
          <p>Remote Direct Memory Access is a data-transfer and programming model. Once memory and communication endpoints are prepared, an application can describe work such as “send this buffer,” “write these bytes into that permitted remote memory,” or “read from that permitted remote memory into my buffer.”</p>
          <p>A hardware RDMA NIC can then perform the memory access and transport processing associated with that operation. The operating system is not asked to socket-process every payload byte on the remote side of an ordinary one-sided operation.</p>
          <p>Only now does the full term become useful: <strong className="text-slate-100">Remote Direct Memory Access</strong> — direct memory access semantics extended to memory in another computer.</p>
        </>
      ),
      visual: rdmaVisual(true),
      evidence: <EvidenceNote kind="Important boundary">RDMA is not a replacement for Ethernet or IP. RoCEv2 carries RDMA operations inside UDP/IP over Ethernet networks. The networking you already understand still matters.</EvidenceNote>,
    },
    {
      id: "comparison",
      title: "The difference is the transfer and programming model",
      actionLabel: "Understand what Soft-RoCE can and cannot prove",
      body: (
        <>
          <p>Compare the two paths as models rather than slogans. Conventional sockets give applications a reliable byte-stream abstraction. RDMA gives applications explicit control over registered memory, work descriptions, endpoints and completion observation.</p>
          <p>The CPU still has essential work in RDMA: open the device, create protection and queue resources, register memory, exchange endpoint metadata through some control mechanism, post work, poll completions and coordinate application-level meaning. What can be reduced is per-transfer protocol and payload-placement involvement, especially on the target of one-sided operations.</p>
        </>
      ),
      visual: comparison(),
    },
    {
      id: "soft-roce",
      title: "This laboratory demonstrates real semantics, not hardware offload performance",
      actionLabel: "Continue: how is memory made available?",
      body: (
        <>
          <p>RoCEv2 is a way to transport RDMA operations over an IP/Ethernet network, using UDP destination port 4791. We will inspect the packet headers later, after the application behaviour makes sense.</p>
          <p><strong className="text-slate-100">The experiments in this practical use Soft-RoCE, a software implementation of RDMA. They demonstrate the RDMA programming model and real RoCEv2 packets. They do not demonstrate the performance or CPU-offload characteristics of a hardware RDMA NIC.</strong></p>
          <p>If a network device can access application memory, how do we ensure it accesses only the memory it is supposed to?</p>
        </>
      ),
      visual: rdmaVisual(true),
      evidence: <Callout title="The next problem is safety">A device that can write memory must be constrained to a specific region and specific permissions. That constraint is not optional decoration; it is central to the RDMA programming model.</Callout>,
    },
  ];

  return <GuidedLesson lessonId="why-rdma" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 3: memory registration" />;
}
