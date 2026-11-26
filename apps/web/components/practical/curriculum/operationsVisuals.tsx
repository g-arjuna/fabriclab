"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  bytesFromHex,
  exact,
  packetLengthBreakdown,
  rdmaEvidence,
  type Experiment,
  type PacketRecord,
} from "@/lib/practical/rdmaEvidence";
import { ExperimentFocusDiagram, type FocusEndpointModel, type FocusWorkState, type TransferVisualModel } from "./rdmaDiagrams";
import {
  ActionButton,
  ByteCells,
  CompactPacketCard,
  CompletionCard,
  EndpointFacts,
  HexByteTable,
  MemorySnapshotCard,
  PacketInspector,
  ProvenanceTag,
  Quiz,
  SourceLines,
  WorkRequestCard,
  completionFor,
  endpoint,
  experiment,
  memoryRegion,
  packet,
  snapshot,
  sourceLines,
  workRequest,
} from "./operationPrimitives";
import { cx, exactValue } from "./visuals";

const sendExperiment = experiment("send-recv");
const writeExperiment = experiment("write");
const readExperiment = experiment("read");

function textPayload(hex: string | null | undefined) {
  return bytesFromHex(hex).map((byte) => byte === 10 ? "\\n" : byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : "·").join("");
}

function hexEqual(left: string | null | undefined, right: string | null | undefined) {
  return (left || "").toLowerCase() === (right || "").toLowerCase();
}

function focusEndpoint(host: "hosta" | "hostb", name: "Server A" | "Server B", memoryLabel: string, memory: ReactNode, options: Partial<FocusEndpointModel> = {}): FocusEndpointModel {
  return { host, name, memoryLabel, memory, ...options };
}

function work(title: string, label: ReactNode, tone: FocusWorkState["tone"] = "pending", detail?: ReactNode): FocusWorkState {
  return { title, label, tone, detail };
}

function Bench({ a, b, transfer, caption, testId = "operations-bench" }: { a: FocusEndpointModel; b: FocusEndpointModel; transfer: TransferVisualModel; caption?: ReactNode; testId?: string }) {
  return (
    <div data-testid={testId}>
      <ExperimentFocusDiagram a={a} b={b} transfer={transfer} caption={caption} />
    </div>
  );
}

function CaptureLink({ experimentValue }: { experimentValue: Experiment }) {
  if (!experimentValue.captureDownload) return null;
  return <a className="text-xs text-cyan-200 underline underline-offset-4" href={experimentValue.captureDownload.path}>download {experimentValue.captureDownload.fileName}</a>;
}

function EventFact({ id, label }: { id: string; label: string }) {
  return <div className="rounded-lg border border-white/10 bg-slate-950/45 px-2.5 py-2 font-mono text-xs text-slate-300"><span className="text-slate-500">{label}: </span>{id}</div>;
}

function OperationShell({ title, children, controls, provenance = "recorded", testId }: { title: string; children: ReactNode; controls?: ReactNode; provenance?: "recorded" | "source-derived" | "conceptual"; testId: string }) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/30 p-3 sm:p-4" data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <ProvenanceTag kind={provenance} />
      </div>
      {children}
      {controls ? <div className="flex flex-wrap gap-2 border-t border-white/8 pt-3">{controls}</div> : null}
    </section>
  );
}

function Lesson51() {
  const [inspectPrograms, setInspectPrograms] = useState(false);
  const [capture, setCapture] = useState(false);
  const hosta = rdmaEvidence.hosts.hosta;
  const hostb = rdmaEvidence.hosts.hostb;
  return (
    <OperationShell title="Two-host recorded laboratory" testId="visual-5-1" controls={<>
      <ActionButton testId="inspect-two-programs" active={inspectPrograms} onClick={() => setInspectPrograms((value) => !value)}>Inspect the two programs</ActionButton>
      <ActionButton testId="locate-capture" active={capture} onClick={() => setCapture((value) => !value)}>Locate the capture</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "application memory · CPU/RAM", "sender message buffer", { providerNote: "rxe0 · data0", memoryNote: hosta.dataIp })}
        b={focusEndpoint("hostb", "Server B", "application memory · CPU/RAM", "receive buffer", { providerNote: "rxe0 · data0", memoryNote: hostb.dataIp })}
        transfer={{ visible: capture, direction: "a-to-b", kind: capture ? "request" : "none", label: capture ? "isolated RoCEv2 data capture" : undefined, detail: capture ? "TCP control coordination is not present in this data capture" : undefined }}
        caption={<span>TCP control link {hosta.controlIp} ⇄ {hostb.controlIp} · separate RoCEv2 data link {hosta.dataIp} ⇄ {hostb.dataIp}</span>}
      />
      <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2" data-testid="environment-facts">
        <div className="rounded-xl border border-white/10 bg-white/4 p-3">device <span className="font-mono text-cyan-100">rxe0</span> associated with <span className="font-mono text-cyan-100">data0</span></div>
        <div className="rounded-xl border border-white/10 bg-white/4 p-3">guests: {rdmaEvidence.environment.guests?.hosta?.os_release || "Ubuntu"} · kernel {rdmaEvidence.environment.guests?.hosta?.kernel || "recorded Linux"}</div>
      </div>
      {inspectPrograms ? <SourceLines testId="send-program-roles" path="python/exp_b_send_recv.py" start={76} end={99} title="Actual SEND/RECEIVE roles and arguments" /> : null}
      {capture ? <div className="rounded-xl border border-orange-300/20 bg-orange-300/7 p-3 text-sm text-orange-50" data-testid="capture-location"><CaptureLink experimentValue={sendExperiment} /> · capture interface {rdmaEvidence.source.captureInterface}</div> : null}
    </OperationShell>
  );
}

function Lesson52() {
  const [stage, setStage] = useState(0);
  const aEndpoint = endpoint(sendExperiment, "hosta");
  const bEndpoint = endpoint(sendExperiment, "hostb");
  const prepared = stage >= 2;
  return (
    <OperationShell title="Prepared connection resource ledger" testId="visual-5-2" controls={<>
      <ActionButton testId="open-device-resources" active={stage >= 1} onClick={() => setStage(1)}>Open device and create resources</ActionButton>
      <ActionButton testId="exchange-endpoint-metadata" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Exchange endpoint metadata</ActionButton>
      <ActionButton testId="prepare-qps" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Prepare the QPs</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "registered memory", `${exact(aEndpoint.memoryRegion.address)} · ${aEndpoint.memoryRegion.length} bytes`, {
          providerNote: prepared ? "QP RTS" : "resources being prepared",
          work: [work("Send Queue", "no data WR", "empty"), work("Receive Queue", "no data WR", "empty")],
        })}
        b={focusEndpoint("hostb", "Server B", "registered memory", `${exact(bEndpoint.memoryRegion.address)} · ${bEndpoint.memoryRegion.length} bytes`, {
          providerNote: prepared ? "QP RTS" : "resources being prepared",
          work: [work("Send Queue", "no data WR", "empty"), work("Receive Queue", "no data WR", "empty")],
        })}
        transfer={{ visible: stage >= 2, direction: "both", kind: stage >= 2 && stage < 3 ? "control" : "none", label: "endpoint metadata over TCP" }}
        caption="Recorded endpoint preparation · no pending data work at this point"
      />
      <div className="grid gap-2 lg:grid-cols-3" data-testid="resource-ledger">
        {["device context + PD/CQ/MR/QP", "GID/IP/QPN/PSN endpoint metadata", "INIT/RTR/RTS readiness"].map((label, index) => (
          <div key={label} className={cx("rounded-xl border p-3 text-sm", stage > index ? "border-emerald-300/25 bg-emerald-300/8 text-emerald-50" : "border-white/10 bg-white/4 text-slate-400")}>{index + 1}. {label}</div>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <EndpointFacts endpointValue={aEndpoint} title="Server A" />
        <EndpointFacts endpointValue={bEndpoint} title="Server B" />
      </div>
      <details className="rounded-xl border border-white/10 bg-white/4 p-3"><summary className="cursor-pointer text-sm text-cyan-100">Inspect actual helper source</summary><div className="mt-3 grid gap-3"><SourceLines path="python/exp_b_send_recv.py" start={50} end={72} title="Context and resource creation" /><SourceLines path="python/rdma_common.py" start={131} end={191} title="MR/QP helper and endpoint transitions" /></div></details>
    </OperationShell>
  );
}

function Lesson53() {
  const [stage, setStage] = useState(0);
  const recvWr = workRequest(sendExperiment, "receive");
  const bMemory = memoryRegion(sendExperiment, "hostb");
  return (
    <OperationShell title="Receiver-selected destination memory" testId="visual-5-3" controls={<>
      <ActionButton testId="describe-receive-memory" active={stage >= 1} onClick={() => setStage(1)}>Describe receive memory</ActionButton>
      <ActionButton testId="post-receive-request" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Post receive request</ActionButton>
      <ActionButton testId="tell-a-ready" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Tell A the receiver is ready</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "sender memory", "not prepared yet", { work: [work("Send Queue", "no SEND before readiness", "empty")], completion: stage >= 3 ? "peer_ready recorded" : undefined })}
        b={focusEndpoint("hostb", "Server B", "receive memory · source-derived zeros", `0x00 … capacity ${bMemory.length}`, {
          memoryNote: `${exact(bMemory.address)} · LKEY ${exact(bMemory.lkey)}`,
          work: [work("Receive Queue", stage >= 2 ? `WR ${exactValue(recvWr.wrId)} · RECEIVE` : "no receive WR", stage >= 2 ? "pending" : "empty", stage >= 1 ? `${exact(recvWr.localAddress)} · ${recvWr.byteLength} bytes` : undefined)],
        })}
        transfer={{ visible: stage >= 3, direction: "b-to-a", kind: "control", label: "TCP ready" }}
        caption="The receive instruction is local to B; A does not receive B's buffer address or RKEY for ordinary SEND"
      />
      <div className="grid gap-3 xl:grid-cols-2">
        <WorkRequestCard request={recvWr} testId="send-receive-wr-card" />
        <div className="space-y-2">
          {stage >= 1 ? <SourceLines path="python/exp_b_send_recv.py" start={104} end={107} title="Receive memory description and posting" /> : null}
          {stage >= 3 ? <EventFact id="b:hosta:exp-b-sender:4" label="A peer_ready event" /> : null}
        </div>
      </div>
    </OperationShell>
  );
}

function Lesson54() {
  const [state, setState] = useState<"empty" | "rnr" | "prepared" | "actual">("empty");
  const [retry, setRetry] = useState(false);
  const prepared = state === "prepared" || state === "actual";
  return (
    <OperationShell title="Conceptual missing-receive fork" provenance="conceptual" testId="visual-5-4" controls={<>
      <ActionButton testId="try-send-no-receive" active={state === "rnr"} onClick={() => setState("rnr")}>Try SEND with no receive</ActionButton>
      <ActionButton testId="prepare-receive-work" active={prepared} onClick={() => setState("prepared")}>Prepare receive work</ActionButton>
      <ActionButton testId="return-recorded-send" active={state === "actual"} onClick={() => setState("actual")}>Return to recorded experiment</ActionButton>
      <ActionButton testId="inspect-retry-configuration" active={retry} onClick={() => setRetry((value) => !value)}>Inspect retry configuration</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "illustrative source", "HELLO", { work: [work("Send Queue", state === "rnr" ? "conceptual SEND attempted" : "no recorded SEND here", state === "rnr" ? "pending" : "empty")] })}
        b={focusEndpoint("hostb", "Server B", "illustrative destination", prepared ? "buffer described" : "no destination described", {
          work: [work("Receive Queue", prepared ? "conceptual receive description" : "empty", prepared ? "pending" : "empty")],
          completion: state === "rnr" ? "no successful completion" : undefined,
        })}
        transfer={{ visible: state === "rnr", direction: "a-to-b", kind: "request", label: state === "rnr" ? "conceptual SEND cannot be placed" : undefined }}
        caption={state === "rnr" ? "Receiver not ready · dashed conceptual RNR response; no fabricated capture, timing or status" : prepared ? "A suitable local receive description exists before SEND" : "Start with B's Receive Queue empty"}
      />
      <div className="rounded-xl border border-amber-300/25 bg-amber-300/8 p-3 text-sm leading-6 text-amber-50" data-testid="missing-receive-state">
        {state === "rnr" ? "Observed state: receiver not ready; no byte placement and no successful CQE are shown." : prepared ? "Observed state: receive work is prepared before the real SEND experiment continues." : "Observed state: no receive work is available."}
      </div>
      {retry ? <><div className="rounded-xl border border-white/10 bg-white/4 p-3 text-sm text-slate-300" data-testid="rnr-retry-explanation">The helper sets <span className="font-mono text-cyan-100">rnr_retry=7</span>, which requests indefinite receiver-not-ready retries in this RC configuration. The separate application wait remains finite; it is not transport retry exhaustion.</div><SourceLines path="python/rdma_common.py" start={181} end={189} title="Actual helper retry configuration" /></> : null}
    </OperationShell>
  );
}

