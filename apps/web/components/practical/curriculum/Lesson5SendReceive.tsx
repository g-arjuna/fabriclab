"use client";

import { useState } from "react";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { CompletionSummary, PacketSummary, WorkRequestSummary } from "./operationVisuals";
import { CodeOperationChain, ExperimentFocusDiagram, ExpandableTechnicalDiagram, RdmaSystemDiagram, type CompletionQueueVisualModel, type QueueVisualModel, type WorkVisual } from "./rdmaDiagrams";
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


function LaboratoryOrientation() {
  const preparation = [
    ["1", "Open the Soft-RoCE device context and discover the local RoCEv2 network identity", "device access from Lesson 2"],
    ["2", "Create the Protection Domain and Completion Queue", "resource boundary and outcome reporting from Lessons 3–4"],
    ["3", "Allocate memory, register it and create the Queue Pair associated with the CQ", "registered memory plus endpoint resources"],
    ["4", "Open the separate TCP control connection", "coordination only — not the RDMA payload path"],
    ["5", "Exchange QPN, packet sequence number and network identity", "peer endpoint metadata"],
    ["6", "Transition each QP through INIT, RTR and RTS", "endpoint readiness before real work"],
    ["7", "Receiver posts its Receive Work Request", "destination memory is chosen locally"],
    ["8", "Sender writes the payload, constructs and posts the SEND Work Request", "the first real data operation"],
    ["9", "Each application polls its own completion when its local operation finishes", "independent local outcome sequences, not one global ordering"],
    ["10", "The receiver reads and verifies memory after observing its receive completion", "receiver-local memory evidence; the sender completion is separate"],
  ] as const;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" data-testid="laboratory-orientation">
      <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
        <h3 className="font-semibold text-slate-100">The real laboratory topology</h3>
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:gap-2 sm:items-stretch">
          {([
            ["SERVER A", "Python program · Sender", rdmaEvidence.hosts.hosta],
            ["SERVER B", "Python program · Receiver", rdmaEvidence.hosts.hostb],
          ] as const).map(([server, program, host]) => (
            <section key={server} className="rounded-xl border border-white/10 bg-slate-900/45 p-1.5 text-center sm:p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{server}</div>
              <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/55 px-1.5 py-1.5 text-xs leading-4 text-slate-200 sm:px-2 sm:text-sm sm:leading-5">{program}</div>
              <div className="py-1 font-mono text-[9px] leading-3.5 text-cyan-200/75 sm:text-[13px] sm:leading-5" aria-hidden="true">↓ uses Python verbs binding</div>
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/7 px-1.5 py-1.5 text-xs text-cyan-100 sm:px-2 sm:text-sm">Pyverbs</div>
              <div className="py-1 font-mono text-[9px] leading-3.5 text-cyan-200/75 sm:text-[13px] sm:leading-5" aria-hidden="true">↓ issues verbs operations</div>
              <div className="rounded-lg border border-orange-300/20 bg-orange-300/7 px-1.5 py-1.5 text-xs text-orange-100 sm:px-2 sm:text-sm">Linux Soft-RoCE</div>
              <div className="mt-2 break-words font-mono text-[9px] leading-3.5 text-slate-400 sm:text-[11px] sm:leading-5">data {host.dataIp}<br />control {host.controlIp}</div>
            </section>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          <div className="rounded-xl border border-orange-300/25 bg-orange-300/7 px-3 py-2 text-center text-xs leading-5 text-orange-100" data-testid="orientation-data-network">
            RDMA data network · {rdmaEvidence.hosts.hosta.dataIp} ⇄ {rdmaEvidence.hosts.hostb.dataIp}<br />
            <span className="text-orange-100/70">carries the real RoCEv2 packets; packet capture records the {rdmaEvidence.source.captureInterface}</span>
          </div>
          <div className="rounded-xl border border-violet-300/25 bg-violet-300/7 px-3 py-2 text-center text-xs leading-5 text-violet-100" data-testid="orientation-control-network">
            TCP control network · {rdmaEvidence.hosts.hosta.controlIp} ⇄ {rdmaEvidence.hosts.hostb.controlIp}<br />
            <span className="text-violet-100/70">{rdmaEvidence.source.controlInterface}; exchanges setup metadata and coordinates the demonstration</span>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">Python is the demonstration application. Pyverbs gives that Python program access to RDMA verbs. Soft-RoCE is the software RDMA implementation used by both servers. Browser buttons replay and inspect this recorded execution; they do not run live RDMA operations.</p>
      </section>

      <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-3">
        <h3 className="font-semibold text-cyan-100">How the real programs prepare the first SEND</h3>
        <ol className="mt-3 grid gap-2 lg:grid-cols-2">
          {preparation.map(([number, action, concept]) => (
            <li key={number} className="rounded-xl border border-white/10 bg-slate-950/50 p-2.5 text-xs leading-5 text-slate-300">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300/15 font-mono text-[10px] text-cyan-100">{number}</span>
              <span className="font-medium text-slate-100">{action}</span>
              <span className="block pl-7 text-[11px] text-slate-500">{concept}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-5 text-slate-500">This is the ordering in the validated SEND/RECEIVE program. The first SEND begins with prepared resources because the application has already performed this preparation; those resources did not appear from nowhere.</p>
      </section>
    </div>
  );
}

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
  const senderCq: CompletionQueueVisualModel = stage >= 8 ? { state: "post-poll" } : { state: "unknown" };
  const receiverCq: CompletionQueueVisualModel = stage >= 8 ? { state: "post-poll" } : { state: "unknown" };
  const senderObserved = stage >= 8 ? [{ id: sendCqe.id, label: `Work Completion · Send · WR ${exactValue(sendCqe.wrId)}`, detail: "retrieved by Server A poll", evidence: "recorded" as const, lifecycle: "polled" as const }] : undefined;
  const receiverObserved = stage >= 8 ? [{ id: recvCqe.id, label: `Work Completion · Receive · WR ${exactValue(recvCqe.wrId)}`, detail: "retrieved by Server B poll", evidence: "recorded" as const, lifecycle: "polled" as const }] : undefined;
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

  const focusTransfer = {
    visible: packetInFlight || ackInFlight || stage === 3,
    direction: packetInFlight ? "a-to-b" as const : ackInFlight ? "b-to-a" as const : stage === 3 ? "both" as const : "none" as const,
    kind: packetInFlight ? "request" as const : ackInFlight ? "acknowledgement" as const : stage === 3 ? "control" as const : "none" as const,
    label: packetInFlight
      ? <span>{sendPacket.opcodeName}<br />payload toward receiver</span>
      : ackInFlight
        ? <span>transport ACK<br />not an application completion</span>
        : stage === 3
          ? <span>TCP readiness coordination<br />no RDMA payload</span>
          : undefined,
  };
  const memoryText = stage >= 9 ? `${receivedText}
[recorded verification]` : stage >= 7 ? `${sendWr.payloadText}
[illustrated placement]` : "waiting";

  return (
    <div className="space-y-3">
      <ExperimentFocusDiagram
        transfer={focusTransfer}
        caption="Compact causal view. Open the technical diagram only when the complete resource relationships are needed."
        a={{
          host: "hosta",
          name: "Server A",
          memoryLabel: "source memory",
          memory: stage >= 4 ? sendWr.payloadText : "source buffer prepared",
          memoryNote: stage >= 4 ? "recorded payload content" : undefined,
          work: stage >= 4 ? [{ title: "Send Queue", label: `WR ${exactValue(sendWr.wrId)} · SEND`, detail: "references source memory", tone: sendLifecycle === "posted" || sendLifecycle === "in-flight" ? "pending" : sendLifecycle === "completed" ? "completed" : "empty" }] : [],
          completion: stage >= 8 ? `send completion observed by Server A · WR ${exactValue(sendCqe.wrId)}` : undefined,
          providerNote: packetInFlight ? "executes SEND" : undefined,
        }}
        b={{
          host: "hostb",
          name: "Server B",
          memoryLabel: "destination memory",
          memory: memoryText,
          memoryNote: stage >= 9 ? "verified after completion" : stage >= 7 ? "placement is causal illustration" : "receiver chooses this destination",
          work: stage >= 2 ? [{ title: "Receive Queue", label: `WR ${exactValue(recvWr.wrId)} · RECEIVE`, detail: "chooses destination memory", tone: receiveLifecycle === "posted" || receiveLifecycle === "in-flight" ? "pending" : receiveLifecycle === "consumed" ? "consumed" : receiveLifecycle === "completed" ? "completed" : "empty" }] : [],
          completion: stage >= 8 ? `receive completion observed by Server B · WR ${exactValue(recvCqe.wrId)}` : undefined,
          providerNote: packetInFlight ? "consumes posted receive" : undefined,
        }}
      />
      {chain.length ? <CodeOperationChain items={chain} /> : null}
      <ExpandableTechnicalDiagram>
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
          observedCompletions: senderObserved,
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
              ? `${sendWr.payloadText}\n[illustrated transport placement]`
              : "destination buffer waiting",
          provider: packetInFlight ? "consumes the SEND using the posted receive" : "Soft-RoCE provider implementing RDMA transport",
          softRoce: true,
          constructedWork: receiveLifecycle === "constructed" ? [receiveWork] : undefined,
          sendQueue: stage >= 2 ? { state: "empty" } : { state: "not-introduced" },
          receiveQueue: stage >= 2 ? queueFor(receiveWork, receiveLifecycle) : { state: "not-introduced" },
          completionQueue: receiverCq,
          observedCompletions: receiverObserved,
          emphasize: stage === 2 ? ["application", "memory"] : stage === 3 ? ["qp"] : packetInFlight ? ["provider", "memory"] : stage === 7 ? ["memory", "qp"] : stage >= 8 ? ["cq"] : [],
        }}
        />
      </ExpandableTechnicalDiagram>
    </div>
  );
}

function MissingReceiveExercise() {
  const [selected, setSelected] = useState<string | null>(null);
  const options = [
    ["posted-receive", "A posted receive buffer on Server B", "Correct. A Reliable Connected SEND needs appropriate receive work at the target. Without it, transport can encounter Receiver Not Ready behaviour and retry or eventually fail according to its configuration."],
    ["sender-packet", "A packet already waiting in the network", "Not correct. The packet is a consequence of executing posted work; it is not the prerequisite that tells Server B where incoming payload may land."],
    ["remote-address", "The sender's knowledge of Server B's virtual address", "Not correct for SEND/RECEIVE. Unlike ordinary WRITE, SEND does not name remote memory directly; the receiver's posted receive work chooses the destination locally."],
  ] as const;
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-4" data-testid="missing-receive-exercise">
      <h3 className="font-semibold text-slate-100">Predict the missing prerequisite</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">Suppose Server A wants to SEND data, but Server B has not provided receive work. Which necessary input is absent?</p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {options.map(([id, label, explanation]) => (
          <button key={id} type="button" onClick={() => setSelected(id)} aria-pressed={selected === id} className={`rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected === id ? id === "posted-receive" ? "border-emerald-300/45 bg-emerald-300/10 text-emerald-100" : "border-amber-300/45 bg-amber-300/10 text-amber-100" : "border-white/10 bg-slate-900/45 text-slate-300 hover:border-white/25"}`}>
            {label}
          </button>
        ))}
      </div>
      {selected ? <p className="mt-3 rounded-lg border border-white/10 bg-slate-950/55 p-2.5 text-xs leading-5 text-slate-300" data-testid="missing-receive-feedback">{options.find(([id]) => id === selected)?.[2]}</p> : null}
      <p className="mt-3 text-xs leading-5 text-slate-500">Conceptual transport explanation. This practical does not fabricate a failed Receiver-Not-Ready reference experiment.</p>
    </section>
  );
}

