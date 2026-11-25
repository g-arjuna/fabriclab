"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { Callout, EvidenceNote, TwoServerVisual } from "./visuals";

const conceptualCaption = (
  <span>
    <strong className="text-slate-300">Conceptual illustration.</strong> This is a simplified TCP/socket path used to establish the problem; it is not presented as a captured TCP experiment. Real implementations may use segmentation, checksum, copy and other offloads.
  </span>
);

function visual(stage: number) {
  const aMemory = stage >= 1 ? "48 45 4c 4c 4f   H E L L O" : "five bytes belong to the application";
  const bMemory = stage >= 6 ? "48 45 4c 4c 4f   H E L L O" : "space reserved · no data yet";
  const packet = stage === 4 ? (
    <span>
      Ethernet frame → IP packet → TCP segment<br />payload bytes: HELLO
    </span>
  ) : undefined;
  return (
    <TwoServerVisual
      caption={conceptualCaption}
      transfer={{
        active: stage === 4,
        direction: stage === 4 ? "a-to-b" : "none",
        packet,
        label: stage === 4 ? "The network carries a copy of the bytes" : "Ethernet connecting the two servers",
        detail: stage === 4 ? "Switches and routers forward frames or packets using the familiar Ethernet/IP/TCP rules you already know." : undefined,
      }}
      a={{
        emphasis: stage === 1 ? ["application", "memory"] : stage === 2 ? ["application", "os"] : stage === 3 ? ["os", "nic"] : [],
        application: stage >= 2 ? "calls sendall() on a connected TCP socket" : "has data it wants to share",
        memory: aMemory,
        memoryTone: stage >= 1 ? "source" : "empty",
        os: stage >= 3 ? "copies or arranges access to the bytes, builds TCP state, segments the stream and asks the NIC to transmit" : stage === 2 ? "the socket API is the application’s controlled entry point into the kernel" : "waiting for a request from the application",
        nic: stage >= 3 ? "frames the outgoing traffic and transmits it onto Ethernet" : "idle for this transfer",
      }}
      b={{
        emphasis: stage === 5 ? ["nic", "os"] : stage === 6 ? ["memory", "application"] : [],
        application: stage >= 6 ? "recv() returns the five bytes to the receiving application" : "has allocated space and is waiting to receive",
        memory: bMemory,
        memoryTone: stage >= 6 ? "changed" : "ready",
        os: stage >= 5 ? "validates the incoming packets, reassembles the byte stream and makes data available to the socket" : "ready to process incoming traffic",
        nic: stage >= 5 ? "receives the Ethernet frames and passes them upward" : "listening",
      }}
    />
  );
}

