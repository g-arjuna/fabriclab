"use client";

import { useState, type ReactNode } from "react";

import { rdmaEvidence } from "@/lib/practical/rdmaEvidence";
import { cx } from "./visuals";

export type WorkLifecycle =
  | "not-created"
  | "constructed"
  | "posted"
  | "in-flight"
  | "consumed"
  | "completed"
  | "unknown";

export type WorkVisual = {
  id: string;
  label: string;
  detail?: string;
  lifecycle: WorkLifecycle;
};

export type CompletionVisual = {
  id: string;
  label: string;
  detail?: string;
  evidence?: "recorded" | "conceptual";
};

export type QueueVisualModel = {
  state: "not-introduced" | "unknown" | "empty" | "occupied";
  entries?: WorkVisual[];
};

export type CompletionQueueVisualModel = {
  state: "not-introduced" | "unknown" | "empty" | "occupied";
  entries?: CompletionVisual[];
};

function lifecycleLabel(lifecycle: WorkLifecycle) {
  if (lifecycle === "constructed") return "constructed · not yet posted";
  if (lifecycle === "posted") return "posted · pending";
  if (lifecycle === "in-flight") return "in flight";
  if (lifecycle === "consumed") return "consumed · no longer pending";
  if (lifecycle === "completed") return "completed · no longer pending";
  if (lifecycle === "unknown") return "state not established";
  return "not created";
}

