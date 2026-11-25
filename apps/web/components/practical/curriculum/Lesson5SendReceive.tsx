"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { CompletionSummary, PacketSummary, WorkRequestSummary } from "./operationVisuals";
import { CodeOperationChain, RdmaSystemDiagram, type CompletionQueueVisualModel, type QueueVisualModel, type WorkVisual } from "./rdmaDiagrams";
import { EvidenceNote, exactValue, SourceExcerpt } from "./visuals";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

const experiment = rdmaEvidence.experiments.find((item) => item.id === "send-recv")!;
const sendWr = experiment.workRequests.find((item) => item.kind === "send")!;
const recvWr = experiment.workRequests.find((item) => item.kind === "receive")!;
const sendCqe = experiment.completions.find((item) => item.host === "hosta")!;
const recvCqe = experiment.completions.find((item) => item.host === "hostb")!;
const sendPacket = experiment.packets.find((item) => item.role === "request")!;
const ackPacket = experiment.packets.find((item) => item.role === "acknowledgement")!;
const receiveMemory = experiment.memoryRegions.find((item) => item.host === "hostb")!;
const receivedText = receiveMemory.snapshots.find((item) => item.id.includes("received"))?.text;

function lifecycleForReceive(stage: number): WorkVisual["lifecycle"] {
  if (stage === 2) return "constructed";
  if (stage >= 3 && stage <= 5) return "posted";
  if (stage === 6) return "in-flight";
  if (stage === 7) return "consumed";
  if (stage >= 8) return "completed";
  return "not-created";
}

function lifecycleForSend(stage: number): WorkVisual["lifecycle"] {
  if (stage === 4) return "constructed";
  if (stage === 5) return "posted";
  if (stage === 6 || stage === 7) return "in-flight";
  if (stage >= 8) return "completed";
  return "not-created";
}

function queueFor(entry: WorkVisual, lifecycle: WorkVisual["lifecycle"]): QueueVisualModel {
  if (lifecycle === "not-created") return { state: "empty" };
  if (lifecycle === "constructed") return { state: "empty" };
  if (lifecycle === "posted" || lifecycle === "in-flight") return { state: "occupied", entries: [entry] };
  return { state: "empty", entries: [entry] };
}

