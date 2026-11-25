import type { ReactNode } from "react";

import { exact, rdmaEvidence } from "@/lib/practical/rdmaEvidence";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type HostEmphasis = "application" | "memory" | "os" | "nic";

export type QueueVisualState = {
  send?: string[];
  receive?: string[];
  completion?: string[];
  label?: string;
};

export type HostVisualState = {
  emphasis?: HostEmphasis[];
  application?: ReactNode;
  memory?: ReactNode;
  memoryTone?: "empty" | "ready" | "changed" | "locked" | "source";
  os?: ReactNode;
  nic?: ReactNode;
  queues?: QueueVisualState;
  dimmed?: boolean;
};

export type TransferVisualState = {
  label?: ReactNode;
  detail?: ReactNode;
  direction?: "a-to-b" | "b-to-a" | "both" | "none";
  packet?: ReactNode;
  active?: boolean;
};

function rowTone(active: boolean) {
  return active
    ? "border-cyan-300/50 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(103,232,249,0.16)]"
    : "border-white/10 bg-slate-950/45";
}

function MemoryBox({ children, tone = "empty" }: { children: ReactNode; tone?: HostVisualState["memoryTone"] }) {
  const styles = {
    empty: "border-white/10 bg-slate-950/70 text-slate-500",
    ready: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    changed: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
    locked: "border-violet-300/40 bg-violet-300/10 text-violet-100",
    source: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  }[tone || "empty"];
  return <div className={cx("mt-2 rounded-xl border px-3 py-2 font-mono text-sm leading-6 break-words", styles)}>{children}</div>;
}

