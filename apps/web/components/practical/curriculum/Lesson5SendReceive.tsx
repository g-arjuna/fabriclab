"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { CompletionSummary, PacketSummary, WorkRequestSummary } from "./operationVisuals";
import { EvidenceNote, exactValue, SourceExcerpt, TwoServerVisual } from "./visuals";
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

function visual(stage: number) {
  const receivePosted = stage >= 3;
  const sendPosted = stage >= 5;
  const packetOnWire = stage === 6;
  const completed = stage >= 8;
  return (
    <TwoServerVisual
      caption="Guided replay of the validated SEND/RECEIVE reference execution. Browser actions reveal the recorded causal states; they do not execute live RDMA operations."
      transfer={{
        active: packetOnWire || stage === 8,
        direction: packetOnWire ? "a-to-b" : stage === 8 ? "b-to-a" : "none",
        packet: packetOnWire ? <span>{sendPacket.opcodeName}<br />dest QPN {exactValue(sendPacket.destinationQpn)} · PSN {exactValue(sendPacket.psn)}</span> : stage === 8 ? <span>transport acknowledgement<br />toward sender QPN {exactValue(ackPacket.destinationQpn)}</span> : undefined,
        label: packetOnWire ? "The SEND packet carries payload data toward the receiver endpoint" : stage === 8 ? "The acknowledgement is transport evidence, not either application completion" : "Endpoints prepared; no data packet yet",
      }}
      a={{
        emphasis: stage === 1 ? ["memory"] : stage === 4 ? ["application", "memory"] : stage === 5 ? ["application", "os"] : packetOnWire ? ["nic"] : completed ? ["os"] : [],
        application: stage >= 4 ? "sender prepares a signalled SEND Work Request" : "sender application",
        memory: stage >= 4 ? sendWr.payloadText : "source buffer prepared for payload",
        memoryTone: stage >= 4 ? "source" : "ready",
        os: "sender endpoint and Completion Queue",
        nic: packetOnWire ? "executes the posted SEND operation" : "sender RDMA device",
        queues: stage >= 3 ? {
          label: `Sender QP ${exactValue(experiment.endpoints.initiator.qpn)}`,
          send: sendPosted ? [`WR ${exactValue(sendWr.wrId)} · SEND · ${sendWr.byteLength} bytes`] : [],
          receive: [],
          completion: completed ? [`CQE · Send · ${exactValue(sendCqe.wrId)}`] : [],
        } : undefined,
      }}
      b={{
        emphasis: stage === 1 ? ["memory"] : stage === 2 ? ["memory"] : stage === 3 ? ["os"] : packetOnWire ? ["nic", "os"] : stage === 7 ? ["memory", "application"] : completed ? ["os"] : [],
        application: stage >= 7 ? "receiver observes and verifies the bytes that landed" : "receiver application",
        memory: stage >= 7 ? receivedText : "destination buffer waiting",
        memoryTone: stage >= 7 ? "changed" : "ready",
        os: "receiver endpoint and Completion Queue",
        nic: packetOnWire ? "consumes the SEND using the posted receive" : "receiver RDMA device",
        queues: stage >= 2 ? {
          label: `Receiver QP ${exactValue(experiment.endpoints.responder.qpn)}`,
          send: [],
          receive: receivePosted ? [`WR ${exactValue(recvWr.wrId)} · RECEIVE buffer`] : [],
          completion: completed ? [`CQE · Receive · ${exactValue(recvCqe.wrId)}`] : [],
        } : undefined,
      }}
    />
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
          <p>The HELLO example established the memory-to-memory objective. The experiment now uses the genuine recorded payload <span className="font-mono text-cyan-100">{sendWr.payloadText}</span>. We will not substitute illustrative bytes into the captured evidence; every packet and memory observation in this lesson comes from the validated reference execution.</p>
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
          <p>Server A will supply the payload bytes from its registered memory. Server B must identify where incoming data is allowed to land. That receiving decision is local to Server B: the sender does not choose the destination address in a SEND/RECEIVE operation.</p>
          <p>This is the crucial difference from the one-sided operations we will study later. The receiver participates before the sender transmits by posting a receive request.</p>
        </>
      ),
      visual: visual(1),
      inspect: <WorkRequestSummary request={recvWr} title="Recorded receive-side memory description" />,
    },
    {
      id: "prepare-receive",
      title: "The receive buffer is memory made available for incoming data",
      actionLabel: "Post the receive request",
      body: (
        <>
          <p>Server B has registered a buffer. Preparing the receive means describing that buffer to the endpoint so the transport knows where an incoming SEND may place data.</p>
          <p>The receive request does not contain payload bytes. It is a promise: “when a matching SEND arrives, this memory may be used.”</p>
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
      title: "The Receive Work Request is now waiting in Server B’s Receive Queue",
      actionLabel: "Prepare the send request",
      body: (
        <>
          <p>The Receive Work Request has entered Server B’s Receive Queue. No network packet has appeared merely because this request exists. Server B has only armed a local receive slot.</p>
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
      title: "Posting the SEND makes work visible to the endpoint",
      actionLabel: "Follow the network packet",
      body: (
        <>
          <p>The decisive application call is <code className="font-mono text-cyan-100">qp.post_send(swr)</code>. At that moment the instruction enters Server A’s Send Queue. The application has requested work; it has not itself placed a packet on the wire.</p>
          <p>The RDMA implementation can now execute the queue entry using the programmed endpoint state.</p>
        </>
      ),
      visual: visual(5),
      inspect: (
        <SourceExcerpt path="python/exp_b_send_recv.py" start={135} end={143} title="The exact submission and application event">
          The embedded source snapshot shows <code className="font-mono text-cyan-100">qp.post_send(swr)</code> followed by the event log record that the evidence exporter uses to correlate the Work Request.
        </SourceExcerpt>
      ),
    },
    {
      id: "send-packet",
      title: "The captured SEND packet carries the payload toward Server B",
      actionLabel: "Inspect the received data",
      body: (
        <>
          <p>The validated capture contains a SEND Only packet from {sendPacket.sourceIp} to {sendPacket.destinationIp}. Its destination QPN is {exactValue(sendPacket.destinationQpn)}, which identifies Server B’s receiving endpoint. Its packet sequence number is {exactValue(sendPacket.psn)} in this reference run.</p>
          <p>This packet is network evidence produced as transport executes the posted Work Request. It is related to the Work Request, but it is not the same object as the Work Request.</p>
        </>
      ),
      visual: visual(6),
      evidence: <EvidenceNote kind="Captured on the wire">Frame {sendPacket.frameNumber} in {sendPacket.captureFile} is genuine RoCEv2 traffic captured on the data network.</EvidenceNote>,
      inspect: <PacketSummary packet={sendPacket}>The UDP destination port is 4791. The BTH carries the opcode, destination QPN and PSN. SEND does not carry a remote memory address or RKEY because the receive request chooses the destination locally.</PacketSummary>,
    },
    {
      id: "received-data",
      title: "Server B’s memory now contains the genuine payload",
      actionLabel: "Check the completions",
      body: (
        <>
          <p>The incoming SEND consumes Server B’s posted Receive Work Request. The transport places the payload bytes into the memory described by that receive request.</p>
          <p>The verified destination memory begins with <span className="font-mono text-emerald-100">{receivedText}</span>. This is application memory evidence recorded by the experiment, not an inference from the packet alone.</p>
        </>
      ),
      visual: visual(7),
      evidence: <EvidenceNote kind="Verified through application memory inspection">The receiver read the bytes from its own buffer after the receive completion and logged a payload-match verification.</EvidenceNote>,
      inspect: (
        <SourceExcerpt path="python/exp_b_send_recv.py" start={111} end={121} title="The receiver observes memory after completion">
          The application polls its completion queue, reads exactly the completed byte length from its buffer and compares it with the expected payload.
        </SourceExcerpt>
      ),
    },
    {
      id: "completions",
      title: "Each endpoint observes its own local completion",
      actionLabel: "Inspect the packet capture",
      body: (
        <>
          <p>Server A observes a send completion for the signalled SEND it posted. Server B observes a receive completion because its posted receive was consumed. Neither completion travels on the network.</p>
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
      id: "packet-code-relationship",
      title: "Code, queues, packet, memory and completion now form one causal chain",
      actionLabel: "Continue: what makes WRITE different?",
      body: (
        <>
          <p>The chain is: receiver posts a receive → sender posts a SEND → transport emits a SEND packet → receiver memory is placed through the posted receive → each application observes its own local completion.</p>
          <p>Server B prepared a receive request before Server A sent its message. Can we move data into Server B’s memory without requiring it to post a receive request for that transfer?</p>
        </>
      ),
      visual: visual(8),
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