function visual(stage: number) {
  const receiveLifecycle = lifecycleForReceive(stage);
  const sendLifecycle = lifecycleForSend(stage);
  const receiveWork: WorkVisual = {
    id: recvWr.id,
    label: `WR ${exactValue(recvWr.wrId)} · RECEIVE buffer`,
    detail: `${recvWr.byteLength} bytes · local memory selected by Server B`,
    lifecycle: receiveLifecycle,
  };
  const sendWork: WorkVisual = {
    id: sendWr.id,
    label: `WR ${exactValue(sendWr.wrId)} · SEND · ${sendWr.byteLength} bytes`,
    detail: "signalled application send request",
    lifecycle: sendLifecycle,
  };
  const senderCq: CompletionQueueVisualModel = stage >= 8
    ? { state: "occupied", entries: [{ id: sendCqe.id, label: `CQE · Send · WR ${exactValue(sendCqe.wrId)}`, detail: "polled by Server A", evidence: "recorded" }] }
    : { state: "unknown" };
  const receiverCq: CompletionQueueVisualModel = stage >= 8
    ? { state: "occupied", entries: [{ id: recvCqe.id, label: `CQE · Receive · WR ${exactValue(recvCqe.wrId)}`, detail: "polled by Server B", evidence: "recorded" }] }
    : { state: "unknown" };
  const packetInFlight = stage === 6;
  const ackInFlight = stage === 7;
  const chain = stage === 3
    ? [{ path: "python/exp_b_send_recv.py", line: 107, effect: "posts the receive request into Server B’s Receive Queue" }]
    : stage === 5
      ? [{ path: "python/exp_b_send_recv.py", line: 139, effect: "posts the SEND request into Server A’s Send Queue" }]
      : stage === 8
        ? [
            { path: "python/exp_b_send_recv.py", line: 113, effect: "Server B polls and observes its local receive completion" },
            { path: "python/exp_b_send_recv.py", line: 144, effect: "Server A polls and observes its local send completion" },
          ]
        : [];

  return (
    <div className="space-y-3">
      {chain.length ? <CodeOperationChain items={chain} /> : null}
      <RdmaSystemDiagram
        caption="Guided replay of the validated SEND/RECEIVE reference execution. Queue lifecycle is a logical instructional reconstruction tied to recorded application events; it is not independently measured hardware queue occupancy. Browser actions do not execute live RDMA."
        transfer={{
          visible: packetInFlight || ackInFlight,
          direction: packetInFlight ? "a-to-b" : ackInFlight ? "b-to-a" : "none",
          kind: packetInFlight ? "request" : ackInFlight ? "acknowledgement" : "none",
          label: packetInFlight
            ? <span>{sendPacket.opcodeName}<br />dest QPN {exactValue(sendPacket.destinationQpn)} · PSN {exactValue(sendPacket.psn)}</span>
            : ackInFlight
              ? <span>transport acknowledgement<br />toward sender QPN {exactValue(ackPacket.destinationQpn)}</span>
              : undefined,
          detail: packetInFlight
            ? "The SEND packet carries payload data toward the receiver endpoint."
            : ackInFlight
              ? "The ACK is transport evidence, not either application completion."
              : stage >= 8
                ? "The captured SEND/ACK exchange has already completed; the learner is now inspecting application completion evidence."
                : stage === 7
                  ? "The SEND has been consumed; the reverse ACK is in transit before application completion observation."
                  : "Endpoints are prepared, but no data packet exists yet.",
        }}
        a={{
          host: "hosta",
          name: "Server A",
          role: "sender / initiator",
          qpn: exactValue(experiment.endpoints.initiator.qpn),
          application: stage >= 4 ? "sender prepares a signalled SEND Work Request" : "sender application",
          memory: stage >= 4 ? sendWr.payloadText : "source buffer prepared for payload",
          provider: packetInFlight ? "executes the posted SEND operation" : "Soft-RoCE provider implementing RDMA transport",
          softRoce: true,
          constructedWork: sendLifecycle === "constructed" ? [sendWork] : undefined,
          sendQueue: stage >= 4 ? queueFor(sendWork, sendLifecycle) : { state: "not-introduced" },
          receiveQueue: stage >= 4 ? { state: "empty" } : { state: "not-introduced" },
          completionQueue: senderCq,
          emphasize: stage === 4 ? ["application", "memory"] : stage === 5 ? ["application", "qp"] : packetInFlight ? ["provider"] : stage >= 8 ? ["cq"] : [],
        }}
        b={{
          host: "hostb",
          name: "Server B",
          role: "receiver",
          qpn: exactValue(experiment.endpoints.responder.qpn),
          application: stage >= 9 ? "receiver verifies memory after observing completion" : stage >= 2 ? "receiver prepares memory for a possible incoming SEND" : "receiver application",
          memory: stage >= 9
            ? `${receivedText}\n[recorded memory verification after completion]`
            : stage >= 7
              ? `${sendWr.payloadText}\n[causal memory-placement illustration]`
              : "destination buffer waiting",
          provider: packetInFlight ? "consumes the SEND using the posted receive" : "Soft-RoCE provider implementing RDMA transport",
          softRoce: true,
          constructedWork: receiveLifecycle === "constructed" ? [receiveWork] : undefined,
          sendQueue: stage >= 2 ? { state: "empty" } : { state: "not-introduced" },
          receiveQueue: stage >= 2 ? queueFor(receiveWork, receiveLifecycle) : { state: "not-introduced" },
          completionQueue: receiverCq,
          emphasize: stage === 2 ? ["application", "memory"] : stage === 3 ? ["qp"] : packetInFlight ? ["provider", "memory"] : stage === 7 ? ["memory", "qp"] : stage >= 8 ? ["cq"] : [],
        }}
      />
    </div>
  );
}

