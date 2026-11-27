"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";

import { Lesson1MovingData } from "./curriculum/Lesson1MovingData";
import { Lesson2WhyRdma } from "./curriculum/Lesson2WhyRdma";
import { Lesson3Memory } from "./curriculum/Lesson3Memory";
import { Lesson4Queues } from "./curriculum/Lesson4Queues";
import { Lesson5SendReceive } from "./curriculum/Lesson5SendReceive";
import { Lesson6Write } from "./curriculum/Lesson6Write";
import { Lesson7Read } from "./curriculum/Lesson7Read";
import { Lesson8Packets } from "./curriculum/Lesson8Packets";
import { cx } from "./curriculum/visuals";
import { finalGuidedStepIdForLesson } from "./curriculum/guidedLessonNavigation";
import { guidedLessonLegacyStateStorageKey, guidedLessonStateStorageKey, guidedPersistedRevisionForLesson } from "./curriculum/GuidedLesson";

type LessonComponent = ComponentType<{ onComplete: () => void; onPreviousLesson?: () => void; hasPreviousLesson?: boolean }>;

type LessonMeta = {
  id: string;
  nav: string;
  title: string;
  question: string;
  component: LessonComponent;
};

const LESSONS: LessonMeta[] = [
  { id: "moving-data", nav: "Moving data", title: "How does data travel between two computers?", question: "How do five bytes move from one application’s memory into another computer’s application memory?", component: Lesson1MovingData },
  { id: "why-rdma", nav: "Why RDMA?", title: "Why does RDMA exist?", question: "Why did engineers need a different data-transfer and programming model for repeated large memory-to-memory transfers?", component: Lesson2WhyRdma },
  { id: "memory", nav: "Memory", title: "How do we make memory available to RDMA?", question: "How do we let a device access exactly the memory intended for a transfer — and no more?", component: Lesson3Memory },
  { id: "queues", nav: "Queues", title: "How does an application tell the RDMA device what to do?", question: "How does application intent become work that an RDMA device can execute?", component: Lesson4Queues },
  { id: "send-receive", nav: "SEND/RECEIVE", title: "Our first real RDMA transfer: SEND/RECEIVE", question: "How do a posted receive, a send request, one packet and two completions fit together?", component: Lesson5SendReceive },
  { id: "write", nav: "WRITE", title: "What makes RDMA WRITE different?", question: "How can the initiator write into remote memory without the target posting a receive request?", component: Lesson6Write },
  { id: "read", nav: "READ", title: "How does RDMA READ work?", question: "How can the initiator pull data from remote memory, and why are request and payload directions different?", component: Lesson7Read },
  { id: "packets", nav: "Packet analysis", title: "From Python code to packets on the wire", question: "How do the operations you now understand appear in genuine RoCEv2 packet captures?", component: Lesson8Packets },
];

const CURRENT_KEY = "fabriclab.rdma.curriculum.current";
const COMPLETED_KEY = "fabriclab.rdma.curriculum.completed";
const COMPLETED_V2_KEY = "fabriclab.rdma.curriculum.completed.v2";
const COMPLETED_V3_KEY = "fabriclab.rdma.curriculum.completed.v3";
const FINISHED_KEY = "fabriclab.rdma.curriculum.finished";
const REVISED_FOUNDATION_LESSON_IDS = new Set(LESSONS.slice(0, 4).map((lesson) => lesson.id));
const REVISED_OPERATION_LESSON_IDS = new Set(LESSONS.slice(4).map((lesson) => lesson.id));

function validCompletedLessons(value: unknown) {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && LESSONS.some((item) => item.id === id)) : [];
}

function validLessonIndex(value: string | undefined) {
  const index = LESSONS.findIndex((lesson) => lesson.id === value);
  return index >= 0 ? index : 0;
}

function lessonProgressPrefix(lessonId: string) {
  return `fabriclab.rdma.lesson.${lessonId}`;
}

function clearLessonProgress(lessonId: string) {
  const prefix = lessonProgressPrefix(lessonId);
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(prefix)) window.localStorage.removeItem(key);
  }
}

const OPERATION_QUIZ_IDS_BY_LESSON: Record<string, string[]> = {
  "send-receive": ["send-destination-review", "send-evidence-review"],
  write: ["write-evidence-review"],
  read: ["read-direction-review"],
  packets: ["case-a-destination", "case-a-additional-record", "case-b-ack-meaning", "case-b-target-poll", "case-c-completion-owner", "case-c-initiator", "case-c-target-endpoint", "final-distinction-review"],
};
const OPERATION_SECTION_PREFIX_BY_LESSON: Record<string, string> = {
  "send-receive": "5.",
  write: "6.",
  read: "7.",
  packets: "8.",
};

