"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { CompletionSummary, PacketSummary, PayloadMemory, WorkRequestSummary } from "./operationVisuals";
import { CodeOperationChain, RdmaSystemDiagram, type CompletionQueueVisualModel, type QueueVisualModel, type WorkVisual } from "./rdmaDiagrams";
import { EvidenceNote, exactValue, OperationComparisonTable, SourceExcerpt } from "./visuals";
import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";

const experiment = rdmaEvidence.experiments.find((item) => item.id === "read")!;
const readWr = experiment.workRequests.find((item) => item.kind === "rdma-read")!;
const readCqe = experiment.completions[0];
const readRequest = experiment.packets.find((item) => item.role === "request")!;
const readResponse = experiment.packets.find((item) => item.role === "response")!;
const localMemory = experiment.memoryRegions.find((item) => item.host === "hosta")!;
const remoteMemory = experiment.memoryRegions.find((item) => item.host === "hostb")!;
const localAfter = localMemory.snapshots.find((item) => item.id.includes("read-result"))?.text;
const remoteBefore = remoteMemory.snapshots.find((item) => item.id.includes("before"))?.text;

function lifecycleForRead(stage: number): WorkVisual["lifecycle"] {
  if (stage === 3) return "constructed";
  if (stage === 4) return "posted";
  if (stage >= 5 && stage <= 7) return "in-flight";
  if (stage >= 8) return "completed";
  return "not-created";
}

function queueFor(entry: WorkVisual, lifecycle: WorkVisual["lifecycle"]): QueueVisualModel {
  if (lifecycle === "not-created" || lifecycle === "constructed") return { state: "empty" };
  if (lifecycle === "posted" || lifecycle === "in-flight") return { state: "occupied", entries: [entry] };
  return { state: "empty", entries: [entry] };
}

function visual(stage: number) {
  const readLifecycle = lifecycleForRead(stage);
  const readWork: WorkVisual = {
    id: readWr.id,
    label: `WR ${exactValue(readWr.wrId)} · RDMA READ`,
    detail: `${readWr.byteLength} bytes · remote source into local destination`,
    lifecycle: readLifecycle,
  };
  const readerCq: CompletionQueueVisualModel = stage >= 8
    ? { state: "occupied", entries: [{ id: readCqe.id, label: `CQE · RDMA read · WR ${exactValue(readCqe.wrId)}`, detail: "polled by Server A", evidence: "recorded" }] }
    : { state: "unknown" };
  const sourceCq: CompletionQueueVisualModel = stage >= 8 ? { state: "empty" } : { state: "unknown" };
  const requestInFlight = stage === 5;
  const responseInFlight = stage === 6;
  const chain = stage === 4
    ? [{ path: "python/exp_d_read.py", line: 120, effect: "posts the READ request into Server A’s Send Queue even though payload will return inward" }]
    : stage === 8
      ? [{ path: "python/exp_d_read.py", line: 126, effect: "Server A polls and observes the reader-local completion" }]
      : [];

  return (
    <div className="space-y-3">
      {chain.length ? <CodeOperationChain items={chain} /> : null}
      <RdmaSystemDiagram
        caption="Guided replay of the validated RDMA READ reference execution. The request travels from reader to source; the payload response travels back from source to reader. Queue lifecycle is a logical instructional reconstruction tied to recorded events."
        transfer={{
          visible: requestInFlight || responseInFlight || stage === 2,
          direction: requestInFlight ? "a-to-b" : responseInFlight || stage === 2 ? "b-to-a" : "none",
          kind: requestInFlight ? "request" : responseInFlight ? "response" : stage === 2 ? "control" : "none",
          label: requestInFlight
            ? <span>{readRequest.opcodeName}<br />request only · no payload data</span>
            : responseInFlight
              ? <span>{readResponse.opcodeName}<br />payload returns to reader</span>
              : stage === 2
                ? <span>TCP control channel: remote address + RKEY metadata</span>
                : undefined,
          detail: requestInFlight
            ? "Request direction: reader asks source transport for memory."
            : responseInFlight
              ? "Payload direction: source memory returns to reader memory."
              : stage === 2
                ? "The reader learns which remote region it may read."
                : stage >= 8
                  ? "The READ request/response exchange has completed; the learner is inspecting application completion and memory evidence."
                  : stage === 7
                    ? "The response has arrived; local memory placement is causally illustrated before completion inspection."
                    : "READ reverses the data-availability problem.",
        }}
        a={{
          host: "hosta",
          name: "Server A",
          role: "reader / initiator",
          qpn: exactValue(experiment.endpoints.initiator.qpn),
          application: stage >= 3 ? "reader initiates the operation" : "reader application",
          memory: stage >= 9
            ? `${localAfter}\n[recorded memory verification after completion]`
            : stage >= 7
              ? `${remoteBefore?.split("#")[0] || "remote data"}\n[causal memory-placement illustration]`
              : "local destination buffer waiting",
          provider: requestInFlight ? "emits READ request" : responseInFlight ? "places response bytes into local memory" : "Soft-RoCE provider implementing RDMA transport",
          softRoce: true,
          constructedWork: readLifecycle === "constructed" ? [readWork] : undefined,
          sendQueue: stage >= 3 ? queueFor(readWork, readLifecycle) : { state: "not-introduced" },
          receiveQueue: stage >= 3 ? { state: "empty" } : { state: "not-introduced" },
          completionQueue: readerCq,
          emphasize: stage === 1 ? ["memory"] : stage === 3 ? ["application", "memory"] : stage === 4 ? ["application", "qp"] : requestInFlight ? ["provider"] : responseInFlight ? ["provider", "memory"] : stage >= 8 ? ["cq"] : [],
        }}
        b={{
          host: "hostb",
          name: "Server B",
          role: "source / responder",
          qpn: exactValue(experiment.endpoints.responder.qpn),
          application: stage >= 4 ? "source application owns the data but posts no data Work Request for this READ" : "source application owns the data",
          memory: stage >= 2 ? `${remoteBefore}\n[recorded remote source memory]` : "registered source memory not yet inspected",
          provider: requestInFlight ? "receives the READ request" : responseInFlight ? "returns memory contents in a READ response" : "Soft-RoCE provider implementing RDMA transport",
          softRoce: true,
          sendQueue: stage >= 3 ? { state: "empty" } : { state: "not-introduced" },
          receiveQueue: stage >= 3 ? { state: "empty" } : { state: "not-introduced" },
          completionQueue: sourceCq,
          emphasize: stage === 1 || stage === 2 ? ["memory"] : requestInFlight ? ["provider", "memory"] : responseInFlight ? ["provider", "memory"] : [],
        }}
      />
    </div>
  );
}