function Lesson55() {
  const [stage, setStage] = useState(0);
  const sendWr = workRequest(sendExperiment, "send");
  const sendPacket = packet(sendExperiment, "request");
  const aMemory = memoryRegion(sendExperiment, "hosta");
  return (
    <OperationShell title="Construct and submit the actual SEND" testId="visual-5-5" controls={<>
      <ActionButton testId="write-bytes-a-buffer" active={stage >= 1} onClick={() => setStage(1)}>Write bytes into A's buffer</ActionButton>
      <ActionButton testId="construct-send-instruction" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Construct SEND instruction</ActionButton>
      <ActionButton testId="submit-to-send-queue" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Submit to Send Queue</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "source memory · reconstructed", stage >= 1 ? textPayload(sendPacket.payloadHex) : "payload not written", {
          memoryNote: `${exact(aMemory.address)} · LKEY ${exact(aMemory.lkey)}`,
          work: [work("Send Queue", stage >= 3 ? `WR ${exactValue(sendWr.wrId)} · SEND` : stage >= 2 ? "constructed · not posted" : "no SEND WR", stage >= 3 ? "pending" : stage >= 2 ? "unknown" : "empty", stage >= 2 ? `${sendWr.byteLength} bytes · local SGE` : undefined)],
        })}
        b={focusEndpoint("hostb", "Server B", "receive memory", "destination already posted", { work: [work("Receive Queue", "posted receive remains pending", "pending")] })}
        transfer={{ visible: false, direction: "none", kind: "none" }}
        caption="Observed state after submission: pending instruction only; no successful completion yet"
      />
      {stage >= 1 ? <ByteCells testId="send-payload-exact-bytes" hex={sendPacket.payloadHex} label="exact unpadded SEND payload from packet cross-checked with source" /> : null}
      {stage >= 2 ? <WorkRequestCard request={sendWr} testId="actual-send-wr" /> : null}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]"><SourceLines path="python/exp_b_send_recv.py" start={43} end={45} title="Actual payload literal" /><SourceLines path="python/exp_b_send_recv.py" start={128} end={145} title="Actual SEND source construction and submission" /></div>
    </OperationShell>
  );
}

function Lesson56() {
  const [stage, setStage] = useState(0);
  const sendPacket = packet(sendExperiment, "request");
  const recvWr = workRequest(sendExperiment, "receive");
  const lengths = packetLengthBreakdown(sendPacket);
  return (
    <OperationShell title="Captured SEND and conceptual placement" testId="visual-5-6" controls={<>
      <ActionButton testId="inspect-captured-send" active={stage >= 1} onClick={() => setStage(1)}>Inspect captured SEND</ActionButton>
      <ActionButton testId="follow-placement-b" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Follow placement at B</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "source memory", textPayload(sendPacket.payloadHex), { work: [work("Send Queue", "SEND in flight", "pending")] })}
        b={focusEndpoint("hostb", "Server B", "destination memory", stage >= 2 ? textPayload(sendPacket.payloadHex) : "not yet shown placed", { work: [work("Receive Queue", stage >= 2 ? `WR ${exactValue(recvWr.wrId)} consumed` : "posted receive", stage >= 2 ? "consumed" : "pending")] })}
        transfer={{ visible: stage >= 1, direction: "a-to-b", kind: "request", label: `${sendPacket.opcodeName} · ${lengths.applicationPayloadBytes} application bytes` }}
        caption="Recorded packet plus conceptual placement mechanism; memory change is not presented as independently time-sampled"
      />
      {stage >= 1 ? <><PacketInspector packetValue={sendPacket} /><div className="rounded-xl border border-white/10 bg-white/4 p-2 text-xs text-slate-300"><CaptureLink experimentValue={sendExperiment} /></div></> : null}
      {stage >= 2 ? <div className="rounded-xl border border-sky-300/20 bg-sky-300/7 p-3 text-sm text-sky-50" data-testid="send-placement-state">Conceptual state: first {lengths.applicationPayloadBytes} bytes placed in B's described receive memory; receive instruction moved to consumed history. Completion evidence remains separate.</div> : null}
    </OperationShell>
  );
}

