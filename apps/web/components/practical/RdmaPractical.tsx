"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  asciiFromBytes,
  bytesFromHex,
  exact,
  formatUtcEpoch,
  rdmaEvidence,
  type EvidenceEvent,
  type Experiment,
  type MemoryRegion,
  type PacketRecord,
  type PythonSource,
  type RdmaEvidenceBundle,
  type WalkthroughStep,
  type WorkRequest,
} from "@/lib/practical/rdmaEvidence";

const EXPERIMENT_LABELS: Record<Experiment["id"], string> = {
  resources: "A · Resources",
  "send-recv": "B · SEND/RECEIVE",
  write: "C · RDMA WRITE",
  read: "D · RDMA READ",
};

const KIND_STYLES: Record<WalkthroughStep["kind"], string> = {
  code: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  resource: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  control: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  memory: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "work-request": "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  packet: "border-orange-400/30 bg-orange-400/10 text-orange-200",
  completion: "border-lime-400/30 bg-lime-400/10 text-lime-200",
  verification: "border-teal-400/30 bg-teal-400/10 text-teal-200",
};

const GLOSSARY: Array<{ term: string; definition: string }> = [
  { term: "QP", definition: "Queue Pair: a send queue and receive queue that form one RDMA endpoint." },
  { term: "PD", definition: "Protection Domain: the verbs object that scopes memory regions, queue pairs and access permissions." },
  { term: "MR", definition: "Memory Region: registered memory that the RDMA transport is allowed to access." },
  { term: "CQ", definition: "Completion Queue: a local queue from which the application polls completion records." },
  { term: "WR", definition: "Work Request: the application-level request posted to a queue. It is not itself a packet." },
  { term: "WQE", definition: "Work Queue Entry: the provider's queue representation of posted work; not necessarily identical to the application-level WR object." },
  { term: "CQE", definition: "Completion Queue Entry: a local completion record. It never travels on the network." },
  { term: "PSN", definition: "Packet Sequence Number: a reliable-transport sequence number carried in the BTH." },
  { term: "BTH", definition: "Base Transport Header: the InfiniBand/RoCE transport header containing opcode, destination QPN and PSN." },
  { term: "RETH", definition: "RDMA Extended Transport Header: carries remote virtual address, RKEY and DMA length for WRITE/READ operations." },
  { term: "RoCEv2", definition: "RDMA over Converged Ethernet version 2, encapsulated in UDP/IP with destination port 4791." },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function validExperimentId(value: string | undefined): Experiment["id"] {
  if (value === "resources" || value === "send-recv" || value === "write" || value === "read") {
    return value;
  }
  return "write";
}

function hostLabel(host: string | null | undefined) {
  if (host === "hosta") return "Host A";
  if (host === "hostb") return "Host B";
  if (host === "wire") return "Data network";
  if (host === "both") return "Both hosts";
  return "—";
}

function Panel({
  title,
  eyebrow,
  children,
  className,
  actions,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cx("min-w-0 rounded-[1.5rem] border border-white/10 bg-slate-900/72 shadow-[0_18px_60px_rgba(2,6,23,0.28)] backdrop-blur", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
        <div>
          {eyebrow ? <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p> : null}
          <h2 className="mt-1 text-base font-semibold text-white">{title}</h2>
        </div>
        {actions}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function SmallStat({ label, value, tone = "default" }: { label: string; value: ReactNode; tone?: "default" | "cyan" | "green" | "amber" }) {
  const toneClass = {
    default: "border-white/10 bg-slate-950/70 text-slate-200",
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  }[tone];
  return (
    <div className={cx("rounded-2xl border px-3 py-2", toneClass)}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 break-words font-mono text-sm">{value}</div>
    </div>
  );
}

function ValueRow({ label, value, highlight = false, title }: { label: string; value: ReactNode; highlight?: boolean; title?: string }) {
  return (
    <div className={cx("flex items-start justify-between gap-3 rounded-xl px-2 py-1.5", highlight && "bg-cyan-400/10 ring-1 ring-cyan-400/30")} title={title}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="break-all text-right font-mono text-xs text-slate-200">{value}</dd>
    </div>
  );
}

function ExperimentSelector({
  experimentId,
  onSelect,
}: {
  experimentId: Experiment["id"];
  onSelect: (id: Experiment["id"]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="group" aria-label="Select RDMA experiment">
      {rdmaEvidence.experiments.map((experiment) => {
        const active = experiment.id === experimentId;
        return (
          <button
            key={experiment.id}
            type="button"
            onClick={() => onSelect(experiment.id)}
            aria-pressed={active}
            className={cx(
              "rounded-2xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              active
                ? "border-cyan-300/60 bg-cyan-400/12 shadow-[0_12px_40px_rgba(34,211,238,0.12)]"
                : "border-white/10 bg-slate-950/60 hover:border-white/25 hover:bg-slate-900",
            )}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{EXPERIMENT_LABELS[experiment.id]}</div>
            <div className="mt-1 line-clamp-2 text-sm font-medium text-white">{experiment.title}</div>
            <div className="mt-2 text-xs text-slate-500">
              {experiment.noDataCapture ? "No data WR · no RDMA capture" : `${experiment.packets.length} decoded RoCEv2 packets`}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PlaybackControls({
  stepIndex,
  stepCount,
  playing,
  speed,
  onStart,
  onPrevious,
  onNext,
  onPlayPause,
  onRestart,
  onSpeed,
}: {
  stepIndex: number;
  stepCount: number;
  playing: boolean;
  speed: number;
  onStart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeed: (speed: number) => void;
}) {
  const buttonClass = "rounded-full border border-white/10 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Walkthrough playback controls">
      <button type="button" onClick={onStart} className={buttonClass}>Start</button>
      <button type="button" onClick={onPrevious} disabled={stepIndex === 0} className={buttonClass}>Previous</button>
      <button
        type="button"
        onClick={onPlayPause}
        className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <button type="button" onClick={onNext} disabled={stepIndex >= stepCount - 1} className={buttonClass}>Next</button>
      <button type="button" onClick={onRestart} className={buttonClass}>Restart</button>
      <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
        Speed
        <select
          value={String(speed)}
          onChange={(event) => onSpeed(Number(event.target.value))}
          className="rounded-full border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          aria-label="Playback speed"
        >
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
      </label>
      <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-400">
        Step {stepIndex + 1}/{stepCount}
      </span>
    </div>
  );
}

function TopologyPanel({
  experiment,
  step,
  selectedPacket,
}: {
  experiment: Experiment;
  step: WalkthroughStep;
  selectedPacket: PacketRecord | null;
}) {
  const dataActive = step.plane === "data" || selectedPacket !== null;
  const controlActive = step.plane === "control";
  const initiator = experiment.endpoints.initiator;
  const responder = experiment.endpoints.responder;
  const packetDirection = selectedPacket ? `${selectedPacket.sourceIp} → ${selectedPacket.destinationIp}` : "No packet selected";

  function endpointCard(side: "initiator" | "responder") {
    const endpoint = side === "initiator" ? initiator : responder;
    const focused = step.focusHost === endpoint.host || step.focusHost === "both";
    return (
      <div className={cx(
        "min-w-0 flex-1 rounded-2xl border p-4 transition",
        focused ? "border-cyan-300/50 bg-cyan-400/10" : "border-white/10 bg-slate-950/70",
      )}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">{endpoint.hostLabel}</div>
            <div className="text-xs text-slate-500">{endpoint.roleName} · {endpoint.host}</div>
          </div>
          <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-400">
            {endpoint.qpState ?? "RTS"}
          </span>
        </div>
        <dl className="mt-4 grid gap-1">
          <ValueRow label="Local QPN" value={exact(endpoint.qpn)} highlight={step.kind === "packet" || step.kind === "resource"} />
          <ValueRow label="Peer QPN" value={exact(endpoint.destinationQpn)} />
          <ValueRow label="MR address" value={exact(endpoint.memoryRegion.address)} highlight={step.memoryRegionIds.some((id) => id.endsWith(endpoint.host))} />
          <ValueRow label="RKEY" value={exact(endpoint.memoryRegion.rkey)} />
        </dl>
      </div>
    );
  }

  return (
    <Panel title="Two-host topology" eyebrow="Control plane separate from data plane">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        {endpointCard("initiator")}
        <div className="flex min-w-[210px] flex-col justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className={cx("rounded-xl border px-3 py-2", controlActive ? "border-amber-300/50 bg-amber-400/10" : "border-white/10 bg-slate-900/60")}>
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200">TCP control channel</div>
            <div className="mt-1 font-mono text-xs text-slate-300">192.168.100.1 ↔ 192.168.100.2</div>
            <div className="mt-1 text-xs text-slate-500">Metadata and synchronisation only. No payload and no control packets in the data capture.</div>
          </div>
          <div className={cx("rounded-xl border px-3 py-2", dataActive ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-slate-900/60")}>
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">RoCEv2 data network</div>
            <div className="mt-1 font-mono text-xs text-slate-300">10.10.10.1 ↔ 10.10.10.2 · UDP/4791</div>
            <div className="mt-1 text-xs text-slate-500">{packetDirection}</div>
          </div>
        </div>
        {endpointCard("responder")}
      </div>
    </Panel>
  );
}

function QpStateDiagram({ ready }: { ready: boolean }) {
  const states = ["RESET", "INIT", "RTR", "RTS"];
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Queue pair state transition reset to init to RTR to RTS">
      {states.map((state, index) => {
        const active = ready || index === 0;
        return (
          <div key={state} className="flex items-center gap-2">
            <span className={cx(
              "rounded-full border px-3 py-1.5 font-mono text-xs",
              active ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-slate-950 text-slate-500",
              state === "RTS" && ready && "border-emerald-300/60 bg-emerald-400/10 text-emerald-100",
            )}>
              {state}
            </span>
            {index < states.length - 1 ? <span className="text-slate-600">→</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function ResourcePanel({
  experiment,
  step,
  stepIndex,
  highlightedWrIds,
  highlightedCompletionIds,
}: {
  experiment: Experiment;
  step: WalkthroughStep;
  stepIndex: number;
  highlightedWrIds: Set<string>;
  highlightedCompletionIds: Set<string>;
}) {
  const qpReadyIds = new Set([experiment.endpoints.initiator.qpReadyEventId, experiment.endpoints.responder.qpReadyEventId]);
  const qpReadySeen = experiment.walkthrough.slice(0, stepIndex + 1).some((item) => item.eventIds.some((id) => qpReadyIds.has(id)));
  const writeExperiment = experiment.id === "write";
  const targetCompletions = experiment.completions.filter((completion) => completion.host === experiment.endpoints.responder.host);

  return (
    <Panel title="Verbs resources and completions" eyebrow="Recorded endpoint state">
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Reliable Connected QP state</div>
          <QpStateDiagram ready={qpReadySeen || experiment.id !== "resources"} />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            The recorded end state is RTS. INIT/RTR/RTS are distinct programming steps in the helper source; this is not a packet exchange.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {(["initiator", "responder"] as const).map((side) => {
            const endpoint = experiment.endpoints[side];
            return (
              <div key={side} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{endpoint.hostLabel} · {endpoint.roleName}</h3>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">{side}</span>
                </div>
                <dl className="grid gap-1">
                  <ValueRow label="QPN → peer" value={`${exact(endpoint.qpn)} → ${exact(endpoint.destinationQpn)}`} highlight={step.kind === "packet"} title="The forward packet names the receiving endpoint's local QPN." />
                  <ValueRow label="SQ/RQ PSN" value={`${exact(endpoint.sqPsn, "decimal")} / ${exact(endpoint.rqPsn, "decimal")}`} />
                  <ValueRow label="MR VA" value={exact(endpoint.memoryRegion.address)} />
                  <ValueRow label="LKEY / RKEY" value={`${exact(endpoint.memoryRegion.lkey)} / ${exact(endpoint.memoryRegion.rkey)}`} title="LKEY is local access metadata; RKEY can be shared for remote access." />
                </dl>
              </div>
            );
          })}
        </div>

        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Work requests</div>
          {experiment.workRequests.length ? (
            <div className="grid gap-2">
              {experiment.workRequests.map((request) => (
                <div
                  key={request.id}
                  className={cx(
                    "rounded-2xl border p-3 transition",
                    highlightedWrIds.has(request.id) ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-slate-950/60",
                  )}
                  data-work-request-id={request.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-white">{request.opcode}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-slate-400">wr_id {exact(request.wrId)}</span>
                    <span className="text-xs text-slate-500">{hostLabel(request.host)}</span>
                  </div>
                  <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                    <ValueRow label="Local addr/LKEY" value={`${exact(request.localAddress)} / ${exact(request.localLkey)}`} />
                    {request.remoteAddress ? <ValueRow label="Remote addr/RKEY" value={`${exact(request.remoteAddress)} / ${exact(request.remoteRkey)}`} highlight /> : null}
                    <ValueRow label="Bytes" value={request.byteLength ?? "receive buffer"} />
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-400">
              Experiment A posts no data work request. Resource setup is the entire demonstration.
            </p>
          )}
          <p className="mt-2 text-xs leading-5 text-slate-500">
            WR ID and LKEY are verbs/application metadata. They are not fields in the RoCEv2 BTH or RETH packet headers.
          </p>
        </div>

        <div>
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Completion queue entries</div>
          {experiment.completions.length ? (
            <div className="grid gap-2">
              {experiment.completions.map((completion) => (
                <div
                  key={completion.id}
                  className={cx(
                    "rounded-2xl border p-3",
                    highlightedCompletionIds.has(completion.id) ? "border-lime-300/60 bg-lime-400/10" : "border-white/10 bg-slate-950/60",
                  )}
                  data-completion-id={completion.id}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-white">{completion.opcode}</span>
                    <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">{completion.status}</span>
                    <span className="text-xs text-slate-500">{hostLabel(completion.host)} · wr_id {exact(completion.wrId)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-400">No completion records: no work request was posted.</p>
          )}
          {writeExperiment ? (
            <div className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3" data-testid="write-no-target-cqe">
              <div className="text-sm font-semibold text-emerald-100">Ordinary WRITE target CQ: empty</div>
              <p className="mt-1 text-xs leading-5 text-emerald-100/80">
                Host B posted no receive WR, consumed no receive WR, and observed {targetCompletions.length} target CQEs. Host A can still receive its own signalled completion.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

function CodePanel({
  experiment,
  step,
  sources,
}: {
  experiment: Experiment;
  step: WalkthroughStep;
  sources: PythonSource[];
}) {
  const experimentPath = `python/${experiment.script}`;
  const relevantPaths = Array.from(new Set([experimentPath, "python/rdma_common.py"]));
  const relevantSources = relevantPaths.map((path) => sources.find((source) => source.path === path)).filter((source): source is PythonSource => Boolean(source));
  const firstRefPath = step.codeRefs[0]?.sourcePath;
  const [selectedPath, setSelectedPath] = useState(firstRefPath ?? experimentPath);

  useEffect(() => {
    setSelectedPath(firstRefPath ?? experimentPath);
  }, [firstRefPath, experimentPath]);

  const source = relevantSources.find((item) => item.path === selectedPath) ?? relevantSources[0];
  const activeRefs = step.codeRefs.filter((reference) => reference.sourcePath === source?.path);

  if (!source) {
    return <Panel title="Python source" eyebrow="Pyverbs"><p className="text-sm text-slate-400">Source snapshot unavailable.</p></Panel>;
  }

  return (
    <Panel
      title="Actual Pyverbs source"
      eyebrow="Source snapshot from the validated lab"
      actions={<span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] text-slate-500">sha256 {source.sha256.slice(0, 12)}…</span>}
    >
      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Python source files">
        {relevantSources.map((item) => (
          <button
            key={item.path}
            type="button"
            role="tab"
            aria-selected={item.path === source.path}
            onClick={() => setSelectedPath(item.path)}
            className={cx(
              "rounded-full border px-3 py-1.5 font-mono text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              item.path === source.path ? "border-cyan-300/60 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-slate-950/70 text-slate-400 hover:text-slate-200",
            )}
          >
            {item.path.replace("python/", "")}
          </button>
        ))}
      </div>
      {activeRefs.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {activeRefs.map((reference) => (
            <span key={`${reference.startLine}-${reference.endLine}-${reference.label}`} className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100">
              {reference.label}: lines {reference.startLine}–{reference.endLine}
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-slate-500">This step has no direct Python line reference; inspect the causal events, packet or memory state.</p>
      )}
      <div className="max-h-[520px] overflow-auto rounded-2xl border border-white/10 bg-[#020617]" data-testid="code-panel">
        <pre className="min-w-0 whitespace-pre-wrap break-words py-3 text-xs leading-6 text-slate-300 sm:min-w-max sm:whitespace-pre sm:break-normal">
          {source.lines.map((line) => {
            const highlighted = activeRefs.some((reference) => line.number >= reference.startLine && line.number <= reference.endLine);
            return (
              <div
                key={line.number}
                className={cx(
                  "grid min-w-0 grid-cols-[3.5rem_1fr] px-3",
                  highlighted ? "bg-cyan-400/15 text-cyan-50 shadow-[inset_3px_0_0_#22d3ee]" : "hover:bg-white/[0.03]",
                )}
                data-line-number={line.number}
                data-highlighted={highlighted ? "true" : "false"}
              >
                <span className="select-none pr-4 text-right text-slate-600">{line.number}</span>
                <code className="min-w-0">{line.text || " "}</code>
              </div>
            );
          })}
        </pre>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Pyverbs is Python bindings for the RDMA verbs programming interface. Helper functions are shown in the rdma_common.py tab when they perform part of an operation.
      </p>
    </Panel>
  );
}

function EventFields({ event }: { event: EvidenceEvent }) {
  const entries = Object.entries(event.fields).slice(0, 6);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map(([key, value]) => (
        <span key={key} className="rounded-full bg-slate-950 px-2 py-1 font-mono text-[10px] text-slate-400">
          {key}={typeof value === "object" ? JSON.stringify(value) : String(value)}
        </span>
      ))}
    </div>
  );
}

function TimelinePanel({
  experiment,
  step,
  stepIndex,
  onStep,
  selectedPacketId,
  onPacket,
  selectedEventId,
  onEvent,
}: {
  experiment: Experiment;
  step: WalkthroughStep;
  stepIndex: number;
  onStep: (index: number) => void;
  selectedPacketId: string | null;
  onPacket: (id: string) => void;
  selectedEventId: string | null;
  onEvent: (id: string) => void;
}) {
  const eventsById = new Map(experiment.events.map((event) => [event.id, event]));
  const packetsById = new Map(experiment.packets.map((packet) => [packet.id, packet]));
  const stepEvents = step.eventIds.map((id) => eventsById.get(id)).filter((event): event is EvidenceEvent => Boolean(event));
  const stepPackets = step.packetIds.map((id) => packetsById.get(id)).filter((packet): packet is PacketRecord => Boolean(packet));

  return (
    <Panel title="Causal event timeline" eyebrow="Replay ordering, not a globally synchronised clock">
      <div className="space-y-2" data-testid="event-timeline">
        {experiment.walkthrough.map((item, index) => {
          const active = index === stepIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onStep(index)}
              aria-current={active ? "step" : undefined}
              className={cx(
                "grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                active ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-slate-950/55 hover:border-white/25",
              )}
            >
              <span className={cx("flex h-8 w-8 items-center justify-center rounded-full border font-mono text-xs", active ? "border-cyan-300/60 text-cyan-100" : "border-white/10 text-slate-500")}>{index + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">{item.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.simpleExplanation}</span>
              </span>
              <span className={cx("rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em]", KIND_STYLES[item.kind])}>{item.kind}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-3">
        <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">Records linked to this step</div>
        {stepPackets.length ? (
          <div className="mb-3 grid gap-2">
            {stepPackets.map((packet) => (
              <button
                key={packet.id}
                type="button"
                onClick={() => onPacket(packet.id)}
                className={cx(
                  "rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
                  selectedPacketId === packet.id ? "border-orange-300/70 bg-orange-400/10" : "border-orange-400/20 bg-orange-400/5 hover:border-orange-300/40",
                )}
                data-testid={`packet-link-${packet.frameNumber}`}
              >
                <div className="font-mono text-sm text-orange-100">frame {packet.frameNumber} · {packet.opcodeName}</div>
                <div className="mt-1 text-xs text-slate-400">{packet.sourceIp} → {packet.destinationIp} · dest QPN {exact(packet.destinationQpn)} · PSN {exact(packet.psn, "decimal")}</div>
              </button>
            ))}
          </div>
        ) : experiment.noDataCapture ? (
          <p className="mb-3 rounded-xl border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-400">No packet records are expected for this resources-only experiment.</p>
        ) : (
          <p className="mb-3 text-sm text-slate-500">No packet is directly linked to this step.</p>
        )}

        {stepEvents.length ? (
          <div className="grid gap-2">
            {stepEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onEvent(event.id)}
                className={cx(
                  "rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                  selectedEventId === event.id ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-slate-900/70 hover:border-white/25",
                )}
                data-event-id={event.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-white">{event.type}</span>
                  <span className="text-xs text-slate-500">{hostLabel(event.host)} · seq {event.sequence}</span>
                  {event.type === "cqe" ? <span className="rounded-full bg-lime-400/10 px-2 py-0.5 text-[10px] text-lime-200">completion</span> : null}
                  {event.type.includes("metadata") || event.type.includes("ready") || event.type.includes("signal") ? <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">control channel</span> : null}
                </div>
                <EventFields event={event} />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">This conceptual step is inferred from validated protocol causality; it does not fabricate an application event.</p>
        )}
      </div>
    </Panel>
  );
}

function MemoryBytes({
  title,
  hex,
  compareHex,
  testId,
}: {
  title: string;
  hex: string | null;
  compareHex?: string | null;
  testId?: string;
}) {
  const bytes = bytesFromHex(hex);
  const compare = bytesFromHex(compareHex);
  if (!bytes.length) {
    return <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-500">No byte snapshot recorded for this state.</div>;
  }
  const rows: number[][] = [];
  for (let index = 0; index < bytes.length; index += 16) rows.push(bytes.slice(index, index + 16));
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3" data-testid={testId}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <span className="rounded-full bg-slate-900 px-2 py-1 font-mono text-[10px] text-slate-400">{bytes.length} bytes</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-max space-y-1 font-mono text-[11px] leading-5">
          {rows.map((row, rowIndex) => {
            const offset = rowIndex * 16;
            return (
              <div key={offset} className="flex gap-3">
                <span className="w-12 select-none text-slate-600">{offset.toString(16).padStart(4, "0")}</span>
                <span className="flex gap-1">
                  {row.map((byte, index) => {
                    const absolute = offset + index;
                    const changed = compare.length > absolute && compare[absolute] !== byte;
                    return (
                      <span key={absolute} className={cx("rounded px-0.5", changed ? "bg-emerald-400/25 text-emerald-100" : "text-slate-300")}>
                        {byte.toString(16).padStart(2, "0")}
                      </span>
                    );
                  })}
                </span>
                <span className="text-slate-500">{asciiFromBytes(row)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function snapshotByPreference(region: MemoryRegion, preference: "before" | "after" | "auto") {
  const snapshots = region.snapshots;
  if (preference === "before") return snapshots.find((snapshot) => snapshot.label === "before") ?? snapshots[0];
  if (preference === "after") return snapshots.find((snapshot) => snapshot.label !== "before") ?? snapshots[snapshots.length - 1];
  return snapshots[0];
}

function MemoryPanel({
  experiment,
  step,
  highlightedMemoryIds,
}: {
  experiment: Experiment;
  step: WalkthroughStep;
  highlightedMemoryIds: Set<string>;
}) {
  const regions = experiment.memoryRegions.filter((region) => highlightedMemoryIds.has(region.id) || step.memoryRegionIds.includes(region.id));
  const displayRegions = regions.length ? regions : experiment.memoryRegions;

  return (
    <Panel title="Registered memory" eyebrow="Recorded byte snapshots">
      <div className="space-y-4">
        {displayRegions.map((region) => {
          const before = region.snapshots.find((snapshot) => snapshot.label === "before");
          const after = region.snapshots.find((snapshot) => snapshot.label !== "before");
          const preferred = snapshotByPreference(region, step.memoryState === "before" ? "before" : step.memoryState === "after" ? "after" : "auto");
          const highlighted = highlightedMemoryIds.has(region.id);
          return (
            <article
              key={region.id}
              className={cx("rounded-2xl border p-3 transition", highlighted ? "border-emerald-300/50 bg-emerald-400/8" : "border-white/10 bg-slate-900/55")}
              data-memory-region-id={region.id}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{hostLabel(region.host)} memory region</h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">VA {exact(region.address)} · len {region.length} · LKEY {exact(region.lkey)} · RKEY {exact(region.rkey)}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400">
                  showing {step.memoryState === "none" ? preferred?.label ?? "snapshot" : step.memoryState}
                </span>
              </div>
              {before && after ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  <MemoryBytes title="Before" hex={before.hex} testId={experiment.id === "write" && region.host === "hostb" ? "write-memory-before" : undefined} />
                  <MemoryBytes title="After" hex={after.hex} compareHex={before.hex} testId={experiment.id === "write" && region.host === "hostb" ? "write-memory-after" : undefined} />
                </div>
              ) : (
                <MemoryBytes title={preferred?.label ?? "Snapshot"} hex={preferred?.hex} />
              )}
              {after?.verification ? (
                <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-100">
                  Verification: {Object.entries(after.verification).map(([key, value]) => `${key}=${String(value)}`).join(" · ")}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function HexDump({ rawHex }: { rawHex: string }) {
  const bytes = bytesFromHex(rawHex);
  const rows: number[][] = [];
  for (let index = 0; index < bytes.length; index += 16) rows.push(bytes.slice(index, index + 16));
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/70 p-3">
      <div className="min-w-max space-y-1 font-mono text-[11px] leading-5">
        {rows.map((row, rowIndex) => {
          const offset = rowIndex * 16;
          return (
            <div key={offset} className="flex gap-3">
              <span className="w-12 select-none text-slate-600">{offset.toString(16).padStart(4, "0")}</span>
              <span className="flex gap-1">
                {row.map((byte, index) => <span key={`${offset}-${index}`} className="text-slate-300">{byte.toString(16).padStart(2, "0")}</span>)}
              </span>
              <span className="text-slate-500">{asciiFromBytes(row)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PacketInspector({
  experiment,
  selectedPacket,
  onPacket,
  highlightedWrIds,
  highlightedCompletionIds,
  highlightedMemoryIds,
}: {
  experiment: Experiment;
  selectedPacket: PacketRecord | null;
  onPacket: (id: string) => void;
  highlightedWrIds: Set<string>;
  highlightedCompletionIds: Set<string>;
  highlightedMemoryIds: Set<string>;
}) {
  if (!experiment.packets.length) {
    return (
      <Panel title="Packet inspector" eyebrow="No data capture for Experiment A">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <h3 className="font-semibold text-white">No RDMA data-transfer packets were produced.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Experiment A only creates and connects resources; no data work request was posted. FabricLab deliberately does not fabricate a packet capture for a traffic type that never occurred.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Packet inspector"
      eyebrow="Decoded from the committed capture"
      actions={selectedPacket ? (
        <a href={selectedPacket.downloadPath} download className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 transition hover:bg-cyan-400/20">
          Download {selectedPacket.captureFile}
        </a>
      ) : null}
    >
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Decoded packets">
        {experiment.packets.map((packet) => (
          <button
            key={packet.id}
            type="button"
            role="tab"
            aria-selected={selectedPacket?.id === packet.id}
            onClick={() => onPacket(packet.id)}
            className={cx(
              "rounded-full border px-3 py-1.5 font-mono text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",
              selectedPacket?.id === packet.id ? "border-orange-300/70 bg-orange-400/10 text-orange-100" : "border-white/10 bg-slate-950/70 text-slate-400 hover:text-slate-200",
            )}
          >
            frame {packet.frameNumber} · {packet.opcodeName}
          </button>
        ))}
      </div>

      <div data-testid="packet-inspector">
      {selectedPacket ? (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <SmallStat label="Direction" value={`${selectedPacket.sourceIp} → ${selectedPacket.destinationIp}`} tone="cyan" />
            <SmallStat label="Opcode" value={selectedPacket.opcodeName} tone="amber" />
            <SmallStat label="Dest QPN" value={exact(selectedPacket.destinationQpn)} />
            <SmallStat label="PSN" value={exact(selectedPacket.psn, "decimal")} />
          </div>
          {selectedPacket.reth ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <SmallStat label="RETH virtual address" value={exact(selectedPacket.reth.virtualAddress)} tone="green" />
              <SmallStat label="RETH RKEY" value={exact(selectedPacket.reth.rkey)} tone="green" />
              <SmallStat label="DMA length" value={`${exact(selectedPacket.reth.dmaLength, "decimal")} bytes`} tone="green" />
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
            <h3 className="text-sm font-semibold text-white">Correlated objects</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Work request</div>
                <div className="mt-1 font-mono text-xs text-cyan-100">{selectedPacket.correlations.workRequestIds.length ? `${highlightedWrIds.size} highlighted` : "none"}</div>
              </div>
              <div className="rounded-xl bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Completion</div>
                <div className="mt-1 font-mono text-xs text-lime-100">{selectedPacket.correlations.completionIds.length ? `${highlightedCompletionIds.size} linked` : "none/local transport only"}</div>
              </div>
              <div className="rounded-xl bg-slate-900/70 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Memory</div>
                <div className="mt-1 font-mono text-xs text-emerald-100">{selectedPacket.correlations.memoryRegionIds.length ? `${highlightedMemoryIds.size} region highlighted` : "no direct memory snapshot"}</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Packet role: {selectedPacket.role}. Correlations are derived from validated QPN/PSN/RETH and WR/CQE relationships, not from an artificial global clock.
            </p>
          </div>

          <div className="space-y-2">
            {selectedPacket.protocolTree.map((layer, index) => (
              <details key={layer.protocol} open={index < 4 || layer.protocol.includes("InfiniBand") || layer.protocol.includes("RDMA")} className="rounded-2xl border border-white/10 bg-slate-950/55 open:bg-slate-950/80">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  {layer.protocol}
                </summary>
                <div className="border-t border-white/8 px-4 py-3">
                  <dl className="grid gap-2">
                    {layer.fields.map((field) => (
                      <div key={`${layer.protocol}-${field.name}`} className="grid gap-1 rounded-xl bg-slate-900/55 p-2 sm:grid-cols-[11rem_1fr] sm:gap-3">
                        <dt className="text-xs text-slate-500">{field.name}</dt>
                        <dd className="min-w-0">
                          <div className="break-all font-mono text-xs text-slate-200">{field.value}</div>
                          {field.annotation ? <div className="mt-1 text-xs leading-5 text-cyan-200/80"><span className="font-semibold">Teaching note:</span> {field.annotation}</div> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </details>
            ))}
          </div>

          {selectedPacket.payloadText ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Payload bytes interpreted as UTF-8</div>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-sm text-emerald-100">{selectedPacket.payloadText}</pre>
              <p className="mt-2 text-xs text-slate-500">Transport padding shown in the decoded data length is not part of the application payload.</p>
            </div>
          ) : null}

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Captured frame bytes</h3>
              <span className="font-mono text-xs text-slate-500">{formatUtcEpoch(selectedPacket.timeEpoch)} · {selectedPacket.capturedLength} bytes</span>
            </div>
            <HexDump rawHex={selectedPacket.rawHex} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Select a packet in the timeline or packet tabs.</p>
      )}
      </div>
    </Panel>
  );
}

function ExplanationPanel({ step, experiment }: { step: WalkthroughStep; experiment: Experiment }) {
  return (
    <Panel title="What is happening?" eyebrow="Plain-language explanation">
      <div className="space-y-4">
        <div>
          <div className={cx("inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]", KIND_STYLES[step.kind])}>{step.kind}</div>
          <h3 className="mt-3 text-xl font-semibold text-white">{step.title}</h3>
          <p className="mt-2 text-base leading-7 text-slate-200">{step.simpleExplanation}</p>
        </div>
        <details open className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">Technical detail</summary>
          <p className="mt-3 text-sm leading-7 text-slate-300">{step.explanation}</p>
          {step.teachingPoints.length ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              {step.teachingPoints.map((point) => <li key={point} className="flex gap-2"><span className="text-cyan-300">•</span><span>{point}</span></li>)}
            </ul>
          ) : null}
        </details>
        {experiment.id === "write" ? (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4">
            <h4 className="text-sm font-semibold text-emerald-100">WRITE completion rule</h4>
            <p className="mt-2 text-sm leading-6 text-emerald-100/85">
              Ordinary RDMA WRITE does not consume a target receive WR and does not produce a normal target receive CQE. Remote application notification remains a separate protocol concern.
            </p>
          </div>
        ) : null}
        <details className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-cyan-200">Terms in this walkthrough</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {GLOSSARY.map((item) => (
              <div key={item.term} className="rounded-xl bg-slate-900/70 p-3">
                <div className="font-mono text-sm text-cyan-200">{item.term}</div>
                <p className="mt-1 text-xs leading-5 text-slate-400">{item.definition}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </Panel>
  );
}

function ProvenancePanel({ bundle }: { bundle: RdmaEvidenceBundle }) {
  const captures = bundle.experiments.flatMap((experiment) => experiment.captureDownload ? [experiment.captureDownload] : []);
  return (
    <Panel title="Evidence provenance and reproducibility" eyebrow="Interactive replay of a verified RDMA execution">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <div className="space-y-4">
          <p className="text-sm leading-7 text-slate-300">
            These experiments ran on two Ubuntu KVM/QEMU guests using Pyverbs, rdma-core and Linux Soft-RoCE. RoCEv2 packets were captured on the isolated data interface. This page is a replay of that validated reference recording; the browser does not execute Python, Docker, KVM or RDMA.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <SmallStat label="Validation" value={bundle.source.validationStatus} tone="green" />
            <SmallStat label="Schema" value={`v${bundle.schemaVersion}`} />
            <SmallStat label="Evidence commit" value={`${bundle.provenance.gitCommit.slice(0, 12)}…`} />
            <SmallStat label="Evidence digest" value={`${bundle.provenance.evidenceDigest.slice(0, 16)}…`} />
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            <strong className="font-semibold">Clock limitation:</strong> {bundle.clockModel.explanation}
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-400">
            <strong className="font-semibold text-slate-200">Scope limitation:</strong> the transfers are intentionally small and demonstrate verbs semantics, packet structure and memory behaviour. Soft-RoCE is not a hardware RNIC; this reference does not demonstrate ConnectX performance, offload behaviour, congestion control, PFC/ECN or line-rate characteristics.
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Download captures</h3>
            <div className="mt-2 grid gap-2">
              {captures.map((capture) => (
                <a key={capture.fileName} href={capture.path} download className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                  <span className="font-mono">{capture.fileName}</span>
                  <span>Download PCAP</span>
                </a>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <h3 className="text-sm font-semibold text-white">Reference environment</h3>
            <dl className="mt-3 grid gap-1">
              <ValueRow label="Guest OS" value={bundle.environment.guests?.hosta?.os_release ?? "Ubuntu"} />
              <ValueRow label="Kernel" value={bundle.environment.guests?.hosta?.kernel ?? "—"} />
              <ValueRow label="Pyverbs" value={bundle.environment.guests?.hosta?.pyverbs ?? "—"} />
              <ValueRow label="rdma-core" value={bundle.environment.guests?.hosta?.rdma_core ?? "—"} />
              <ValueRow label="Run" value={`${bundle.provenance.referenceRunStartedAt} → ${bundle.provenance.referenceRunFinishedAt}`} />
            </dl>
          </div>
          <a
            href="https://github.com/g-arjuna/fabriclab/tree/preview/labs/rdma-basics"
            className="block rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-100 transition hover:bg-cyan-400/15"
          >
            Open the runnable rdma-basics lab source and reproduction instructions on GitHub →
          </a>
        </div>
      </div>
    </Panel>
  );
}

export function RdmaPractical({ initialExperiment }: { initialExperiment?: string }) {
  const [experimentId, setExperimentId] = useState<Experiment["id"]>(() => validExperimentId(initialExperiment));
  const experiment = useMemo(() => rdmaEvidence.experiments.find((item) => item.id === experimentId) ?? rdmaEvidence.experiments.find((item) => item.id === "write")!, [experimentId]);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(experiment.walkthrough[0]?.packetIds[0] ?? null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const lastInitialExperiment = useRef(initialExperiment);
  const step = experiment.walkthrough[stepIndex] ?? experiment.walkthrough[0];
  const stepCount = experiment.walkthrough.length;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (initialExperiment === lastInitialExperiment.current) return;
    lastInitialExperiment.current = initialExperiment;
    const nextId = validExperimentId(initialExperiment);
    setExperimentId((current) => current === nextId ? current : nextId);
  }, [initialExperiment]);

  useEffect(() => {
    setStepIndex(0);
    setPlaying(false);
    setSelectedEventId(null);
    setSelectedPacketId(experiment.walkthrough[0]?.packetIds[0] ?? null);
  }, [experiment]);

  useEffect(() => {
    const firstPacket = step.packetIds[0];
    if (firstPacket) setSelectedPacketId(firstPacket);
  }, [step]);

  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= stepCount - 1) {
      setPlaying(false);
      return;
    }
    const timeout = window.setTimeout(() => setStepIndex((current) => Math.min(current + 1, stepCount - 1)), 1700 / speed);
    return () => window.clearTimeout(timeout);
  }, [playing, stepIndex, stepCount, speed]);

  const goPrevious = () => {
    setPlaying(false);
    setStepIndex((current) => Math.max(0, current - 1));
  };
  const goNext = () => {
    setPlaying(false);
    setStepIndex((current) => Math.min(stepCount - 1, current + 1));
  };
  const restart = () => {
    setPlaying(false);
    setStepIndex(0);
  };
  const start = () => {
    setStepIndex(0);
    setPlaying(true);
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      } else if (event.key === " " && target === document.body) {
        event.preventDefault();
        setPlaying((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const selectedPacket = experiment.packets.find((packet) => packet.id === selectedPacketId) ?? null;
  const highlightedWrIds = new Set([...(step.workRequestIds ?? []), ...(selectedPacket?.correlations.workRequestIds ?? [])]);
  const highlightedCompletionIds = new Set([...(step.completionIds ?? []), ...(selectedPacket?.correlations.completionIds ?? [])]);
  const highlightedMemoryIds = new Set([...(step.memoryRegionIds ?? []), ...(selectedPacket?.correlations.memoryRegionIds ?? [])]);

  function selectExperiment(id: Experiment["id"]) {
    setExperimentId(id);
    window.history.replaceState(null, "", `/practical/rdma?experiment=${encodeURIComponent(id)}`);
  }

  return (
    <div className="space-y-5" data-testid="rdma-practical" data-hydrated={hydrated ? "true" : "false"}>
      <section className="rounded-[1.75rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-5 shadow-[0_24px_90px_rgba(2,6,23,0.38)] sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">Validated evidence · {rdmaEvidence.source.validationStatus}</span>
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">Interactive replay of a verified RDMA execution</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{experiment.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">{experiment.objective}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Follow real Python/Pyverbs code → verbs resources → work request → queue pair → packet on the wire → remote memory → completion.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[430px]">
            <SmallStat label="Initiator QPN" value={exact(experiment.endpoints.initiator.qpn)} tone="cyan" />
            <SmallStat label="Responder QPN" value={exact(experiment.endpoints.responder.qpn)} tone="cyan" />
            <SmallStat label="Capture" value={experiment.captureDownload?.fileName ?? "none by design"} tone={experiment.noDataCapture ? "amber" : "green"} />
          </div>
        </div>
      </section>

      <ExperimentSelector experimentId={experimentId} onSelect={selectExperiment} />

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
        <PlaybackControls
          stepIndex={stepIndex}
          stepCount={stepCount}
          playing={playing}
          speed={speed}
          onStart={start}
          onPrevious={goPrevious}
          onNext={goNext}
          onPlayPause={() => setPlaying((current) => !current)}
          onRestart={restart}
          onSpeed={setSpeed}
        />
        <p className="mt-3 text-xs leading-5 text-slate-500">Keyboard: ← previous, → next, space play/pause when the page body has focus.</p>
      </div>

      <ExplanationPanel step={step} experiment={experiment} />
      <TopologyPanel experiment={experiment} step={step} selectedPacket={selectedPacket} />

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)]">
        <div className="min-w-0 space-y-5">
          <CodePanel experiment={experiment} step={step} sources={rdmaEvidence.sources} />
          <MemoryPanel experiment={experiment} step={step} highlightedMemoryIds={highlightedMemoryIds} />
        </div>
        <div className="min-w-0 space-y-5">
          <ResourcePanel experiment={experiment} step={step} stepIndex={stepIndex} highlightedWrIds={highlightedWrIds} highlightedCompletionIds={highlightedCompletionIds} />
          <TimelinePanel
            experiment={experiment}
            step={step}
            stepIndex={stepIndex}
            onStep={(index) => { setPlaying(false); setStepIndex(index); }}
            selectedPacketId={selectedPacketId}
            onPacket={setSelectedPacketId}
            selectedEventId={selectedEventId}
            onEvent={setSelectedEventId}
          />
        </div>
      </div>

      <PacketInspector
        experiment={experiment}
        selectedPacket={selectedPacket}
        onPacket={setSelectedPacketId}
        highlightedWrIds={highlightedWrIds}
        highlightedCompletionIds={highlightedCompletionIds}
        highlightedMemoryIds={highlightedMemoryIds}
      />

      <ProvenancePanel bundle={rdmaEvidence} />
    </div>
  );
}
