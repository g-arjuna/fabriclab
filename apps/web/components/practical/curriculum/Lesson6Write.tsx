"use client";

import { useEffect, useState } from "react";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { CompletionSummary, PacketSummary, PayloadMemory, WorkRequestSummary } from "./operationVisuals";
import { CodeOperationChain, RdmaSystemDiagram, type CompletionQueueVisualModel, type QueueVisualModel, type WorkVisual } from "./rdmaDiagrams";
import { cx, EvidenceNote, exactValue, OperationComparisonTable, SourceExcerpt } from "./visuals";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

const experiment = rdmaEvidence.experiments.find((item) => item.id === "write")!;
const writeWr = experiment.workRequests.find((item) => item.kind === "rdma-write")!;
const writeCqe = experiment.completions[0];
const writePacket = experiment.packets.find((item) => item.role === "request")!;
const ackPacket = experiment.packets.find((item) => item.role === "acknowledgement")!;
const targetMemory = experiment.memoryRegions.find((item) => item.host === "hostb")!;
const beforeText = targetMemory.snapshots.find((item) => item.id.includes("before"))?.text;
const afterText = targetMemory.snapshots.find((item) => item.id.includes("after"))?.text;
const PREDICTION_KEY = "fabriclab.rdma.lesson.write.prediction";

function lifecycleForWrite(stage: number): WorkVisual["lifecycle"] {
  if (stage === 3) return "constructed";
  if (stage === 4) return "posted";
  if (stage === 5 || stage === 6) return "in-flight";
  if (stage >= 7) return "completed";
  return "not-created";
}

function queueFor(entry: WorkVisual, lifecycle: WorkVisual["lifecycle"]): QueueVisualModel {
  if (lifecycle === "not-created" || lifecycle === "constructed") return { state: "empty" };
  if (lifecycle === "posted" || lifecycle === "in-flight") return { state: "occupied", entries: [entry] };
  return { state: "empty", entries: [entry] };
}

