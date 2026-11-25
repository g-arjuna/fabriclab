"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { ConventionalDataPathDiagram, OpeningMemoryDiagram } from "./rdmaDiagrams";
import { Callout, EvidenceNote } from "./visuals";

function visual(stage: number) {
  if (stage <= 1) return <OpeningMemoryDiagram />;
  return <ConventionalDataPathDiagram stage={stage} />;
}

export function Lesson1MovingData({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "objective",
      title: "The objective is memory to memory",
      actionLabel: "How do we send these bytes?",
      body: (
        <>
          <p>We have two Linux servers connected over Ethernet.</p>
          <p>An application on Server A contains five bytes: <span className="font-mono text-cyan-100">HELLO</span>. An application on Server B is waiting to receive those bytes.</p>
          <p>Our goal is to understand how those five bytes travel from one application’s memory into the other application’s memory.</p>
        </>
      ),
      visual: visual(0),
      inlineVisual: true,
    },
    {
      id: "memory",
      title: "The bytes begin in the application, not in the network",
      actionLabel: "Ask the application to send them",
      body: (
        <>
          <p>The five bytes are stored in Server A’s application memory. Server B has memory ready to receive data, but the bytes have not arrived. Neither operating system nor network interface independently knows that this transfer is desired.</p>
          <p>The application needs a controlled way to ask for network transmission. In conventional networking, that controlled entry point is the socket API.</p>
        </>
      ),
      visual: visual(1),
      inspect: (
        <div>
          <p className="font-semibold text-slate-100">A minimal conceptual socket operation</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/80 p-3 font-mono text-xs leading-6 text-slate-200"><code>{`# Server A: sock is a connected TCP socket
sock.sendall(b"HELLO")`}</code></pre>
          <p className="mt-3">This fragment deliberately omits connection setup. It shows only the operation that matters here: the application submits the contents of a memory buffer to the local socket.</p>
        </div>
      ),
    },
    {
      id: "socket-api",
      title: "The socket API hands the bytes to the local operating system",
      actionLabel: "Follow the bytes through Server A",
      body: (
        <>
          <p>Applications do not normally program the Ethernet interface directly. They call into the operating system. With TCP, <code className="font-mono text-cyan-100">sendall()</code> asks the local kernel to transmit the supplied byte sequence reliably on an established connection.</p>
          <p>Be precise about semantics: successful <code className="font-mono text-cyan-100">sendall()</code> means the bytes were submitted through the local socket interface. It does not, by itself, prove that the remote application has received or consumed them.</p>
        </>
      ),
      visual: visual(2),
      evidence: <EvidenceNote kind="Mental model">The application supplies memory and intent. The operating system supplies protocol machinery and device control. The network interface supplies transmission onto the link.</EvidenceNote>,
    },
    {
      id: "server-a-path",
      title: "Server A turns a byte stream into network traffic",
      actionLabel: "Follow the packet across the network",
      body: (
        <>
          <p>Inside Server A, TCP treats HELLO as part of a byte stream. The kernel maintains connection state, ordering, retransmission information and socket buffering. TCP forms segments, IP adds addressing and routing information, and Ethernet framing prepares the result for the link.</p>
          <p>Implementations may copy bytes, avoid copies in optimized paths, or offload segmentation and checksum work. The representative causal path remains application memory → kernel networking machinery → NIC transmission.</p>
        </>
      ),
      visual: visual(3),
      inspect: <p><strong className="text-slate-100">Why the operating system is involved:</strong> TCP must remember what has been sent, what has been acknowledged, when to retransmit, how much the peer can receive and how the local connection state changes. Those are kernel responsibilities in the conventional socket model.</p>,
    },
    {
      id: "network",
      title: "The network carries packets containing copies of the bytes",
      actionLabel: "Follow the bytes through Server B",
      body: (
        <>
          <p>The wire does not carry “Server A’s memory” as an object. It carries protocol headers and payload bytes. Ethernet switches forward frames; IP routers forward packets; TCP endpoints interpret sequence and acknowledgement state.</p>
          <p>Your existing Ethernet, IP, TCP and Wireshark knowledge applies directly here. The new question is how application memory and transport endpoints relate to those packets.</p>
        </>
      ),
      visual: visual(4),
      evidence: <EvidenceNote kind="Conceptual illustration">The diagram represents the five bytes inside a TCP segment. It does not claim that every implementation uses exactly one packet or exactly one memory copy.</EvidenceNote>,
    },
    {
      id: "server-b-path",
      title: "Server B reconstructs the byte stream before the application reads it",
      actionLabel: "Inspect Server B’s memory",
      body: (
        <>
          <p>Server B’s NIC receives the frames and the operating system performs the reverse processing: Ethernet validation, IP delivery, TCP sequence checking, reassembly, acknowledgement behavior and socket buffering. Only after that processing can the receiving application use <code className="font-mono text-cyan-100">recv()</code> to consume bytes from the socket.</p>
          <p>Network arrival and application consumption are related, but they are not the same event. TCP is also a byte stream: one <code className="font-mono text-cyan-100">recv(5)</code> call is not guaranteed to return all five bytes merely because five were requested.</p>
        </>
      ),
      visual: visual(5),
      inspect: (
        <div>
          <p className="font-semibold text-slate-100">A correct small receive loop</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/80 p-3 font-mono text-xs leading-6 text-slate-200"><code>{`parts = []
remaining = 5
while remaining:
    chunk = sock.recv(remaining)
    if not chunk:
        raise ConnectionError("peer closed early")
    parts.append(chunk)
    remaining -= len(chunk)
data = b"".join(parts)`}</code></pre>
          <p className="mt-3">The loop keeps receiving until the application has collected the five bytes it expects. This is more correct than assuming one <code className="font-mono text-cyan-100">recv(5)</code> call always returns five bytes.</p>
        </div>
      ),
    },
    {
      id: "objective-complete",
      title: "The five bytes are now in Server B’s application memory",
      actionLabel: "Continue: why does RDMA exist?",
      body: (
        <>
          <p>We have successfully moved data between two applications. Both operating systems participated in protocol processing, buffering and delivery. For five bytes, that is perfectly reasonable.</p>
          <p>What happens when two computers need to exchange enormous amounts of data repeatedly?</p>
        </>
      ),
      visual: visual(6),
      evidence: <Callout title="Hold on to the objective">Throughout the rest of the practical, keep returning to this simple question: which application memory changed, which component changed it, and how do we know?</Callout>,
    },
  ];

  return <GuidedLesson lessonId="moving-data" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 2: Why does RDMA exist?" />;
}
