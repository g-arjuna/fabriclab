"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { EvidenceNote, exactValue, FactGrid, SourceExcerpt } from "./visuals";
import { CodeOperationChain, RdmaSystemDiagram, type QueueVisualModel, type WorkVisual } from "./rdmaDiagrams";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

const resources = rdmaEvidence.experiments.find((experiment) => experiment.id === "resources")!;
const a = resources.endpoints.initiator;
const b = resources.endpoints.responder;

function queuesVisual(stage: number) {
  const wr: WorkVisual = {
    id: "conceptual-send-wr",
    label: "WR · operation · buffer · length · LKEY",
    detail: "conceptual instruction object",
    lifecycle: stage < 2 ? "constructed" : stage < 6 ? "posted" : "completed",
  };
  const queueNowEmpty: QueueVisualModel = { state: "empty", entries: stage >= 6 ? [wr] : [] };
  const pendingQueue: QueueVisualModel = { state: "occupied", entries: stage >= 2 ? [wr] : [] };
  return (
    <div className="space-y-3">
      {stage >= 2 ? (
        <CodeOperationChain items={[{ path: "python/exp_b_send_recv.py", line: 139, effect: "a real SEND Work Request enters the sender Send Queue" }]} />
      ) : null}
      <RdmaSystemDiagram
        caption={stage >= 6 ? "Logical mechanical diagram. The Work Request is application intent, the packet and ACK are wire objects, and the Completion Queue Entry is a separate local application-observable result." : "Logical resource diagram. Components appear as the lesson establishes why they are needed; queue placement is not a claim about physical storage inside a particular NIC."}
        transfer={{
          visible: stage === 4,
          direction: stage === 4 ? "both" : "none",
          kind: stage === 4 ? "control" : "none",
          label: stage === 4 ? <span>TCP control channel: endpoint metadata only</span> : undefined,
          detail: stage === 6 ? "The conceptual operation packet and reverse ACK have already occurred; they are not still in flight while the completion is inspected." : stage >= 4 ? "QPN, PSN and network identity are programmed through a separate control mechanism." : "Memory preparation alone does not describe work.",
        }}
        a={{
          host: "hosta",
          name: "Server A",
          role: "endpoint example",
          qpn: stage >= 3 ? exactValue(a.qpn) : undefined,
          application: stage >= 1 ? "constructs a Work Request describing the desired operation" : "has registered memory but has not described any work",
          memory: stage >= 1 ? "registered buffer · address · length · LKEY" : "registered buffer ready for use",
          provider: stage >= 4 ? "Soft-RoCE provider can use the programmed endpoint" : "RDMA provider present",
          softRoce: true,
          constructedWork: stage === 1 ? [wr] : undefined,
          sendQueue: stage >= 2 ? (stage >= 6 ? queueNowEmpty : pendingQueue) : { state: "not-introduced" },
          receiveQueue: stage >= 2 ? { state: "empty" } : { state: "not-introduced" },
          completionQueue: stage >= 5 ? (stage >= 6 ? { state: "occupied", entries: [{ id: "conceptual-cqe", label: "CQE · local outcome", detail: "conceptual signalled send completion", evidence: "conceptual" }] } : { state: "empty" }) : { state: "not-introduced" },
          emphasize: stage === 0 ? ["memory"] : stage === 1 ? ["application"] : stage <= 3 ? ["qp"] : stage === 4 ? ["provider"] : stage >= 5 ? ["cq"] : [],
        }}
        b={{
          host: "hostb",
          name: "Server B",
          role: "peer endpoint",
          qpn: stage >= 4 ? exactValue(b.qpn) : undefined,
          application: stage >= 4 ? "has also prepared an endpoint" : "not relevant until endpoint setup",
          memory: stage >= 4 ? "registered buffer" : "—",
          provider: stage >= 4 ? "Soft-RoCE provider can use the programmed endpoint" : "RDMA provider present",
          softRoce: true,
          sendQueue: stage >= 4 ? { state: "empty" } : { state: "not-introduced" },
          receiveQueue: stage >= 4 ? { state: "empty" } : { state: "not-introduced" },
          completionQueue: stage >= 5 ? { state: "empty" } : { state: "not-introduced" },
          emphasize: stage === 4 ? ["provider"] : [],
          dimmed: stage < 4,
        }}
      />
    </div>
  );
}