export function Lesson5SendReceive({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "building-blocks",
      title: "The laboratory runs two cooperating Python programs",
      actionLabel: "Inspect both prepared servers",
      body: (
        <>
          <p>Lessons 1–4 introduced the individual ideas. This lesson puts them together in one executable application: Server A runs a sender and Server B runs a receiver. Both programs prepare RDMA resources before the first SEND is posted.</p>
          <p>The memory-to-memory objective is the same one introduced with HELLO. The experiment uses the genuine recorded payload <span className="font-mono text-cyan-100">{sendWr.payloadText}</span>; we will not substitute illustrative bytes into the captured evidence.</p>
        </>
      ),
      visual: <LaboratoryOrientation />,
      visualFirst: true,
      evidence: <EvidenceNote kind="Evidence boundary">Learner actions control guided replay of recorded execution evidence. They do not execute RDMA operations in the browser or on a live host.</EvidenceNote>,
      inspect: (
        <div className="space-y-4">
          <SourceExcerpt path="python/exp_b_send_recv.py" start={88} end={99} title="Actual preparation order in main()">
            The program opens the device context, discovers its RoCEv2 identity, creates supporting resources, builds memory/QP resources, opens TCP control and exchanges endpoint metadata before any data work.
          </SourceExcerpt>
          <SourceExcerpt path="python/exp_b_send_recv.py" start={50} end={73} title="Resource construction and endpoint transition details">
            The helper registers memory, creates the QP, exchanges endpoint metadata and transitions the endpoint to a ready state. This is the complete-program inspection path for readers who want implementation detail.
          </SourceExcerpt>
        </div>
      ),
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
      mobileVisualFirst: true,
      interaction: <MissingReceiveExercise />,
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
      mobileVisualFirst: true,
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
      mobileVisualFirst: true,
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
      mobileVisualFirst: true,
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
      mobileVisualFirst: true,
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
      mobileVisualFirst: true,
      evidence: <EvidenceNote kind="Captured on the wire">Frame {sendPacket.frameNumber} in {sendPacket.captureFile} is genuine RoCEv2 traffic captured on the data network.</EvidenceNote>,
      inspect: <PacketSummary packet={sendPacket}>The UDP destination port is 4791. SEND does not carry a remote memory address or RKEY because the receive request chooses the destination locally.</PacketSummary>,
    },
    {
      id: "consume-receive",
      title: "The incoming SEND consumes the posted Receive Work Request",
      actionLabel: "Check the completions",
      body: (
        <>
          <p>The receive request now leaves the pending Receive Queue: it has been consumed by the incoming SEND. Server B previously told its RDMA provider where incoming data should go. When the SEND arrives, the provider places the bytes into that buffer.</p>
          <p>This memory placement is an evidence-bounded illustration of transport execution. The application’s verified memory inspection comes later, after completion observation.</p>
        </>
      ),
      visual: visual(7),
      mobileVisualFirst: true,
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
      mobileVisualFirst: true,
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
      mobileVisualFirst: true,
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
      mobileVisualFirst: true,
      evidence: <EvidenceNote kind="Evidence correlation">The exporter correlates the posted SEND, SEND packet and sender completion using operation type, endpoint direction, QPN, PSN and WR ID. The receive completion is independently correlated with Server B’s posted receive by WR ID.</EvidenceNote>,
      inspect: (
        <SourceExcerpt path="python/exp_b_send_recv.py" start={126} end={148} title="The sender half of the real experiment">
          The sender waits for the receiver-ready control message, writes payload bytes into its registered memory, posts the SEND and polls its own completion queue.
        </SourceExcerpt>
      ),
    },
  ];

  return <GuidedLesson lessonId="send-receive" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 6: RDMA WRITE" />;
}