function Lesson57() {
  const [ack, setAck] = useState(false);
  const [aPolled, setAPolled] = useState(false);
  const [bPolled, setBPolled] = useState(false);
  const ackPacket = packet(sendExperiment, "acknowledgement");
  const aCqe = completionFor(sendExperiment, "hosta");
  const bCqe = completionFor(sendExperiment, "hostb");
  return (
    <OperationShell title="Reverse ACK and two independent local completions" testId="visual-5-7" controls={<>
      <ActionButton testId="inspect-reverse-ack" active={ack} onClick={() => setAck(true)}>Inspect the reverse ACK</ActionButton>
      <ActionButton testId="observe-a-completion" active={aPolled} disabled={!ack} onClick={() => setAPolled(true)}>Observe A's completion</ActionButton>
      <ActionButton testId="observe-b-completion" active={bPolled} disabled={!ack} onClick={() => setBPolled(true)}>Observe B's completion</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "source memory", "payload written", { work: [work("Send Queue", "SEND completed", "completed")], completion: aPolled ? `WC ${exactValue(aCqe.wrId)} · ${aCqe.status}` : undefined })}
        b={focusEndpoint("hostb", "Server B", "destination memory", "placement illustrated", { work: [work("Receive Queue", "RECEIVE completed", "completed")], completion: bPolled ? `WC ${exactValue(bCqe.wrId)} · ${bCqe.status}` : undefined })}
        transfer={{ visible: ack, direction: "b-to-a", kind: "acknowledgement", label: ack ? `ACK · zero payload · destination QPN ${exact(ackPacket.destinationQpn)}` : undefined }}
        caption="Local polls are independent; no globally ordered A/B poll sequence is claimed"
      />
      {ack ? <PacketInspector packetValue={ackPacket} testId="send-ack-inspector" /> : null}
      <div className="grid gap-3 xl:grid-cols-2" data-testid="independent-completion-panels">
        {aPolled ? <CompletionCard completion={aCqe} testId="send-a-completion" /> : <div className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-500">A completion not yet observed in this view</div>}
        {bPolled ? <CompletionCard completion={bCqe} testId="send-b-completion" /> : <div className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-500">B completion not yet observed in this view</div>}
      </div>
    </OperationShell>
  );
}

function Lesson58() {
  const [read, setRead] = useState(false);
  const [hexMode, setHexMode] = useState(false);
  const region = memoryRegion(sendExperiment, "hostb");
  const received = snapshot(region, "b:memory:hostb:received");
  const sendPacket = packet(sendExperiment, "request");
  const equal = hexEqual(received.hex, sendPacket.payloadHex);
  return (
    <OperationShell title="B's verified receive memory" testId="visual-5-8" controls={<>
      <ActionButton testId="read-received-bytes" active={read} onClick={() => setRead(true)}>Read received bytes</ActionButton>
      <ActionButton testId="toggle-byte-representation" active={hexMode} disabled={!read} onClick={() => setHexMode((value) => !value)}>{hexMode ? "Show byte cells" : "Show hexadecimal table"}</ActionButton>
    </>}>
      {read ? (
        <>
          <MemorySnapshotCard snapshotValue={received} capacity={region.length} title="Recorded B buffer after receive" testId="send-received-memory" />
          {hexMode ? <HexByteTable testId="send-received-hex" hex={received.hex} label="full received byte sample with offsets" /> : null}
          <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/8 p-3 text-sm text-emerald-50" data-testid="send-exact-byte-equality" data-equal={equal ? "true" : "false"}>
            Full unpadded packet payload equality: {equal ? "exact match" : "mismatch"} · {bytesFromHex(received.hex).length} received bytes / {region.length} byte registered capacity · newline retained as hex 0a.
          </div>
          <div className="grid gap-2 sm:grid-cols-3" data-testid="send-local-verification-order">
            {["B completion observed", "B reads local memory", "B verifies bytes"].map((label, index) => <div key={label} className="rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-slate-200">{index + 1}. {label}</div>)}
          </div>
          <SourceLines path="python/exp_b_send_recv.py" start={113} end={121} title="Actual receive completion, local memory read and verification" />
        </>
      ) : <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">B's memory verification is withheld until the recorded read action.</div>}
    </OperationShell>
  );
}

function Lesson59() {
  const sendPacket = packet(sendExperiment, "request");
  return (
    <OperationShell title="SEND causal review" testId="visual-5-9">
      <CompactPacketCard packetValue={sendPacket} title="review packet · decoded SEND" testId="review-send-packet" />
      <div className="grid gap-2 md:grid-cols-5" data-testid="send-causal-strip">
        {["receive prepared", "local SEND instruction", "network request", "local completions", "verified B bytes"].map((label, index) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/4 p-3 text-center text-xs font-semibold text-slate-200"><span className="text-cyan-200">{index + 1}</span><br />{label}</div>
        ))}
      </div>
      <Quiz id="send-destination-review" question="Where does B's destination buffer address come from?" options={["From RETH", "From B's posted receive work", "From UDP destination port"]} correct={1} feedback="This ordinary SEND has no RETH. The destination QPN selects the endpoint and B's posted receive work supplies the local memory description." />
      <Quiz id="send-evidence-review" question="Which evidence establishes what B received and verified?" options={["SEND packet alone", "B's successful completion and verified buffer", "A's WR ID alone"]} correct={1} feedback="The packet shows transport across the capture point. B's local completion and exact byte verification are the application evidence." />
    </OperationShell>
  );
}

function Lesson61() {
  const [mode, setMode] = useState<"recall" | "compare" | "recorded">("recall");
  return (
    <OperationShell title="Destination selection: SEND versus ordinary WRITE" provenance={mode === "recorded" ? "recorded" : "conceptual"} testId="visual-6-1" controls={<>
      <ActionButton testId="recall-send" active={mode === "recall"} onClick={() => setMode("recall")}>Recall SEND</ActionButton>
      <ActionButton testId="compare-ordinary-write" active={mode === "compare"} onClick={() => setMode("compare")}>Compare ordinary WRITE</ActionButton>
      <ActionButton testId="open-recorded-write" active={mode === "recorded"} onClick={() => setMode("recorded")}>Open the recorded WRITE experiment</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", mode === "recorded" ? "writer source memory" : "illustrative source", mode === "recorded" ? `${exact(writeExperiment.endpoints.initiator.memoryRegion.address)}` : "HELLO", { work: [work("Send Queue", mode === "compare" ? "WRITE names remote destination" : mode === "recorded" ? `run ${writeExperiment.id}` : "SEND", mode === "recall" ? "empty" : "pending")] })}
        b={focusEndpoint("hostb", "Server B", mode === "recorded" ? "target memory" : "illustrative destination", mode === "recorded" ? `${exact(writeExperiment.endpoints.responder.memoryRegion.address)}` : mode === "compare" ? "authorized region" : "········", { work: [work("Receive Queue", mode === "recall" ? "posted receive chooses destination" : "no receive for ordinary WRITE", mode === "recall" ? "pending" : "empty")] })}
        transfer={{ visible: false, direction: "none", kind: "none" }}
        caption={mode === "recorded" ? `Recorded WRITE run ${writeExperiment.id} · distinct QPNs/keys` : "Illustrative comparison only · not the recorded transfer"}
      />
      <div className="grid gap-2 sm:grid-cols-2" data-testid="write-run-scope">
        <EventFact id={writeExperiment.endpoints.initiator.qpn.decimal} label="writer local QPN decimal" />
        <EventFact id={writeExperiment.endpoints.responder.qpn.decimal} label="target local QPN decimal" />
      </div>
    </OperationShell>
  );
}

function Lesson62() {
  const [stage, setStage] = useState(0);
  const region = memoryRegion(writeExperiment, "hostb");
  const before = snapshot(region, "c:memory:hostb:before");
  const bEndpoint = endpoint(writeExperiment, "hostb");
  return (
    <OperationShell title="Target memory and advertised remote tuple" testId="visual-6-2" controls={<>
      <ActionButton testId="inspect-target-before" active={stage >= 1} onClick={() => setStage(1)}>Inspect target before</ActionButton>
      <ActionButton testId="share-destination-information" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Share destination information</ActionButton>
      <ActionButton testId="prepare-write-endpoints" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Prepare endpoints and signal readiness</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "writer memory", "source not yet constructed", { completion: stage >= 3 ? "peer_ready recorded" : undefined })}
        b={focusEndpoint("hostb", "Server B", "target memory · recorded before", stage >= 1 ? "dots sampled" : "not inspected", {
          memoryNote: `${exact(region.address)} · ${region.length} bytes · RKEY ${exact(region.rkey)}`,
          work: [work("Receive Queue", "no receive WR for ordinary WRITE", "empty")],
        })}
        transfer={{ visible: stage >= 2, direction: "b-to-a", kind: "control", label: stage >= 2 ? `TCP tuple addr ${exact(region.address)} · RKEY ${exact(region.rkey)} · len ${region.length}` : undefined }}
        caption="B advertises remote address, RKEY and capacity; B's LKEY is not required by A"
      />
      {stage >= 1 ? <MemorySnapshotCard snapshotValue={before} capacity={region.length} title="Recorded target before snapshot" testId="write-before-memory" /> : null}
      {stage >= 2 ? <div className="grid gap-3 xl:grid-cols-2"><EndpointFacts endpointValue={bEndpoint} title="Target" /><SourceLines path="python/exp_c_write.py" start={57} end={69} title="WRITE target metadata preparation" /></div> : null}
      {stage >= 3 ? <SourceLines path="python/exp_c_write.py" start={106} end={122} title="Endpoint preparation and readiness exchange" /> : null}
    </OperationShell>
  );
}

function Lesson63() {
  const [stage, setStage] = useState(0);
  const writeWr = workRequest(writeExperiment, "rdma-write");
  const writePacket = packet(writeExperiment, "request");
  return (
    <OperationShell title="WRITE instruction assembled from local and remote descriptions" testId="visual-6-3" controls={<>
      <ActionButton testId="fill-write-source" active={stage >= 1} onClick={() => setStage(1)}>Fill A's source buffer</ActionButton>
      <ActionButton testId="describe-write-local-source" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Describe local source</ActionButton>
      <ActionButton testId="add-remote-destination" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Add remote destination</ActionButton>
      <ActionButton testId="construct-write-instruction" active={stage >= 4} disabled={stage < 3} onClick={() => setStage(4)}>Construct WRITE instruction</ActionButton>
      <ActionButton testId="submit-write" active={stage >= 5} disabled={stage < 4} onClick={() => setStage(5)}>Submit WRITE</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "source memory · reconstructed", stage >= 1 ? textPayload(writePacket.payloadHex) : "payload not written", {
          work: [work("Send Queue", stage >= 5 ? `WR ${exactValue(writeWr.wrId)} · WRITE` : stage >= 4 ? "constructed · not posted" : "no WRITE WR", stage >= 5 ? "pending" : stage >= 4 ? "unknown" : "empty")],
        })}
        b={focusEndpoint("hostb", "Server B", "remote destination", `${exact(writeWr.remoteAddress)} · RKEY ${exact(writeWr.remoteRkey)}`, { work: [work("Receive Queue", "no receive WR", "empty")] })}
        transfer={{ visible: false, direction: "none", kind: "none" }}
        caption="No destination memory verification is available at submission time"
      />
      {stage >= 1 ? <ByteCells hex={writePacket.payloadHex} label="exact unpadded WRITE payload" testId="write-payload-exact-bytes" /> : null}
      {stage >= 2 ? <div className="grid gap-2 sm:grid-cols-2" data-testid="write-memory-descriptions">
        <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3 text-sm text-cyan-50">local source · addr {exact(writeWr.localAddress)} · LKEY {exact(writeWr.localLkey)} · len {writeWr.byteLength}</div>
        {stage >= 3 ? <div className="rounded-xl border border-orange-300/25 bg-orange-300/8 p-3 text-sm text-orange-50">remote destination · addr {exact(writeWr.remoteAddress)} · RKEY {exact(writeWr.remoteRkey)}</div> : null}
      </div> : null}
      {stage >= 4 ? <WorkRequestCard request={writeWr} testId="actual-write-wr" /> : null}
      <SourceLines path="python/exp_c_write.py" start={124} end={138} title="Actual WRITE construction and submission" />
    </OperationShell>
  );
}

function Lesson64() {
  const [stage, setStage] = useState(0);
  const request = packet(writeExperiment, "request");
  const wr = workRequest(writeExperiment, "rdma-write");
  const region = memoryRegion(writeExperiment, "hostb");
  return (
    <OperationShell title="Target provider validates and places the WRITE" testId="visual-6-4" controls={<>
      <ActionButton testId="inspect-write-request" active={stage >= 1} onClick={() => setStage(1)}>Inspect WRITE request</ActionButton>
      <ActionButton testId="check-target-access" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Check target access</ActionButton>
      <ActionButton testId="follow-target-placement" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Follow target placement</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "source memory", textPayload(request.payloadHex), { work: [work("Send Queue", "WRITE pending", "pending")] })}
        b={focusEndpoint("hostb", "Server B", "target memory", stage >= 3 ? textPayload(request.payloadHex) : "dots · placement not shown", { work: [work("Receive Queue", "unchanged · no receive consumed", "empty")], completion: "no target CQE shown" })}
        transfer={{ visible: stage >= 1, direction: "a-to-b", kind: "request", label: `${request.opcodeName} · RETH + ${packetLengthBreakdown(request).applicationPayloadBytes} bytes` }}
        caption="Payload path does not pass through SQ/RQ; queue instructions only describe work"
      />
      {stage >= 1 ? <PacketInspector packetValue={request} testId="write-request-inspector" /> : null}
      {stage >= 2 ? <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3 font-mono text-xs leading-6 text-cyan-50" data-testid="write-access-interval">requested interval [{exact(request.reth!.virtualAddress)}, {exact(request.reth!.virtualAddress)} + {exact(request.reth!.dmaLength, "decimal")}) · registered base {exact(region.address)} · capacity {region.length} · causal access check consistent with verified run</div> : null}
      {stage >= 3 ? <div className="rounded-xl border border-sky-300/25 bg-sky-300/8 p-3 text-sm text-sky-50" data-testid="write-placement-caveat">Placement illustrated for first {wr.byteLength} bytes. The actual target buffer check is deliberately not revealed yet; no target CQE is fabricated.</div> : null}
    </OperationShell>
  );
}

function Lesson65() {
  const [stage, setStage] = useState(0);
  const ackPacket = packet(writeExperiment, "acknowledgement");
  const completion = completionFor(writeExperiment, "hosta");
  return (
    <OperationShell title="Reverse ACK and writer-local completion" testId="visual-6-5" controls={<>
      <ActionButton testId="inspect-write-ack" active={stage >= 1} onClick={() => setStage(1)}>Inspect the ACK</ActionButton>
      <ActionButton testId="poll-writer-cq" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Poll writer CQ</ActionButton>
      <ActionButton testId="observe-write-complete" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Observe write_complete</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "writer memory", "source bytes", { work: [work("Send Queue", stage >= 2 ? "WRITE completed" : "WRITE pending", stage >= 2 ? "completed" : "pending")], completion: stage >= 2 ? `WC ${exactValue(completion.wrId)} · SUCCESS` : undefined })}
        b={focusEndpoint("hostb", "Server B", "target memory", "verification withheld", { work: [work("Receive Queue", "no receive WR", "empty")], completion: "target CQ not inspected yet" })}
        transfer={{ visible: stage >= 1, direction: "b-to-a", kind: "acknowledgement", label: `ACK · destination QPN ${exact(ackPacket.destinationQpn)} · zero payload` }}
        caption="A's completion is local writer evidence; target application observation remains unrevealed"
      />
      {stage >= 1 ? <PacketInspector packetValue={ackPacket} testId="write-ack-inspector" /> : null}
      {stage >= 2 ? <CompletionCard completion={completion} testId="write-a-completion" /> : null}
      {stage >= 3 ? <div className="grid gap-2"><EventFact id="c:hosta:exp-c-writer:7" label="writer event" /><SourceLines path="python/exp_c_write.py" start={140} end={150} title="Writer completion and synchronization send" /></div> : null}
    </OperationShell>
  );
}

function Lesson66() {
  const predictionStorageKey = "fabriclab.rdma.operations-v2.6.6.prediction";
  const [prediction, setPrediction] = useState<string | null>(null);
  const [skippedPrediction, setSkippedPrediction] = useState(false);
  const [predictionHydrated, setPredictionHydrated] = useState(false);
  const [stage, setStage] = useState(0);
  const correct = prediction === "No";
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(predictionStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { prediction?: string | null; skipped?: boolean; revision?: string };
        if (parsed.revision === "operations-v2") {
          if (typeof parsed.prediction === "string") setPrediction(parsed.prediction);
          setSkippedPrediction(Boolean(parsed.skipped));
        }
      }
    } catch {
      // Scoped prediction persistence is optional.
    }
    setPredictionHydrated(true);
  }, []);
  useEffect(() => {
    if (!predictionHydrated) return;
    try {
      window.localStorage.setItem(predictionStorageKey, JSON.stringify({ prediction, skipped: skippedPrediction, revision: "operations-v2", section: "6.6" }));
    } catch {
      // Scoped prediction persistence is optional.
    }
  }, [prediction, predictionHydrated, skippedPrediction]);
  return (
    <OperationShell title="Target completion prediction and synchronized observation" testId="visual-6-6" controls={<>
      <ActionButton testId="follow-write-done-signal" active={stage >= 1} onClick={() => setStage(1)}>Follow the synchronization message</ActionButton>
      <ActionButton testId="poll-target-cq" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Poll B's CQ</ActionButton>
    </>}>
      <section className="rounded-xl border border-violet-300/20 bg-violet-300/7 p-3" data-testid="write-target-cqe-prediction" data-prediction={prediction || "none"}>
        <div className="font-semibold text-violet-100">Will ordinary WRITE produce a normal receive completion at B?</div>
        <div className="mt-2 flex flex-wrap gap-2">{["Yes", "No", "Not sure"].map((option) => <ActionButton key={option} testId={`target-cqe-predict-${option.toLowerCase().replace(/\s+/g, "-")}`} active={prediction === option} onClick={() => { setPrediction(option); setSkippedPrediction(false); }}>{option}</ActionButton>)}<ActionButton testId="target-cqe-prediction-skip" active={skippedPrediction} onClick={() => { setPrediction(null); setSkippedPrediction(true); }}>Skip prediction</ActionButton></div>
        <div className="mt-2 text-xs text-slate-400">{prediction ? "Prediction recorded; the answer is withheld until the recorded poll." : skippedPrediction ? "Prediction skipped; skipping does not record mastery." : "Choose, skip, or continue without answering."}</div>
      </section>
      <Bench
        a={focusEndpoint("hosta", "Server A", "writer memory", "completed WRITE", { completion: "writer completion already observed" })}
        b={focusEndpoint("hostb", "Server B", "target memory", "verification not yet shown", { work: [work("Receive Queue", "no receive WR", "empty")], completion: stage >= 2 ? "poll returned 0 entries" : "CQ not inspected yet" })}
        transfer={{ visible: stage >= 1, direction: "a-to-b", kind: "control", label: stage >= 1 ? "TCP write_done" : undefined }}
        caption="A's writer completion precedes the explicit TCP synchronization message in the actual program"
      />
      {stage >= 1 ? <EventFact id="c:hostb:exp-c-target:5" label="B received control signal" /> : null}
      {stage >= 2 ? <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/8 p-3" data-testid="write-target-zero-poll">
        <EventFact id="c:hostb:exp-c-target:6" label="recorded target poll" />
        <div className="mt-2 font-mono text-sm text-emerald-50">npolled=0 · this specific controlled poll only</div>
        {prediction ? <div className="mt-2 text-sm text-emerald-50" data-testid="write-prediction-feedback">{correct ? "Prediction matched the recorded result." : "The recorded result was zero entries for this ordinary WRITE poll."}</div> : skippedPrediction ? <div className="mt-2 text-sm text-sky-50" data-testid="write-prediction-feedback">Prediction skipped. The recorded result was zero entries; skipping does not record mastery.</div> : null}
      </div> : null}
    </OperationShell>
  );
}

