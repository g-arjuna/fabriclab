"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
  subsectionId?: string;
  subsectionIndex?: number;
  subsectionCount?: number;
  stageIndex?: number;
  stageCount?: number;
  stageLabel?: string;
  observation?: ReactNode;
  nextPreview?: string;
  actionLabel?: string;
};

type PersistedGuidedState = {
  version: 5;
  revision: string;
  current: string;
  visited: string[];
};

const REVISED_FOUNDATION_LESSONS = new Set(["moving-data", "why-rdma", "memory", "queues"]);
const REVISED_OPERATION_LESSONS = new Set(["send-receive", "write", "read", "packets"]);
export function guidedLessonStateStorageKey(lessonId: string) {
  return `fabriclab.rdma.lesson.${lessonId}.guided-state.v5`;
}

export function guidedLessonLegacyStateStorageKey(lessonId: string) {
  return `fabriclab.rdma.lesson.${lessonId}.guided-state.v4`;
}

export function guidedPersistedRevisionForLesson(lessonId: string) {
  if (REVISED_FOUNDATION_LESSONS.has(lessonId)) return FOUNDATIONS_V2_REVISION;
  if (REVISED_OPERATION_LESSONS.has(lessonId)) return OPERATIONS_V2_REVISION;
  return "guided-legacy-v1";
}

const FOUNDATIONS_V2_REVISION = "guided-foundations-v3";
const OPERATIONS_V2_REVISION = "guided-operations-v3";

function idToIndex(steps: GuidedStep[], id: string | undefined) {
  const index = steps.findIndex((step) => step.id === id);
  return index >= 0 ? index : 0;
}

function parsePersistedState(value: string | null, steps: GuidedStep[], requiredRevision: string, version: 4 | 5): { stepIndex: number; visitedSteps: number[] } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PersistedGuidedState>;
    if (parsed.version !== version || parsed.revision !== requiredRevision || typeof parsed.current !== "string" || !Array.isArray(parsed.visited)) return null;
    const validIds = new Set(steps.map((step) => step.id));
    if (!validIds.has(parsed.current)) return null;
    const visitedSteps = Array.from(new Set(parsed.visited.filter((id): id is string => typeof id === "string" && validIds.has(id)).map((id) => idToIndex(steps, id))));
    return { stepIndex: idToIndex(steps, parsed.current), visitedSteps };
  } catch {
    return null;
  }
}

