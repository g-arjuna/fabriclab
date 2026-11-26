"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cx } from "./visuals";

export type GuidedStep = {
  id: string;
  title: string;
  body: ReactNode;
  visual: ReactNode;
  inspect?: ReactNode;
  evidence?: ReactNode;
  interaction?: ReactNode;
  inlineVisual?: boolean;
  mobileVisualFirst?: boolean;
  visualFirst?: boolean;
  actionLabel: string;
  canAdvance?: boolean;
  advanceBlockedReason?: string;
};

type PersistedGuidedState = {
  version: 2;
  current: string;
  visited: string[];
};

function idToIndex(steps: GuidedStep[], id: string | undefined) {
  const index = steps.findIndex((step) => step.id === id);
  return index >= 0 ? index : 0;
}

function parsePersistedState(value: string | null, steps: GuidedStep[]): { stepIndex: number; visitedSteps: number[] } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PersistedGuidedState>;
    if (parsed.version !== 2 || typeof parsed.current !== "string" || !Array.isArray(parsed.visited)) return null;
    const validIds = new Set(steps.map((step) => step.id));
    const visitedSteps = Array.from(new Set(parsed.visited.filter((id): id is string => typeof id === "string" && validIds.has(id)).map((id) => idToIndex(steps, id))));
    return { stepIndex: idToIndex(steps, parsed.current), visitedSteps };
  } catch {
    return null;
  }
}

function parseLegacyIndex(value: string | null, length: number) {
  const parsed = value ? Number.parseInt(value, 10) : 0;
  return Number.isFinite(parsed) && parsed >= 0 && parsed < length ? parsed : 0;
}