function visual(stage: number) {
  const writeLifecycle = lifecycleForWrite(stage);
  const writeWork: WorkVisual = {
    id: writeWr.id,
    label: `WR ${exactValue(writeWr.wrId)} · RDMA WRITE`,
    detail: `${writeWr.byteLength} bytes · local source + remote destination`,
    lifecycle: writeLifecycle,
  };
  const writerCq: CompletionQueueVisualModel = stage >= 7
    ? { state: "occupied", entries: [{ id: writeCqe.id, label: `CQE · RDMA write · WR ${exactValue(writeCqe.wrId)}`, detail: "polled by Server A", evidence: "recorded" }] }
    : { state: "unknown" };
  const targetCq: CompletionQueueVisualModel = stage >= 10 ? { state: "empty" } : { state: "unknown" };
  const packetInFlight = stage === 5;
  const ackInFlight = stage === 6;
  const controlVisible = stage === 2 || stage === 9;
  const chain = stage === 4
    ? [{ path: "python/exp_c_write.py", line: 134, effect: "posts the ordinary WRITE into Server A’s Send Queue" }]
    : stage === 7
      ? [{ path: "python/exp_c_write.py", line: 140, effect: "Server A polls and observes the writer-local completion" }]
      : stage === 10
        ? [{ path: "python/exp_c_write.py", line: 161, effect: "Server B polls its target CQ after synchronization and observes zero entries" }]
        : stage === 11
          ? [{ path: "python/exp_c_write.py", line: 165, effect: "Server B reads its memory after the empty target-CQ observation" }]
          : [];

  return (
    <div className="space-y-3">
      {chain.length ? <CodeOperationChain items={chain} /> : null}
      <RdmaSystemDiagram
        caption="Guided replay of the validated ordinary RDMA WRITE reference execution. Queue lifecycle is a logical instructional reconstruction tied to application events; intermediate memory placement is causal illustration, while before/after bytes are recorded memory evidence."
        transfer={{
          visible: packetInFlight || ackInFlight || controlVisible,
          direction: packetInFlight || stage === 9 ? "a-to-b" : ackInFlight || stage === 2 ? "b-to-a" : "none",
          kind: packetInFlight ? "request" : ackInFlight ? "acknowledgement" : controlVisible ? "control" : "none",
          label: packetInFlight
            ? <span>{writePacket.opcodeName}<br />dest QPN {exactValue(writePacket.destinationQpn)} · PSN {exactValue(writePacket.psn)}<br />remote address + RKEY in RETH</span>
            : ackInFlight
              ? <span>transport ACK toward writer QPN {exactValue(ackPacket.destinationQpn)}</span>
              : stage === 2
                ? <span>TCP control channel: memory metadata only</span>
                : stage === 9
                  ? <span>TCP synchronization after writer completion<br />no payload bytes</span>
                  : undefined,
          detail: packetInFlight
            ? "WRITE request names remote memory directly."
            : ackInFlight
              ? "Memory placement is causally illustrated while the reverse ACK is in transit; the ACK is not a target application completion."
              : stage === 2
                ? "The target shares address, length and RKEY before the operation."
                : stage === 9
                  ? "Synchronization tells the target when it may inspect memory."
                  : stage === 10
                    ? "The WRITE/ACK exchange and synchronization have already occurred; the target CQ observation is now inspected."
                    : stage >= 11
                      ? "The target CQ observation is complete; the separately recorded memory verification is now inspected."
                      : stage === 7
                      ? "The WRITE/ACK exchange has completed; the initiator-local completion is now being inspected."
                      : stage === 8
                        ? "No additional target-side traffic is implied while the target completion behavior is predicted."
                        : "No target Receive Work Request is armed.",
        }}
        a={{
          host: "hosta",
          name: "Server A",
          role: "writer / initiator",
          qpn: exactValue(experiment.endpoints.initiator.qpn),
          application: stage >= 3 ? "writer constructs one ordinary RDMA WRITE request" : "writer application",
          memory: stage >= 3 ? writeWr.payloadText : "source buffer",
          provider: packetInFlight ? "executes the posted WRITE" : "Soft-RoCE provider implementing RDMA transport",
          softRoce: true,
          constructedWork: writeLifecycle === "constructed" ? [writeWork] : undefined,
          sendQueue: stage >= 3 ? queueFor(writeWork, writeLifecycle) : { state: "not-introduced" },
          receiveQueue: stage >= 3 ? { state: "empty" } : { state: "not-introduced" },
          completionQueue: writerCq,
          emphasize: stage === 3 ? ["application", "memory"] : stage === 4 ? ["application", "qp"] : packetInFlight ? ["provider"] : stage >= 7 ? ["cq"] : [],
        }}
        b={{
          host: "hostb",
          name: "Server B",
          role: "target",
          qpn: exactValue(experiment.endpoints.responder.qpn),
          application: stage >= 11 ? "target verifies memory after the empty CQ observation" : stage === 10 ? "target polls its Completion Queue after synchronization" : stage >= 9 ? "target uses explicit synchronization before polling and verifying memory" : stage >= 3 ? "target application does not post a receive for ordinary WRITE" : "target application",
          memory: stage >= 11
            ? `${afterText}\n[recorded memory verification after synchronization]`
            : stage >= 6
              ? `${writeWr.payloadText}\n[causal memory-placement illustration]`
              : stage >= 1
                ? `${beforeText}\n[recorded before-state]`
                : "registered destination memory not yet inspected",
          provider: packetInFlight ? "transport writes the permitted registered memory" : "Soft-RoCE provider implementing RDMA transport",
          softRoce: true,
          sendQueue: stage >= 3 ? { state: "empty" } : { state: "not-introduced" },
          receiveQueue: stage >= 3 ? { state: "empty" } : { state: "not-introduced" },
          completionQueue: targetCq,
          emphasize: stage === 1 ? ["memory"] : stage === 2 ? ["memory", "application"] : packetInFlight ? ["provider", "memory"] : stage === 6 ? ["memory"] : stage === 10 ? ["cq"] : stage >= 11 ? ["memory", "application"] : stage >= 9 ? ["cq", "application"] : [],
        }}
      />
    </div>
  );
}