function removeStorageKeysMatching(predicate: (key: string) => boolean) {
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key && predicate(key)) window.localStorage.removeItem(key);
  }
}

function clearOperationInteractionState(lessonId: string) {
  const sectionPrefix = OPERATION_SECTION_PREFIX_BY_LESSON[lessonId];
  const quizIds = OPERATION_QUIZ_IDS_BY_LESSON[lessonId] || [];
  removeStorageKeysMatching((key) => {
    if (sectionPrefix && key.startsWith(`fabriclab.rdma.operations-v2.interaction.${sectionPrefix}`)) return true;
    if (quizIds.some((id) => key === `fabriclab.rdma.operations-v2.quiz.${id}`)) return true;
    return lessonId === "write" && key === "fabriclab.rdma.operations-v2.6.6.prediction";
  });
}

function clearAllOperationInteractionState() {
  removeStorageKeysMatching((key) => key.startsWith("fabriclab.rdma.operations-v2."));
}

export function RdmaCurriculum({ initialLesson }: { initialLesson?: string }) {
  const [lessonIndex, setLessonIndex] = useState(() => validLessonIndex(initialLesson));
  const [completed, setCompleted] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const lesson = LESSONS[lessonIndex];
  const Lesson = lesson.component;

  useEffect(() => {
    try {
      const storedLesson = window.localStorage.getItem(CURRENT_KEY);
      const initialIndex = validLessonIndex(initialLesson);
      if (!initialLesson && storedLesson) {
        const storedIndex = validLessonIndex(storedLesson);
        if (storedIndex > 0) setLessonIndex(storedIndex);
      } else if (initialIndex !== lessonIndex) {
        setLessonIndex(initialIndex);
      }
      const operationsCompleted = window.localStorage.getItem(COMPLETED_V3_KEY);
      let migratedCompleted: string[] = [];
      let droppedOperationProgress = false;
      let droppedLegacyProgress = false;
      if (operationsCompleted) {
        migratedCompleted = validCompletedLessons(JSON.parse(operationsCompleted));
      } else {
        // Preserve accepted Foundations V2 completion, but do not allow the
        // shorter pre-Operations lessons 5–8 to satisfy the expanded revision.
        const versionedCompleted = window.localStorage.getItem(COMPLETED_V2_KEY);
        if (versionedCompleted) {
          const stored = validCompletedLessons(JSON.parse(versionedCompleted));
          migratedCompleted = stored.filter((id) => !REVISED_OPERATION_LESSON_IDS.has(id));
          droppedOperationProgress = stored.some((id) => REVISED_OPERATION_LESSON_IDS.has(id));
        } else {
          const legacyCompleted = window.localStorage.getItem(COMPLETED_KEY);
          if (legacyCompleted) {
            const stored = validCompletedLessons(JSON.parse(legacyCompleted));
            migratedCompleted = stored.filter((id) => !REVISED_FOUNDATION_LESSON_IDS.has(id) && !REVISED_OPERATION_LESSON_IDS.has(id));
            droppedLegacyProgress = stored.length > migratedCompleted.length;
          }
        }
      }
      if (droppedLegacyProgress) {
        setMigrationNotice("The guided-navigation redesign changed the internal visual stages of this course. Earlier unversioned lesson progress was not carried forward; restart those lessons from their first guided state.");
      } else if (droppedOperationProgress) {
        setMigrationNotice("The guided-navigation redesign changed the internal visual stages of this course. Earlier operation-lesson progress was not carried forward; restart those lessons from their first guided state. Foundations V2 completion is preserved where it has a meaningful correspondence.");
      }
      setCompleted(migratedCompleted);
      const storedFinished = window.localStorage.getItem(FINISHED_KEY) === "true" && LESSONS.every((item) => migratedCompleted.includes(item.id));
      setFinished(storedFinished);
      setShowCompletion(storedFinished && !initialLesson);
    } catch {
      // Progress persistence is non-invasive and optional.
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CURRENT_KEY, lesson.id);
      window.localStorage.setItem(COMPLETED_V3_KEY, JSON.stringify(completed));
      window.localStorage.setItem(FINISHED_KEY, finished ? "true" : "false");
      const url = new URL(window.location.href);
      if (url.searchParams.has("lesson")) {
        url.searchParams.set("lesson", lesson.id);
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // Ignore storage/history failures.
    }
  }, [completed, finished, hydrated, lesson.id]);

  const progressText = useMemo(() => `${lessonIndex + 1} of ${LESSONS.length}`, [lessonIndex]);

  function completeLesson() {
    const nextCompleted = completed.includes(lesson.id) ? completed : [...completed, lesson.id];
    const practicalComplete = LESSONS.every((item) => nextCompleted.includes(item.id));
    const nextLessonIndex = practicalComplete || lessonIndex >= LESSONS.length - 1 ? lessonIndex : lessonIndex + 1;
    try {
      window.localStorage.setItem(COMPLETED_V3_KEY, JSON.stringify(nextCompleted));
      window.localStorage.setItem(FINISHED_KEY, practicalComplete ? "true" : "false");
      window.localStorage.setItem(CURRENT_KEY, LESSONS[nextLessonIndex].id);
    } catch {
      // Progress persistence is optional.
    }
    setCompleted(nextCompleted);
    if (practicalComplete) {
      setFinished(true);
      setShowCompletion(true);
    } else if (lessonIndex < LESSONS.length - 1) {
      setLessonIndex(nextLessonIndex);
    }
  }

  function markLessonExplicit(id: string) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lesson", id);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Direct-reference persistence is optional.
    }
  }

  function seedLessonAtFinalGuidedState(lessonId: string) {
    const finalStepId = finalGuidedStepIdForLesson(lessonId);
    if (!finalStepId) return;
    try {
      const stateKey = guidedLessonStateStorageKey(lessonId);
      const legacyKey = guidedLessonLegacyStateStorageKey(lessonId);
      const existingRaw = window.localStorage.getItem(stateKey) || window.localStorage.getItem(legacyKey);
      let visited: string[] = [];
      if (existingRaw) {
        const existing = JSON.parse(existingRaw) as { visited?: unknown };
        if (Array.isArray(existing.visited)) visited = existing.visited.filter((id): id is string => typeof id === "string");
      }
      if (!visited.includes(finalStepId)) visited.push(finalStepId);
      window.localStorage.setItem(stateKey, JSON.stringify({
        version: 5,
        revision: guidedPersistedRevisionForLesson(lessonId),
        current: finalStepId,
        visited,
      }));
    } catch {
      // Cross-lesson navigation still opens the preceding lesson if storage is unavailable.
    }
  }

  function openPreviousLesson() {
    if (lessonIndex <= 0) return;
    const previousIndex = lessonIndex - 1;
    seedLessonAtFinalGuidedState(LESSONS[previousIndex].id);
    selectLesson(previousIndex);
  }

  function selectLesson(index: number) {
    markLessonExplicit(LESSONS[index].id);
    try {
      window.localStorage.setItem(CURRENT_KEY, LESSONS[index].id);
    } catch {
      // Progress persistence is optional.
    }
    setShowCompletion(false);
    setLessonIndex(index);
  }

  function restartLesson(index = lessonIndex) {
    try {
      clearLessonProgress(LESSONS[index].id);
      clearOperationInteractionState(LESSONS[index].id);
    } catch {
      // Restart remains possible without storage access.
    }
    markLessonExplicit(LESSONS[index].id);
    setCompleted((currentCompleted) => currentCompleted.filter((id) => id !== LESSONS[index].id));
    setFinished(false);
    setShowCompletion(false);
    setLessonIndex(index);
    setResetVersion((current) => current + 1);
  }

  function startPracticalAgain() {
    try {
      LESSONS.forEach((item) => clearLessonProgress(item.id));
      clearAllOperationInteractionState();
      window.localStorage.removeItem(COMPLETED_KEY);
      window.localStorage.removeItem(COMPLETED_V2_KEY);
      window.localStorage.removeItem(COMPLETED_V3_KEY);
      window.localStorage.removeItem(FINISHED_KEY);
      const url = new URL(window.location.href);
      url.searchParams.delete("lesson");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Restart remains possible without storage access.
    }
    setCompleted([]);
    setFinished(false);
    setShowCompletion(false);
    setLessonIndex(0);
    setResetVersion((current) => current + 1);
  }

  const lessonNav = (compact: boolean) => (
    <ol className={compact ? "mt-3 grid gap-1" : "flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"}>
      {LESSONS.map((item, index) => {
        const active = index === lessonIndex;
        const done = completed.includes(item.id);
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => selectLesson(index)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex w-full shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition lg:whitespace-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 motion-reduce:transition-none",
                active ? "bg-cyan-300/12 text-cyan-100" : done ? "text-emerald-100/80 hover:bg-white/5" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              <span className={cx("w-5 font-mono text-xs", done ? "text-emerald-300" : active ? "text-cyan-300" : "text-slate-600")} aria-hidden="true">
                {done ? "✓" : active ? "●" : "○"}
              </span>
              <span>{item.nav}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div data-testid="rdma-curriculum" data-hydrated={hydrated ? "true" : "false"}>
      <div className="border-b border-white/8 pb-3 sm:pb-5">
        <div className="hidden text-xs uppercase tracking-[0.2em] text-slate-500 sm:block">FabricLab / Practicals / RDMA From First Principles</div>
        <div className="mt-2 flex flex-col gap-2.5 sm:mt-4 sm:gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="text-xs font-semibold text-cyan-300 sm:text-sm">Lesson {progressText}</div>
              {completed.includes(lesson.id) ? <div className="text-[11px] uppercase tracking-[0.14em] text-emerald-300/80">Previously completed · review/reference access</div> : null}
            </div>
            {migrationNotice ? <div className="mt-2 max-w-3xl rounded-xl border border-amber-300/20 bg-amber-300/8 px-3 py-2 text-xs leading-5 text-amber-100" data-testid="guided-progress-migration-notice">{migrationNotice}</div> : null}
            <h1 className="mt-1.5 max-w-4xl text-[1.55rem] font-semibold leading-8 tracking-tight text-white sm:mt-2 sm:text-4xl sm:leading-tight">{lesson.title}</h1>
            <p className="mt-3 hidden max-w-3xl text-base leading-7 text-slate-400 sm:block">{lesson.question}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => restartLesson()}
              className="w-fit rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-500 transition hover:border-white/25 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:px-4 sm:py-2 sm:text-sm"
            >
              <span className="sm:hidden">Restart</span><span className="hidden sm:inline">Restart this lesson</span>
            </button>
            <Link
              href="/practical/rdma/explorer"
              className="w-fit rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:border-white/25 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:px-4 sm:py-2 sm:text-sm"
            >
              <span className="sm:hidden">Explorer</span><span className="hidden sm:inline">Open advanced execution explorer</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-6 sm:mt-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="order-2 min-w-0 lg:order-1 lg:sticky lg:top-24 lg:self-start">
          <details className="rounded-xl border border-white/10 bg-slate-950/40 p-3 lg:hidden" data-testid="mobile-learning-path">
            <summary className="cursor-pointer text-sm font-semibold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Learning path · lesson {progressText}</summary>
            {lessonNav(true)}
          </details>

          <nav aria-label="Learning path" className="hidden rounded-xl border border-white/10 bg-slate-950/40 p-3 lg:block">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Learning path</div>
            {lessonNav(false)}
          </nav>

          <section className="mt-4 hidden rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm leading-6 text-slate-400 lg:block">
            <h2 className="font-semibold text-slate-200">Reproduce the evidence</h2>
            <p className="mt-2">The guided lesson replays validated recorded evidence in your browser; it does not execute live RDMA operations.</p>
            <div className="mt-3 grid gap-2">
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/reference-evidence.json">RDMA evidence bundle JSON</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/tcp-foundations-evidence.json">TCP foundations evidence JSON</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/foundations-section-map.json">Foundations source-section map</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/operations-section-map.json">Operations source-section map</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="https://github.com/g-arjuna/fabriclab/tree/a208af6ecf4e838d6d2c475ede366494de81a706/labs/rdma-basics">Lab source and reproduction instructions</a>
            </div>
          </section>

          <details className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm leading-6 text-slate-400 lg:hidden">
            <summary className="cursor-pointer font-semibold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Reproduce the evidence</summary>
            <p className="mt-2">The guided lesson replays validated recorded evidence in your browser; it does not execute live RDMA operations.</p>
            <div className="mt-3 grid gap-2">
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/reference-evidence.json">RDMA evidence bundle JSON</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/tcp-foundations-evidence.json">TCP foundations evidence JSON</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/foundations-section-map.json">Foundations source-section map</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/operations-section-map.json">Operations source-section map</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="https://github.com/g-arjuna/fabriclab/tree/a208af6ecf4e838d6d2c475ede366494de81a706/labs/rdma-basics">Lab source and reproduction instructions</a>
            </div>
          </details>
        </aside>

        <main className="order-1 min-w-0 lg:order-2">
          {showCompletion ? (
            <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/7 p-6 sm:p-8" data-testid="rdma-curriculum-complete">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Guided sequence completed</div>
              <h2 className="mt-3 text-3xl font-semibold text-white">You followed application memory all the way to genuine RoCEv2 packets</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                This completion marker means the guided sequence was viewed; it is not proof of subject mastery. You can review any lesson from its beginning, resume direct reference access, inspect the advanced execution replay, or reproduce the laboratory evidence.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => selectLesson(lessonIndex)} className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/25">Resume current lesson</button>
                <button type="button" onClick={() => restartLesson(0)} className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/25">Review Lesson 1 from the beginning</button>
                <button type="button" onClick={startPracticalAgain} className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/25">Start the practical again</button>
                <Link href="/practical/rdma/explorer" className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Open advanced execution explorer</Link>
              </div>
            </section>
          ) : (
            <Lesson key={`${lesson.id}:${resetVersion}`} onComplete={completeLesson} onPreviousLesson={openPreviousLesson} hasPreviousLesson={lessonIndex > 0} />
          )}
        </main>
      </div>
    </div>
  );
}