function NodeBox({
  title,
  children,
  active = false,
  tone = "neutral",
  testId,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  active?: boolean;
  tone?: "neutral" | "memory" | "device" | "queue" | "completion" | "kernel" | "network" | "warning";
  testId?: string;
  className?: string;
}) {
  const tones = {
    neutral: "border-white/12 bg-slate-900/55",
    memory: "border-sky-300/30 bg-sky-300/8",
    device: "border-orange-300/30 bg-orange-300/8",
    queue: "border-cyan-300/30 bg-cyan-300/7",
    completion: "border-lime-300/30 bg-lime-300/7",
    kernel: "border-violet-300/25 bg-violet-300/6",
    network: "border-orange-300/30 bg-orange-300/8",
    warning: "border-amber-300/35 bg-amber-300/9",
  } as const;
  return (
    <div
      data-testid={testId}
      className={cx(
        "min-w-0 rounded-xl border p-3 transition-colors",
        tones[tone],
        active && "shadow-[0_0_0_1px_rgba(103,232,249,0.35)] ring-1 ring-cyan-300/30",
        className,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{title}</div>
      {children ? <div className="mt-1.5 text-sm leading-6 text-slate-200">{children}</div> : null}
    </div>
  );
}

function Arrow({ direction = "down", label, active = false }: { direction?: "down" | "up" | "right" | "left" | "both"; label?: ReactNode; active?: boolean }) {
  const symbol = direction === "down" ? "↓" : direction === "up" ? "↑" : direction === "right" ? "→" : direction === "left" ? "←" : "↔";
  return (
    <div className={cx("flex items-center justify-center gap-2 py-1 text-center", active ? "text-cyan-200" : "text-slate-600")} aria-hidden="true">
      <span className="font-mono text-lg leading-none">{symbol}</span>
      {label ? <span className="max-w-56 text-[11px] leading-4">{label}</span> : null}
    </div>
  );
}

function Bytes({ value, empty = false }: { value: string; empty?: boolean }) {
  const chars = empty ? value.split("") : value.split("");
  return (
    <div className="flex flex-wrap justify-center gap-1" aria-label={value}>
      {chars.map((char, index) => (
        <span key={`${char}-${index}`} className={cx("rounded border px-1 py-0.5 font-mono text-xs sm:px-1.5 sm:text-sm", empty ? "border-white/10 bg-slate-950/60 text-slate-600" : "border-sky-300/30 bg-sky-300/10 text-sky-100")}>
          {char}
        </span>
      ))}
    </div>
  );
}

export function OpeningMemoryDiagram() {
  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/35 p-2.5 sm:p-4" data-testid="opening-memory-diagram">
      <div className="grid grid-cols-2 gap-3 text-center">
        {(["SERVER A", "SERVER B"] as const).map((server) => (
          <section key={server} aria-label={server === "SERVER A" ? "Server A" : "Server B"}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{server}</h3>
            <div className="mt-2 rounded-xl border border-white/10 bg-slate-900/45 p-2 sm:mt-3 sm:p-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Application</div>
              <Arrow direction="down" />
              <div className="rounded-xl border border-sky-300/25 bg-sky-300/8 p-2 sm:p-3">
                <div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-slate-500">Memory</div>
                {server === "SERVER A" ? <Bytes value="HELLO" /> : <Bytes value="·····" empty />}
              </div>
            </div>
          </section>
        ))}
      </div>
      <div className="mt-2.5 border-t border-white/8 pt-2 text-center sm:mt-4 sm:pt-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ethernet network</div>
        <div className="mt-1 font-mono text-cyan-200" aria-hidden="true">Server A ───────── Server B</div>
      </div>
      <figcaption className="mt-2 text-center text-[11px] text-slate-500 sm:mt-3 sm:text-xs">Conceptual illustration · the objective is memory to memory</figcaption>
    </figure>
  );
}

function PathNode({ label, children, active, dimmed, tone = "neutral" }: { label: string; children?: ReactNode; active?: boolean; dimmed?: boolean; tone?: Parameters<typeof NodeBox>[0]["tone"] }) {
  return (
    <div className={cx("transition-opacity", dimmed && "opacity-35")}>
      <NodeBox title={label} active={active} tone={tone} className="p-2.5">
        <div className="text-xs leading-5">{children}</div>
      </NodeBox>
    </div>
  );
}

export function ConventionalDataPathDiagram({ stage, compact = false }: { stage: number; compact?: boolean }) {
  const showSocketPath = stage >= 2;
  const showStack = stage >= 3;
  const showNetwork = stage >= 4;
  const showReceive = stage >= 5;
  const received = stage >= 6;
  const sourceBytes = "HELLO";
  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 sm:p-4" data-testid="conventional-data-path">
      <div className="grid grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] sm:gap-3">
        <div className="text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Server A</div>
        <div className="self-center text-center text-[10px] uppercase tracking-[0.12em] text-slate-600">Network</div>
        <div className="text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Server B</div>

        <PathNode label="Application buffer" active={stage <= 2} tone="memory">
          <Bytes value={sourceBytes} />
        </PathNode>
        <div />
        <PathNode label="Application buffer" active={received} tone="memory">
          {received ? <Bytes value={sourceBytes} /> : <Bytes value="·····" empty />}
        </PathNode>

        <Arrow direction="down" label={stage >= 2 ? "sendall() submits bytes to the local socket" : "socket operation not yet used"} active={stage === 2} />
        <div />
        <Arrow direction="up" label={showReceive ? "receive loop returns a complete application buffer" : "waiting for application receive"} active={stage === 5 || received} />

        <PathNode label="Kernel socket buffer" active={stage === 3} dimmed={!showSocketPath} tone="kernel">
          {showSocketPath ? "byte-stream data made available to TCP" : "not involved yet"}
        </PathNode>
        <div />
        <PathNode label="Kernel socket buffer" active={stage === 5} dimmed={!showSocketPath} tone="kernel">
          {showReceive ? "received byte-stream data waiting for the application" : "no received bytes yet"}
        </PathNode>

        <Arrow direction="down" label="TCP/IP processing" active={stage === 3} />
        <div className="self-center text-center text-[10px] leading-4 text-slate-600">{showNetwork ? "protocol headers carry a copy of the bytes" : ""}</div>
        <Arrow direction="up" label="TCP/IP processing" active={stage === 5} />

        <PathNode label="NIC transmit" active={stage === 4} dimmed={!showStack} tone="device">
          {showStack ? "frames outgoing traffic" : "not involved yet"}
        </PathNode>
        <div className={cx("self-center rounded-xl border px-2 py-3 text-center", showNetwork ? "border-orange-300/35 bg-orange-300/10" : "border-dashed border-white/10")} data-testid="conventional-network-packet">
          <div className="font-mono text-lg text-orange-100" aria-hidden="true">→</div>
          {showNetwork ? <div className="mt-1 font-mono text-[10px] leading-4 text-orange-100">packet payload<br />HELLO</div> : <div className="text-[10px] text-slate-600">idle</div>}
        </div>
        <PathNode label="NIC receive" active={stage === 5} dimmed={!showStack} tone="device">
          {showReceive ? "receives frames from the network" : "listening"}
        </PathNode>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-slate-500">
        Conceptual illustration of a representative TCP/socket path. Real implementations may use segmentation, checksum, copy and other offloads. This is not a captured TCP experiment.
      </figcaption>
    </figure>
  );
}

