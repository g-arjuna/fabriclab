"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  asciiFromBytes,
  bytesFromHex,
  exact,
  packetLengthBreakdown,
  rdmaEvidence,
  type Completion,
  type Endpoint,
  type Experiment,
  type MemoryRegion,
  type MemorySnapshot,
  type PacketRecord,
  type WorkRequest,
} from "@/lib/practical/rdmaEvidence";
import { PacketSummary } from "./operationVisuals";
import { cx, exactValue, SourceExcerpt } from "./visuals";

export function experiment(id: "send-recv" | "write" | "read") {
  return rdmaEvidence.experiments.find((item) => item.id === id)!;
}

export function packet(experimentValue: Experiment, role: "request" | "response" | "acknowledgement") {
  return experimentValue.packets.find((item) => item.role === role)!;
}

export function workRequest(experimentValue: Experiment, kind: WorkRequest["kind"]) {
  return experimentValue.workRequests.find((item) => item.kind === kind)!;
}

export function completionFor(experimentValue: Experiment, host: "hosta" | "hostb") {
  return experimentValue.completions.find((item) => item.host === host)!;
}

export function memoryRegion(experimentValue: Experiment, host: "hosta" | "hostb") {
  return experimentValue.memoryRegions.find((item) => item.host === host)!;
}

export function snapshot(region: MemoryRegion, id: string) {
  return region.snapshots.find((item) => item.id === id)!;
}

export function endpoint(experimentValue: Experiment, host: "hosta" | "hostb"): Endpoint {
  return experimentValue.endpoints.initiator.host === host ? experimentValue.endpoints.initiator : experimentValue.endpoints.responder;
}

export function sourceLines(path: string, start: number, end: number) {
  const source = rdmaEvidence.sources.find((item) => item.path === path);
  return source?.lines.filter((line) => line.number >= start && line.number <= end) || [];
}

export function SourceLines({ path, start, end, title, testId }: { path: string; start: number; end: number; title: string; testId?: string }) {
  return (
    <div data-testid={testId}>
      <SourceExcerpt path={path} start={start} end={end} title={title} />
    </div>
  );
}

export function ProvenanceTag({ kind, children }: { kind: "recorded" | "source-derived" | "conceptual"; children?: ReactNode }) {
  const styles = {
    recorded: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    "source-derived": "border-sky-300/30 bg-sky-300/10 text-sky-100",
    conceptual: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  } as const;
  return <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", styles[kind])} data-testid={`provenance-${kind}`}>{children || kind}</span>;
}

export function ActionButton({ children, onClick, active = false, disabled = false, testId }: { children: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      data-testid={testId}
      className={cx(
        "rounded-full border px-3.5 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-50" : "border-white/12 bg-slate-950/45 text-slate-200 hover:border-cyan-300/35 hover:text-cyan-100",
      )}
    >
      {children}
    </button>
  );
}