function Lesson67() {
  const [inspect, setInspect] = useState(false);
  const region = memoryRegion(writeExperiment, "hostb");
  const before = snapshot(region, "c:memory:hostb:before");
  const after = snapshot(region, "c:memory:hostb:after");
  const request = packet(writeExperiment, "request");
  const commonBefore = (before.hex || "").slice(0, (after.hex || "").length);
  const exactMatch = hexEqual(after.hex, request.payloadHex) && hexEqual(commonBefore, "".padEnd((after.hex || "").length, "2e"));
  return (
    <OperationShell title="Before/after target memory verification" testId="visual-6-7" controls={<ActionButton testId="inspect-write-before-after" active={inspect} onClick={() => setInspect(true)}>Inspect before and after</ActionButton>}>
      {inspect ? (
        <>
          <div className="grid gap-3 xl:grid-cols-2">
            <MemorySnapshotCard snapshotValue={before} capacity={region.length} title="before · 64 sampled dots" testId="write-memory-before-card" />
            <MemorySnapshotCard snapshotValue={after} capacity={region.length} title="after · actual 53-byte sample" testId="write-memory-after-card" />
          </div>
          <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/8 p-3 text-sm text-emerald-50" data-testid="write-memory-exact-comparison" data-equal={exactMatch ? "true" : "false"}>
            Compared exactly across the common observed {bytesFromHex(after.hex).length}-byte range: {exactMatch ? "after bytes match the full unpadded packet payload including newline" : "mismatch"}. Bytes beyond 53 are not observed in the after snapshot.
          </div>
          <div className="grid gap-2 md:grid-cols-4" data-testid="write-target-local-order">
            {["write_done signal", "poll returned zero", "CPU reads local memory", "payload_ok verification"].map((label, index) => <div key={label} className="rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-sm text-slate-200">{index + 1}. {label}</div>)}
          </div>
          <SourceLines path="python/exp_c_write.py" start={155} end={171} title="Target synchronization, zero poll and memory verification" />
        </>
      ) : <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Before/after memory evidence is withheld until requested.</div>}
    </OperationShell>
  );
}

function Lesson68() {
  const [mode, setMode] = useState<"send" | "write" | "immediate">("write");
  return (
    <OperationShell title="SEND, ordinary WRITE and notification choices" testId="visual-6-8" controls={<>
      <ActionButton testId="compare-select-send" active={mode === "send"} onClick={() => setMode("send")}>SEND</ActionButton>
      <ActionButton testId="compare-select-write" active={mode === "write"} onClick={() => setMode("write")}>Ordinary WRITE</ActionButton>
      <ActionButton testId="inspect-write-immediate" active={mode === "immediate"} onClick={() => setMode("immediate")}>Inspect WRITE with immediate (conceptual)</ActionButton>
    </>}>
      <div className="overflow-x-auto rounded-xl border border-white/10" data-testid="send-write-comparison-table">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead><tr className="bg-slate-900/80 text-xs uppercase tracking-[0.14em] text-slate-400"><th className="px-3 py-2">Question</th><th className="px-3 py-2">SEND</th><th className="px-3 py-2">Ordinary WRITE</th></tr></thead>
          <tbody className="text-slate-300">
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">destination description</th><td className="px-3 py-2">B posted receive</td><td className="px-3 py-2">A remote address/RKEY</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">target receive WR</th><td className="px-3 py-2">required and consumed</td><td className="px-3 py-2">not required for ordinary WRITE</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">RETH</th><td className="px-3 py-2">absent</td><td className="px-3 py-2">present in request</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">recorded completion</th><td className="px-3 py-2">A SEND and B RECEIVE</td><td className="px-3 py-2">A WRITE only</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">recorded payload</th><td className="px-3 py-2">50 bytes</td><td className="px-3 py-2">53 bytes</td></tr>
          </tbody>
        </table>
      </div>
      {mode === "immediate" ? <div className="rounded-xl border border-amber-300/25 bg-amber-300/8 p-3 text-sm leading-6 text-amber-50" data-testid="write-immediate-conceptual"><ProvenanceTag kind="conceptual" /> WRITE with immediate is a different operation: it can consume target receive work and report immediate metadata in a receive completion. It is not the operation in the recorded ordinary WRITE run.</div> : null}
      {mode !== "immediate" ? <Bench
        a={focusEndpoint("hosta", "Server A", "memory", mode === "send" ? "SEND source" : "WRITE source", { work: [work("Send Queue", mode === "send" ? "SEND" : "WRITE", "pending")] })}
        b={focusEndpoint("hostb", "Server B", "memory", mode === "send" ? "receive-selected destination" : "remote-named destination", { work: [work("Receive Queue", mode === "send" ? "posted receive" : "no receive WR", mode === "send" ? "pending" : "empty")] })}
        transfer={{ visible: false, direction: "none", kind: "none" }}
        caption={mode === "send" ? `Recorded SEND run ${sendExperiment.id}` : `Recorded WRITE run ${writeExperiment.id}`}
      /> : null}
      <Quiz id="write-evidence-review" question="Which evidence proves B's bytes matched?" options={["ACK alone", "B's buffer verification", "A's LKEY"]} correct={1} feedback="The exact target memory verification compared B's bytes with the unpadded payload. The ACK is transport evidence, and A's LKEY is local source metadata." />
    </OperationShell>
  );
}

function Lesson71() {
  const [mode, setMode] = useState<"problem" | "app" | "read" | "recorded">("problem");
  return (
    <OperationShell title="READ reverses who supplies the data" provenance={mode === "recorded" ? "recorded" : "conceptual"} testId="visual-7-1" controls={<>
      <ActionButton testId="compare-application-request-reply" active={mode === "app"} onClick={() => setMode("app")}>Compare application request/reply</ActionButton>
      <ActionButton testId="choose-rdma-read" active={mode === "read"} onClick={() => setMode("read")}>Choose RDMA READ</ActionButton>
      <ActionButton testId="open-recorded-read" active={mode === "recorded"} onClick={() => setMode("recorded")}>Open the recorded READ experiment</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", mode === "recorded" ? "reader destination" : "requester buffer", mode === "recorded" ? "zero-filled destination" : "········", { work: [work("Send Queue", mode === "read" || mode === "recorded" ? "READ instruction" : "no READ yet", mode === "read" || mode === "recorded" ? "pending" : "empty")], completion: mode === "read" || mode === "recorded" ? "completion belongs to A" : undefined })}
        b={focusEndpoint("hostb", "Server B", mode === "recorded" ? "source memory" : "data already here", "HELLO", { providerNote: mode === "read" || mode === "recorded" ? "provider services response; no B application SendWR" : undefined })}
        transfer={mode === "read" || mode === "recorded" ? { visible: true, direction: "both", kind: "response", label: "request A→B · payload response B→A" } : mode === "app" ? { visible: true, direction: "both", kind: "control", label: "two application-controlled messages" } : { visible: false, direction: "none", kind: "none" }}
        caption={mode === "recorded" ? `Recorded READ run ${readExperiment.id} · fresh endpoint metadata` : "Conceptual role comparison; request and payload directions are separate"}
      />
    </OperationShell>
  );
}

function Lesson72() {
  const [stage, setStage] = useState(0);
  const bRegion = memoryRegion(readExperiment, "hostb");
  const aRegion = memoryRegion(readExperiment, "hosta");
  const before = snapshot(bRegion, "d:memory:hostb:before");
  return (
    <OperationShell title="READ source and destination preparation" testId="visual-7-2" controls={<>
      <ActionButton testId="inspect-read-source" active={stage >= 1} onClick={() => setStage(1)}>Inspect B's source</ActionButton>
      <ActionButton testId="prepare-read-destination" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Prepare A's destination</ActionButton>
      <ActionButton testId="exchange-read-metadata" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Exchange source metadata</ActionButton>
      <ActionButton testId="confirm-read-readiness" active={stage >= 4} disabled={stage < 3} onClick={() => setStage(4)}>Confirm readiness</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "destination memory · source-derived zeros", stage >= 2 ? `0x00 … capacity ${aRegion.length}` : "not prepared", { memoryNote: `${exact(aRegion.address)} · write access for local destination`, completion: stage >= 4 ? "peer_ready recorded" : undefined })}
        b={focusEndpoint("hostb", "Server B", "source memory · recorded before", stage >= 1 ? textPayload(before.hex).slice(0, 46) : "not inspected", { memoryNote: `${exact(bRegion.address)} · RKEY ${exact(bRegion.rkey)} · MR ${bRegion.length}` })}
        transfer={{ visible: stage >= 3, direction: "b-to-a", kind: "control", label: "TCP source addr/RKEY + advertised valid length 46" }}
        caption="Advertised valid data length 46 differs from registered capacity 4096"
      />
      {stage >= 1 ? <MemorySnapshotCard snapshotValue={before} capacity={bRegion.length} title="Recorded READ source snapshot" testId="read-source-before" /> : null}
      {stage >= 3 ? <div className="grid gap-3 xl:grid-cols-2"><EndpointFacts endpointValue={endpoint(readExperiment, "hostb")} title="Source" /><SourceLines path="python/exp_d_read.py" start={90} end={106} title="READ source metadata exchange" /></div> : null}
    </OperationShell>
  );
}