export function Lesson6Write({ onComplete }: { onComplete: () => void }) {
  const [prediction, setPrediction] = useState<"yes" | "no" | null>(null);
  const [predictionHydrated, setPredictionHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PREDICTION_KEY);
      if (stored === "yes" || stored === "no") setPrediction(stored);
    } catch {
      // Prediction persistence is optional.
    }
    setPredictionHydrated(true);
  }, []);

  useEffect(() => {
    if (!predictionHydrated || !prediction) return;
    try {
      window.localStorage.setItem(PREDICTION_KEY, prediction);
    } catch {
      // Ignore storage failures.
    }
  }, [prediction, predictionHydrated]);

  const predictionInteraction = (
    <section className="rounded-xl border border-white/10 bg-slate-950/55 p-4" data-testid="write-completion-prediction">
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
              "rounded-full border px-4 py-2.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none",
              prediction === value ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100" : "border-white/10 text-slate-300 hover:border-white/25 hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {prediction ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-slate-900/70 p-3 text-sm leading-6 text-slate-300" data-testid="write-prediction-result">
          Prediction recorded. The answer is intentionally not revealed yet; inspect the target Completion Queue evidence next.
        </p>
      ) : null}
    </section>
  );

  const predictionReview = prediction ? (
    <section className="rounded-xl border border-white/10 bg-slate-950/55 p-4" data-testid="write-prediction-review">
      <h3 className="font-semibold text-slate-100">Compare your prediction with the evidence</h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        You predicted {prediction === "yes" ? "that a normal receive completion would appear" : "that ordinary WRITE would produce no normal receive completion"}. The recorded target CQ poll returned zero completions, so {prediction === "no" ? "your prediction matches the evidence." : "the evidence contradicts that prediction."} The mechanism explains why: ordinary WRITE did not consume a target Receive Work Request, so there was no receive work for which to generate a normal target receive completion.
      </p>
    </section>
  ) : null;

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
          <p>Ordinary WRITE does not bypass registration or permissions; it depends on them.</p>
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
          <p>The RKEY is the scoped authorization value associated with that registered region. It is neither encryption nor general server authentication.</p>
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
          <p>This remote addressing is what makes the operation one-sided. Server B does not need to post a Receive Work Request describing where this WRITE lands.</p>
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
      title: "The writer queue is pending while the target Receive Queue remains empty",
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
      actionLabel: "Observe causal memory placement",
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
      id: "memory-placement",
      title: "Target memory placement is separate from target application observation",
      actionLabel: "Inspect the initiator completion",
      body: (
        <>
          <p>The target transport can place payload bytes directly into the registered memory named by RETH. No target Receive Work Request participates in that placement.</p>
          <p>The diagram labels this as a causal memory-placement illustration. The actual target application did not independently inspect memory at the packet instant; its verified memory evidence is recorded later after synchronization.</p>
        </>
      ),
      visual: visual(6),
      evidence: <EvidenceNote kind="Derived from a validated relationship">Memory placement is derived from captured WRITE semantics and correlated RETH. Do not confuse it with the later application memory inspection.</EvidenceNote>,
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
      actionLabel: "Inspect synchronization before the target poll",
      body: (
        <>
          <p>Before revealing the target CQ result, use the mechanism rather than guessing from the word “write.” Server B did not post a receive request. The WRITE payload was placed directly in registered memory.</p>
          <p>The target Completion Queue is deliberately shown as <em>not yet inspected</em>, not as empty. Unknown and empty are different states.</p>
        </>
      ),
      visual: visual(8),
      interaction: predictionInteraction,
      canAdvance: prediction !== null,
      advanceBlockedReason: "Make a prediction before inspecting the evidence.",
    },
    {
      id: "target-synchronization",
      title: "The writer explicitly tells the target when inspection is meaningful",
      actionLabel: "Inspect the target completion evidence",
      body: (
        <>
          <p>After the writer observes completion, it sends a small TCP synchronization message in the demonstration. That message does not carry the RDMA payload and does not cause its placement.</p>
          <p>It solves a different problem: application-level timing. Server B now knows when interpreting the memory is meaningful.</p>
        </>
      ),
      visual: visual(9),
      evidence: <EvidenceNote kind="Control-channel evidence">The synchronization message is TCP control/application coordination. It is separate from the RDMA payload path.</EvidenceNote>,
    },
    {
      id: "target-cq-empty",
      title: "The target Completion Queue is observed empty",
      actionLabel: "Verify target memory afterward",
      body: (
        <>
          <p>The reference target explicitly polled its Completion Queue after synchronization and recorded zero completions. This is the answer to the prediction: ordinary WRITE generated no normal target receive completion in this experiment; no normal target receive CQE exists.</p>
          <p>Do not collapse the events together: payload placement and transport completion have already occurred, but the target application has not yet verified memory in the visual sequence. WRITE with immediate data is a different operation outside this experiment.</p>
        </>
      ),
      visual: visual(10),
      interaction: predictionReview,
      evidence: <EvidenceNote kind="Recorded application event">The target application logged a CQ poll count of zero after receiving the writer’s explicit synchronization signal.</EvidenceNote>,
      inspect: (
        <SourceExcerpt path="python/exp_c_write.py" start={152} end={163} title="Synchronization and empty target CQ observation">
          The source shows the target waiting for a control signal, polling its CQ once and recording zero entries before memory verification.
        </SourceExcerpt>
      ),
    },
    {
      id: "target-memory-verified",
      title: "Only afterward does the target verify memory",
      actionLabel: "Compare SEND/RECEIVE and ordinary WRITE",
      body: (
        <>
          <p>After the empty target-CQ observation, Server B reads its registered buffer and verifies the payload. The verified destination memory begins with <span className="font-mono text-emerald-100">{afterText}</span>.</p>
          <p>The ordering matters: causal memory placement, initiator completion, explicit synchronization, target CQ observation and application memory verification are related but distinct events.</p>
        </>
      ),
      visual: visual(11),
      evidence: <EvidenceNote kind="Verified through application memory inspection">The recorded target memory evidence is inspected after the empty CQ observation, not presented as a simultaneous pre-completion observation.</EvidenceNote>,
      inspect: (
        <SourceExcerpt path="python/exp_c_write.py" start={165} end={176} title="Memory verification follows the target CQ observation">
          The application reads the completed byte length from its buffer, compares it with the expected payload and logs the combined verification result.
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
