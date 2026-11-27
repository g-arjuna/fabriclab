"use client";

import type { ReactNode } from "react";

import { cx } from "./visuals";

export type FoundationTone = "cpu" | "memory" | "device" | "kernel" | "network" | "metadata" | "warning" | "neutral" | "success";

export const toneClasses: Record<FoundationTone, string> = {
  cpu: "border-amber-300/35 bg-amber-300/8 text-amber-50",
  memory: "border-sky-300/35 bg-sky-300/8 text-sky-50",
  device: "border-orange-300/35 bg-orange-300/8 text-orange-50",
  kernel: "border-violet-300/35 bg-violet-300/8 text-violet-50",
  network: "border-cyan-300/35 bg-cyan-300/8 text-cyan-50",
  metadata: "border-fuchsia-300/35 bg-fuchsia-300/8 text-fuchsia-50",
  warning: "border-red-300/35 bg-red-300/8 text-red-50",
  neutral: "border-white/12 bg-white/4 text-slate-200",
  success: "border-emerald-300/35 bg-emerald-300/8 text-emerald-50",
};

export function FoundationBox({
  title,
  children,
  tone = "neutral",
  active = false,
  dashed = false,
  testId,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  tone?: FoundationTone;
  active?: boolean;
  dashed?: boolean;
  testId?: string;
  className?: string;
}) {
  return (
    <section
      data-testid={testId}
      className={cx(
        "min-w-0 rounded-xl border p-3",
        toneClasses[tone],
        active && "shadow-[0_0_0_1px_rgba(103,232,249,0.4)] ring-1 ring-cyan-300/30",
        dashed && "border-dashed opacity-80",
        className,
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-75">{title}</div>
      {children ? <div className="mt-2 text-sm leading-6">{children}</div> : null}
    </section>
  );
}

export function FoundationAction({
  children,
  onClick,
  active = false,
  disabled = false,
  testId,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      data-testid={testId}
      className={cx(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-cyan-200 bg-cyan-300 text-slate-950" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20",
      )}
    >
      {children}
    </button>
  );
}

export function ActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2" data-testid="foundation-action-row">{children}</div>;
}

export function LinkLine({
  label,
  kind = "payload",
  direction = "right",
  active = true,
  testId,
}: {
  label: ReactNode;
  kind?: "payload" | "instruction" | "translation" | "metadata" | "reference" | "network";
  direction?: "right" | "left" | "both" | "down";
  active?: boolean;
  testId?: string;
}) {
  const colors = {
    payload: "border-sky-300/70 text-sky-100",
    instruction: "border-amber-300/70 text-amber-100",
    translation: "border-emerald-300/70 text-emerald-100",
    metadata: "border-fuchsia-300/70 text-fuchsia-100",
    reference: "border-violet-300/70 text-violet-100",
    network: "border-cyan-300/70 text-cyan-100",
  } as const;
  const arrow = direction === "both" ? "↔" : direction === "left" ? "←" : direction === "down" ? "↓" : "→";
  const borderKind = kind === "instruction" || kind === "metadata" ? "border-dashed" : kind === "translation" || kind === "reference" ? "border-dotted" : "border-solid";
  return (
    <div className={cx("flex min-w-0 items-center justify-center gap-2 py-1 text-center text-[11px] leading-4", active ? colors[kind] : "border-white/10 text-slate-600")} data-testid={testId} data-kind={kind} data-active={active ? "true" : "false"}>
      {direction === "down" ? null : <span className={cx("min-w-8 flex-1 border-t", borderKind)} aria-hidden="true" />}
      <span className="font-mono text-sm leading-none" aria-hidden="true">{arrow}</span>
      <span className="max-w-full break-words">{label}</span>
      {direction === "down" ? null : <span className={cx("min-w-8 flex-1 border-t", borderKind)} aria-hidden="true" />}
    </div>
  );
}

export function ByteCells({
  bytes,
  offsets,
  addresses,
  ascii = false,
  highlight = [],
  outOfRange = [],
  tone = "memory",
  testId,
  compact = false,
}: {
  bytes: string[];
  offsets?: number[];
  addresses?: string[];
  ascii?: boolean;
  highlight?: number[];
  outOfRange?: number[];
  tone?: FoundationTone;
  testId?: string;
  compact?: boolean;
}) {
  return (
    <div className={cx("grid gap-1", compact ? "grid-cols-8 sm:grid-cols-16" : "grid-cols-4 sm:grid-cols-8 xl:grid-cols-16")} data-testid={testId}>
      {bytes.map((byte, index) => {
        const isHighlight = highlight.includes(index);
        const isOut = outOfRange.includes(index);
        return (
          <div
            key={`${index}-${byte}`}
            data-byte-index={index}
            className={cx(
              "min-w-0 rounded-md border px-1 py-1 text-center font-mono",
              compact ? "text-[9px]" : "text-[10px]",
              isHighlight ? "border-cyan-200 bg-cyan-300/25 text-cyan-50 ring-1 ring-cyan-300/40" : isOut ? "border-red-300/30 bg-red-300/8 text-red-100/70" : toneClasses[tone],
            )}
          >
            {offsets ? <div className="text-[8px] uppercase tracking-wide opacity-60">off {offsets[index]}</div> : null}
            {addresses ? <div className="text-[8px] opacity-60">{addresses[index]}</div> : null}
            <div className="text-sm font-semibold leading-5">{byte}</div>
            {ascii ? <div className="text-[9px] opacity-70">{byte === "00" ? "NUL" : String.fromCharCode(Number.parseInt(byte, 16))}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function Legend({ items }: { items: Array<[FoundationTone | "instruction" | "translation" | "metadata" | "reference", string]> }) {
  return (
    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400" data-testid="foundation-visual-legend">
      {items.map(([kind, label]) => <span key={label} className="rounded-full border border-white/10 bg-white/4 px-2 py-1"><span className="font-semibold text-slate-200">{kind}</span> · {label}</span>)}
    </div>
  );
}

export function SmallNote({ children, testId }: { children: ReactNode; testId?: string }) {
  return <div className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-[11px] leading-5 text-slate-400" data-testid={testId}>{children}</div>;
}

export function RangeBar({
  ranges,
  total,
  selected,
  highlighted = [],
  onSelect,
  testId,
}: {
  ranges: Array<{ id: string; label: string; start: number; endExclusive: number; detail?: string }>;
  total: number;
  selected?: string | null;
  highlighted?: string[];
  onSelect?: (id: string) => void;
  testId?: string;
}) {
  return (
    <div className="flex h-10 overflow-hidden rounded-xl border border-white/12 bg-slate-950/60" data-testid={testId}>
      {ranges.map((range) => {
        const width = `${Math.max(7, ((range.endExclusive - range.start) / total) * 100)}%`;
        const active = selected === range.id;
        const intersects = !active && highlighted.includes(range.id);
        const content = (
          <>
            <span className="block truncate font-mono text-[10px]">{range.label}</span>
            <span className="block truncate font-mono text-[9px] opacity-70">{range.start}–{range.endExclusive - 1}</span>
          </>
        );
        return onSelect ? (
          <button
            type="button"
            key={range.id}
            onClick={() => onSelect(range.id)}
            style={{ width }}
            data-range-id={range.id}
            className={cx("min-w-0 border-r border-slate-950/70 px-1 py-1 text-left last:border-r-0", active ? "bg-cyan-300/35 text-cyan-50" : intersects ? "bg-emerald-300/25 text-emerald-50 hover:bg-emerald-300/35" : "bg-sky-300/10 text-sky-100 hover:bg-sky-300/20")}
          >
            {content}
          </button>
        ) : (
          <div key={range.id} style={{ width }} data-range-id={range.id} className={cx("min-w-0 border-r border-slate-950/70 px-1 py-1 last:border-r-0", active ? "bg-cyan-300/35 text-cyan-50" : intersects ? "bg-emerald-300/25 text-emerald-50" : "bg-sky-300/10 text-sky-100")}>{content}</div>
        );
      })}
    </div>
  );
}