function Lesson73() {
  const [stage, setStage] = useState(0);
  const readWr = workRequest(readExperiment, "rdma-read");
  return (
    <OperationShell title="READ submitted through the initiator's Send Queue" testId="visual-7-3" controls={<>
      <ActionButton testId="describe-read-local-destination" active={stage >= 1} onClick={() => setStage(1)}>Describe local destination</ActionButton>
      <ActionButton testId="name-remote-source" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Name remote source</ActionButton>
      <ActionButton testId="construct-read" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Construct READ</ActionButton>
      <ActionButton testId="submit-read" active={stage >= 4} disabled={stage < 3} onClick={() => setStage(4)}>Submit to A's Send Queue</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "local destination reference", stage >= 1 ? `${exact(readWr.localAddress)} · LKEY ${exact(readWr.localLkey)}` : "not described", { work: [work("Send Queue", stage >= 4 ? `WR ${exactValue(readWr.wrId)} · READ` : stage >= 3 ? "constructed · not posted" : "no READ WR", stage >= 4 ? "pending" : stage >= 3 ? "unknown" : "empty")] })}
        b={focusEndpoint("hostb", "Server B", "remote source reference", stage >= 2 ? `${exact(readWr.remoteAddress)} · RKEY ${exact(readWr.remoteRkey)}` : "not named", { providerNote: "no B application WR is needed for the response" })}
        transfer={{ visible: false, direction: "none", kind: "none" }}
        caption="For READ the local SGE is a destination reference, not outgoing payload"
      />
      {stage >= 3 ? <WorkRequestCard request={readWr} testId="actual-read-wr" /> : null}
      <SourceLines path="python/exp_d_read.py" start={110} end={124} title="Actual READ construction and submission" />
    </OperationShell>
  );
}

function Lesson74() {
  const [inspect, setInspect] = useState(false);
  const request = packet(readExperiment, "request");
  const region = memoryRegion(readExperiment, "hostb");
  return (
    <OperationShell title="READ request carries RETH but no payload" testId="visual-7-4" controls={<>
      <ActionButton testId="inspect-read-request" active={inspect} onClick={() => setInspect(true)}>Inspect captured READ request</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "destination memory", "still unverified zeros", { work: [work("Send Queue", "READ pending", "pending")] })}
        b={focusEndpoint("hostb", "Server B", "source memory", "readable data remains unchanged", { memoryNote: `${exact(region.address)} · capacity ${region.length}` })}
        transfer={{ visible: inspect, direction: "a-to-b", kind: "request", label: "READ request · zero application bytes · RETH length 46" }}
        caption="The request direction follows the initiator; it is not the payload direction"
      />
      {inspect ? <><PacketInspector packetValue={request} testId="read-request-inspector" /><div className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3 font-mono text-xs text-cyan-50" data-testid="read-request-range">requested source range [{exact(request.reth!.virtualAddress)}, {exact(request.reth!.virtualAddress)} + {exact(request.reth!.dmaLength, "decimal")}) · payload bytes {packetLengthBreakdown(request).applicationPayloadBytes}</div></> : null}
    </OperationShell>
  );
}

function Lesson75() {
  const [stage, setStage] = useState(0);
  const response = packet(readExperiment, "response");
  const sourceBefore = snapshot(memoryRegion(readExperiment, "hostb"), "d:memory:hostb:before");
  const prefix = (sourceBefore.hex || "").slice(0, (response.payloadHex || "").length);
  const matches = hexEqual(prefix, response.payloadHex);
  return (
    <OperationShell title="READ response carries data back to the initiator" testId="visual-7-5" controls={<>
      <ActionButton testId="inspect-read-response" active={stage >= 1} onClick={() => setStage(1)}>Inspect captured READ response</ActionButton>
      <ActionButton testId="place-returned-bytes" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Place returned bytes</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "destination memory", stage >= 2 ? textPayload(response.payloadHex) : "not yet shown placed", { work: [work("Send Queue", "READ pending", "pending")] })}
        b={focusEndpoint("hostb", "Server B", "source memory", "provider reads source bytes", { providerNote: "provider response · no B application SendWR" })}
        transfer={{ visible: stage >= 1, direction: "b-to-a", kind: "response", label: `READ response · ${packetLengthBreakdown(response).applicationPayloadBytes} bytes · no RETH` }}
        caption="Packet source B, data source B and operation initiator A are distinct roles"
      />
      {stage >= 1 ? <PacketInspector packetValue={response} testId="read-response-inspector" /> : null}
      {stage >= 2 ? <div className="rounded-xl border border-sky-300/25 bg-sky-300/8 p-3 text-sm text-sky-50" data-testid="read-response-prefix-comparison" data-equal={matches ? "true" : "false"}>Response payload matches the first {bytesFromHex(response.payloadHex).length} bytes of B's recorded source snapshot: {matches ? "exact" : "mismatch"}. Trailing hashes in the 64-byte sample are outside the advertised valid length.</div> : null}
    </OperationShell>
  );
}

function Lesson76() {
  const [stage, setStage] = useState(0);
  const completion = completionFor(readExperiment, "hosta");
  const aRegion = memoryRegion(readExperiment, "hosta");
  const result = snapshot(aRegion, "d:memory:hosta:read-result");
  const response = packet(readExperiment, "response");
  const matches = hexEqual(result.hex, response.payloadHex);
  return (
    <OperationShell title="Reader completion, verification and responder synchronization" testId="visual-7-6" controls={<>
      <ActionButton testId="poll-reader-cq" active={stage >= 1} onClick={() => setStage(1)}>Poll reader CQ</ActionButton>
      <ActionButton testId="inspect-verified-reader-memory" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Inspect verified reader memory</ActionButton>
      <ActionButton testId="signal-read-done" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Signal READ done</ActionButton>
      <ActionButton testId="inspect-source-cq" active={stage >= 4} disabled={stage < 3} onClick={() => setStage(4)}>Inspect source CQ</ActionButton>
    </>}>
      <Bench
        a={focusEndpoint("hosta", "Server A", "verified reader memory", stage >= 2 ? textPayload(result.hex) : "not verified yet", { work: [work("Send Queue", stage >= 1 ? "READ completed" : "READ pending", stage >= 1 ? "completed" : "pending")], completion: stage >= 1 ? `WC ${exactValue(completion.wrId)} · SUCCESS` : undefined })}
        b={focusEndpoint("hostb", "Server B", "source memory", "unchanged source", { completion: stage >= 4 ? "source poll returned 0 entries" : "source CQ withheld until read_done" })}
        transfer={{ visible: stage >= 3, direction: "a-to-b", kind: "control", label: "TCP read_done" }}
        caption="Recorded local order: A poll → verify → read_done → B zero-entry poll"
      />
      {stage >= 1 ? <CompletionCard completion={completion} testId="read-a-completion" /> : null}
      {stage >= 2 ? <><MemorySnapshotCard snapshotValue={result} capacity={aRegion.length} title="Verified reader memory" testId="read-result-memory" /><div className="rounded-xl border border-emerald-300/25 bg-emerald-300/8 p-3 text-sm text-emerald-50" data-testid="read-result-exact-comparison" data-equal={matches ? "true" : "false"}>Verified reader bytes exactly match the response payload: {matches ? "yes" : "no"}.</div><SourceLines path="python/exp_d_read.py" start={126} end={134} title="Reader memory verification and read_done signal" /></> : null}
      {stage >= 3 ? <><EventFact id="d:hostb:exp-d-source:5" label="B received read_done" /><SourceLines path="python/exp_d_read.py" start={134} end={134} title="READ done control send" /></> : null}
      {stage >= 4 ? <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/8 p-3" data-testid="read-source-zero-poll"><EventFact id="d:hostb:exp-d-source:6" label="source CQ poll" /><div className="mt-2 font-mono text-sm text-emerald-50">npolled=0 · this synchronized observation only</div><SourceLines path="python/exp_d_read.py" start={137} end={144} title="READ source synchronization and poll" /></div> : null}
    </OperationShell>
  );
}

function Lesson77() {
  const [selected, setSelected] = useState<"send" | "write" | "read">("read");
  return (
    <OperationShell title="Three-operation comparison" testId="visual-7-7" controls={<>
      <ActionButton testId="trace-send-operation" active={selected === "send"} onClick={() => setSelected("send")}>Trace SEND</ActionButton>
      <ActionButton testId="trace-write-operation" active={selected === "write"} onClick={() => setSelected("write")}>Trace WRITE</ActionButton>
      <ActionButton testId="trace-read-operation" active={selected === "read"} onClick={() => setSelected("read")}>Trace READ</ActionButton>
    </>}>
      <div className="overflow-x-auto rounded-xl border border-white/10" data-testid="three-operation-authored-table">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead><tr className="bg-slate-900/80 text-xs uppercase tracking-[0.14em] text-slate-400"><th className="px-3 py-2">Question</th><th className="px-3 py-2">SEND</th><th className="px-3 py-2">Ordinary WRITE</th><th className="px-3 py-2">READ</th></tr></thead>
          <tbody className="text-slate-300">
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">Initiator in our lab</th><td className="px-3 py-2">A</td><td className="px-3 py-2">A</td><td className="px-3 py-2">A</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">Application payload</th><td className="px-3 py-2">A → B</td><td className="px-3 py-2">A → B</td><td className="px-3 py-2">B → A</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">Who describes destination?</th><td className="px-3 py-2">B, posted receive</td><td className="px-3 py-2">A, remote address and RKEY</td><td className="px-3 py-2">A, local SGE</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">Matching target receive WR?</th><td className="px-3 py-2">Yes</td><td className="px-3 py-2">No</td><td className="px-3 py-2">No</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">Remote address and RKEY in request?</th><td className="px-3 py-2">No</td><td className="px-3 py-2">Yes, destination</td><td className="px-3 py-2">Yes, source</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">Local completions recorded</th><td className="px-3 py-2">A SEND; B RECEIVE</td><td className="px-3 py-2">A WRITE</td><td className="px-3 py-2">A READ</td></tr>
            <tr className="border-t border-white/8"><th className="px-3 py-2 text-slate-100">Target application coordination</th><td className="px-3 py-2">Posted receive, then observe receive completion</td><td className="px-3 py-2">Explicit control notification in this run</td><td className="px-3 py-2">Source readiness and done synchronization in this run</td></tr>
          </tbody>
        </table>
      </div>
      <Bench
        a={focusEndpoint("hosta", "Server A", "selected operation context", selected === "read" ? "local destination" : "local source", { work: [work("Send Queue", selected.toUpperCase(), "pending")] })}
        b={focusEndpoint("hostb", "Server B", "selected operation context", selected === "read" ? "remote source" : selected === "write" ? "remote destination" : "receive-selected destination", { work: [work("Receive Queue", selected === "send" ? "posted receive" : "no matching receive", selected === "send" ? "pending" : "empty")] })}
        transfer={{ visible: true, direction: selected === "read" ? "b-to-a" : "a-to-b", kind: selected === "read" ? "response" : "request", label: selected === "read" ? "payload B→A" : "payload A→B" }}
        caption={`Selected ${selected.toUpperCase()} · request direction and payload direction are separately labelled`}
      />
      <Quiz id="read-direction-review" question="A posts READ. Which direction does the payload move?" options={["A→B", "B→A", "neither"]} correct={1} feedback="The READ request travels from initiator A to source B, but the response payload travels from B back to A." />
    </OperationShell>
  );
}

function protocolFields(packetValue: PacketRecord, protocolPart: string) {
  return packetValue.protocolTree.find((item) => item.protocol.toLowerCase().includes(protocolPart.toLowerCase()))?.fields || [];
}

function Lesson81() {
  const sendPacket = packet(sendExperiment, "request");
  const layers = [
    ["ethernet", "Ethernet II", "Follow Ethernet delivery"],
    ["internet", "IPv4", "Follow IP delivery"],
    ["user datagram", "UDP", "Open UDP encapsulation"],
    ["base transport", "BTH", "Inspect the RDMA header"],
  ] as const;
  const [selected, setSelected] = useState(0);
  const fields = protocolFields(sendPacket, layers[selected][0]);
  return (
    <OperationShell title="RoCEv2 encapsulation in the actual SEND packet" testId="visual-8-1" controls={<>
      {layers.map(([key, label, action], index) => <ActionButton key={key} testId={`layer-${key.replace(/\s+/g, "-")}`} active={selected === index} onClick={() => setSelected(index)}>{action}</ActionButton>)}
    </>}>
      <div className="rounded-xl border border-orange-300/20 bg-orange-300/6 p-3" data-testid="packet-layer-strip">
        <div className="flex flex-wrap gap-1" aria-label="packet encapsulation layers">
          {layers.map(([key, label], index) => <button key={key} type="button" onClick={() => setSelected(index)} className={cx("rounded-lg border px-3 py-2 text-xs font-semibold", selected === index ? "border-orange-300/60 bg-orange-300/20 text-orange-50" : "border-white/10 bg-slate-950/50 text-slate-400")}>{label}</button>)}
          <span className="rounded-lg border border-sky-300/25 bg-sky-300/8 px-3 py-2 text-xs font-semibold text-sky-100">payload/padding/data</span>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
            <div className="text-xs font-semibold text-cyan-100">{layers[selected][1]} decoded fields</div>
            <dl className="mt-2 grid gap-1 font-mono text-[11px] text-slate-300" data-testid="selected-layer-fields">
              {fields.map((field) => <div key={field.name} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2"><dt className="text-slate-500">{field.name}</dt><dd className="break-all">{field.value}</dd></div>)}
            </dl>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
            <CompactPacketCard packetValue={sendPacket} title={`actual packet ${sendPacket.id}`} />
            <div className="mt-2 rounded-lg border border-white/10 bg-white/4 p-2 text-[11px] text-slate-400" data-testid="packet-capture-topology-inset">control TCP {rdmaEvidence.hosts.hosta.controlIp} ⇄ {rdmaEvidence.hosts.hostb.controlIp} · data RoCEv2 {rdmaEvidence.hosts.hosta.dataIp} ⇄ {rdmaEvidence.hosts.hostb.dataIp}</div>
            <div className="mt-2 text-xs leading-5 text-slate-400">Outer delivery fields remain visible as context. UDP destination port 4791 identifies RoCEv2 encapsulation; UDP does not itself supply RC reliability. <CaptureLink experimentValue={sendExperiment} /></div>
          </div>
        </div>
      </div>
      <details className="rounded-xl border border-white/10 bg-white/4 p-3"><summary className="cursor-pointer text-sm text-orange-100">Inspect complete packet evidence</summary><div className="mt-3"><PacketInspector packetValue={sendPacket} /></div></details>
    </OperationShell>
  );
}

function Lesson82() {
  const [packetRole, setPacketRole] = useState<"request" | "acknowledgement">("request");
  const [field, setField] = useState<"qpn" | "opcode" | "psn">("qpn");
  const [numberMode, setNumberMode] = useState<"hex" | "decimal">("hex");
  const current = packet(sendExperiment, packetRole);
  const endpointName = current.destinationQpn.decimal === endpoint(sendExperiment, "hosta").qpn.decimal ? "A endpoint" : current.destinationQpn.decimal === endpoint(sendExperiment, "hostb").qpn.decimal ? "B endpoint" : "unresolved endpoint";
  const wr = workRequest(sendExperiment, "send");
  return (
    <OperationShell title="Base Transport Header field correlation" testId="visual-8-2" controls={<>
      <ActionButton testId="select-send-request-bth" active={packetRole === "request"} onClick={() => setPacketRole("request")}>SEND request</ActionButton>
      <ActionButton testId="switch-to-ack-bth" active={packetRole === "acknowledgement"} onClick={() => setPacketRole("acknowledgement")}>Switch to ACK</ActionButton>
      <ActionButton testId="toggle-bth-number-base" active={numberMode === "decimal"} onClick={() => setNumberMode((mode) => mode === "hex" ? "decimal" : "hex")}>{numberMode === "hex" ? "Show decimal" : "Show hexadecimal"}</ActionButton>
    </>}>
      <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="select BTH field">
        {([
          ["qpn", `Destination QPN ${exact(current.destinationQpn, numberMode)}`],
          ["opcode", current.opcodeName],
          ["psn", `PSN ${exact(current.psn, numberMode)}`],
        ] as const).map(([id, label]) => <ActionButton key={id} testId={`bth-field-${id}`} active={field === id} onClick={() => setField(id)}>{label}</ActionButton>)}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <CompactPacketCard packetValue={current} selected title={`${current.id} · ${current.direction}`} testId="selected-bth-packet" />
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3" data-testid="bth-field-correlation">
          {field === "qpn" ? <div>Destination QPN {exact(current.destinationQpn)} / {exact(current.destinationQpn, "decimal")} selects the <span className="font-semibold">{endpointName}</span>. There is no standalone source QPN field in this RC BTH view.</div> : null}
          {field === "opcode" ? <div>{packetRole === "request" ? `Application WR opcode ${wr.opcode} corresponds to wire opcode ${current.opcodeName}.` : "The ACK is a transport response, not a new application Work Request."}</div> : null}
          {field === "psn" ? <div>PSN {exact(current.psn, "decimal")} belongs to transport sequencing in this single-packet reference exchange; it is not a WR ID or byte count.</div> : null}
        </div>
      </div>
    </OperationShell>
  );
}

function Lesson83() {
  const choices = [
    ["send", "SEND request", packet(sendExperiment, "request")],
    ["write", "WRITE request", packet(writeExperiment, "request")],
    ["read-request", "READ request", packet(readExperiment, "request")],
    ["read-response", "READ response", packet(readExperiment, "response")],
    ["ack", "ACK", packet(writeExperiment, "acknowledgement")],
  ] as const;
  const [selected, setSelected] = useState<(typeof choices)[number][0]>("write");
  const choice = choices.find((item) => item[0] === selected) || choices[1];
  const current = choice[2];
  const experimentValue = selected === "send" ? sendExperiment : selected === "write" || selected === "ack" ? writeExperiment : readExperiment;
  const relatedMemory = current.reth ? experimentValue.memoryRegions.find((region) => region.rkey.decimal === current.reth!.rkey.decimal) : undefined;
  return (
    <OperationShell title="When RETH appears — and when payload appears without it" testId="visual-8-3" controls={<>
      {choices.map(([id, label]) => <ActionButton key={id} testId={`packet-kind-${id}`} active={selected === id} onClick={() => setSelected(id)}>{label}</ActionButton>)}
    </>}>
      <div className="grid gap-3 xl:grid-cols-2">
        <CompactPacketCard packetValue={current} selected title={`${choice[1]} · ${current.id}`} testId="reth-selected-packet" />
        <div className="rounded-xl border border-white/10 bg-white/4 p-3" data-testid="reth-context-panel" data-has-reth={current.reth ? "true" : "false"}>
          {current.reth ? (
            <div className="space-y-2 text-sm text-slate-200">
              <div className="font-semibold text-orange-100">RETH present</div>
              <div className="font-mono text-xs">address {exact(current.reth.virtualAddress)} · RKEY {exact(current.reth.rkey)} · DMA length {exact(current.reth.dmaLength, "decimal")}</div>
              {relatedMemory ? <div className="text-xs text-slate-400">validated memory interval: {relatedMemory.id} · base {exact(relatedMemory.address)} · capacity {relatedMemory.length}</div> : null}
              <div className="text-xs text-slate-400">Role: {selected === "read-request" ? "remote source" : "remote destination"} for this operation.</div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-slate-200">
              <div className="font-semibold text-sky-100">No RETH in this packet</div>
              <div className="text-xs text-slate-400">{selected === "send" ? "The posted receive WR supplies destination memory outside the packet." : selected === "read-response" ? "The initiator's local READ WR supplies the destination context outside this response." : "The ACK carries no application memory description."}</div>
            </div>
          )}
        </div>
      </div>
      <PacketInspector packetValue={current} />
    </OperationShell>
  );
}

function Lesson84() {
  const choices = [
    ["send", packet(sendExperiment, "request"), 4096, workRequest(sendExperiment, "send").byteLength || 0],
    ["send-ack", packet(sendExperiment, "acknowledgement"), 0, 0],
    ["write", packet(writeExperiment, "request"), 4096, workRequest(writeExperiment, "rdma-write").byteLength || 0],
    ["write-ack", packet(writeExperiment, "acknowledgement"), 0, 0],
    ["read-request", packet(readExperiment, "request"), 4096, workRequest(readExperiment, "rdma-read").byteLength || 0],
    ["read-response", packet(readExperiment, "response"), 4096, workRequest(readExperiment, "rdma-read").byteLength || 0],
  ] as const;
  const [selected, setSelected] = useState<(typeof choices)[number][0]>("send");
  const [showPadding, setShowPadding] = useState(false);
  const choice = choices.find((item) => item[0] === selected) || choices[0];
  const current = choice[1];
  const lengths = packetLengthBreakdown(current);
  const rows = [
    ["registered capacity", choice[2] || "not a memory-transfer payload packet", "memory bound"],
    ["application payload", lengths.applicationPayloadBytes, "unpadded bytes"],
    ["transport padding", lengths.transportPaddingBytes, "alignment padding"],
    ["captured RDMA data", lengths.capturedDataBytes, "payload + padding"],
    ["recorded frame length", lengths.totalFrameBytes, "decode/export frame length"],
    ["captured frame length", lengths.capturedFrameBytes, "bytes available in capture"],
  ] as const;
  return (
    <OperationShell title="Capacity, transfer length, padding and frame length" testId="visual-8-4" controls={<>
      {choices.map(([id, item]) => <ActionButton key={id} testId={`length-packet-${id}`} active={selected === id} onClick={() => setSelected(id)}>{item.opcodeName}</ActionButton>)}
      {current.payloadHex ? <ActionButton testId="toggle-payload-padding-view" active={showPadding} onClick={() => setShowPadding((value) => !value)}>{showPadding ? "Show payload only" : "Show payload plus transport padding"}</ActionButton> : null}
    </>}>
      <div className="rounded-xl border border-orange-300/20 bg-orange-300/6 p-3" data-testid="packet-length-breakdown" data-packet-id={current.id} data-app-payload={lengths.applicationPayloadBytes} data-padding={lengths.transportPaddingBytes} data-frame-length={lengths.totalFrameBytes}>
        <div className="mb-3 font-semibold text-orange-100">{current.id} · {current.opcodeName}</div>
        <div className="flex min-w-0 flex-wrap overflow-hidden rounded-lg border border-white/10 font-mono text-[11px]">
          <span className="bg-slate-700/80 px-2 py-2 text-slate-100">headers</span>
          {current.reth ? <span className="bg-orange-500/30 px-2 py-2 text-orange-50">RETH</span> : null}
          {lengths.applicationPayloadBytes ? <span className="bg-sky-500/30 px-2 py-2 text-sky-50" style={{ flexGrow: lengths.applicationPayloadBytes }}>application {lengths.applicationPayloadBytes}</span> : null}
          {lengths.transportPaddingBytes ? <span className="bg-violet-500/30 px-2 py-2 text-violet-50">pad {lengths.transportPaddingBytes}</span> : null}
          <span className="bg-slate-800 px-2 py-2 text-slate-300">integrity/other frame fields</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([label, value, note]) => <div key={label} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</div><div className="mt-1 font-mono text-sm text-slate-100">{value}</div><div className="text-[11px] text-slate-500">{note}</div></div>)}</div>
      </div>
      {current.payloadHex ? <ByteCells hex={showPadding ? current.dataHex : current.payloadHex} label={showPadding ? "application payload plus transport padding" : "unpadded application payload bytes"} /> : null}
    </OperationShell>
  );
}

function Lesson85() {
  const [selected, setSelected] = useState(0);
  const [actual, setActual] = useState(false);
  const packets = [
    { label: "First", range: "0–1023", bytes: 1024, psn: 100 },
    { label: "Middle", range: "1024–2047", bytes: 1024, psn: 101 },
    { label: "Last", range: "2048–2499", bytes: 452, psn: 102 },
  ];
  const sendPacket = packet(sendExperiment, "request");
  return (
    <OperationShell title="Conceptual multi-packet SEND" provenance="conceptual" testId="visual-8-5" controls={<>
      {packets.map((item, index) => <ActionButton key={item.label} testId={`multipacket-select-${item.label.toLowerCase()}`} active={!actual && selected === index} onClick={() => { setSelected(index); setActual(false); }}>{item.label} packet</ActionButton>)}
      <ActionButton testId="compare-small-captured-send" active={actual} onClick={() => setActual(true)}>Compare small captured SEND</ActionButton>
    </>}>
      {actual ? (
        <div data-testid="actual-only-send-comparison"><CompactPacketCard packetValue={sendPacket} selected title={`actual single-packet SEND · PSN ${exact(sendPacket.psn, "decimal")}`} /><div className="mt-2 text-sm text-slate-300">The recorded small SEND is SEND Only. The multi-packet example above is illustrative, not captured.</div></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3"><div className="font-semibold text-cyan-100">one conceptual SEND WR</div><div className="mt-2 font-mono text-sm">length 2500 · one receive description consumed for the complete message</div></div>
          <div className="grid gap-2 md:grid-cols-3" data-testid="conceptual-multipacket-cards">
            {packets.map((item, index) => <button key={item.label} type="button" onClick={() => setSelected(index)} className={cx("rounded-xl border p-3 text-left", selected === index ? "border-orange-300/55 bg-orange-300/15" : "border-white/10 bg-white/4")}><div className="font-semibold text-orange-100">{item.label}</div><div className="mt-1 font-mono text-xs text-slate-300">offsets {item.range}<br />{item.bytes} bytes<br />illustrative PSN {item.psn}</div><div className="mt-2 h-2 overflow-hidden rounded bg-slate-800" aria-hidden="true"><div className="h-full bg-orange-300/70" style={{ width: `${(item.bytes / 2500) * 100}%`, marginLeft: `${(index * 1024 / 2500) * 100}%` }} /></div></button>)}
          </div>
        </div>
      )}
      {!actual ? <div className="rounded-xl border border-amber-300/25 bg-amber-300/8 p-3 text-sm text-amber-50" data-testid="selected-multipacket-range">Selected conceptual packet: {packets[selected].label}, byte offsets {packets[selected].range}, illustrative PSN {packets[selected].psn}. No capture frame number or packet hex is invented.</div> : null}
    </OperationShell>
  );
}

function Lesson86() {
  const [mode, setMode] = useState<"complete" | "missing" | "recovery" | "rnr" | "access" | "settings">("complete");
  return (
    <OperationShell title="Reliable Connected transport is more than UDP reachability" provenance="conceptual" testId="visual-8-6" controls={<>
      <ActionButton testId="illustrate-missing-packet" active={mode === "missing"} onClick={() => setMode("missing")}>Illustrate missing packet</ActionButton>
      <ActionButton testId="illustrate-transport-recovery" active={mode === "recovery"} onClick={() => setMode("recovery")}>Illustrate transport recovery</ActionButton>
      <ActionButton testId="case-receiver-not-ready" active={mode === "rnr"} onClick={() => setMode("rnr")}>Receiver not ready</ActionButton>
      <ActionButton testId="case-remote-access-rejected" active={mode === "access"} onClick={() => setMode("access")}>Remote access rejected</ActionButton>
      <ActionButton testId="inspect-lab-retry-settings" active={mode === "settings"} onClick={() => setMode("settings")}>Inspect lab retry settings</ActionButton>
    </>}>
      <div className="grid gap-2 md:grid-cols-3" data-testid="reliability-conceptual-packets">
        {[0, 1, 2].map((index) => <div key={index} className={cx("rounded-xl border p-3 text-center", mode === "missing" && index === 1 ? "border-red-300/45 bg-red-300/10 text-red-100" : mode === "recovery" && index === 1 ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/4 text-slate-200")}>illustrative packet {index + 1}<br /><span className="font-mono text-xs">PSN {100 + index} · range part {index + 1}</span>{mode === "missing" && index === 1 ? <div className="mt-1 text-xs">missing · operation incomplete</div> : null}{mode === "recovery" && index === 1 ? <div className="mt-1 text-xs">retried conceptually</div> : null}</div>)}
      </div>
      <div className="rounded-xl border border-amber-300/25 bg-amber-300/8 p-3 text-sm leading-6 text-amber-50" data-testid="reliability-case-state">
        {mode === "complete" ? "Initial conceptual model: all required transport data progresses; completion can become eligible." : null}
        {mode === "missing" ? "One range is missing. No completion is claimed while required transport progress is incomplete." : null}
        {mode === "recovery" ? "Recovery is illustrated without exact timing, NAK format or a fabricated capture. Completion is possible only after required progress." : null}
        {mode === "rnr" ? "Receiver-not-ready is a separate RC case from missing network packets: no suitable receive description exists. No successful placement or CQE is shown." : null}
        {mode === "access" ? "Remote access rejection belongs to WRITE/READ remote-memory authorization; it is not a missing-receive SEND case and no fabricated error packet is shown." : null}
        {mode === "settings" ? "Actual helper settings: transport retry configuration and the application poll timeout are separate mechanisms." : null}
      </div>
      {mode === "settings" ? <SourceLines path="python/rdma_common.py" start={181} end={224} title="Actual helper retry configuration and polling timeout" /> : null}
    </OperationShell>
  );
}

function lineText(path: string, line: number) {
  return sourceLines(path, line, line)[0]?.text || "";
}

function Lesson87() {
  const writeWr = workRequest(writeExperiment, "rdma-write");
  const writePacket = packet(writeExperiment, "request");
  const rows = [
    { id: "operation", label: "Operation", lines: [127, 128, 129, 130], wr: writeWr.opcode, wire: writePacket.opcodeName, direct: true, explanation: "application-selected operation ↔ wire opcode" },
    { id: "remote-address", label: "Remote address", lines: [133], wr: exact(writeWr.remoteAddress), wire: exact(writePacket.reth!.virtualAddress), direct: true, explanation: "remote destination address ↔ RETH address" },
    { id: "remote-key", label: "Remote key", lines: [133], wr: exact(writeWr.remoteRkey), wire: exact(writePacket.reth!.rkey), direct: true, explanation: "remote access key ↔ RETH RKEY" },
    { id: "length", label: "Length", lines: [125, 126], wr: `${writeWr.byteLength} bytes`, wire: `${exact(writePacket.reth!.dmaLength, "decimal")} bytes`, direct: true, explanation: "local SGE transfer length ↔ RETH DMA length" },
    { id: "destination-qpn", label: "Destination QPN", lines: [115, 116], wr: "peer endpoint context", wire: exact(writePacket.destinationQpn), direct: true, explanation: "prepared peer endpoint ↔ BTH destination QPN" },
    { id: "psn", label: "PSN", lines: [115, 116], wr: "transport endpoint sequencing", wire: exact(writePacket.psn), direct: true, explanation: "QP transport sequence state ↔ packet sequence number" },
    { id: "local-address", label: "Local address", lines: [125], wr: exact(writeWr.localAddress), wire: "No direct transmitted field", direct: false, explanation: "local source memory metadata is used by the initiator provider" },
    { id: "lkey", label: "LKEY", lines: [126], wr: exact(writeWr.localLkey), wire: "No direct transmitted field", direct: false, explanation: "the normal local key is not carried as a BTH/RETH field" },
    { id: "wr-id", label: "WR ID", lines: [127], wr: exact(writeWr.wrId), wire: "No direct transmitted field", direct: false, explanation: "WR ID is local completion bookkeeping, not PSN" },
  ] as const;
  const [selected, setSelected] = useState<(typeof rows)[number]["id"]>("remote-address");
  const [payloadMatchVisible, setPayloadMatchVisible] = useState(false);
  const active = rows.find((row) => row.id === selected) || rows[0];
  const targetAfter = snapshot(memoryRegion(writeExperiment, "hostb"), "c:memory:hostb:after");
  const payloadMatches = hexEqual(targetAfter.hex, writePacket.payloadHex);
  return (
    <OperationShell title="Actual Python → WR → packet correlation" testId="visual-8-7" controls={<ActionButton testId="inspect-write-payload-match" active={payloadMatchVisible} onClick={() => setPayloadMatchVisible(true)}>Inspect payload match</ActionButton>}>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label="select WRITE correlation field">
        {rows.map((row) => <ActionButton key={row.id} testId={`correlate-${row.id}`} active={selected === row.id} onClick={() => setSelected(row.id)}>{row.label}</ActionButton>)}
      </div>
      <div className="grid gap-3 xl:grid-cols-3" data-testid="selected-code-wire-chain" data-field={active.id} data-direct-field={active.direct ? "true" : "false"}>
        <section className="rounded-xl border border-white/10 bg-slate-950/50 p-3" data-testid="correlation-source-lines">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">embedded Python source</div>
          <div className="mt-2 space-y-1 font-mono text-xs text-cyan-50">{active.lines.map((line) => <div key={line} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 rounded bg-cyan-300/8 px-1.5 py-1"><span className="text-right text-slate-500">{line}</span><code className="whitespace-pre-wrap break-words">{lineText("python/exp_c_write.py", line)}</code></div>)}</div>
        </section>
        <section className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3" data-testid="correlation-runtime-value"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100/70">runtime WR/evidence</div><div className="mt-2 break-words font-mono text-sm text-cyan-50">{active.wr}</div></section>
        <section className="rounded-xl border border-orange-300/25 bg-orange-300/8 p-3" data-testid="correlation-packet-value"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-100/70">captured packet field</div><div className="mt-2 break-words font-mono text-sm text-orange-50">{active.wire}</div></section>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/4 p-3 text-sm text-slate-300" data-testid="correlation-field-explanation">{active.explanation}{active.direct ? "." : "; there is no corresponding transmitted BTH/RETH field."}</div>
      <div className="grid gap-3 xl:grid-cols-2">
        <WorkRequestCard request={writeWr} testId="correlation-write-wr" />
        <CompactPacketCard packetValue={writePacket} title={`actual WRITE packet ${writePacket.id}`} />
      </div>
      {payloadMatchVisible ? <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/8 p-3 text-sm text-emerald-50" data-testid="write-payload-target-match" data-equal={payloadMatches ? "true" : "false"}>Unpadded packet payload equals the recorded target after snapshot across the observed 53 bytes: {payloadMatches ? "exact match" : "mismatch"}.</div> : null}
      <details className="rounded-xl border border-white/10 bg-white/4 p-3"><summary className="cursor-pointer text-sm text-cyan-100">Inspect complete WRITE source excerpt</summary><div className="mt-3"><SourceLines path="python/exp_c_write.py" start={124} end={140} title="WRITE construction, submission and completion polling" /></div></details>
    </OperationShell>
  );
}

function InvestigationEvidence({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/7 p-3" data-testid="investigation-evidence-reveal">{children}</div>;
}

function Lesson88() {
  const [evidenceStage, setEvidenceStage] = useState(0);
  const sendPacket = packet(sendExperiment, "request");
  const recvWr = workRequest(sendExperiment, "receive");
  const region = memoryRegion(sendExperiment, "hostb");
  const received = snapshot(region, "b:memory:hostb:received");
  const completion = completionFor(sendExperiment, "hostb");
  return (
    <OperationShell title="Case A — Find the destination buffer" testId="visual-8-8" controls={<>
      <ActionButton testId="reveal-receive-instruction" active={evidenceStage >= 1} onClick={() => setEvidenceStage(1)}>Reveal receive instruction</ActionButton>
      <ActionButton testId="reveal-completion-verified-bytes" active={evidenceStage >= 2} disabled={evidenceStage < 1} onClick={() => setEvidenceStage(2)}>Reveal completion and verified bytes</ActionButton>
    </>}>
      <PacketInspector packetValue={sendPacket} testId="case-a-packet" />
      <Quiz id="case-a-destination" question="Can this packet alone identify the destination virtual address?" options={["Yes, the BTH contains it", "No, the destination comes from posted receive work", "Yes, the UDP port identifies it"]} correct={1} feedback="BTH selects the endpoint, not a particular application buffer. UDP 4791 identifies RoCEv2 encapsulation, not a memory address." />
      <Quiz id="case-a-additional-record" question="Which additional record shows what arrived in B's application buffer?" options={["B's verified receive bytes", "A's destination QPN alone", "The captured Ethernet destination alone"]} correct={0} feedback="B's verified receive bytes are application memory evidence correlated with the posted receive description. Endpoint or Ethernet identity alone does not reveal the application buffer contents." />
      {evidenceStage >= 1 ? <InvestigationEvidence><WorkRequestCard request={recvWr} testId="case-a-receive-wr" /></InvestigationEvidence> : null}
      {evidenceStage >= 2 ? <InvestigationEvidence><div className="grid gap-3 xl:grid-cols-2"><CompletionCard completion={completion} testId="case-a-receive-completion" /><MemorySnapshotCard snapshotValue={received} capacity={region.length} title="B verified receive bytes" /></div><div className="mt-3"><EventFact id="b:hostb:exp-b-receiver:7" label="B memory verification event" /></div></InvestigationEvidence> : null}
    </OperationShell>
  );
}

function Lesson89() {
  const [stage, setStage] = useState(0);
  const [selectedPacket, setSelectedPacket] = useState<"request" | "acknowledgement">("request");
  const request = packet(writeExperiment, "request");
  const ackPacket = packet(writeExperiment, "acknowledgement");
  const completion = completionFor(writeExperiment, "hosta");
  const after = snapshot(memoryRegion(writeExperiment, "hostb"), "c:memory:hostb:after");
  const verifiedMatch = hexEqual(after.hex, request.payloadHex);
  return (
    <OperationShell title="Case B — Does an ACK notify the target application?" testId="visual-8-9" controls={<>
      <ActionButton testId="reveal-writer-completion" active={stage >= 1} onClick={() => setStage(1)}>Reveal writer completion</ActionButton>
      <ActionButton testId="reveal-control-and-target-poll" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Reveal B's control signal and poll</ActionButton>
      <ActionButton testId="reveal-target-memory-evidence" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Reveal target memory evidence</ActionButton>
    </>}>
      <div className="grid gap-3 xl:grid-cols-2" data-testid="case-b-selectable-packets"><CompactPacketCard packetValue={request} selected={selectedPacket === "request"} onClick={() => setSelectedPacket("request")} title={`WRITE request · ${request.id} · frame ${request.frameNumber}`} testId="case-b-select-write-request" /><CompactPacketCard packetValue={ackPacket} selected={selectedPacket === "acknowledgement"} onClick={() => setSelectedPacket("acknowledgement")} title={`reverse ACK · ${ackPacket.id} · frame ${ackPacket.frameNumber}`} testId="case-b-select-ack" /></div><div className="rounded-xl border border-white/10 bg-white/4 p-3 text-sm text-slate-300" data-testid="case-b-selected-packet-note">Selected packet: {selectedPacket === "request" ? "ordinary WRITE request with visible RETH remote address/RKEY" : "reverse ACK targeting the writer endpoint with zero application payload"}.</div>
      <Quiz id="case-b-ack-meaning" question="Does the ACK prove that B's Python process has consumed the data?" options={["Yes", "No"]} correct={1} checkEnabled={stage >= 2} answerHiddenReason="Answer feedback is hidden until the synchronized evidence is revealed or the review is skipped." feedback="The ACK is transport evidence. It does not show the target application's later poll or memory verification." />
      <Quiz id="case-b-target-poll" question="What does B observe when it polls after the synchronization signal in this run?" options={["Ordinary receive completion", "Zero entries", "A copy of the ACK packet"]} correct={1} checkEnabled={stage >= 2} answerHiddenReason="Answer feedback is hidden until the synchronized evidence is revealed or the review is skipped." feedback="The recorded synchronized poll returns zero entries for this ordinary WRITE. CQ entries are local work results, not packet copies." />
      {stage >= 1 ? <CompletionCard completion={completion} testId="case-b-writer-completion" /> : null}
      {stage >= 2 ? <InvestigationEvidence><div className="grid gap-2"><EventFact id="c:hostb:exp-c-target:5" label="write_done signal" /><EventFact id="c:hostb:exp-c-target:6" label="target zero-entry poll" /></div><div className="mt-3"><SourceLines path="python/exp_c_write.py" start={155} end={171} title="Target synchronization, poll and verification source" /></div></InvestigationEvidence> : null}
      {stage >= 3 ? <><MemorySnapshotCard snapshotValue={after} capacity={4096} title="target verified memory prefix" testId="case-b-target-memory" /><div className="rounded-xl border border-emerald-300/25 bg-emerald-300/8 p-3 text-sm text-emerald-50" data-testid="case-b-buffer-comparison" data-equal={verifiedMatch ? "true" : "false"}>Target verified memory prefix exact comparison with the unpadded WRITE payload: {verifiedMatch ? "match" : "mismatch"}.</div></> : null}
    </OperationShell>
  );
}

function Lesson810() {
  const [stage, setStage] = useState(0);
  const response = packet(readExperiment, "response");
  const request = packet(readExperiment, "request");
  const readWr = workRequest(readExperiment, "rdma-read");
  const completion = completionFor(readExperiment, "hosta");
  const aRegion = memoryRegion(readExperiment, "hosta");
  const bRegion = memoryRegion(readExperiment, "hostb");
  const sourceBefore = snapshot(bRegion, "d:memory:hostb:before");
  const result = snapshot(aRegion, "d:memory:hosta:read-result");
  return (
    <OperationShell title="Case C — Who initiated this response?" testId="visual-8-10" controls={<>
      <ActionButton testId="find-earlier-read-request" active={stage >= 1} onClick={() => setStage(1)}>Find the earlier request</ActionButton>
      <ActionButton testId="inspect-originating-read-work" active={stage >= 2} disabled={stage < 1} onClick={() => setStage(2)}>Inspect originating work</ActionButton>
      <ActionButton testId="inspect-read-data-completion" active={stage >= 3} disabled={stage < 2} onClick={() => setStage(3)}>Inspect data and completion</ActionButton>
    </>}>
      <PacketInspector packetValue={response} testId="case-c-response" />
      <Quiz id="case-c-initiator" question="Given this decoded RC READ response and its prepared A/B endpoint context, which host initiated the associated READ?" options={["A", "B", "Both submitted a READ"]} correct={0} feedback="A initiated the READ. B transmitted the response while servicing that operation; packet direction alone would be insufficient." />
      <Quiz id="case-c-target-endpoint" question="Which endpoint does this response target?" options={[`A local QPN ${exact(endpoint(readExperiment, "hosta").qpn, "decimal")}`, `B local QPN ${exact(endpoint(readExperiment, "hostb").qpn, "decimal")}`]} correct={0} feedback="The reverse response targets A's local QP, matching the original initiator context." />
      <Quiz id="case-c-completion-owner" question="Which application should observe READ completion?" options={["A", "B", "both"]} correct={0} feedback="The initiating reader observes the signalled READ completion after returned bytes are placed locally." />
      {stage >= 1 ? <InvestigationEvidence><CompactPacketCard packetValue={request} title={`earlier READ request · ${request.id}`} testId="case-c-earlier-request" /><div className="mt-2 text-sm text-emerald-50">The request travelled A→B with RETH and zero payload; the response travelled B→A with payload and no RETH.</div></InvestigationEvidence> : null}
      {stage >= 2 ? <InvestigationEvidence><WorkRequestCard request={readWr} testId="case-c-originating-wr" /><div className="mt-2 text-sm text-emerald-50">The originating READ WR belongs to reader A. No new B application SEND WR is inferred.</div></InvestigationEvidence> : null}
      {stage >= 3 ? <InvestigationEvidence><div className="grid gap-3 xl:grid-cols-2"><MemorySnapshotCard snapshotValue={sourceBefore} capacity={bRegion.length} title="B source before · prefix evidence" testId="case-c-source-before" /><MemorySnapshotCard snapshotValue={result} capacity={aRegion.length} title="A verified read result" testId="case-c-read-result" /></div><div className="mt-3 grid gap-3 xl:grid-cols-2"><CompletionCard completion={completion} testId="case-c-reader-completion" /><div className="space-y-2"><EventFact id="d:hostb:exp-d-source:5" label="B received read_done" /><EventFact id="d:hostb:exp-d-source:6" label="B source poll after synchronization · zero entries" /></div></div></InvestigationEvidence> : null}
    </OperationShell>
  );
}

function Lesson811() {
  const [mode, setMode] = useState<"host" | "gpu" | "congestion">("host");
  return (
    <OperationShell title="Conceptual bridge from Soft-RoCE laboratory to AI fabrics" provenance="conceptual" testId="visual-8-11" controls={<>
      <ActionButton testId="compare-host-memory-path" active={mode === "host"} onClick={() => setMode("host")}>Compare host-memory path</ActionButton>
      <ActionButton testId="inspect-gpu-memory-path" active={mode === "gpu"} onClick={() => setMode("gpu")}>Inspect possible GPU-memory path</ActionButton>
      <ActionButton testId="inspect-fabric-congestion" active={mode === "congestion"} onClick={() => setMode("congestion")}>Inspect fabric congestion</ActionButton>
    </>}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)]" data-testid="ai-fabric-bridge">
        {["AI host A", "AI host B"].map((host, index) => (
          <section key={host} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <h3 className="text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">{host}</h3>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="rounded-lg border border-white/10 bg-white/4 p-2">application / communication library</div>
              <div className={cx("rounded-lg border p-2", mode === "gpu" ? "border-violet-300/30 bg-violet-300/8 text-violet-100" : "border-sky-300/25 bg-sky-300/8 text-sky-100")}>{mode === "gpu" ? "supported GPU memory + host resources" : "host application memory"}</div>
              <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/8 p-2">RDMA resources · QP/CQ/MR</div>
              <div className="rounded-lg border border-orange-300/25 bg-orange-300/8 p-2">representative RNIC</div>
            </div>
          </section>
        ))}
        <div className="order-first rounded-xl border border-orange-300/20 bg-orange-300/7 p-3 text-center lg:order-none" data-testid="conceptual-fabric-path">
          <div className="text-[10px] uppercase tracking-[0.15em] text-orange-100">leaf/spine fabric</div>
          <div className="mt-3 font-mono text-cyan-200">RNIC ⇄ switch ⇄ switch ⇄ RNIC</div>
          {mode === "congestion" ? <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-2 text-xs text-amber-50">one conceptual queue builds · ECN mark · receiver-to-sender CNP concept · PFC link behavior is distinct</div> : <div className="mt-3 text-xs text-slate-400">switch path is distinct from memory and application instructions</div>}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2" data-testid="ai-control-payload-paths">
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-3 text-sm text-cyan-50"><span className="font-semibold">CPU/control path:</span> application/library → RDMA resources → RNIC instructions; dashed conceptual control, not packet payload.</div>
        <div className="rounded-xl border border-orange-300/20 bg-orange-300/7 p-3 text-sm text-orange-50"><span className="font-semibold">Memory payload path:</span> {mode === "gpu" ? "supported GPU memory" : "host memory"} → RNIC → leaf/spine fabric → RNIC → destination memory; solid conceptual payload direction.</div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/4 p-3" data-testid="ai-troubleshooting-chapter-links">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Verified troubleshooting layers</div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <a className="rounded-full border border-cyan-300/25 px-2.5 py-1 text-cyan-100 underline-offset-4 hover:underline" href="/learn/ch15-ip-routing-ai-fabrics">Chapter 15 · IP routing in AI fabrics</a>
          <a className="rounded-full border border-cyan-300/25 px-2.5 py-1 text-cyan-100 underline-offset-4 hover:underline" href="/learn/ch16-gpu-compute-network-packet-anatomy">Chapter 16 · compute-network packet anatomy</a>
          <a className="rounded-full border border-cyan-300/25 px-2.5 py-1 text-cyan-100 underline-offset-4 hover:underline" href="/learn/ch5-pfc-ecn-congestion">Chapter 5 · PFC/ECN congestion</a>
          <a className="rounded-full border border-cyan-300/25 px-2.5 py-1 text-cyan-100 underline-offset-4 hover:underline" href="/learn/ch8-nccl-performance">Chapter 8 · NCCL performance</a>
        </div>
      </div>
      <div className="rounded-xl border border-amber-300/25 bg-amber-300/8 p-3 text-sm leading-6 text-amber-50" data-testid="ai-bridge-scope-label">Conceptual bridge only: no performance numbers, no measured NCCL/GPU experiment and no claim that this Soft-RoCE capture used GPU memory.</div>
    </OperationShell>
  );
}

function Lesson812() {
  const [area, setArea] = useState("objective");
  const areas = [
    ["objective", "Objective", "Which application bytes must move, in which direction, and what result must be verified?"],
    ["preparation", "Preparation", "Which memory regions, permissions, endpoints, keys and receive descriptions are required before work is submitted?"],
    ["submission", "Submission", "Which local Work Request and opcode did the initiator submit, and which fields are local-only?"],
    ["transport", "Transport", "Which packets, directions, opcodes, QPNs, PSNs, RETH/payload/padding and acknowledgements are visible?"],
    ["observation", "Application observation", "Which completion, synchronization and exact memory verification establish the application result?"],
  ] as const;
  const active = areas.find((item) => item[0] === area) || areas[0];
  return (
    <OperationShell title="Final causal troubleshooting checklist" testId="visual-8-12" controls={<>
      {areas.map(([id, label]) => <ActionButton key={id} testId={`checklist-${id}`} active={area === id} onClick={() => setArea(id)}>{label}</ActionButton>)}
    </>}>
      <div className="grid gap-2 md:grid-cols-5" data-testid="causal-troubleshooting-map">
        {areas.map(([id, label], index) => <button key={id} type="button" onClick={() => setArea(id)} className={cx("rounded-xl border p-3 text-center text-xs font-semibold", area === id ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50" : "border-white/10 bg-white/4 text-slate-300")}><span className="text-cyan-200">{index + 1}</span><br />{label}</button>)}
      </div>
      <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 p-4" data-testid="selected-checklist-area"><div className="font-semibold text-cyan-100">{active[1]}</div><p className="mt-2 text-sm leading-6 text-slate-300">{active[2]}</p><div className="mt-3 flex flex-wrap gap-2 text-xs">{[["send-receive", "SEND/RECEIVE"], ["write", "WRITE"], ["read", "READ"]].map(([id, label]) => <a key={id} className="rounded-full border border-cyan-300/25 px-2.5 py-1 text-cyan-100 underline-offset-4 hover:underline" href={`/practical/rdma?lesson=${id}`}>Review {label}</a>)}</div></div>
      <details className="rounded-xl border border-white/10 bg-white/4 p-3"><summary className="cursor-pointer text-sm font-semibold text-cyan-100">Review one real run</summary><div className="mt-3 grid gap-3 md:grid-cols-3" data-testid="real-run-review-links">
        {[sendExperiment, writeExperiment, readExperiment].map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/45 p-3"><div className="font-semibold text-slate-100">{item.id}</div><div className="mt-1 text-xs text-slate-500">{item.packets.map((itemPacket) => itemPacket.id).join(" · ")}</div><div className="mt-2"><CaptureLink experimentValue={item} /></div></div>)}
      </div></details>
      <div className="flex flex-wrap gap-2" data-testid="final-reference-actions"><a className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200" href="/practical/rdma/explorer">Open advanced execution explorer</a><a className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200" href="/practical/rdma/reference-evidence.json">Download lab evidence JSON</a></div>
      <Quiz id="final-distinction-review" question="Which object reports the outcome of eligible local work to an application?" options={["Network ACK", "Work Completion", "UDP destination port"]} correct={1} feedback="A Work Completion is local application evidence. A network ACK is transport evidence, and UDP 4791 identifies encapsulation." />
    </OperationShell>
  );
}

export function OperationsVisual({ sectionId }: { sectionId: string }) {
  const components: Record<string, () => ReactNode> = {
    "5.1": Lesson51,
    "5.2": Lesson52,
    "5.3": Lesson53,
    "5.4": Lesson54,
    "5.5": Lesson55,
    "5.6": Lesson56,
    "5.7": Lesson57,
    "5.8": Lesson58,
    "5.9": Lesson59,
    "6.1": Lesson61,
    "6.2": Lesson62,
    "6.3": Lesson63,
    "6.4": Lesson64,
    "6.5": Lesson65,
    "6.6": Lesson66,
    "6.7": Lesson67,
    "6.8": Lesson68,
    "7.1": Lesson71,
    "7.2": Lesson72,
    "7.3": Lesson73,
    "7.4": Lesson74,
    "7.5": Lesson75,
    "7.6": Lesson76,
    "7.7": Lesson77,
    "8.1": Lesson81,
    "8.2": Lesson82,
    "8.3": Lesson83,
    "8.4": Lesson84,
    "8.5": Lesson85,
    "8.6": Lesson86,
    "8.7": Lesson87,
    "8.8": Lesson88,
    "8.9": Lesson89,
    "8.10": Lesson810,
    "8.11": Lesson811,
    "8.12": Lesson812,
  };
  const Component = components[sectionId];
  if (!Component) return <div className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-red-100">Missing authored visual mapping for section {sectionId}</div>;
  return <Component />;
}