function QueueStack({ queues }: { queues: QueueVisualState }) {
  const queue = (label: string, entries: string[] | undefined, empty: string, tone: string) => (
    <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/60 p-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 space-y-1.5">
        {(entries && entries.length > 0 ? entries : [empty]).map((entry, index) => (
          <div
            key={`${label}-${index}-${entry}`}
            className={cx(
              "rounded-lg border px-2 py-1.5 font-mono text-[11px] leading-4",
              entries && entries.length > 0 ? tone : "border-dashed border-white/10 text-slate-600",
            )}
          >
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/55 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-200">{queues.label || "Queue Pair"}</div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">application-visible state</div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {queue("Send queue", queues.send, "empty", "border-cyan-300/35 bg-cyan-300/10 text-cyan-100")}
        {queue("Receive queue", queues.receive, "empty", "border-violet-300/35 bg-violet-300/10 text-violet-100")}
        {queue("Completion queue", queues.completion, "empty", "border-lime-300/35 bg-lime-300/10 text-lime-100")}
      </div>
    </div>
  );
}

export function ServerStack({
  name,
  address,
  state,
}: {
  name: "Server A" | "Server B";
  address?: string;
  state: HostVisualState;
}) {
  const active = (part: HostEmphasis) => state.emphasis?.includes(part) || false;
  return (
    <section
      aria-label={name}
      className={cx(
        "min-w-0 rounded-[1.35rem] border p-3 transition sm:p-4",
        state.dimmed ? "border-white/8 bg-slate-950/30 opacity-70" : "border-white/12 bg-slate-900/52",
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/8 pb-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">{name}</h3>
        {address ? <span className="font-mono text-[11px] text-slate-500">{address}</span> : null}
      </header>
      <div className="mt-3 space-y-3">
        <div className={cx("rounded-2xl border p-3 transition", rowTone(active("application")))}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Application</div>
          <div className="mt-1 text-sm leading-6 text-slate-200">{state.application || "Running process"}</div>
        </div>
        <div className={cx("rounded-2xl border p-3 transition", rowTone(active("memory")))}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Application memory</div>
          <MemoryBox tone={state.memoryTone}>{state.memory || "No relevant bytes yet"}</MemoryBox>
        </div>
        <div className={cx("rounded-2xl border p-3 transition", rowTone(active("os")))}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Operating system</div>
          <div className="mt-1 text-sm leading-6 text-slate-300">{state.os || "Sockets, protocol processing and device drivers"}</div>
          {state.queues ? <QueueStack queues={state.queues} /> : null}
        </div>
        <div className={cx("rounded-2xl border p-3 transition", rowTone(active("nic")))}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Network interface</div>
          <div className="mt-1 text-sm leading-6 text-slate-300">{state.nic || "Ethernet interface"}</div>
        </div>
      </div>
    </section>
  );
}

function DirectionalLink({ transfer }: { transfer: TransferVisualState }) {
  const direction = transfer.direction || "none";
  return (
    <div
      data-testid="network-transfer"
      className={cx(
        "relative flex min-h-28 items-center justify-center rounded-[1.35rem] border p-4 text-center transition lg:min-h-full lg:w-40",
        transfer.active ? "border-cyan-300/35 bg-cyan-400/8" : "border-white/10 bg-slate-950/35",
      )}
    >
      <div className="w-full">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Ethernet / IP network</div>
        <div className="mx-auto mt-4 hidden h-px w-full max-w-28 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent lg:block" />
        <div className="mx-auto mt-4 h-px w-full max-w-40 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent lg:hidden" />
        <div className="mt-3 font-mono text-lg text-cyan-200" aria-hidden="true">
          {direction === "a-to-b" ? "A ─────→ B" : direction === "b-to-a" ? "A ←───── B" : direction === "both" ? <span>A ─────→ B<br />A ←───── B</span> : "A ───── B"}
        </div>
        {transfer.packet ? (
          <div className="mx-auto mt-3 max-w-48 rounded-xl border border-orange-300/35 bg-orange-300/10 px-3 py-2 text-xs leading-5 text-orange-100">
            {transfer.packet}
          </div>
        ) : null}
        {transfer.label ? <div className="mt-3 text-sm font-medium text-slate-200">{transfer.label}</div> : null}
        {transfer.detail ? <div className="mt-1 text-xs leading-5 text-slate-500">{transfer.detail}</div> : null}
      </div>
    </div>
  );
}

export function TwoServerVisual({
  a,
  b,
  transfer,
  caption,
}: {
  a: HostVisualState;
  b: HostVisualState;
  transfer: TransferVisualState;
  caption?: ReactNode;
}) {
  return (
    <figure className="rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-3 sm:p-4" data-testid="two-server-visual">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
        <ServerStack name="Server A" address={rdmaEvidence.hosts.hosta?.dataIp} state={a} />
        <DirectionalLink transfer={transfer} />
        <ServerStack name="Server B" address={rdmaEvidence.hosts.hostb?.dataIp} state={b} />
      </div>
      {caption ? <figcaption className="mt-3 text-xs leading-5 text-slate-500">{caption}</figcaption> : null}
    </figure>
  );
}

export function EvidenceNote({ kind, children }: { kind: string; children: ReactNode }) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-slate-950/50 p-4" data-testid="evidence-note">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{kind}</div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{children}</div>
    </aside>
  );
}

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4">
      <div className="text-sm font-semibold text-amber-100">{title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-300">{children}</div>
    </aside>
  );
}

export function FactGrid({ facts }: { facts: Array<{ label: string; value: ReactNode; tone?: "cyan" | "green" | "amber" | "violet" }> }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.label} className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{fact.label}</dt>
          <dd className="mt-1 break-words font-mono text-sm text-slate-200">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceExcerpt({
  path,
  start,
  end,
  title,
  emphasisLines = [],
  emphasisLabel,
  children,
}: {
  path: string;
  start: number;
  end: number;
  title: string;
  emphasisLines?: number[];
  emphasisLabel?: string;
  children?: ReactNode;
}) {
  const source = rdmaEvidence.sources.find((item) => item.path === path);
  const lines = source?.lines.filter((line) => line.number >= start && line.number <= end) || [];
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/72" data-testid="source-excerpt">
      <header className="border-b border-white/8 px-4 py-3">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        <div className="mt-1 font-mono text-[11px] text-slate-500">
          {path}:{start}–{end} · embedded source snapshot from the verified reference run
        </div>
        {emphasisLabel ? <div className="mt-2 text-xs leading-5 text-cyan-100/85">{emphasisLabel}</div> : null}
      </header>
      <div className="overflow-x-auto p-3">
        <pre className="min-w-max font-mono text-xs leading-6 text-slate-300">
          {lines.map((line) => (
            <div key={line.number} className={cx("grid grid-cols-[3rem_1fr] gap-3 rounded px-2 hover:bg-white/4", emphasisLines.includes(line.number) && "bg-cyan-300/10 text-cyan-50 shadow-[inset_2px_0_0_rgba(103,232,249,0.75)]")}>
              <span className="select-none text-right text-slate-600">{line.number}</span>
              <code>{line.text || " "}</code>
            </div>
          ))}
        </pre>
      </div>
      {children ? <div className="border-t border-white/8 px-4 py-3 text-sm leading-6 text-slate-300">{children}</div> : null}
    </section>
  );
}

export function MemoryHex({ text, emptyLabel = "empty" }: { text: string | null | undefined; emptyLabel?: string }) {
  if (!text) return <span className="text-slate-600">{emptyLabel}</span>;
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

export function OperationComparisonTable({ includeRead = true }: { includeRead?: boolean }) {
  const rows = [
    {
      property: "Initiating endpoint",
      send: "The sender posts a SEND; the receiver must already have posted a RECEIVE.",
      write: "The writer initiates and supplies the remote destination address and RKEY.",
      read: "The reader initiates and supplies the remote source address and RKEY.",
    },
    {
      property: "Payload direction",
      send: "From the sending endpoint to the receiving endpoint.",
      write: "From the initiator's local buffer into the target's memory.",
      read: "From the target's memory back into the reader's local buffer.",
    },
    {
      property: "Remote receive request required",
      send: "Yes. Incoming SEND data consumes a posted receive request.",
      write: "No for an ordinary WRITE. The transport writes registered memory directly.",
      read: "No. The responder transport services the read without a receive WR.",
    },
    {
      property: "Remote address and RKEY required",
      send: "No. The receive WR selects the destination buffer locally.",
      write: "Yes. The request names the exact remote writable region.",
      read: "Yes. The request names the exact remote readable region.",
    },
    {
      property: "Completion ownership",
      send: "Sender receives a send completion; receiver receives a receive completion.",
      write: "The initiating writer receives the signalled completion. An ordinary WRITE gives no normal target receive CQE.",
      read: "The initiating reader receives the completion after the response data is placed locally.",
    },
    {
      property: "Typical use",
      send: "Message-oriented exchange where the receiver controls where messages land.",
      write: "Publishing or pushing data into a known remote buffer with minimal target involvement.",
      read: "Fetching data from a known remote buffer without asking the remote application to participate in each transfer.",
    },
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10" data-testid="operation-comparison">
      <table className="min-w-[760px] w-full border-collapse text-left text-sm">
        <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.14em] text-slate-400">
          <tr>
            <th className="border-b border-white/10 px-4 py-3">Property</th>
            <th className="border-b border-white/10 px-4 py-3">SEND/RECEIVE</th>
            <th className="border-b border-white/10 px-4 py-3">Ordinary WRITE</th>
            {includeRead ? <th className="border-b border-white/10 px-4 py-3">READ</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.property} className="align-top odd:bg-slate-950/35 even:bg-slate-900/25">
              <th className="w-44 px-4 py-3 font-semibold text-slate-200">{row.property}</th>
              <td className="px-4 py-3 leading-6 text-slate-300">{row.send}</td>
              <td className="px-4 py-3 leading-6 text-slate-300">{row.write}</td>
              {includeRead ? <td className="px-4 py-3 leading-6 text-slate-300">{row.read}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function exactValue(value: Parameters<typeof exact>[0], mode: "hex" | "decimal" = "hex") {
  return exact(value, mode);
}