export function DmaDiagram({ phase }: { phase: "cpu-copy" | "device-dma" }) {
  if (phase === "cpu-copy") {
    return (
      <figure className="rounded-2xl border border-white/10 bg-slate-950/35 p-4" data-testid="cpu-copy-diagram">
        <div className="mx-auto max-w-md">
          <NodeBox title="Memory location A" tone="memory"><Bytes value="HELLO" /></NodeBox>
          <Arrow direction="down" label="CPU executes instructions that read bytes" active />
          <NodeBox title="CPU" tone="warning">moves data through processor-mediated copy work</NodeBox>
          <Arrow direction="down" label="CPU writes bytes to the destination" active />
          <NodeBox title="Memory location B" tone="memory"><Bytes value="HELLO" /></NodeBox>
        </div>
        <figcaption className="mt-3 text-center text-xs text-slate-500">Conceptual local copy: software instructions move the data.</figcaption>
      </figure>
    );
  }
  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/35 p-4" data-testid="device-dma-diagram">
      <div className="mx-auto max-w-3xl">
        <NodeBox title="CPU" tone="warning">configures the transfer: address, length, direction and permissions</NodeBox>
        <Arrow direction="down" label="setup / control" active />
        <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]">
          <NodeBox title="DMA-capable device" tone="device" active>
            performs the memory transfer after being configured
          </NodeBox>
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 px-2 py-3 text-center" data-testid="dma-direct-path">
            <div className="font-mono text-lg text-cyan-100" aria-hidden="true">↔</div>
            <div className="mt-1 text-[11px] leading-4 text-cyan-100">device-mediated memory read/write<br />CPU does not execute a byte-by-byte copy loop</div>
          </div>
          <NodeBox title="System memory buffer" tone="memory" active>
            device reads or writes this memory through DMA
          </NodeBox>
        </div>
        <Arrow direction="down" label="completion or status is observed later" />
        <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-slate-950/50 p-2.5 text-center text-xs text-slate-400">software observes completion or status through the device/programming interface</div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-slate-500">Conceptual single-server DMA demonstration. Conventional Ethernet NICs already use DMA.</figcaption>
    </figure>
  );
}