function stateMachineExplanation() {
  return (
    <details className="rounded-2xl border border-white/10 bg-slate-950/50 p-4" data-testid="qp-state-explanation">
      <summary className="cursor-pointer text-sm font-semibold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Why do RESET, INIT, RTR and RTS appear in the code?</summary>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
        <p>A newly created Reliable Connected Queue Pair starts in RESET. INIT configures local port and access attributes. RTR — ready to receive — supplies peer addressing information, the destination QPN and the packet sequence number expected from the peer. RTS — ready to send — supplies the local sending sequence number and retry/timeout behavior.</p>
        <p>These states are not separate network protocols. They are programming transitions that make the local endpoint internally consistent. Creating a QP does not automatically tell the remote host anything; the laboratory exchanges endpoint metadata over a separate TCP control channel.</p>
      </div>
    </details>
  );
}

export function Lesson4Queues({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "need-work-description",
      title: "Prepared memory is not yet an instruction",
      actionLabel: "Describe the work",
      body: (
        <>
          <p>We have prepared memory for RDMA. But the device still does not know whether we want to send data, receive data, read remote memory or write remote memory. We need a way to describe the work.</p>
          <p>The application must say which operation is requested, which local memory is involved, how many bytes matter, and which key authorizes use of that local memory.</p>
        </>
      ),
      visual: queuesVisual(0),
    },
    {
      id: "work-request",
      title: "A Work Request is the application’s instruction",
      actionLabel: "Place the work on a queue",
      body: (
        <>
          <p>A <strong className="text-slate-100">Work Request</strong> is an application-level description of work for the RDMA device. It can describe a send, a receive buffer, a write into named remote memory or a read from named remote memory.</p>
          <p>For memory access, the request references a local buffer by address and length and uses the local memory key. One-sided operations additionally contain the remote address and remote key. The request is not a packet; it is input to the device and transport implementation.</p>
        </>
      ),
      visual: queuesVisual(1),
      inspect: (
        <SourceExcerpt path="python/exp_b_send_recv.py" start={131} end={139} title="A real SEND Work Request under construction">
          The scatter-gather entry names the local buffer address, byte length and LKEY. The SendWR carries the operation type and a signalling flag. Later lessons correlate this exact structure with a genuine packet.
        </SourceExcerpt>
      ),
    },
    {
      id: "queues",
      title: "Work enters the Send Queue or Receive Queue",
      actionLabel: "Pair the queues into an endpoint",
      body: (
        <>
          <p>The application does not shout instructions into the network. It posts Work Requests into queues associated with its endpoint. Send-style operations are posted to the <strong className="text-slate-100">Send Queue</strong>. Memory prepared to receive incoming SEND data is posted to the <strong className="text-slate-100">Receive Queue</strong>.</p>
          <p>RDMA READ and ordinary RDMA WRITE are also initiated through the Send Queue because the local endpoint is initiating work. “Send Queue” does not mean the payload always travels outward; READ is initiated there even though payload data returns inward.</p>
        </>
      ),
      visual: queuesVisual(2),
      evidence: <EvidenceNote kind="Mechanism">When the learner submits an instruction in this diagram, it first appears in the appropriate queue. Nothing yet implies that a packet exists.</EvidenceNote>,
    },
    {
      id: "queue-pair",
      title: "A Queue Pair is one communication endpoint",
      actionLabel: "Prepare both endpoints to communicate",
      body: (
        <>
          <p>A Reliable Connected endpoint uses a Send Queue and a Receive Queue together. Together they form a <strong className="text-slate-100">Queue Pair</strong>. Each endpoint has its own Queue Pair Number, or QPN. A packet header carries the destination QPN: the QPN of the endpoint that packet is targeting.</p>
          <p>A QP is not a TCP connection and a QPN is not an IP address or UDP port. RoCEv2 uses IP and UDP underneath, while the RDMA transport uses QPNs and packet sequence numbers for endpoint and reliability semantics.</p>
        </>
      ),
      visual: queuesVisual(3),
      inspect: (
        <div className="space-y-4">
          <FactGrid facts={[
            { label: "Server A endpoint QPN", value: exactValue(a.qpn) },
            { label: "Server A peer QPN", value: exactValue(a.destinationQpn) },
            { label: "Server B endpoint QPN", value: exactValue(b.qpn) },
            { label: "Server B peer QPN", value: exactValue(b.destinationQpn) },
          ]} />
          <p>These endpoint numbers come from the validated resource-creation run. They are run-specific identifiers, not universal constants.</p>
        </div>
      ),
    },
    {
      id: "connection-setup",
      title: "Both endpoints must be programmed with peer information",
      actionLabel: "Introduce completion observation",
      body: (
        <>
          <p>Reliable Connected Queue Pairs communicate as endpoints of one association. Each side needs enough peer information to interpret and generate transport packets: the peer’s QPN, initial packet sequence number and RoCEv2 network identity.</p>
          <p>In this laboratory that information is exchanged through a separate TCP control mechanism. The control channel carries metadata only. It does not carry the RDMA payload, and creating a QP does not automatically establish remote communication.</p>
        </>
      ),
      visual: queuesVisual(4),
      interaction: stateMachineExplanation(),
      inspect: (
        <SourceExcerpt path="python/rdma_common.py" start={155} end={191} title="RESET → INIT → RTR → RTS in the real helper">
          The comments in the embedded source show why each transition exists. RTR programs information needed to receive from the peer; RTS programs information needed to send to the peer.
        </SourceExcerpt>
      ),
    },
    {
      id: "completion-queue",
      title: "A Completion Queue reports local outcomes to the application",
      actionLabel: "Compare requests, packets, acknowledgements and completions",
      body: (
        <>
          <p>Posting work is not the same as knowing the outcome. When a signalled operation completes, the device or provider places a <strong className="text-slate-100">Completion Queue Entry</strong> into a Completion Queue. The application polls that queue and interprets the entry.</p>
          <p>A Completion Queue is an independently created resource associated with one or more Queue Pairs. Multiple QPs may share a CQ, and send and receive completions may use the same or different CQs depending on the design. A QP itself consists of its Send Queue and Receive Queue.</p>
          <p>A completion is local application evidence. It is not a network packet and it is not the peer’s completion. A transport acknowledgement can contribute to the reliable-transport outcome, but the acknowledgement on the wire and the completion observed by the application are different objects.</p>
        </>
      ),
      visual: queuesVisual(5),
      inspect: (
        <SourceExcerpt path="python/rdma_common.py" start={194} end={224} title="Polling a real Completion Queue">
          The application repeatedly polls the CQ. It interprets a completion only after checking successful status. This is why completion ownership is local and explicit.
        </SourceExcerpt>
      ),
    },
    {
      id: "four-objects",
      title: "Four related objects must remain distinct",
      actionLabel: "Continue: perform a real SEND/RECEIVE transfer",
      body: (
        <>
          <p>A Work Request is the application’s instruction. A network packet is a wire-format artifact produced as transport executes work. A transport acknowledgement is network behavior used by reliable transport. A Work Completion is a local record observed by an application.</p>
          <p>They can correlate strongly, but they are not interchangeable. Confusing them causes exactly the operational mistakes network engineers need to avoid: treating an ACK as application consumption, treating a local completion as a peer event, or assuming a posted request means a packet already exists.</p>
        </>
      ),
      visual: queuesVisual(6),
      evidence: <EvidenceNote kind="Validated reference context">The resource-creation experiment reaches ready endpoint state but posts no data work. No data-operation capture exists for it because preparing resources is not itself an RDMA data transfer.</EvidenceNote>,
    },
  ];

  return <GuidedLesson lessonId="queues" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 5: real SEND/RECEIVE" />;
}