export function Lesson1MovingData({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "objective",
      title: "The objective is memory to memory",
      actionLabel: "Inspect application memory",
      body: (
        <>
          <p>Imagine that we have two Linux servers connected over Ethernet. An application running on Server A has five bytes of data in its memory: HELLO.</p>
          <p>Another application is running on Server B. It has allocated space in memory, but it has not received the data yet.</p>
          <p>Our objective is simple: get those five bytes from Server A’s application memory into Server B’s application memory.</p>
          <p>Before we understand RDMA, we need to understand how this normally happens.</p>
        </>
      ),
      visual: visual(0),
      evidence: <EvidenceNote kind="Orientation">Everything in this lesson is a conceptual illustration. The goal is not packet detail yet; it is to establish which memory belongs to which application and which components participate in moving bytes.</EvidenceNote>,
    },
    {
      id: "memory",
      title: "Applications operate on bytes in memory",
      actionLabel: "Ask the application to send the data",
      body: (
        <>
          <p>The five bytes are not “in the socket” yet. They are bytes in the application process’s address space. At this point the operating system and network interface do not inherently know that the application wants those bytes sent anywhere.</p>
          <p>The application needs a controlled way to ask the operating system for network transmission. That is the purpose of the socket API.</p>
        </>
      ),
      visual: visual(1),
      inspect: (
        <div>
          <p className="font-semibold text-slate-100">A minimal conceptual socket operation</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/80 p-3 font-mono text-xs leading-6 text-slate-200"><code>{`# Server A: sock is a connected TCP socket
sock.sendall(b"HELLO")`}</code></pre>
          <p className="mt-3">This fragment deliberately omits connection setup. It shows only the operation that matters here: the application asks the kernel to transmit the contents of a memory buffer.</p>
        </div>
      ),
    },
    {
      id: "socket-api",
      title: "The socket API crosses into the operating system",
      actionLabel: "Follow data through Server A",
      body: (
        <>
          <p>Applications do not normally program the Ethernet interface directly. They call into the operating system. With TCP, <code className="font-mono text-cyan-100">sendall()</code> means “take these bytes from my memory and reliably transmit them on this established connection.”</p>
          <p>The kernel now becomes responsible for connection state, ordering, retransmission, buffering and interaction with the network device. The application has not become a network device driver; it has delegated network work through a well-defined API.</p>
        </>
      ),
      visual: visual(2),
      evidence: <EvidenceNote kind="Mental model">The application supplies memory and intent. The operating system supplies protocol machinery and device control. The network interface supplies transmission onto the physical or virtual link.</EvidenceNote>,
    },
    {
      id: "server-a-path",
      title: "Server A turns a byte stream into network traffic",
      actionLabel: "Follow the network transmission",
      body: (
        <>
          <p>Inside Server A, the TCP implementation treats HELLO as part of a byte stream. It may copy the bytes into kernel buffers or arrange more optimized access to them. TCP then forms segments with sequence numbers and connection metadata, IP adds addressing and routing information, and Ethernet framing prepares the result for the link.</p>
          <p>The exact implementation can be optimized by segmentation, checksum and copy offloads, but the conceptual path remains application memory → operating system protocol processing → network interface.</p>
        </>
      ),
      visual: visual(3),
      inspect: (
        <div>
          <p><strong className="text-slate-100">Why the operating system is involved:</strong> TCP must remember what has been sent, what has been acknowledged, when to retransmit, how much the peer can receive and how the local connection state changes. Those are kernel responsibilities in the conventional socket model.</p>
        </div>
      ),
    },
    {
      id: "network",
      title: "The network carries packets, not application memory",
      actionLabel: "Follow data through Server B",
      body: (
        <>
          <p>The wire does not carry “Server A’s memory” as an object. It carries a copy of those bytes inside network protocol data units. Ethernet switches forward frames; IP routers forward packets; TCP endpoints interpret sequence and acknowledgement state.</p>
          <p>Your existing Ethernet, IP, TCP and Wireshark knowledge applies directly here. The new question is how application memory and the transport endpoint relate to those packets.</p>
        </>
      ),
      visual: visual(4),
      evidence: <EvidenceNote kind="Conceptual illustration">The diagram represents the five bytes inside a TCP segment. It does not claim that every implementation uses exactly one packet or exactly one memory copy.</EvidenceNote>,
    },
    {
      id: "server-b-path",
      title: "Server B reconstructs the byte stream",
      actionLabel: "Inspect Server B’s memory",
      body: (
        <>
          <p>Server B’s NIC receives the frames and the operating system performs the reverse processing: Ethernet validation, IP delivery, TCP sequence checking, reassembly and buffering. Only after that processing can the receiving application use <code className="font-mono text-cyan-100">recv()</code> to consume bytes from the socket.</p>
          <p>The receiving application still controls when it reads. Network arrival and application consumption are related, but they are not the same event.</p>
        </>
      ),
      visual: visual(5),
      inspect: (
        <div>
          <p className="font-semibold text-slate-100">The complementary conceptual operation</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/80 p-3 font-mono text-xs leading-6 text-slate-200"><code>{`# Server B: wait for bytes from the connected socket
data = sock.recv(5)`}</code></pre>
          <p className="mt-3">The kernel has already done the protocol work. This call transfers the received byte-stream data into memory controlled by the application.</p>
        </div>
      ),
    },
    {
      id: "objective-complete",
      title: "The five bytes are now in Server B’s application memory",
      actionLabel: "Continue: why does RDMA exist?",
      body: (
        <>
          <p>We have successfully moved data between two applications. But notice how both operating systems participate in processing and delivering that data. What happens when two computers need to exchange enormous amounts of data repeatedly?</p>
          <p>That question is the starting point for RDMA.</p>
        </>
      ),
      visual: visual(6),
      evidence: <Callout title="Hold on to the objective">Throughout the rest of the practical, keep returning to this simple question: which application memory changed, which component changed it, and how do we know?</Callout>,
    },
  ];

  return <GuidedLesson lessonId="moving-data" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 2: Why does RDMA exist?" />;
}
