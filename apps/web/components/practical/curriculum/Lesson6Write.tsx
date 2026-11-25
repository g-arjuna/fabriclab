"use client";

import { useState } from "react";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { CompletionSummary, PacketSummary, PayloadMemory, WorkRequestSummary } from "./operationVisuals";
import { cx, EvidenceNote, exactValue, OperationComparisonTable, SourceExcerpt, TwoServerVisual } from "./visuals";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

const experiment = rdmaEvidence.experiments.find((item) => item.id === "write")!;
const writeWr = experiment.workRequests.find((item) => item.kind === "rdma-write")!;
const writeCqe = experiment.completions[0];
const writePacket = experiment.packets.find((item) => item.role === "request")!;
const ackPacket = experiment.packets.find((item) => item.role === "acknowledgement")!;
const targetMemory = experiment.memoryRegions.find((item) => item.host === "hostb")!;
const beforeText = targetMemory.snapshots.find((item) => item.id.includes("before"))?.text;
const afterText = targetMemory.snapshots.find((item) => item.id.includes("after"))?.text;

function visual(stage: number) {
  const shared = stage >= 2;
  const posted = stage >= 4;
  const packetOnWire = stage === 5;
  const memoryChanged = stage >= 6;
  const completed = stage >= 7;
  return (
    <TwoServerVisual
      caption="Guided replay of the validated ordinary RDMA WRITE reference execution. Target memory bytes were recorded later in the execution; the memory-change state is a validated causal reconstruction, not an independently timestamped wire snapshot. Browser actions do not execute live RDMA."
      transfer={{
        active: stage === 2 || packetOnWire || stage === 7 || stage === 9,
        direction: packetOnWire || stage === 9 ? "a-to-b" : stage === 2 || stage === 7 ? "b-to-a" : "none",
        packet: packetOnWire ? <span>{writePacket.opcodeName}<br />dest QPN {exactValue(writePacket.destinationQpn)} · PSN {exactValue(writePacket.psn)}<br />remote address {exactValue(writePacket.reth?.virtualAddress)} · RKEY {exactValue(writePacket.reth?.rkey)}</span> : stage === 7 ? <span>transport ACK toward writer QPN {exactValue(ackPacket.destinationQpn)}</span> : stage === 2 ? <span>TCP control channel: metadata only</span> : stage === 9 ? <span>TCP synchronization after writer completion<br />no payload bytes</span> : undefined,
        label: packetOnWire ? "WRITE request names remote memory directly" : stage === 2 ? "The target shares address, length and RKEY before the operation" : stage === 9 ? "Synchronization tells the target when it may inspect memory" : "No target Receive Work Request is armed",
      }}
      a={{
        emphasis: stage === 3 ? ["application", "memory"] : stage === 4 ? ["application", "os"] : packetOnWire ? ["nic"] : completed ? ["os"] : [],
        application: stage >= 3 ? "writer constructs one ordinary RDMA WRITE request" : "writer application",
        memory: stage >= 3 ? writeWr.payloadText : "source buffer",
        memoryTone: stage >= 3 ? "source" : "ready",
        os: "writer endpoint and Completion Queue",
        nic: packetOnWire ? "executes the posted WRITE" : "writer RDMA device",
        queues: stage >= 3 ? {
          label: `Writer QP ${exactValue(experiment.endpoints.initiator.qpn)}`,
          send: posted ? [`WR ${exactValue(writeWr.wrId)} · RDMA WRITE`] : [],
          receive: [],
          completion: completed ? [`CQE · RDMA write · ${exactValue(writeCqe.wrId)}`] : [],
        } : undefined,
      }}
      b={{
        emphasis: stage === 1 ? ["memory"] : stage === 2 ? ["memory", "application"] : packetOnWire ? ["nic", "memory"] : stage === 6 ? ["memory"] : stage >= 8 ? ["os"] : [],
        application: stage >= 9 ? "target uses explicit synchronization before verifying memory" : stage >= 3 ? "target application does not post a receive for ordinary WRITE" : "target application",
        memory: memoryChanged ? afterText : stage >= 1 ? beforeText : "registered destination memory not yet inspected",
        memoryTone: memoryChanged ? "changed" : "locked",
        os: shared ? "remote-writable memory metadata has been shared" : "target endpoint and Completion Queue",
        nic: packetOnWire ? "transport writes the permitted registered memory" : "target RDMA device",
        queues: stage >= 3 ? {
          label: `Target QP ${exactValue(experiment.endpoints.responder.qpn)}`,
          send: [],
          receive: [],
          completion: stage >= 9 ? [] : undefined,
        } : undefined,
      }}
    />
  );
}