export function Lesson5SendReceive({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "building-blocks",
      title: "We can now perform a real RDMA transfer",
      actionLabel: "Inspect both servers",
      body: (
        <>
          <p>We now have the building blocks needed to move data. Let us perform our first RDMA transfer. Server A wants to send a message, and Server B is expecting to receive it.</p>
          <p>The HELLO example established the memory-to-memory objective. The experiment now uses the genuine recorded payload <span className="font-mono text-cyan-100">{sendWr.payloadText}</span>. We will not substitute illustrative bytes into the captured evidence.</p>
        </>
      ),
      visual: visual(0),
      evidence: <EvidenceNote kind="Evidence boundary">Learner actions control guided replay of recorded execution evidence. They do not execute RDMA operations in the browser or on a live host.</EvidenceNote>,
    },
    {
      id: "inspect-servers",
      title: "Server A owns the source; Server B must provide the destination",
      actionLabel: "Prepare the receive buffer",
      body: (
        <>
          <p>Server A will supply payload bytes from its registered memory. Server B must identify where incoming data is allowed to land. That receiving decision is local to Server B: the sender does not choose the destination address in a SEND/RECEIVE operation.</p>
          <p>The receiver participates before the sender transmits by preparing and then posting a receive request.</p>
        </>
      ),
      visual: visual(1),
      inspect: <WorkRequestSummary request={recvWr} title="Recorded receive-side memory description" />,
    },
    {
      id: "prepare-receive",
      title: "The receive request is constructed before it is posted",
      actionLabel: "Post the receive request",
      body: (
        <>
          <p>Server B has registered a buffer. Preparing the receive means describing that buffer to the endpoint so the transport knows where an incoming SEND may place data.</p>
          <p>At this point the request is an application-constructed object. It is not yet pending in the Receive Queue and it has no network effect.</p>
        </>
      ),
      visual: visual(2),
      inspect: (
        <SourceExcerpt path="python/exp_b_send_recv.py" start={102} end={109} title="The real receive request is constructed and posted">
          The scatter-gather entry names Server B’s buffer address, length and LKEY. <code className="font-mono text-cyan-100">qp.post_recv(rwr)</code> makes that memory available for a subsequent incoming SEND.
        </SourceExcerpt>
      ),
    },
    {
      id: "post-receive",
      title: "The Receive Work Request is pending in Server B’s Receive Queue",
      actionLabel: "Prepare the send request",
      body: (
        <>
          <p>The Receive Work Request has entered Server B’s Receive Queue. No network packet appears merely because this request exists. Server B has armed a local receive slot.</p>
          <p>Server A is told through the lab’s control channel that the peer is ready. That control message coordinates the demonstration; it is not the RDMA data transfer.</p>
        </>
      ),
      visual: visual(3),
      evidence: <EvidenceNote kind="Recorded application event">The application log recorded the posted receive with WR ID {exactValue(recvWr.wrId)}, buffer length {recvWr.byteLength} and local key. The exporter correlates that event with the later receive completion by WR ID.</EvidenceNote>,
      inspect: <WorkRequestSummary request={recvWr} title="Posted Receive Work Request" />,
    },
    {
      id: "prepare-send",
      title: "Server A describes the payload and requested operation",
      actionLabel: "Submit the send request",
      body: (
        <>
          <p>Server A writes the genuine payload into its registered source buffer and constructs a signalled SEND Work Request. The scatter-gather entry names the local source memory and length; the operation says SEND.</p>
          <p>The sender does not provide Server B’s memory address. In SEND/RECEIVE, the destination is selected by the receiver’s already-posted Receive Work Request.</p>
        </>
      ),
      visual: visual(4),
      inspect: (
        <div className="space-y-4">
          <WorkRequestSummary request={sendWr} title="Send Work Request being prepared" />
          <SourceExcerpt path="python/exp_b_send_recv.py" start={131} end={138} title="Constructing the real SEND request">
            The local SGE names Server A’s memory. The opcode is SEND and the request is signalled, so the sender expects a local completion.
          </SourceExcerpt>
        </div>
      ),
    },
    {
      id: "submit-send",
      title: "Posting the SEND makes work pending in the sender queue",
      actionLabel: "Follow the network packet",
      body: (
        <>
          <p>The decisive application call is <code className="font-mono text-cyan-100">qp.post_send(swr)</code>. The instruction enters Server A’s Send Queue. The application has requested work; it has not itself placed a packet on the wire.</p>
          <p>The RDMA implementation can now execute the queue entry using the programmed endpoint state.</p>
        </>
      ),
      visual: visual(5),
      inspect: (
        <SourceExcerpt path="python/exp_b_send_recv.py" start={135} end={143} title="The exact submission and application event">
          The embedded source snapshot shows <code className="font-mono text-cyan-100">qp.post_send(swr)</code> followed by the event log record used to correlate the Work Request.
        </SourceExcerpt>
      ),
    },
    {
      id: "send-packet",
      title: "The captured SEND packet carries the payload toward Server B",
      actionLabel: "Consume the posted receive",
      body: (
        <>
          <p>The validated capture contains a SEND Only packet from {sendPacket.sourceIp} to {sendPacket.destinationIp}. Its destination QPN is {exactValue(sendPacket.destinationQpn)}, which identifies Server B’s receiving endpoint. Its packet sequence number is {exactValue(sendPacket.psn)} in this reference run.</p>
          <p>This packet is network evidence produced as transport executes the posted Work Request. It is related to the Work Request, but it is not the same object as the Work Request.</p>
        </>
      ),
      visual: visual(6),
      evidence: <EvidenceNote kind="Captured on the wire">Frame {sendPacket.frameNumber} in {sendPacket.captureFile} is genuine RoCEv2 traffic captured on the data network.</EvidenceNote>,
      inspect: <PacketSummary packet={sendPacket}>The UDP destination port is 4791. SEND does not carry a remote memory address or RKEY because the receive request chooses the destination locally.</PacketSummary>,
    },
    {
      id: "consume-receive",
      title: "The incoming SEND consumes the posted Receive Work Request",
      actionLabel: "Check the completions",
      body: (
        <>
          <p>The receive request now leaves the pending Receive Queue: it has been consumed by the incoming SEND. The transport uses its buffer description to place the payload into Server B’s registered memory.</p>
          <p>This memory placement is shown as a causal illustration of transport execution. The application’s verified memory inspection comes later, after completion observation.</p>
        </>
      ),
      visual: visual(7),
      evidence: <EvidenceNote kind="Causal illustration bounded by evidence">The packet, posted receive and completion relationships are validated. The precise intermediate memory-instant is not independently timestamped, so this state is not presented as a measured memory snapshot.</EvidenceNote>,
    },
    {
      id: "completions",
      title: "Each endpoint observes its own local completion",
      actionLabel: "Verify the received memory",
      body: (
        <>
          <p>Server A polls and observes a send completion for the signalled SEND it posted. Server B polls and observes a receive completion because its posted receive was consumed. Neither completion travels on the network.</p>
          <p>The reverse-direction acknowledgement in the capture is reliable-transport behavior. It is correlated with the operation, but it is not the sender’s Completion Queue Entry and it is not the receiver’s Completion Queue Entry.</p>
        </>
      ),
      visual: visual(8),
      inspect: (
        <div className="space-y-4">
          <CompletionSummary completion={sendCqe} title="Sender-local completion" />
          <CompletionSummary completion={recvCqe} title="Receiver-local completion" />
          <PacketSummary packet={ackPacket}>The ACK travels back toward the sender endpoint QPN {exactValue(ackPacket.destinationQpn)}. It is wire evidence of transport acknowledgement, separate from both local CQEs.</PacketSummary>
        </div>
      ),
    },
    {
      id: "verify-memory",
      title: "Only after completion does the receiver verify application memory",
      actionLabel: "Connect the whole causal chain",
      body: (
        <>
          <p>Server B now reads exactly the completed byte length from its own buffer and compares it with the expected payload. The verified destination memory begins with <span className="font-mono text-emerald-100">{receivedText}</span>.</p>
          <p>This ordering matters: memory placement, completion generation, completion polling and application memory verification are related but distinct events.</p>
        </>
      ),
      visual: visual(9),
      evidence: <EvidenceNote kind="Verified through application memory inspection">The receiver read the bytes from its own buffer after the receive completion and logged a payload-match verification.</EvidenceNote>,
      inspect: (
        <SourceExcerpt path="python/exp_b_send_recv.py" start={111} end={121} title="The receiver observes memory after completion">
          The application polls its completion queue, reads exactly the completed byte length from its buffer and compares it with the expected payload.
        </SourceExcerpt>
      ),
    },
    {
      id: "packet-code-relationship",
      title: "Code, queues, packet, memory and completion now form one causal chain",
      actionLabel: "Continue: what makes WRITE different?",
      body: (
        <>
          <p>The chain is: receiver constructs and posts a receive → sender constructs and posts a SEND → transport emits a SEND packet → the receive request is consumed and memory is placed → each application observes its own local completion → the receiver verifies memory.</p>
          <p>Server B prepared a receive request before Server A sent its message. Can we move data into Server B’s memory without requiring it to post a receive request for that transfer?</p>
        </>
      ),
      visual: visual(10),
      evidence: <EvidenceNote kind="Validated relationship">The exporter correlates the posted SEND, SEND packet and sender completion using operation type, endpoint direction, QPN, PSN and WR ID. The receive completion is independently correlated with Server B’s posted receive by WR ID.</EvidenceNote>,
      inspect: (
        <SourceExcerpt path="python/exp_b_send_recv.py" start={126} end={148} title="The sender half of the real experiment">
          The sender waits for the receiver-ready control message, writes payload bytes into its registered memory, posts the SEND and polls its own completion queue.
        </SourceExcerpt>
      ),
    },
  ];

  return <GuidedLesson lessonId="send-receive" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 6: RDMA WRITE" />;
}
