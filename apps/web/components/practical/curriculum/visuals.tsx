import type { ReactNode } from "react";

import { exact, rdmaEvidence } from "@/lib/practical/rdmaEvidence";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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