export function Lesson6Write({ onComplete }: { onComplete: () => void }) {
  const [prediction, setPrediction] = useState<"yes" | "no" | null>(null);

  const predictionInteraction = (
    <section className="rounded-2xl border border-white/10 bg-slate-950/55 p-4" data-testid="write-completion-prediction">
      <h3 className="font-semibold text-slate-100">Predict before inspecting the evidence</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">Will Server B receive a normal receive completion when Server A performs this ordinary RDMA WRITE?</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {([
          ["yes", "Yes — a normal receive completion appears"],
          ["no", "No — ordinary WRITE produces none"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPrediction(value)}
            aria-pressed={prediction === value}
            className={cx(
              "rounded-full border px-4 py-2.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              prediction === value ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100" : "border-white/10 text-slate-300 hover:border-white/25 hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {prediction ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-slate-900/70 p-3 text-sm leading-6 text-slate-300" data-testid="write-prediction-result">
          {prediction === "no"
            ? "Correct prediction for an ordinary WRITE: the target does not consume a receive Work Request and does not receive a normal receive CQE. Inspect the recorded target CQ evidence to confirm it."
            : "That is a reasonable inference from SEND/RECEIVE, but ordinary WRITE has different target-side semantics: it does not consume a receive Work Request and does not produce a normal receive CQE. Inspect the recorded target CQ evidence."}
        </p>
      ) : null}
    </section>
  );

  const steps: GuidedStep[] = [
    {
      id: "recall-send-receive",
      title: "WRITE answers the question raised by SEND/RECEIVE",
      actionLabel: "Inspect Server B’s registered destination memory",
      body: (
        <>
          <p>In SEND/RECEIVE, Server B had to post a receive request before Server A’s message could be placed. That gives the receiver control over the destination, but it also means the target must participate in every incoming message transfer.</p>
          <p>Ordinary RDMA WRITE is the one-sided answer: the initiator names registered remote memory directly, using authorization established beforehand.</p>
        </>
      ),
      visual: visual(0),
    },
    {
      id: "target-memory",
      title: "The destination is a registered region with a recorded before-state",
      actionLabel: "Share the remote address and key",
      body: (
        <>
          <p>Server B owns the destination memory. In the reference run it fills the beginning of the region with dots so the later mutation is visible. The memory is registered with remote-write permission; without that permission, a remote WRITE must not be allowed.</p>
          <p>The important security boundary from Lesson 3 still applies. Ordinary WRITE does not bypass registration or permissions; it depends on them.</p>
        </>
      ),
      visual: visual(1),
      evidence: <EvidenceNote kind="Verified through application memory inspection">The target application recorded the before-state bytes shown in the diagram. The address and key are run-specific evidence values, not reusable constants.</EvidenceNote>,
      inspect: <PayloadMemory label="Recorded target memory before WRITE" value={beforeText} />,
    },
    {
      id: "share-rkey",
      title: "Server A learns exactly which remote region it may write",
      actionLabel: "Construct the WRITE Work Request",
      body: (
        <>
          <p>The target shares its registered memory address, length and RKEY through the laboratory’s TCP control channel. This is application/control setup, not the RDMA payload path.</p>
          <p>The RKEY is the scoped authorization value associated with that registered region. It is neither encryption nor general server authentication. It does not authorize access to unrelated memory.</p>
        </>
      ),
      visual: visual(2),
      inspect: (
        <SourceExcerpt path="python/exp_c_write.py" start={57} end={69} title="The target shares memory metadata over TCP">
          The TCP control message carries the target's RKEY, memory address and length as metadata. The actual payload will later cross the RDMA data network in a WRITE packet.
        </SourceExcerpt>
      ),
    },
    {
      id: "construct-write",
      title: "The WRITE Work Request names local source memory and remote destination memory",
      actionLabel: "Submit the WRITE without a target receive",
      body: (
        <>
          <p>Server A writes the payload into its local registered source buffer. The WRITE Work Request has two memory relationships: the local source buffer uses the local address and LKEY; the remote destination uses the target’s shared address and RKEY.</p>
          <p>This remote addressing is what makes the operation one-sided. Server B does not need to post a Receive Work Request describing where this WRITE lands, because the initiator has already named the destination region.</p>
        </>
      ),
      visual: visual(3),
      inspect: (
        <div className="space-y-4">
          <WorkRequestSummary request={writeWr} title="Recorded RDMA WRITE Work Request" />
          <SourceExcerpt path="python/exp_c_write.py" start={119} end={136} title="Constructing the real WRITE request">
            <code className="font-mono text-cyan-100">set_wr_rdma(rkey=peer["rkey"], addr=peer["addr"])</code> attaches the remote memory description to the WRITE request.
          </SourceExcerpt>
        </div>
      ),
    },
    {
      id: "submit-write",
      title: "The target Receive Queue remains empty",
      actionLabel: "Inspect the real WRITE packet",
      body: (
        <>
          <p>Server A posts the WRITE to its Send Queue. Server B’s Receive Queue is deliberately empty. For an ordinary RDMA WRITE, no target receive request is consumed because the remote address and RKEY already describe the memory placement.</p>
          <p>Posting the WRITE is still only the application’s instruction. The packet evidence comes next.</p>
        </>
      ),
      visual: visual(4),
      evidence: <EvidenceNote kind="Programming-model distinction">“No receive WR required” is not an implementation accident. It is the defining target-side difference of ordinary one-sided WRITE compared with SEND/RECEIVE.</EvidenceNote>,
      inspect: (
        <SourceExcerpt path="python/exp_c_write.py" start={126} end={139} title="Posting the ordinary WRITE">
          The SEND queue is used because Server A initiates work. That does not make the operation two-sided SEND/RECEIVE; the opcode is RDMA_WRITE.
        </SourceExcerpt>
      ),
    },
    {
      id: "write-packet",
      title: "The captured WRITE packet carries remote-memory instructions in RETH",
      actionLabel: "Observe the destination memory evidence",
      body: (
        <>
          <p>The genuine WRITE Only packet travels from {writePacket.sourceIp} to {writePacket.destinationIp}. Its destination QPN is {exactValue(writePacket.destinationQpn)}, the target endpoint. Because it is a WRITE request, it contains an RDMA Extended Transport Header: remote virtual address {exactValue(writePacket.reth?.virtualAddress)}, RKEY {exactValue(writePacket.reth?.rkey)} and DMA length {exactValue(writePacket.reth?.dmaLength, "decimal")} bytes.</p>
          <p>Those packet fields correlate with the target’s registered memory metadata and the constructed Work Request.</p>
        </>
      ),
      visual: visual(5),
      evidence: <EvidenceNote kind="Captured on the wire">Frame {writePacket.frameNumber} in {writePacket.captureFile} is the genuine WRITE request. SEND, ACK and READ-response packets do not all contain this header; header presence depends on the operation.</EvidenceNote>,
      inspect: <PacketSummary packet={writePacket}>The RETH exists because this packet is an RDMA WRITE request. It is the wire representation of the remote memory portion of the Work Request.</PacketSummary>,
    },
    {
      id: "memory-after",
      title: "The target memory changes without a target receive request",
      actionLabel: "Inspect the initiator completion",
      body: (
        <>
          <p>The verified destination memory later begins with <span className="font-mono text-emerald-100">{afterText}</span>. No target Receive Work Request was posted for this transfer.</p>
          <p>Be precise about evidence: the WRITE packet and RETH establish the transport-causal memory placement, while the after-bytes were recorded when the target application later inspected memory. The display combines those validated facts but does not pretend the memory inspection happened exactly at packet time.</p>
        </>
      ),
      visual: visual(6),
      evidence: <EvidenceNote kind="Derived from a validated relationship + later memory evidence">The memory placement is derived from the captured WRITE semantics and correlated RETH; the bytes themselves are application memory evidence recorded later in the reference execution.</EvidenceNote>,
      inspect: <PayloadMemory label="Recorded target memory after synchronization" value={afterText} />,
    },
    {
      id: "initiator-completion",
      title: "The writer observes a successful local completion",
      actionLabel: "Predict the target completion result",
      body: (
        <>
          <p>Server A polls its own Completion Queue and observes a successful RDMA write completion for WR ID {exactValue(writeCqe.wrId)}. The reverse ACK is transport evidence correlated with that reliable operation.</p>
          <p>The successful initiator completion tells the writer that its signalled WRITE operation completed successfully. It does not mean Server B’s application has noticed the data, and it does not create a normal receive completion on Server B.</p>
        </>
      ),
      visual: visual(7),
      inspect: (
        <div className="space-y-4">
          <CompletionSummary completion={writeCqe} title="Writer-local completion" />
          <PacketSummary packet={ackPacket}>The ACK travels toward writer endpoint QPN {exactValue(ackPacket.destinationQpn)}. It does not carry payload and is not a Completion Queue Entry.</PacketSummary>
        </div>
      ),
    },
    {
      id: "predict-target-cqe",
      title: "Predict what appears in Server B’s Completion Queue",
      actionLabel: "Inspect the target completion evidence",
      body: (
        <>
          <p>Before revealing the target CQ result, use the mechanism rather than guessing from the word “write.” Server B did not post a receive request. The WRITE payload was placed directly in registered memory. Should the target receive the same kind of normal receive completion it received in SEND/RECEIVE?</p>
        </>
      ),
      visual: visual(8),
      interaction: predictionInteraction,
      canAdvance: prediction !== null,
      advanceBlockedReason: "Make a prediction before inspecting the evidence.",
    },
    {
      id: "target-cq-empty",
      title: "The target Completion Queue is empty for ordinary WRITE",
      actionLabel: "Compare SEND/RECEIVE and ordinary WRITE",
      body: (
        <>
          <p>The reference target explicitly polled its Completion Queue after synchronization and recorded zero completions. That is the expected result for this ordinary WRITE.</p>
          <p>Keep these facts separate: target memory placement happened; a transport acknowledgement returned; the initiating writer observed a successful signalled completion; no normal target receive CQE exists; the target application still needs explicit synchronization before it knows when to interpret the memory.</p>
          <p>The TCP control message in this demonstration provides that synchronization. It does not carry the RDMA payload and does not cause the memory placement. WRITE with immediate data is a different operation: it can consume a posted receive and generate a receive completion containing immediate data, but that is outside this experiment.</p>
        </>
      ),
      visual: visual(9),
      evidence: <EvidenceNote kind="Recorded application event">The target application logged a CQ poll count of zero and then verified memory after receiving the writer’s explicit synchronization signal.</EvidenceNote>,
      inspect: (
        <SourceExcerpt path="python/exp_c_write.py" start={152} end={176} title="Synchronization, empty target CQ and memory verification">
          The source shows the ordering explicitly: the target waits for a control signal, polls its CQ, expects zero entries, then inspects memory. This preserves the ordinary-WRITE completion semantics.
        </SourceExcerpt>
      ),
    },
    {
      id: "write-comparison",
      title: "SEND/RECEIVE and ordinary WRITE solve different coordination problems",
      actionLabel: "Continue: how does RDMA READ work?",
      body: (
        <>
          <p>SEND/RECEIVE lets the receiver choose the destination by posting a receive. Ordinary WRITE lets the initiator place data into a known registered remote region without target receive involvement. Both are useful; they encode different assumptions about which endpoint knows the destination and when the target application participates.</p>
        </>
      ),
      visual: <OperationComparisonTable includeRead={false} />,
    },
  ];

  return <GuidedLesson lessonId="write" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 7: RDMA READ" />;
}