export function Lesson7Read({ onComplete }: { onComplete: () => void }) {
  const steps: GuidedStep[] = [
    {
      id: "reverse-problem",
      title: "READ reverses where the data already lives",
      actionLabel: "Prepare the local destination buffer",
      body: (
        <>
          <p>Until now, Server A has been transferring its data to Server B. What if Server B already holds the data that Server A needs?</p>
          <p>RDMA READ lets Server A initiate a transfer whose payload moves in the opposite direction: out of Server B’s registered memory and into Server A’s local destination buffer. Initiating a request and being the source of its data are separate roles.</p>
        </>
      ),
      visual: visual(0),
    },
    {
      id: "local-destination",
      title: "The reader first prepares local destination memory",
      actionLabel: "Identify the remote memory and permission",
      body: (
        <>
          <p>Server A needs somewhere for the requested bytes to land. It registers a local destination buffer and uses that buffer’s address, length and LKEY in the local part of the READ Work Request.</p>
          <p>This local memory description is necessary even though the payload currently resides on Server B.</p>
        </>
      ),
      visual: visual(1),
    },
    {
      id: "remote-permission",
      title: "The remote source memory must be readable and identifiable",
      actionLabel: "Construct the READ Work Request",
      body: (
        <>
          <p>Server B shares the address, length and RKEY for the registered memory that may be read. The permission model is the same one established in Lesson 3: remote read must be explicitly permitted.</p>
          <p>The RKEY scopes access to the registered region. It is not a general credential and it does not reveal unrelated memory.</p>
        </>
      ),
      visual: visual(2),
      inspect: <PayloadMemory label="Recorded remote source memory before READ" value={remoteBefore} />,
    },
    {
      id: "construct-read",
      title: "The READ Work Request points in two directions at once",
      actionLabel: "Submit the READ request",
      body: (
        <>
          <p>The local scatter-gather entry names Server A’s destination buffer. The remote part names Server B’s source address and RKEY. The operation is RDMA READ because Server A is asking the remote transport to return memory contents.</p>
          <p>Even though payload data will return from B to A, the Work Request is posted on A’s Send Queue because A initiates the operation.</p>
        </>
      ),
      visual: visual(3),
      inspect: (
        <div className="space-y-4">
          <WorkRequestSummary request={readWr} title="Recorded RDMA READ Work Request" />
          <SourceExcerpt path="python/exp_d_read.py" start={113} end={124} title="Constructing and posting the real READ">
            <code className="font-mono text-cyan-100">set_wr_rdma(rkey=peer["rkey"], addr=peer["addr"])</code> names remote source memory while the SGE names the reader’s local destination memory.
          </SourceExcerpt>
        </div>
      ),
    },
    {
      id: "submit-read",
      title: "The reader posts one instruction to its Send Queue",
      actionLabel: "Follow the READ request",
      body: (
        <>
          <p>Posting the READ makes the instruction pending in Server A’s Send Queue. No payload has moved yet. The source application on Server B has not posted a data Work Request for this transfer.</p>
          <p>The responder transport will service the read because the QP and memory permissions were established beforehand.</p>
        </>
      ),
      visual: visual(4),
    },
    {
      id: "read-request",
      title: "The request travels from reader to source without payload data",
      actionLabel: "Follow the data response",
      body: (
        <>
          <p>The captured READ Request packet travels from {readRequest.sourceIp} to {readRequest.destinationIp}. Its destination QPN is {exactValue(readRequest.destinationQpn)}, the source endpoint on Server B. It carries RETH fields identifying the remote virtual address {exactValue(readRequest.reth?.virtualAddress)}, RKEY {exactValue(readRequest.reth?.rkey)} and DMA length {exactValue(readRequest.reth?.dmaLength, "decimal")} bytes.</p>
          <p>This request does not carry the secret payload. It asks the responder transport to read memory.</p>
        </>
      ),
      visual: visual(5),
      evidence: <EvidenceNote kind="Captured on the wire">Frame {readRequest.frameNumber} in {readRequest.captureFile} is the genuine READ Request. It contains RETH because it is a READ request.</EvidenceNote>,
      inspect: <PacketSummary packet={readRequest}>Request direction is A → B. Payload direction has not happened yet.</PacketSummary>,
    },
    {
      id: "read-response",
      title: "The response travels from source to reader and carries the payload",
      actionLabel: "Observe causal local memory placement",
      body: (
        <>
          <p>The captured READ Response Only packet travels in the reverse direction, from {readResponse.sourceIp} to {readResponse.destinationIp}. Its destination QPN is {exactValue(readResponse.destinationQpn)}, the reader endpoint on Server A.</p>
          <p>This is the visually unmistakable distinction: the request went A → B, while the payload response goes B → A. The response does not contain an RETH header; it carries the response payload bytes.</p>
        </>
      ),
      visual: visual(6),
      evidence: <EvidenceNote kind="Captured on the wire">Frame {readResponse.frameNumber} in {readResponse.captureFile} is the genuine READ Response Only packet. Reverse-direction destination QPNs are operation-specific and are not copied blindly from the forward packet.</EvidenceNote>,
      inspect: <PacketSummary packet={readResponse}>Response direction is B → A. The response payload is the data being read from Server B’s memory.</PacketSummary>,
    },
    {
      id: "local-placement",
      title: "Local memory placement is separate from completion observation",
      actionLabel: "Inspect the reader’s completion",
      body: (
        <>
          <p>The response payload can now be placed into the reader’s registered destination memory. This is shown as a causal illustration of transport execution.</p>
          <p>The application has not yet been shown polling its completion or verifying memory. Those are distinct observations.</p>
        </>
      ),
      visual: visual(7),
      evidence: <EvidenceNote kind="Causal illustration bounded by evidence">The captured response and correlated completion establish the transfer relationship. The exact memory instant is not independently timestamped.</EvidenceNote>,
    },
    {
      id: "reader-completion",
      title: "The initiating reader owns the completion",
      actionLabel: "Verify the reader memory",
      body: (
        <>
          <p>Server A polls and observes a successful RDMA read completion for WR ID {exactValue(readCqe.wrId)} and byte length {readCqe.byteLength}. The source application does not receive a completion for this responder-side activity because it did not post a Work Request for the READ.</p>
          <p>Completion ownership therefore follows the initiating application’s posted work, not simply the direction in which payload bytes travelled.</p>
        </>
      ),
      visual: visual(8),
      inspect: (
        <div className="space-y-4">
          <CompletionSummary completion={readCqe} title="Reader-local completion" />
          <SourceExcerpt path="python/exp_d_read.py" start={136} end={144} title="The source confirms no responder completion">
            The source application polls once after synchronization and records that no completion is expected because the responder side posted no Work Request.
          </SourceExcerpt>
        </div>
      ),
    },
    {
      id: "verify-memory",
      title: "After completion, the reader verifies local memory",
      actionLabel: "Compare the three operations",
      body: (
        <>
          <p>The verified reader memory begins with <span className="font-mono text-emerald-100">{localAfter}</span>. This is local memory evidence recorded after the reader completion.</p>
          <p>The source memory on Server B was not “sent” by the source application in a two-sided operation. The responder transport read it because the initiator presented the correct remote memory description and permission.</p>
        </>
      ),
      visual: visual(9),
      evidence: <EvidenceNote kind="Verified through application memory inspection">The reader compared its local buffer with the expected bytes and logged a successful payload verification.</EvidenceNote>,
      inspect: <PayloadMemory label="Recorded reader memory after READ" value={localAfter} />,
    },
    {
      id: "operation-comparison",
      title: "The three operations encode different ownership and coordination",
      actionLabel: "Continue: analyze real packets",
      body: (
        <>
          <p>SEND/RECEIVE, ordinary WRITE and READ are not interchangeable synonyms for “RDMA.” They differ in who initiates, which direction payload data moves, whether remote receive work is required, whether remote memory metadata is required and where application completion appears.</p>
        </>
      ),
      visual: <OperationComparisonTable />,
    },
  ];

  return <GuidedLesson lessonId="read" steps={steps} onComplete={onComplete} finalActionLabel="Start Lesson 8: packet analysis" />;
}