export function ByteCells({ hex, label, limit, newlineVisible = true, testId }: { hex: string | null | undefined; label: string; limit?: number; newlineVisible?: boolean; testId?: string }) {
  const bytes = bytesFromHex(hex);
  const visible = typeof limit === "number" ? bytes.slice(0, limit) : bytes;
  if (!visible.length) return <div className="rounded-lg border border-white/10 p-2 text-xs text-slate-500">no bytes</div>;
  return (
    <div data-testid={testId || "byte-cells"}>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">
        <span>{label}</span>
        {typeof limit === "number" && bytes.length > limit ? <span>first {limit} of {bytes.length} bytes</span> : <span>{bytes.length} bytes</span>}
      </div>
      <div className="flex max-w-full flex-wrap gap-1" aria-label={`${label}: ${asciiFromBytes(bytes)}`}>
        {visible.map((byte, index) => {
          const newline = byte === 10;
          return (
            <span key={`${index}-${byte}`} className={cx("rounded border px-1.5 py-1 font-mono text-[11px]", newline && newlineVisible ? "border-violet-300/45 bg-violet-300/12 text-violet-100" : "border-cyan-300/25 bg-cyan-300/8 text-cyan-50")} title={newline ? "newline byte 0x0a" : `byte offset ${index}: 0x${byte.toString(16).padStart(2, "0")}`}>
              {newline && newlineVisible ? "\\n" : byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : `0x${byte.toString(16).padStart(2, "0")}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function HexByteTable({ hex, label, testId }: { hex: string | null | undefined; label: string; testId?: string }) {
  const bytes = bytesFromHex(hex);
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/50 p-2" data-testid={testId}>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <table className="font-mono text-[11px] text-slate-300">
        <tbody>
          <tr>{bytes.map((_, index) => <th key={index} className="px-1.5 py-1 text-right font-normal text-slate-600">{index}</th>)}</tr>
          <tr>{bytes.map((byte, index) => <td key={index} className={cx("px-1.5 py-1 text-cyan-100", byte === 10 && "rounded bg-violet-300/15 text-violet-100")}>{byte.toString(16).padStart(2, "0")}</td>)}</tr>
          <tr>{bytes.map((byte, index) => <td key={index} className="px-1.5 py-1 text-slate-400">{byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : byte === 10 ? "\\n" : "."}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}

export function MemorySnapshotCard({ snapshotValue, capacity, title, testId }: { snapshotValue: MemorySnapshot; capacity: number; title: string; testId?: string }) {
  const bytes = bytesFromHex(snapshotValue.hex);
  return (
    <section className="rounded-2xl border border-sky-300/20 bg-sky-300/6 p-4" data-testid={testId || "memory-snapshot-card"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-sky-100">{title}</h3>
        <ProvenanceTag kind="recorded" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">sample bytes</div><div className="mt-1 font-mono text-sm text-slate-100">{bytes.length}</div></div>
        <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">registered capacity</div><div className="mt-1 font-mono text-sm text-slate-100">{capacity}</div></div>
        <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">snapshot id</div><div className="mt-1 break-all font-mono text-[11px] text-slate-100">{snapshotValue.id}</div></div>
      </div>
      <div className="mt-3"><ByteCells hex={snapshotValue.hex} label="recorded byte sample" /></div>
      {bytes.length < capacity ? <div className="mt-2 text-xs text-slate-500" data-testid="unobserved-memory-note">remaining registered capacity: not independently observed in this snapshot</div> : null}
    </section>
  );
}

export function CompactPacketCard({ packetValue, title, selected = false, onClick, testId }: { packetValue: PacketRecord; title?: string; selected?: boolean; onClick?: () => void; testId?: string }) {
  const lengths = packetLengthBreakdown(packetValue);
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-orange-100">{title || `frame ${packetValue.frameNumber} · ${packetValue.opcodeName}`}</div>
        <ProvenanceTag kind="recorded" />
      </div>
      <div className="mt-2 grid gap-1 font-mono text-xs text-slate-300">
        <div>{packetValue.sourceIp} → {packetValue.destinationIp}</div>
        <div>dest QPN {exact(packetValue.destinationQpn)} · PSN {exact(packetValue.psn)}</div>
        <div>payload {lengths.applicationPayloadBytes} · pad {lengths.transportPaddingBytes} · frame {lengths.totalFrameBytes}</div>
        <div>{packetValue.reth ? `RETH addr ${exact(packetValue.reth.virtualAddress)} · RKEY ${exact(packetValue.reth.rkey)} · len ${exact(packetValue.reth.dmaLength, "decimal")}` : "no RETH"}</div>
      </div>
    </>
  );
  const className = cx("w-full rounded-xl border p-3 text-left transition", selected ? "border-orange-300/55 bg-orange-300/15" : "border-orange-300/20 bg-orange-300/6 hover:border-orange-300/40");
  if (!onClick) return <section className={className} data-testid={testId || "compact-packet-card"}>{content}</section>;
  return <button type="button" onClick={onClick} aria-pressed={selected} className={cx(className, "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300")} data-testid={testId || "compact-packet-card"}>{content}</button>;
}

export function PacketInspector({ packetValue, testId = "operations-packet-inspector" }: { packetValue: PacketRecord; testId?: string }) {
  return (
    <div className="space-y-3" data-testid={testId} data-packet-id={packetValue.id}>
      <PacketSummary packet={packetValue} />
      <details className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-orange-100">Inspect decoded protocol tree and raw frame</summary>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <div className="space-y-2">
            {packetValue.protocolTree.map((protocol) => (
              <section key={protocol.protocol} className="rounded-lg border border-white/10 bg-white/4 p-2" data-testid={`protocol-${protocol.protocol.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="text-xs font-semibold text-cyan-100">{protocol.protocol}</div>
                <dl className="mt-1 grid gap-1 font-mono text-[11px] text-slate-300">
                  {protocol.fields.map((field) => <div key={`${protocol.protocol}-${field.name}`} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2"><dt className="text-slate-500">{field.name}</dt><dd className="break-all">{field.value}</dd></div>)}
                </dl>
              </section>
            ))}
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950/80 p-3 font-mono text-[11px] leading-5 text-slate-300" data-testid="packet-raw-hex">{packetValue.rawHex}</pre>
        </div>
      </details>
    </div>
  );
}

export function completionWorkRequest(completion: Completion) {
  for (const experimentValue of rdmaEvidence.experiments) {
    const request = experimentValue.workRequests.find((item) => item.id === completion.workRequestId);
    if (request) return request;
  }
  return undefined;
}

function completionTitle(completion: Completion) {
  const host = completion.host === "hosta" ? "Server A" : "Server B";
  const opcode = completion.opcode.toLowerCase();
  if (opcode.includes("receive")) return `${host} receive completion`;
  if (opcode.includes("read")) return `${host} READ completion`;
  if (opcode.includes("write")) return `${host} WRITE completion`;
  return `${host} send completion`;
}

function completionByteSemantics(completion: Completion) {
  const opcode = completion.opcode.toLowerCase();
  const request = completionWorkRequest(completion);
  if (opcode.includes("receive")) {
    return {
      label: "Received message length",
      value: completion.byteLength,
      explanation: "The successful receive completion supplies the byte count used by this application when reading its buffer.",
    };
  }
  if (opcode.includes("read")) {
    return {
      label: "Requested transfer length / recorded reader completion byte_len",
      value: `${request?.byteLength ?? "—"} / ${completion.byteLength}`,
      explanation: "The requested transfer length comes from the READ memory descriptions. The reference reader uses the successful completion byte_len to read that many local bytes and then verifies the returned data.",
    };
  }
  return {
    label: "Recorded RXE completion byte_len",
    value: completion.byteLength,
    explanation: "This is a value recorded from the software provider in our reference run. Do not treat the send-side byte_len field as a portable guarantee of remote memory contents or target application consumption.",
  };
}

function CompletionLifecycleNote() {
  return (
    <div className="mt-3 rounded-lg border border-lime-300/20 bg-slate-950/45 p-2.5" data-testid="completion-cq-lifecycle">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-lime-100/90">
        <span>Provider reports eligible completion</span><span aria-hidden="true">→</span>
        <span>Completion Queue</span><span aria-hidden="true">→</span>
        <span>Application polls</span><span aria-hidden="true">→</span>
        <span>Retrieved Work Completion</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-4 text-lime-100/70">
        Once retrieved, the completion is outside the pending CQ. Where the pre-poll CQE was not independently observed, that intermediate state is conceptual; the recorded event represents the application's retrieval of the result. A captured ACK packet is not itself inserted into the Completion Queue.
      </p>
    </div>
  );
}

export function CompletionCard({ completion, testId }: { completion: Completion; testId?: string }) {
  const byteSemantics = completionByteSemantics(completion);
  return (
    <section className="rounded-xl border border-lime-300/25 bg-lime-300/8 p-3" data-testid={testId || "recorded-completion-card"}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold text-lime-100">{completionTitle(completion)}</div><ProvenanceTag kind="recorded" /></div>
      <dl className="mt-2 grid gap-1 font-mono text-xs text-lime-50/90 sm:grid-cols-2">
        <div>host: {completion.host === "hosta" ? "Server A" : "Server B"}</div>
        <div>status: {completion.status}</div>
        <div>opcode: {completion.opcode}</div>
        <div>{byteSemantics.label}: {byteSemantics.value}</div>
        <div>WR ID: {exactValue(completion.wrId)}</div>
        <div>QP: {exactValue(completion.qpNum)}</div>
      </dl>
      <p className="mt-2 text-xs leading-5 text-lime-100/75" data-testid="completion-byte-semantics">{byteSemantics.explanation}</p>
      <CompletionLifecycleNote />
      <details className="mt-2 text-[11px] text-lime-100/65"><summary className="cursor-pointer">Evidence identifier</summary><div className="mt-1 break-all font-mono">{completion.id}</div></details>
    </section>
  );
}

function workRequestTitle(request: WorkRequest) {
  const host = request.host === "hosta" ? "Server A" : "Server B";
  const kind = request.kind === "receive" ? "receive" : request.kind === "rdma-write" ? "WRITE" : request.kind === "rdma-read" ? "READ" : "SEND";
  return `${host} ${kind} work request`;
}

export function WorkRequestCard({ request, testId }: { request: WorkRequest; testId?: string }) {
  return (
    <section className="rounded-xl border border-cyan-300/25 bg-cyan-300/8 p-3" data-testid={testId || "recorded-wr-card"}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold text-cyan-100">{workRequestTitle(request)}</div><ProvenanceTag kind="recorded" /></div>
      <dl className="mt-2 grid gap-1 font-mono text-xs text-cyan-50/90 sm:grid-cols-2">
        <div>kind: {request.kind}</div>
        <div>opcode: {request.opcode}</div>
        <div>WR ID: {exactValue(request.wrId)}</div>
        <div>length: {request.byteLength ?? "—"}</div>
        <div>local addr: {exactValue(request.localAddress)}</div>
        <div>LKEY: {exactValue(request.localLkey)}</div>
        {request.remoteAddress ? <div>remote addr: {exactValue(request.remoteAddress)}</div> : null}
        {request.remoteRkey ? <div>RKEY: {exactValue(request.remoteRkey)}</div> : null}
      </dl>
      <details className="mt-2 text-[11px] text-cyan-100/65"><summary className="cursor-pointer">Evidence identifier</summary><div className="mt-1 break-all font-mono">{request.id}</div></details>
    </section>
  );
}

export function Quiz({
  id,
  question,
  options,
  correct,
  feedback,
  skippable = true,
  persistKey,
  checkEnabled = true,
  answerHiddenReason = "Answer feedback is hidden until checked or skipped.",
}: {
  id: string;
  question: string;
  options: string[];
  correct: number;
  feedback: string;
  skippable?: boolean;
  persistKey?: string;
  checkEnabled?: boolean;
  answerHiddenReason?: string;
}) {
  const storageKey = persistKey || `fabriclab.rdma.operations-v2.quiz.${id}`;
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { selected?: number | null; revealed?: boolean; skipped?: boolean; revision?: string };
        if (parsed.revision === "operations-v2" || parsed.revision === "operations-v2-quiz-r1") {
          const validSelected = typeof parsed.selected === "number" && Number.isInteger(parsed.selected) && parsed.selected >= 0 && parsed.selected < options.length ? parsed.selected : null;
          const validRevealed = Boolean(parsed.revealed) && validSelected !== null;
          const validSkipped = Boolean(parsed.skipped) && !validRevealed;
          setSelected(validSelected);
          setRevealed(validRevealed);
          setSkipped(validSkipped);
        }
      }
    } catch {
      // Optional local progress.
    }
    setHydrated(true);
  }, [options.length, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ selected, revealed, skipped, revision: "operations-v2-quiz-r1" }));
    } catch {
      // Optional local progress.
    }
  }, [hydrated, storageKey, selected, revealed, skipped]);

  const answerVisible = revealed || skipped;
  const answeredCorrectly = selected === correct && revealed && !skipped;
  function choose(index: number) {
    if (answerVisible) return;
    setSelected(index);
  }
  function retry() {
    setSelected(null);
    setRevealed(false);
    setSkipped(false);
  }

  return (
    <section className="rounded-2xl border border-violet-300/20 bg-violet-300/7 p-4" data-testid={`${id}-quiz`} data-hydrated={hydrated ? "true" : "false"}>
      <div className="font-semibold text-violet-100">{question}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {options.map((option, index) => (
          <ActionButton key={option} testId={`${id}-option-${index}`} active={selected === index} disabled={answerVisible} onClick={() => choose(index)}>{option}</ActionButton>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton testId={`${id}-check`} disabled={selected === null || !checkEnabled || answerVisible} onClick={() => setRevealed(true)}>Check answer</ActionButton>
        {skippable && !answerVisible ? <ActionButton testId={`${id}-skip`} onClick={() => setSkipped(true)}>Skip review</ActionButton> : null}
        {answerVisible ? <ActionButton testId={`${id}-retry`} onClick={retry}>Retry or review again</ActionButton> : null}
      </div>
      {answerVisible ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-slate-300" data-testid={`${id}-feedback`} data-correct={answeredCorrectly ? "true" : "false"}>
          {answeredCorrectly ? <span className="font-semibold text-emerald-100">Correct. </span> : selected !== null && revealed ? <span className="font-semibold text-amber-100">Not quite. </span> : <span className="font-semibold text-sky-100">Review explanation. </span>}
          {feedback}{skipped ? " Skipping does not record mastery." : ""}
        </div>
      ) : <div className="mt-3 text-xs text-slate-500" data-testid={`${id}-answer-hidden`}>{answerHiddenReason}</div>}
    </section>
  );
}

export function EndpointFacts({ endpointValue, title }: { endpointValue: Endpoint; title: string }) {
  return (
    <dl className="grid gap-2 text-xs sm:grid-cols-2" data-testid="endpoint-facts">
      <div className="rounded-lg border border-white/10 bg-slate-950/45 p-2"><dt className="text-slate-500">{title} local QPN</dt><dd className="mt-1 font-mono text-cyan-100">{exact(endpointValue.qpn)} / {exact(endpointValue.qpn, "decimal")}</dd></div>
      <div className="rounded-lg border border-white/10 bg-slate-950/45 p-2"><dt className="text-slate-500">destination QPN</dt><dd className="mt-1 font-mono text-cyan-100">{exact(endpointValue.destinationQpn)} / {exact(endpointValue.destinationQpn, "decimal")}</dd></div>
      <div className="rounded-lg border border-white/10 bg-slate-950/45 p-2"><dt className="text-slate-500">SQ/RQ PSN</dt><dd className="mt-1 font-mono text-cyan-100">{exact(endpointValue.sqPsn, "decimal")} / {exact(endpointValue.rqPsn, "decimal")}</dd></div>
      <div className="rounded-lg border border-white/10 bg-slate-950/45 p-2"><dt className="text-slate-500">MR</dt><dd className="mt-1 font-mono text-cyan-100">{exact(endpointValue.memoryRegion.address)} · len {endpointValue.memoryRegion.length}</dd></div>
    </dl>
  );
}
