"use client";

import { getScoreBand } from "@/lib/labEngine";
import { useLabStore } from "@/store/labStore";

const bandClasses = {
  green: "text-emerald-300",
  blue: "text-sky-300",
  amber: "text-amber-300",
  red: "text-rose-300",
} as const;

export function LabResult({
  score,
  onReset,
}: {
  score: number;
  onReset: () => void;
}) {
  const lab = useLabStore((state) => state.lab);
  const band = getScoreBand(score);
  const perfectRun =
    lab.mistakeCount === 0 && lab.nearMissCount === 0 && lab.hintsUsed === 0;

  const breakdown = [
    {
      label: "Mistakes",
      count: lab.mistakeCount,
      points: -8,
      total: lab.mistakeCount * -8,
    },
    {
      label: "Near-misses",
      count: lab.nearMissCount,
      points: -3,
      total: lab.nearMissCount * -3,
    },
    {
      label: "Hints used",
      count: lab.hintsUsed,
      points: -10,
      total: lab.hintsUsed * -10,
    },
  ];

  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/95 p-8 text-slate-100 shadow-2xl shadow-slate-950/50 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Lab complete</p>
      <div className={`mt-4 text-7xl font-semibold ${bandClasses[band.color]}`}>{score}</div>
      <p className="mt-2 text-lg text-slate-200">{band.label}</p>
      <p className="mt-3 text-sm text-slate-400">Score: {score}/100</p>

      {perfectRun ? (
        <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          Perfect run — no mistakes, no hints needed.
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/80 p-5 text-sm text-slate-300">
          <div className="border-b border-white/10 pb-3 text-base font-medium text-slate-100">
            Score breakdown
          </div>
          <div className="space-y-3 py-4">
            {breakdown.map((item) => (
              <div key={item.label} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
                <span>{item.label}:</span>
                <span>{item.count}</span>
                <span>{item.points}pts</span>
                <span className="text-right">{item.total}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between text-base font-medium text-slate-100">
              <span>Final score:</span>
              <span>{score}</span>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-8 inline-flex rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
      >
        Try again
      </button>
    </div>
  );
}