export function GuidedLesson({
  lessonId,
  steps,
  onComplete,
  finalActionLabel,
  onPreviousLesson,
  hasPreviousLesson = false,
}: {
  lessonId: string;
  steps: GuidedStep[];
  onComplete: () => void;
  finalActionLabel: string;
  onPreviousLesson?: () => void;
  hasPreviousLesson?: boolean;
}) {
  const stateKey = guidedLessonStateStorageKey(lessonId);
  const legacyStateKey = guidedLessonLegacyStateStorageKey(lessonId);
  const [stepIndex, setStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const revisedFoundation = REVISED_FOUNDATION_LESSONS.has(lessonId);
  const persistedRevision = guidedPersistedRevisionForLesson(lessonId);
  const articleRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const step = steps[stepIndex];
  const isFinal = stepIndex === steps.length - 1;
  const allStepsVisited = steps.every((_, index) => visitedSteps.includes(index));
  const completionReferenceOnly = isFinal && !allStepsVisited;
  const firstUnvisitedStep = steps.findIndex((_, index) => !visitedSteps.includes(index));
  const inlineVisual = Boolean(step.inlineVisual);
  const mobileVisualFirst = Boolean(step.mobileVisualFirst) && !inlineVisual;
  const visualFirst = Boolean(step.visualFirst) && !inlineVisual;
  const hasContextPanel = Boolean(step.inspect);

  const subsections = useMemo(() => {
    const result: { key: string; title: string; firstIndex: number; subsectionId?: string; visited: boolean; active: boolean }[] = [];
    steps.forEach((item, index) => {
      const key = item.subsectionId || item.id;
      const existing = result.find((entry) => entry.key === key);
      if (existing) {
        existing.visited ||= visitedSteps.includes(index);
        existing.active ||= index === stepIndex;
      } else {
        result.push({ key, title: item.title, firstIndex: index, subsectionId: item.subsectionId, visited: visitedSteps.includes(index), active: index === stepIndex });
      }
    });
    return result;
  }, [steps, stepIndex, visitedSteps]);

  useEffect(() => {
    try {
      const versioned = parsePersistedState(window.localStorage.getItem(stateKey), steps, persistedRevision, 5) || parsePersistedState(window.localStorage.getItem(legacyStateKey), steps, persistedRevision, 4);
      if (versioned) {
        setStepIndex(versioned.stepIndex);
        setVisitedSteps(versioned.visitedSteps);
      }
    } catch {
      // Persistence is a convenience; the lesson remains usable without it.
    }
    setHydrated(true);
  }, [stateKey, legacyStateKey, steps, persistedRevision]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const state: PersistedGuidedState = {
        version: 5,
        revision: persistedRevision,
        current: steps[stepIndex]?.id || steps[0].id,
        visited: visitedSteps.map((index) => steps[index]?.id).filter((id): id is string => Boolean(id)),
      };
      window.localStorage.setItem(stateKey, JSON.stringify(state));
    } catch {
      // Ignore storage failures.
    }
  }, [hydrated, persistedRevision, stateKey, stepIndex, steps, visitedSteps]);

  useEffect(() => {
    if (!hydrated) return;
    setVisitedSteps((current) => {
      if (current.includes(stepIndex)) return current;
      return [...current, stepIndex].sort((left, right) => left - right);
    });
  }, [hydrated, stepIndex]);

  function revealCurrentState() {
    window.setTimeout(() => {
      articleRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      headingRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function goTo(index: number) {
    const bounded = Math.max(0, Math.min(steps.length - 1, index));
    setStepIndex(bounded);
    revealCurrentState();
  }

  function goPrevious() {
    if (stepIndex > 0) {
      goTo(stepIndex - 1);
    } else if (hasPreviousLesson && onPreviousLesson) {
      onPreviousLesson();
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["A", "INPUT", "SELECT", "TEXTAREA", "SUMMARY", "BUTTON"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft" && (stepIndex > 0 || hasPreviousLesson)) {
        event.preventDefault();
        goPrevious();
      }
      if (event.key === "ArrowRight" && !isFinal) {
        event.preventDefault();
        goTo(stepIndex + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function advance() {
    if (completionReferenceOnly) {
      goTo(firstUnvisitedStep >= 0 ? firstUnvisitedStep : 0);
      return;
    }
    if (isFinal) {
      onComplete();
      revealCurrentState();
    } else {
      goTo(stepIndex + 1);
    }
  }

  const stageCount = step.stageCount || 1;
  const stageIndex = step.stageIndex || 0;
  const nextPreview = isFinal ? finalActionLabel : step.nextPreview || steps[stepIndex + 1]?.stageLabel || steps[stepIndex + 1]?.title;

  return (
    <div data-testid={`guided-lesson-${lessonId}`} data-hydrated={hydrated ? "true" : "false"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-5 sm:gap-3" data-testid="lesson-progress">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-300" data-testid="guided-position">
            {step.subsectionId ? `${step.subsectionId} — ${step.title}` : step.title}
            {stageCount > 1 ? ` · Stage ${stageIndex + 1} of ${stageCount}` : ""}
          </div>
        </div>
        <details className="rounded-xl border border-white/10 bg-slate-950/35 px-2.5 py-1.5 text-xs text-slate-400 sm:px-3 sm:py-2 sm:text-sm" data-testid="lesson-outline">
          <summary className="cursor-pointer font-medium text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Lesson outline</summary>
          <ol className="mt-3 max-w-xl space-y-1.5">
            {subsections.map((item, index) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => goTo(item.firstIndex)}
                  className={cx(
                    "text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                    item.active ? "font-semibold text-cyan-100" : item.visited ? "text-emerald-100/80 hover:text-emerald-50" : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  {item.subsectionId || `${index + 1}`}. {item.title}
                </button>
              </li>
            ))}
          </ol>
        </details>
      </div>

      <article ref={articleRef} className="scroll-mt-20 guided-lesson-article rounded-2xl border border-white/10 bg-slate-900/35 p-2 shadow-[0_20px_70px_rgba(2,6,23,0.22)] max-lg:pb-20 sm:p-6 lg:p-7" data-testid="guided-article" data-guided-step={step.id} data-stage-index={stageIndex}>
        <div className="border-b border-white/8 pb-3 sm:pb-4">
          <h2 ref={headingRef} tabIndex={-1} className="max-w-4xl text-xl font-semibold tracking-tight text-white outline-none sm:text-3xl">{step.stageLabel || step.title}</h2>
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
            <aside className={cx("min-w-0 space-y-4 xl:border-l xl:border-white/8 xl:pl-5", visualFirst ? "order-3" : "order-3 xl:order-2")}>
              {step.inspect ? (
                <details className="group rounded-xl border border-cyan-300/20 bg-cyan-300/5 open:bg-cyan-300/7" data-testid="inspect-panel">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                    Inspect technical details
                    <span className="ml-2 hidden text-xs font-normal text-cyan-200/70 group-open:inline">hide</span>
                  </summary>
                  <div className="border-t border-cyan-300/15 p-4 text-sm leading-6 text-slate-300">{step.inspect}</div>
                </details>
              ) : null}
            </aside>
          ) : null}

          {!inlineVisual ? (
            <div className={cx("min-w-0 xl:col-span-2", visualFirst ? "order-1 xl:col-span-2" : mobileVisualFirst ? "order-1 xl:order-3" : "order-2 xl:order-3")} data-testid="lesson-visual">
              {step.visual}
            </div>
          ) : null}
        </div>

        {step.observation ? <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/7 p-4 text-sm leading-6 text-emerald-50 sm:mt-5" data-testid="guided-observation">{step.observation}</div> : null}

        <footer className="guided-mobile-footer z-30 mt-5 flex flex-row items-center justify-between gap-2 border-t border-white/8 pt-3 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:m-0 max-lg:bg-slate-950/95 max-lg:px-3 max-lg:py-2 max-lg:shadow-[0_-12px_32px_rgba(2,6,23,0.7)] max-lg:backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-5">
          {stepIndex > 0 || hasPreviousLesson ? (
            <button
              type="button"
              onClick={goPrevious}
              data-testid="lesson-previous"
              className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm text-slate-300 transition hover:border-white/25 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none"
            >
              ← Previous
            </button>
          ) : <span className="hidden sm:block" />}
          <div className="flex items-center gap-2">
            {completionReferenceOnly ? (
              <div className="text-right text-xs text-amber-200">Direct reference access is available. Use the continuation action to review the first unvisited guided state before completion is recorded.</div>
            ) : null}
            {nextPreview ? <div className="hidden text-right text-xs text-slate-400 sm:block" data-testid="guided-next-preview">Up next: {nextPreview}</div> : null}
            <button
              type="button"
              onClick={advance}
              disabled={!hydrated}
              data-testid="lesson-action"
              className="w-auto whitespace-nowrap rounded-full bg-cyan-300 px-4 py-2.5 text-xs sm:px-5 sm:py-3 sm:text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none sm:w-auto"
            >
              {completionReferenceOnly ? "Review first unvisited section" : isFinal ? finalActionLabel : "Next →"}
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
