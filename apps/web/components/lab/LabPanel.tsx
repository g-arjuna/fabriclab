"use client";

import { useEffect, useMemo, useState } from "react";

import { formatConditionLabel } from "@/lib/formatters";
import { useLabStore } from "@/store/labStore";
import type { LabConfig } from "@/types";

const difficultyClasses: Record<LabConfig["difficulty"], string> = {
  beginner: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  intermediate: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
  advanced: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
};

function formatElapsed(startTime: number | null, now: number): string {
  const elapsedSeconds = startTime ? Math.max(0, Math.floor((now - startTime) / 1000)) : 0;
  const minutes = Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function LabPanel({ config }: { config: LabConfig }) {
  const labState = useLabStore((state) => state.lab);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const latestHint = useMemo(() => {
    if (labState.shownHintLevels.size === 0) {
      return null;
    }

    const highestShownLevel = Math.max(...Array.from(labState.shownHintLevels));
    return config.hints.find((hint) => hint.level === highestShownLevel) ?? null;
  }, [config.hints, labState.shownHintLevels]);

  return (
    <section className="flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Active lab</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{config.title}</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${difficultyClasses[config.difficulty]}`}
        >
          {config.difficulty}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Elapsed</p>
          <p className="mt-2 font-mono text-3xl text-cyan-300">
            {formatElapsed(labState.startTime, now)}
          </p>
        </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Scenario</p>
        <div className="mt-3 max-h-[200px] overflow-y-auto pr-1">
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
            {config.scenario}
          </p>
        </div>
      </div>

      <div className="mt-6 flex-1 min-h-0 overflow-y-auto">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Conditions</p>
        <ul className="mt-4 space-y-3">
          {config.requiredConditions.map((condition) => {
            const isMet = labState.conditions[condition] === true;
            const isVerified = labState.verifiedConditions.has(condition);

            let icon = <span className="h-4 w-4 rounded-full border border-slate-600 bg-transparent" />;
            let textClass = "text-slate-400";

            if (isMet && !isVerified) {
              icon = <span className="h-4 w-4 rounded-full bg-amber-400" />;
              textClass = "text-amber-200";
            }

            if (isMet && isVerified) {
              icon = (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                  ✓
                </span>
              );
              textClass = "text-emerald-200";
            }

            return (
              <li
                key={condition}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-900/70 px-4 py-3"
              >
                {icon}
                <span className={`text-sm ${textClass}`}>{formatConditionLabel(condition)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {latestHint ? (
        <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
          <span className="font-medium">Hint: </span>
          {latestHint.text}
        </div>
      ) : null}
    </section>
  );
}