function parseLegacyVisited(value: string | null, length: number) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((item) => Number.isInteger(item) && item >= 0 && item < length))) as number[];
  } catch {
    return [];
  }
}

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
  const stateKey = `fabriclab.rdma.lesson.${lessonId}.state.v2`;
  const storageKey = `fabriclab.rdma.lesson.${lessonId}.step`;
  const visitedKey = `fabriclab.rdma.lesson.${lessonId}.visited`;
  const [stepIndex, setStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const step = steps[stepIndex];
  const isFinal = stepIndex === steps.length - 1;
  const canAdvance = step.canAdvance !== false;
  const allStepsVisited = steps.every((_, index) => visitedSteps.includes(index));
  const completionReferenceOnly = isFinal && !allStepsVisited;
  const primaryCanAdvance = canAdvance && !completionReferenceOnly;
  const hasContextPanel = Boolean(step.inspect || step.evidence);
  const inlineVisual = Boolean(step.inlineVisual);
  const mobileVisualFirst = Boolean(step.mobileVisualFirst) && !inlineVisual;
  const visualFirst = Boolean(step.visualFirst) && !inlineVisual;
  const firstBlockedIndex = steps.findIndex((item) => item.canAdvance === false);

  useEffect(() => {
    try {
      const versioned = parsePersistedState(window.localStorage.getItem(stateKey), steps);
      if (versioned) {
        setStepIndex(versioned.stepIndex);
        setVisitedSteps(versioned.visitedSteps);
      } else {
        const legacyStep = parseLegacyIndex(window.localStorage.getItem(storageKey), steps.length);
        const legacyVisited = parseLegacyVisited(window.localStorage.getItem(visitedKey), steps.length);
        setStepIndex(legacyStep);
        if (legacyVisited.length) setVisitedSteps(legacyVisited);
      }
    } catch {
      // Persistence is a convenience; the lesson remains usable without it.
    }
    setHydrated(true);
  }, [stateKey, storageKey, steps, visitedKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const state: PersistedGuidedState = {
        version: 2,
        current: steps[stepIndex]?.id || steps[0].id,
        visited: visitedSteps.map((index) => steps[index]?.id).filter((id): id is string => Boolean(id)),
      };
      window.localStorage.setItem(stateKey, JSON.stringify(state));
    } catch {
      // Ignore storage failures.
    }
  }, [hydrated, stateKey, stepIndex, steps, visitedSteps]);

  useEffect(() => {
    if (!hydrated) return;
    setVisitedSteps((current) => {
      if (current.includes(stepIndex)) return current;
      const next = [...current, stepIndex].sort((left, right) => left - right);
      return next;
    });
  }, [hydrated, stepIndex, visitedKey]);

  function canNavigateTo(index: number) {
    if (firstBlockedIndex === -1) return true;
    return index <= firstBlockedIndex;
  }

  function revealCurrentState() {
    window.setTimeout(() => {
      articleRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      headingRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function goTo(index: number) {
    const bounded = Math.max(0, Math.min(steps.length - 1, index));
    if (!canNavigateTo(bounded)) return;
    setStepIndex(bounded);
    revealCurrentState();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["A", "INPUT", "SELECT", "TEXTAREA", "SUMMARY"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft" && stepIndex > 0) {
        event.preventDefault();
        goTo(stepIndex - 1);
      }
      if (event.key === "ArrowRight" && !isFinal && primaryCanAdvance && canNavigateTo(stepIndex + 1)) {
        event.preventDefault();
        goTo(stepIndex + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function advance() {
    if (!primaryCanAdvance || !canNavigateTo(stepIndex + 1)) return;
    if (isFinal) {
      onComplete();
      revealCurrentState();
    } else {
      goTo(stepIndex + 1);
    }
  }

  return (
    <div data-testid={`guided-lesson-${lessonId}`} data-hydrated={hydrated ? "true" : "false"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-5 sm:gap-3" data-testid="lesson-progress">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-300">Step {stepIndex + 1} of {steps.length}</div>
          <div className="mt-2 flex items-center gap-1.5" aria-label="Guided step progress">
            {steps.map((item, index) => {
              const active = index === stepIndex;
              const visited = visitedSteps.includes(index);
              return (
                <span
                  key={item.id}
                  title={visited || active ? item.title : "Not yet viewed"}
                  aria-label={`Step ${index + 1}${active ? ", current" : visited ? ", viewed" : ", not viewed"}`}
                  className={cx(
                    "h-2.5 w-2.5 rounded-full border",
                    active ? "border-cyan-200 bg-cyan-300" : visited ? "border-emerald-300/50 bg-emerald-300/60" : "border-white/15 bg-slate-800",
                  )}
                />
              );
            })}
          </div>
        </div>
        <details className="rounded-xl border border-white/10 bg-slate-950/35 px-2.5 py-1.5 text-xs text-slate-400 sm:px-3 sm:py-2 sm:text-sm" data-testid="lesson-outline">
          <summary className="cursor-pointer font-medium text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Lesson outline</summary>
          <ol className="mt-3 max-w-xl space-y-1.5">
            {steps.map((item, index) => {
              const allowed = canNavigateTo(index);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!allowed}
                    onClick={() => goTo(index)}
                    className={cx(
                      "text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40",
                      index === stepIndex ? "font-semibold text-cyan-100" : visitedSteps.includes(index) ? "text-emerald-100/80 hover:text-emerald-50" : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    {index + 1}. {item.title}{!allowed ? " · complete the prerequisite interaction first" : ""}
                  </button>
                </li>
              );
            })}
          </ol>
        </details>
      </div>

      <article ref={articleRef} className="scroll-mt-20 guided-lesson-article rounded-2xl border border-white/10 bg-slate-900/35 p-3 shadow-[0_20px_70px_rgba(2,6,23,0.22)] max-sm:pb-24 sm:p-6 lg:p-7">
        <div className="border-b border-white/8 pb-3 sm:pb-4">
          <h2 ref={headingRef} tabIndex={-1} className="max-w-4xl text-xl font-semibold tracking-tight text-white outline-none sm:text-3xl">{step.title}</h2>
        </div>

        <div className={inlineVisual ? "mt-3 grid gap-4 sm:mt-5 sm:gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(430px,1fr)] xl:items-center" : hasContextPanel ? "mt-3 grid gap-4 sm:mt-5 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_330px]" : "mt-3 flex flex-col gap-4 sm:mt-5 sm:gap-5"}>
          <div className={cx("min-w-0", visualFirst ? "order-2" : mobileVisualFirst && "order-2 xl:order-1")}>
            <div className="max-w-[72ch] space-y-3 text-sm leading-6 text-slate-300 sm:space-y-4 sm:text-[1.01rem] sm:leading-8" data-testid="lesson-narrative">
              {step.body}
            </div>
          </div>

          {inlineVisual ? (
            <div className="min-w-0" data-testid="lesson-visual">
              {step.visual}
            </div>
          ) : null}

          {hasContextPanel ? (
            <aside className={cx("min-w-0 space-y-4 xl:border-l xl:border-white/8 xl:pl-5", visualFirst ? "order-3" : mobileVisualFirst && "order-3 xl:order-2")}>
              {step.evidence}
              {step.inspect ? (
                <details className="group rounded-xl border border-cyan-300/20 bg-cyan-300/5 open:bg-cyan-300/7" data-testid="inspect-panel">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                    Inspect implementation detail
                    <span className="ml-2 hidden text-xs font-normal text-cyan-200/70 group-open:inline">hide</span>
                  </summary>
                  <div className="border-t border-cyan-300/15 p-4 text-sm leading-6 text-slate-300">{step.inspect}</div>
                </details>
              ) : null}
            </aside>
          ) : null}

          {!inlineVisual ? (
            <div className={cx("min-w-0 xl:col-span-2", visualFirst ? "order-1 xl:col-span-2" : mobileVisualFirst ? "order-1 xl:order-3" : "order-3")} data-testid="lesson-visual">
              {step.visual}
            </div>
          ) : null}
        </div>

        {step.interaction ? <div className="mt-3 sm:mt-5">{step.interaction}</div> : null}

        <footer className="guided-mobile-footer z-30 mt-7 flex flex-col-reverse gap-2 border-t border-white/8 pt-4 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:m-0 max-sm:bg-slate-950/95 max-sm:px-4 max-sm:py-3 max-sm:shadow-[0_-12px_32px_rgba(2,6,23,0.7)] max-sm:backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-5">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-white/25 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none"
            >
              Back to previous step
            </button>
          ) : null}
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {completionReferenceOnly ? (
              <div className="text-right text-xs text-amber-200">Direct reference access remains available, but completion is recorded only after each guided step has been viewed.</div>
            ) : !canAdvance && step.advanceBlockedReason ? (
              <div className="text-right text-xs text-amber-200">{step.advanceBlockedReason}</div>
            ) : null}
            <button
              type="button"
              onClick={advance}
              disabled={!hydrated || !primaryCanAdvance || (!isFinal && !canNavigateTo(stepIndex + 1))}
              data-testid="lesson-action"
              className="w-full rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none sm:w-auto"
            >
              {isFinal ? finalActionLabel : step.actionLabel}
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
