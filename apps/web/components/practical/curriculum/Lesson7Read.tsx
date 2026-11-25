"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { CompletionSummary, PacketSummary, PayloadMemory, WorkRequestSummary } from "./operationVisuals";
import { EvidenceNote, exactValue, OperationComparisonTable, SourceExcerpt, TwoServerVisual } from "./visuals";
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

function visual(stage: number) {
  const constructed = stage >= 3;
  const posted = stage >= 4;
  const requestOnWire = stage === 5;
  const responseOnWire = stage === 6;
  const completed = stage >= 8;
  const localData = stage >= 7;
  return (
    <TwoServerVisual
      caption="Guided replay of the validated RDMA READ reference execution. The request travels from reader to source; the payload response travels back from source to reader. Those directions are deliberately shown as separate states."
      transfer={{
        active: requestOnWire || responseOnWire || stage === 2,
        direction: requestOnWire ? "a-to-b" : responseOnWire || stage === 2 ? "b-to-a" : "none",
        packet: requestOnWire ? <span>{readRequest.opcodeName}<br />request only · no payload data</span> : responseOnWire ? <span>{readResponse.opcodeName}<br />payload returns to reader</span> : stage === 2 ? <span>TCP control channel: remote address + RKEY metadata</span> : undefined,
        label: requestOnWire ? "Request direction: reader asks source transport for memory" : responseOnWire ? "Payload direction: source memory returns to reader memory" : stage === 2 ? "The reader learns which remote region it may read" : "READ reverses the data-availability problem",
      }}
      a={{
        emphasis: stage === 1 ? ["memory"] : stage === 3 ? ["application", "memory"] : stage === 4 ? ["application", "os"] : requestOnWire ? ["nic"] : responseOnWire ? ["nic", "memory"] : localData ? ["memory", "application"] : completed ? ["os"] : [],
        application: stage >= 3 ? "reader initiates the operation" : "reader application",
        memory: localData ? localAfter : "local destination buffer waiting",
        memoryTone: localData ? "changed" : "ready",
        os: "reader endpoint and Completion Queue",
        nic: requestOnWire ? "emits READ request" : responseOnWire ? "places response bytes into local memory" : "reader RDMA device",
        queues: stage >= 3 ? {
          label: `Reader QP ${exactValue(experiment.endpoints.initiator.qpn)}`,
          send: posted ? [`WR ${exactValue(readWr.wrId)} · RDMA READ`] : [],
          receive: [],
          completion: completed ? [`CQE · RDMA read · ${exactValue(readCqe.wrId)}`] : [],
        } : undefined,
      }}
      b={{
        emphasis: stage === 1 ? ["memory"] : stage === 2 ? ["memory", "application"] : requestOnWire ? ["nic", "memory"] : responseOnWire ? ["nic", "memory"] : [],
        application: stage >= 4 ? "source application owns the data but does not post a data Work Request for this READ" : "source application owns the data",
        memory: stage >= 2 ? remoteBefore : "registered source memory not yet inspected",
        memoryTone: "source",
        os: "source endpoint; responder transport services the read",
        nic: requestOnWire ? "receives the READ request" : responseOnWire ? "returns memory contents in a READ response" : "source RDMA device",
        queues: stage >= 3 ? {
          label: `Source QP ${exactValue(experiment.endpoints.responder.qpn)}`,
          send: [],
          receive: [],
          completion: [],
        } : undefined,
      }}
    />
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
          <p>This local memory description is necessary even though the payload currently resides on Server B. The initiating endpoint must still define where incoming data belongs.</p>
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
          <p>Posting the READ makes the instruction visible to Server A’s endpoint. No payload has moved yet. The source application on Server B has not posted a data Work Request for this transfer.</p>
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
      actionLabel: "Inspect the reader’s destination memory",
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
      id: "local-memory",
      title: "Server A’s local destination memory now contains the remote data",
      actionLabel: "Inspect the reader’s completion",
      body: (
        <>
          <p>The verified reader memory begins with <span className="font-mono text-emerald-100">{localAfter}</span>. This is local memory evidence recorded after the reader completion.</p>
          <p>The source memory on Server B was not “sent” by the source application in a two-sided operation. The responder transport read it because the initiator presented the correct remote memory description and permission.</p>
        </>
      ),
      visual: visual(7),
      evidence: <EvidenceNote kind="Verified through application memory inspection">The reader compared its local buffer with the expected bytes and logged a successful payload verification.</EvidenceNote>,
      inspect: <PayloadMemory label="Recorded reader memory after READ" value={localAfter} />,
    },
    {
      id: "reader-completion",
      title: "The initiating reader owns the completion",
      actionLabel: "Compare the three operations",
      body: (
        <>
          <p>Server A observes a successful RDMA read completion for WR ID {exactValue(readCqe.wrId)} and byte length {readCqe.byteLength}. The source application does not receive a completion for this responder-side activity because it did not post a Work Request for the READ.</p>
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
