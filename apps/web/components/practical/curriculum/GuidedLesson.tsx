"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cx } from "./visuals";

export type GuidedStep = {
  id: string;
  title: string;
  body: ReactNode;
  visual: ReactNode;
  inspect?: ReactNode;
  evidence?: ReactNode;
  interaction?: ReactNode;
  actionLabel: string;
  canAdvance?: boolean;
  advanceBlockedReason?: string;
};

export function GuidedLesson({
  lessonId,
  steps,
  onComplete,
  finalActionLabel,
}: {
  lessonId: string;
  steps: GuidedStep[];
  onComplete: () => void;
  finalActionLabel: string;
}) {
  const storageKey = `fabriclab.rdma.lesson.${lessonId}.step`;
  const [stepIndex, setStepIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const step = steps[stepIndex];
  const isFinal = stepIndex === steps.length - 1;
  const canAdvance = step.canAdvance !== false;
  const hasContextPanel = Boolean(step.inspect || step.evidence);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      const parsed = stored ? Number.parseInt(stored, 10) : 0;
      if (Number.isFinite(parsed) && parsed >= 0 && parsed < steps.length) {
        setStepIndex(parsed);
      }
    } catch {
      // Persistence is a convenience; the lesson remains usable without it.
    }
    setHydrated(true);
  }, [storageKey, steps.length]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, String(stepIndex));
    } catch {
      // Ignore storage failures.
    }
  }, [hydrated, stepIndex, storageKey]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft" && stepIndex > 0) {
        event.preventDefault();
        setStepIndex((current) => Math.max(0, current - 1));
      }
      if (event.key === "ArrowRight" && !isFinal && canAdvance) {
        event.preventDefault();
        setStepIndex((current) => Math.min(steps.length - 1, current + 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canAdvance, isFinal, stepIndex, steps.length]);

  function advance() {
    if (!canAdvance) return;
    if (isFinal) {
      onComplete();
    } else {
      setStepIndex((current) => Math.min(steps.length - 1, current + 1));
    }
  }

  return (
    <div data-testid={`guided-lesson-${lessonId}`} data-hydrated={hydrated ? "true" : "false"}>
      <nav aria-label="Lesson states" className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible">
        {steps.map((item, index) => {
          const active = index === stepIndex;
          const visited = index < stepIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setStepIndex(index)}
              aria-current={active ? "step" : undefined}
              className={cx(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                active
                  ? "border-cyan-300/60 bg-cyan-300/12 text-cyan-100"
                  : visited
                    ? "border-emerald-300/25 bg-emerald-300/8 text-emerald-100/85"
                    : "border-white/10 bg-slate-950/50 text-slate-400 hover:border-white/25 hover:text-slate-200",
              )}
            >
              {index + 1}. {item.title}
            </button>
          );
        })}
      </nav>

      <article className="rounded-[1.75rem] border border-white/10 bg-slate-900/45 p-4 shadow-[0_20px_70px_rgba(2,6,23,0.28)] sm:p-6 lg:p-8">
        <div className="border-b border-white/8 pb-5">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">State {stepIndex + 1} of {steps.length}</div>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="max-w-4xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">{step.title}</h2>
            <div className="shrink-0 text-xs leading-5 text-slate-500 lg:max-w-56 lg:text-right">
              You can revisit earlier states. Nothing advances automatically.
            </div>
          </div>
        </div>

        <div className={hasContextPanel ? "mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" : "mt-6"}>
          <div className="min-w-0">
            <div className="max-w-[74ch] space-y-4 text-[1.02rem] leading-8 text-slate-300" data-testid="lesson-narrative">
              {step.body}
            </div>
          </div>

          {hasContextPanel ? (
          <aside className="min-w-0 space-y-4 xl:border-l xl:border-white/8 xl:pl-5">
            {step.evidence}
            {step.inspect ? (
              <details className="group rounded-2xl border border-cyan-300/20 bg-cyan-300/6 open:bg-cyan-300/8" data-testid="inspect-panel">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  Inspect the implementation detail
                  <span className="ml-2 text-xs font-normal text-cyan-200/70 group-open:hidden">show</span>
                  <span className="ml-2 hidden text-xs font-normal text-cyan-200/70 group-open:inline">hide</span>
                </summary>
                <div className="border-t border-cyan-300/15 p-4 text-sm leading-6 text-slate-300">{step.inspect}</div>
              </details>
            ) : null}
          </aside>
          ) : null}
        </div>

        <div className="mt-6" data-testid="lesson-visual">
          {step.visual}
        </div>
        {step.interaction ? <div className="mt-5">{step.interaction}</div> : null}

        <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
            className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-white/25 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Back to previous state
          </button>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {!canAdvance && step.advanceBlockedReason ? (
              <div className="text-right text-xs text-amber-200">{step.advanceBlockedReason}</div>
            ) : null}
            <button
              type="button"
              onClick={advance}
              disabled={!hydrated || !canAdvance}
              data-testid="lesson-action"
              className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isFinal ? finalActionLabel : step.actionLabel}
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
