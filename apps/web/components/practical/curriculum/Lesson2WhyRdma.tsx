"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { ConventionalDataPathDiagram, DmaDiagram, HardwareRdmaConceptDiagram, TransferModelComparison } from "./rdmaDiagrams";
import { Callout, EvidenceNote } from "./visuals";

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
      visual: <ConventionalDataPathDiagram stage={2} />,
      evidence: <EvidenceNote kind="Problem">The problem is not “TCP exists.” The problem is repeated high-volume memory-to-memory transfer where conventional application/kernel/socket participation can consume CPU time, memory bandwidth and latency budget.</EvidenceNote>,
    },
    {
      id: "cpu-work",
      title: "Conventional networking gives the host continuing transport work",
      actionLabel: "Understand memory copying",
      body: (
        <>
          <p>In a socket model the CPU and operating system have real work to do: execute application calls, maintain TCP state, manage socket buffers, process acknowledgements and retransmission, demultiplex incoming packets and deliver byte-stream data to the receiving application.</p>
          <p>Memory copying means moving bytes from one memory location to another, for example between application buffers and kernel-managed buffers. Copies consume memory bandwidth and cache capacity even when implementations optimize or avoid selected copies.</p>
          <p>Conventional NICs are not passive serial ports. They commonly use DMA and hardware offloads. The accurate comparison is therefore not “TCP CPU copies; RDMA magic.”</p>
        </>
      ),
      visual: <ConventionalDataPathDiagram stage={6} />,
      inspect: <p><strong className="text-slate-100">Offload nuance:</strong> TCP segmentation offload, checksum offload, receive coalescing and zero-copy techniques reduce work. They do not turn a socket stream into a remote-memory access programming model.</p>,
    },
    {
      id: "cpu-copy",
      title: "First understand CPU-mediated copying",
      actionLabel: "Explore device DMA",
      body: (
        <>
          <p>Before talking about networks, consider one machine. Software can copy data by executing instructions that read bytes from one memory location and write them to another. The CPU is in the data path for that copy.</p>
          <p>That is sometimes fine. But if a device frequently moves large amounts of data, making the CPU move every byte is an expensive use of processor time, cache and memory bandwidth.</p>
        </>
      ),
      visual: <DmaDiagram phase="cpu-copy" />,
    },
    {
      id: "device-dma",
      title: "DMA lets a device perform the memory transfer",
      actionLabel: "Extend the idea across a network",
      body: (
        <>
          <p>Direct Memory Access, normally shortened to DMA after the mechanism is clear, means a hardware device can read from or write to system memory without requiring the CPU to execute a byte-by-byte copy loop for that transfer.</p>
          <p>The CPU still matters. Software configures or arranges the operation: which memory, how many bytes, which direction and what permissions apply. The device then performs the memory access through the memory/interconnect machinery and reports status or completion through the appropriate mechanism.</p>
          <p>Conventional Ethernet NICs already use DMA. DMA itself is not the new RDMA idea; it is the local mechanism that helps us understand what RDMA extends across a network.</p>
        </>
      ),
      visual: <DmaDiagram phase="device-dma" />,
      evidence: <EvidenceNote kind="Terminology introduced after the mechanism">DMA = Direct Memory Access. The acronym names the mechanism you have just seen: device-mediated access to memory rather than CPU-mediated copying of every byte.</EvidenceNote>,
    },
    {
      id: "rdma-path",
      title: "RDMA extends the memory-access model across the network",
      actionLabel: "Compare the two data paths",
      body: (
        <>
          <p>Remote Direct Memory Access is a data-transfer and programming model. Once memory and communication endpoints are prepared, an application can describe work such as “send this buffer,” “write these bytes into that permitted remote memory,” or “read from that permitted remote memory into my buffer.”</p>
          <p>A hardware RDMA NIC can perform memory access and transport processing associated with that operation. The operating system is not asked to socket-process every payload byte on the remote side of an ordinary one-sided operation.</p>
          <p>Only now does the full term become useful: <strong className="text-slate-100">Remote Direct Memory Access</strong> — direct memory access semantics extended to memory in another computer.</p>
        </>
      ),
      visual: <HardwareRdmaConceptDiagram active />,
      evidence: <EvidenceNote kind="Important boundary">RDMA is not a replacement for Ethernet or IP. RoCEv2 carries RDMA operations inside UDP/IP over Ethernet networks. The networking you already understand still matters.</EvidenceNote>,
    },
    {
      id: "comparison",
      title: "The difference is the transfer and programming model",
      actionLabel: "Understand what Soft-RoCE can and cannot prove",
      body: (
        <>
          <p>Switch between the two representative paths while keeping the objective fixed: move data from application memory on one server into application memory on another.</p>
          <p>The CPU still has essential work in RDMA: open the device, create protection and queue resources, register memory, exchange endpoint metadata through some control mechanism, post work, poll completions and coordinate application-level meaning. What can be reduced is per-transfer protocol and payload-placement involvement, especially on the target of one-sided operations.</p>
        </>
      ),
      visual: <TransferModelComparison />,
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
      visual: <HardwareRdmaConceptDiagram active={false} />,
      evidence: <Callout title="The next problem is safety">A device that can write memory must be constrained to a specific region and specific permissions. That constraint is not optional decoration; it is central to the RDMA programming model.</Callout>,
    },
  ];

  return <GuidedLesson lessonId="why-rdma" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 3: memory registration" />;
}