function WorkEntry({ entry }: { entry: WorkVisual }) {
  const pending = entry.lifecycle === "posted" || entry.lifecycle === "in-flight";
  return (
    <div className={cx("rounded-lg border px-2 py-1.5 text-xs leading-5", pending ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-slate-950/45 text-slate-400")} data-lifecycle={entry.lifecycle}>
      <div className="font-mono">{entry.label}</div>
      {entry.detail ? <div className="text-[11px] text-slate-400">{entry.detail}</div> : null}
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">{lifecycleLabel(entry.lifecycle)}</div>
    </div>
  );
}

function QueueLane({ title, queue, testId }: { title: string; queue: QueueVisualModel; testId?: string }) {
  if (queue.state === "not-introduced") return null;
  const entries = queue.entries || [];
  const pending = entries.filter((entry) => entry.lifecycle === "posted" || entry.lifecycle === "in-flight");
  const history = entries.filter((entry) => entry.lifecycle === "consumed" || entry.lifecycle === "completed");
  const queueBox = (
    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-2" data-testid={testId} data-queue-state={queue.state}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</div>
        <div className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
          {queue.state === "unknown" ? "not inspected" : queue.state === "empty" ? "known empty" : pending.length ? "pending work" : "no pending work"}
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        {queue.state === "unknown" ? <div className="rounded-lg border border-dashed border-white/10 px-2 py-1.5 text-xs text-slate-500">state not yet inspected</div> : null}
        {queue.state === "empty" && pending.length === 0 ? <div className="rounded-lg border border-dashed border-white/10 px-2 py-1.5 text-xs text-slate-500">empty in this context</div> : null}
        {pending.map((entry) => <WorkEntry key={entry.id} entry={entry} />)}
      </div>
    </div>
  );
  if (!history.length) return queueBox;
  return (
    <div className="space-y-2">
      {queueBox}
      <div className="rounded-lg border border-white/8 bg-slate-900/35 p-2" data-testid={testId ? `${testId}-history` : undefined}>
        <div className="text-[9px] uppercase tracking-[0.12em] text-slate-600">completed or consumed work history · outside the pending queue</div>
        <div className="mt-1 space-y-1.5">{history.map((entry) => <WorkEntry key={entry.id} entry={entry} />)}</div>
      </div>
    </div>
  );
}

function CompletionLane({ queue }: { queue: CompletionQueueVisualModel }) {
  if (queue.state === "not-introduced") return null;
  return (
    <div data-queue-state={queue.state}>
      {queue.state === "unknown" ? <div className="rounded-lg border border-dashed border-white/10 px-2 py-2 text-xs text-slate-500">Completion Queue state not yet inspected</div> : null}
      {queue.state === "empty" ? <div className="rounded-lg border border-dashed border-white/10 px-2 py-2 text-xs text-slate-500">known empty in the inspected context</div> : null}
      {(queue.entries || []).map((entry) => (
        <div key={entry.id} className="mt-1.5 rounded-lg border border-lime-300/30 bg-lime-300/8 px-2 py-1.5 text-xs leading-5 text-lime-100" data-testid="completion-entry-visual">
          <div className="font-mono">{entry.label}</div>
          {entry.detail ? <div className="text-[11px] text-lime-100/70">{entry.detail}</div> : null}
          {entry.evidence ? <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-lime-100/60">{entry.evidence === "recorded" ? "recorded application evidence" : "conceptual completion illustration"}</div> : null}
        </div>
      ))}
    </div>
  );
}

export type EndpointVisualProps = {
  host: "hosta" | "hostb";
  name: "Server A" | "Server B";
  role: string;
  qpn?: ReactNode;
  application: ReactNode;
  memory: ReactNode;
  memoryActive?: boolean;
  provider: ReactNode;
  providerActive?: boolean;
  sendQueue?: QueueVisualModel;
  receiveQueue?: QueueVisualModel;
  completionQueue?: CompletionQueueVisualModel;
  constructedWork?: WorkVisual[];
  emphasize?: Array<"application" | "qp" | "cq" | "provider" | "memory">;
  dimmed?: boolean;
  softRoce?: boolean;
};

export function EndpointResourceDiagram(props: EndpointVisualProps) {
  const emphasize = (part: NonNullable<EndpointVisualProps["emphasize"]>[number]) => props.emphasize?.includes(part) || false;
  return (
    <section aria-label={props.name} data-testid={`endpoint-${props.host}`} className={cx("min-w-0 rounded-2xl border border-white/10 bg-slate-900/35 p-3", props.dimmed && "opacity-55")}> 
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/8 pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">{props.name}</h3>
        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{props.role}</span>
      </header>
      <div className="mt-3">
        <NodeBox title="Application / userspace verbs interface" active={emphasize("application")}>{props.application}</NodeBox>
        {props.constructedWork?.length ? (
          <div className="mt-2 rounded-lg border border-amber-300/25 bg-amber-300/8 p-2" data-testid={`constructed-work-${props.host}`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100">constructed instruction · not yet posted</div>
            <div className="mt-1 space-y-1">{props.constructedWork.map((entry) => <WorkEntry key={entry.id} entry={entry} />)}</div>
          </div>
        ) : null}
        <div className="hidden grid-cols-2 gap-2 xl:grid" aria-hidden="true">
          <Arrow direction="down" label="posts work" active={emphasize("application") || emphasize("qp")} />
          <Arrow direction="up" label="polls completions" active={emphasize("application") || emphasize("cq")} />
        </div>
        <div className="xl:hidden">
          <Arrow direction="down" label="posts work to the QP · polls the associated CQ" active={emphasize("application") || emphasize("qp") || emphasize("cq")} />
        </div>
        <div className="grid items-start gap-2 xl:grid-cols-2">
          <NodeBox title={props.qpn ? <>Queue Pair · local QPN {props.qpn}</> : "Queue Pair"} active={emphasize("qp")} tone="queue" testId={`qp-resource-${props.host}`}>
            <div className="space-y-2">
              {props.sendQueue ? <QueueLane title="Send Queue" queue={props.sendQueue} testId={`send-queue-${props.host}`} /> : null}
              {props.receiveQueue ? <QueueLane title="Receive Queue" queue={props.receiveQueue} testId={`receive-queue-${props.host}`} /> : null}
              {!props.sendQueue && !props.receiveQueue ? <div className="text-xs text-slate-500">queues not yet introduced</div> : null}
            </div>
          </NodeBox>
          <NodeBox title="Completion Queue · separate associated resource" active={emphasize("cq")} tone="completion" testId={`cq-resource-${props.host}`}>
            {props.qpn ? <div className="mb-2 text-[10px] uppercase tracking-[0.12em] text-lime-100/60">associated with local QP {props.qpn}</div> : null}
            {props.completionQueue ? <CompletionLane queue={props.completionQueue} /> : <div className="text-xs text-slate-500">not yet introduced</div>}
          </NodeBox>
        </div>
        <div className="hidden grid-cols-2 gap-2 xl:grid" aria-hidden="true">
          <Arrow direction="down" label="work execution" active={emphasize("provider") || emphasize("qp")} />
          <Arrow direction="up" label="completion produced" active={emphasize("provider") || emphasize("cq")} />
        </div>
        <div className="xl:hidden">
          <Arrow direction="down" label="device/provider executes work and produces completions where applicable" active={emphasize("provider")} />
        </div>
        <NodeBox title={props.softRoce ? "Soft-RoCE provider · software RDMA transport" : "RDMA device / provider"} active={emphasize("provider")} tone="device">
          {props.provider}
        </NodeBox>
        <Arrow direction="both" label={props.softRoce ? "software provider access to registered memory · not hardware bypass evidence" : "DMA access to registered memory"} active={emphasize("memory") || emphasize("provider")} />
        <NodeBox title="Registered application memory" active={emphasize("memory")} tone="memory" testId={`registered-memory-${props.host}`}>
          <div className="whitespace-pre-wrap break-words font-mono text-sm leading-6">{props.memory}</div>
        </NodeBox>
        <div className="mt-3 rounded-lg border border-violet-300/15 bg-violet-300/5 p-2 text-[11px] leading-5 text-slate-400" data-testid={`kernel-control-${props.host}`}>
          Kernel/driver responsibilities: device setup, resource management, protection and control. This is not depicted as a conventional per-payload socket processing path.
        </div>
      </div>
    </section>
  );
}

export type TransferVisualModel = {
  visible?: boolean;
  direction?: "a-to-b" | "b-to-a" | "both" | "none";
  kind?: "request" | "response" | "acknowledgement" | "control" | "none";
  label?: ReactNode;
  detail?: ReactNode;
};

export function RdmaSystemDiagram({
  a,
  b,
  transfer,
  caption,
}: {
  a: EndpointVisualProps;
  b: EndpointVisualProps;
  transfer: TransferVisualModel;
  caption?: ReactNode;
}) {
  const direction = transfer.direction || "none";
  const arrow = direction === "a-to-b" ? "A ─────→ B" : direction === "b-to-a" ? "A ←───── B" : direction === "both" ? "A ⇄ B" : "A ───── B";
  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/30 p-3 sm:p-4" data-testid="rdma-system-diagram">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1fr)] lg:items-stretch">
        <EndpointResourceDiagram {...a} />
        <div className={cx("flex min-h-24 items-center justify-center rounded-2xl border p-3 text-center", transfer.visible ? "border-orange-300/30 bg-orange-300/8" : "border-white/10 bg-slate-950/30")} data-testid="network-transfer" data-direction={direction} data-kind={transfer.kind || "none"}>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">RoCEv2 / Ethernet network</div>
            <div className="mt-3 font-mono text-lg text-cyan-200" aria-hidden="true">{arrow}</div>
            {transfer.visible ? (
              <div className="mx-auto mt-3 max-w-44 rounded-xl border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-xs leading-5 text-orange-100" data-testid="visible-transfer-object">
                {transfer.label}
              </div>
            ) : <div className="mt-3 text-xs text-slate-600">no data packet at this point</div>}
            {transfer.detail ? <div className="mt-2 text-[11px] leading-5 text-slate-500">{transfer.detail}</div> : null}
          </div>
        </div>
        <EndpointResourceDiagram {...b} />
      </div>
      {caption ? <figcaption className="mt-3 text-xs leading-5 text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
}

export function ResourceRelationshipDiagram({ stage }: { stage: number }) {
  const prepared = stage >= 2;
  const registered = stage >= 3;
  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/35 p-4" data-testid="resource-relationship-diagram">
      <div className="mx-auto max-w-3xl">
        <NodeBox title="Application / userspace verbs interface" active={stage >= 1}>owns the buffer and uses verbs objects through the device context</NodeBox>
        <Arrow direction="down" label="creates and uses associated resources" active={prepared} />
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
          <section className={cx("rounded-xl border p-3", prepared ? "border-violet-300/30 bg-violet-300/7" : "border-dashed border-white/10 bg-slate-950/35")} data-testid="protection-domain-boundary">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-100">Protection Domain · logical association boundary</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <NodeBox title="Memory Region" tone="memory" active={registered} testId="pd-memory-region">
                {registered ? "registered buffer · address · length · permissions" : stage >= 1 ? "buffer allocated, not yet registered" : "no authorized buffer yet"}
              </NodeBox>
              <NodeBox title="Queue Pair" tone="queue" active={stage >= 4} testId="pd-queue-pair">
                {stage >= 4 ? "Send Queue + Receive Queue endpoint" : "introduced in the next lesson"}
              </NodeBox>
            </div>
          </section>
          <NodeBox title="Completion Queue · separate resource" tone="completion" active={stage >= 4} testId="cq-separate-resource">
            associated with Queue Pairs when they are created; it is not contained inside a QP
          </NodeBox>
        </div>
        <Arrow direction="down" label="provider/device uses resource associations and permissions" active={registered} />
        <div className="grid gap-2 md:grid-cols-2">
          <NodeBox title="Kernel driver / resource management" tone="kernel">setup, protection and control responsibilities</NodeBox>
          <NodeBox title="RDMA device or software provider" tone="device" active={registered}>uses registered memory according to explicit permissions</NodeBox>
        </div>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-slate-500">Logical resource relationship diagram. It does not claim a physical memory location for queue objects in a particular implementation.</figcaption>
    </figure>
  );
}

export function HardwareRdmaModelDiagram({ active = false }: { active?: boolean }) {
  const emptyQueue: QueueVisualModel = { state: "empty" };
  return (
    <div data-testid="hardware-rdma-path">
      <RdmaSystemDiagram
        transfer={{
          visible: active,
          direction: active ? "a-to-b" : "none",
          kind: active ? "request" : "none",
          label: active ? "RoCEv2 operation packet" : undefined,
          detail: "Representative hardware RDMA path after setup",
        }}
        caption="Representative hardware RDMA model. The CPU still performs setup, posts work and handles completion; selected payload placement can be device-mediated."
        a={{
          host: "hosta",
          name: "Server A",
          role: "initiator",
          application: "posts a Work Request",
          memory: "registered buffer",
          provider: "hardware RDMA NIC reads memory and executes transport",
          sendQueue: emptyQueue,
          receiveQueue: emptyQueue,
          completionQueue: { state: "unknown" },
          emphasize: active ? ["provider", "memory"] : ["application", "qp"],
        }}
        b={{
          host: "hostb",
          name: "Server B",
          role: "peer",
          application: "application participation depends on operation semantics",
          memory: active ? "registered memory placed or read by the device" : "registered memory",
          provider: "hardware RDMA NIC accesses registered memory",
          sendQueue: emptyQueue,
          receiveQueue: emptyQueue,
          completionQueue: { state: "unknown" },
          emphasize: active ? ["provider", "memory"] : ["provider"],
        }}
      />
    </div>
  );
}


export function HardwareRdmaConceptDiagram({ active = false }: { active?: boolean }) {
  return (
    <figure className="rounded-2xl border border-white/10 bg-slate-950/35 p-4" data-testid="hardware-rdma-concept-path">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)]">
        <section className="rounded-xl border border-white/10 bg-slate-900/35 p-3">
          <h3 className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Server A</h3>
          <div className="mt-3">
            <NodeBox title="Application" active={!active}>describes the desired memory transfer</NodeBox>
            <Arrow direction="down" label="control / work submission" active={!active} />
            <NodeBox title="Hardware RDMA NIC" tone="device" active={active}>executes the transport operation</NodeBox>
            <Arrow direction="both" label="DMA read from registered memory" active={active} />
            <NodeBox title="Registered source memory" tone="memory" active={active}>application buffer made available under explicit rules</NodeBox>
          </div>
        </section>
        <div className={cx("flex items-center justify-center rounded-xl border p-3 text-center", active ? "border-orange-300/30 bg-orange-300/8" : "border-white/10 bg-slate-950/30")}>
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Ethernet / IP network</div>
            <div className="mt-2 font-mono text-cyan-200" aria-hidden="true">A ─────→ B</div>
            {active ? <div className="mt-2 rounded-lg border border-orange-300/30 bg-orange-300/10 px-2 py-1.5 text-xs text-orange-100">RoCEv2 operation packets</div> : null}
          </div>
        </div>
        <section className="rounded-xl border border-white/10 bg-slate-900/35 p-3">
          <h3 className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Server B</h3>
          <div className="mt-3">
            <NodeBox title="Application">participation depends on the operation; one-sided operations do not require per-transfer socket processing</NodeBox>
            <Arrow direction="down" label="setup / coordination happened beforehand" />
            <NodeBox title="Hardware RDMA NIC" tone="device" active={active}>receives or answers RDMA transport operations</NodeBox>
            <Arrow direction="both" label="DMA write or read of registered memory" active={active} />
            <NodeBox title="Registered target/source memory" tone="memory" active={active}>only the prepared region is accessible</NodeBox>
          </div>
        </section>
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-slate-500">Representative hardware RDMA data path after setup. Queue and completion details are intentionally deferred until the application work model is introduced.</figcaption>
    </figure>
  );
}

export function TransferModelComparison() {
  const [model, setModel] = useState<"conventional" | "rdma">("conventional");
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/35 p-4" data-testid="transfer-model-comparison">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">Compare the actual data paths</h3>
          <p className="mt-1 text-xs text-slate-500">Same memory-to-memory objective, different programming and transfer model.</p>
        </div>
        <div className="flex rounded-full border border-white/10 p-1" role="group" aria-label="Choose transfer model">
          {([
            ["conventional", "Conventional sockets"],
            ["rdma", "Hardware RDMA"],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={model === value} onClick={() => setModel(value)} className={cx("rounded-full px-3 py-1.5 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300", model === value ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:text-slate-200")}>{label}</button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {model === "conventional" ? <ConventionalDataPathDiagram stage={6} compact /> : <HardwareRdmaConceptDiagram active />}
      </div>
      <details className="mt-4 rounded-xl border border-white/10 bg-slate-900/35 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Reference comparison table</summary>
        <div className="mt-3 overflow-x-auto text-sm leading-6 text-slate-300">
          <table className="min-w-[680px] w-full border-collapse text-left">
            <tbody>
              <tr className="border-b border-white/8"><th className="py-2 pr-4 text-slate-200">CPU / OS</th><td className="py-2">Sockets require continuing transport and socket-buffer participation. RDMA still requires setup, posting, completion handling and coordination, while selected payload placement can be device-mediated.</td></tr>
              <tr className="border-b border-white/8"><th className="py-2 pr-4 text-slate-200">NIC DMA</th><td className="py-2">Conventional NICs already use DMA and offloads. RDMA is not distinguished by “having DMA”; it is distinguished by the remote-memory transfer and programming model.</td></tr>
              <tr><th className="py-2 pr-4 text-slate-200">Network</th><td className="py-2">Both models can use Ethernet/IP networks. RoCEv2 carries RDMA operations in UDP/IP; it does not replace the network.</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function sourceLine(path: string, lineNumber: number) {
  const source = rdmaEvidence.sources.find((item) => item.path === path);
  return source?.lines.find((line) => line.number === lineNumber)?.text.trim() || `# missing source line ${lineNumber}`;
}

export function CodeOperationChain({ items }: { items: Array<{ path: string; line: number; effect: string }> }) {
  return (
    <section className="rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-3" data-testid="code-operation-chain">
      <div className="grid gap-2 text-xs uppercase tracking-[0.14em] text-slate-500 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <span>Python instruction</span><span className="hidden sm:inline" aria-hidden="true">→</span><span>What changes</span>
      </div>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={`${item.path}:${item.line}`} className="grid gap-2 rounded-lg bg-slate-950/55 p-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <code className="break-words font-mono text-xs text-cyan-100" data-testid="actual-python-instruction">{sourceLine(item.path, item.line)}</code>
            <span className="hidden text-cyan-300 sm:inline" aria-hidden="true">→</span>
            <span className="text-sm leading-6 text-slate-300">{item.effect}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
