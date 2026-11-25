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

type LessonComponent = ComponentType<{ onComplete: () => void }>;

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

function validLessonIndex(value: string | undefined) {
  const index = LESSONS.findIndex((lesson) => lesson.id === value);
  return index >= 0 ? index : 0;
}

export function RdmaCurriculum({ initialLesson }: { initialLesson?: string }) {
  const [lessonIndex, setLessonIndex] = useState(() => validLessonIndex(initialLesson));
  const [completed, setCompleted] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [hydrated, setHydrated] = useState(false);
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
      const storedCompleted = window.localStorage.getItem(COMPLETED_KEY);
      if (storedCompleted) {
        const parsed = JSON.parse(storedCompleted);
        if (Array.isArray(parsed)) setCompleted(parsed.filter((id) => LESSONS.some((item) => item.id === id)));
      }
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
      window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
      const url = `/practical/rdma?lesson=${encodeURIComponent(lesson.id)}`;
      window.history.replaceState(null, "", url);
    } catch {
      // Ignore storage/history failures.
    }
  }, [completed, hydrated, lesson.id]);

  const progressText = useMemo(() => `${lessonIndex + 1} of ${LESSONS.length}`, [lessonIndex]);

  function completeLesson() {
    setCompleted((current) => current.includes(lesson.id) ? current : [...current, lesson.id]);
    if (lessonIndex < LESSONS.length - 1) {
      setFinished(false);
      setLessonIndex(lessonIndex + 1);
    } else {
      setFinished(true);
    }
  }

  function selectLesson(index: number) {
    setFinished(false);
    setLessonIndex(index);
  }

  return (
    <div data-testid="rdma-curriculum" data-hydrated={hydrated ? "true" : "false"}>
      <div className="border-b border-white/8 pb-5">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">FabricLab / Practicals / RDMA From First Principles</div>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-cyan-300">Lesson {progressText}</div>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{lesson.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">{lesson.question}</p>
          </div>
          <Link
            href="/practical/rdma/explorer"
            className="w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:border-white/25 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Open advanced execution explorer
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Learning path" className="rounded-[1.35rem] border border-white/10 bg-slate-950/40 p-3">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Learning path</div>
            <ol className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
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
                        "flex w-full shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition lg:whitespace-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
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
          </nav>

          <section className="mt-4 hidden rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4 text-sm leading-6 text-slate-400 lg:block">
            <h2 className="font-semibold text-slate-200">Reproduce the evidence</h2>
            <p className="mt-2">The guided lesson replays validated recorded evidence in your browser; it does not execute live RDMA operations.</p>
            <div className="mt-3 grid gap-2">
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/reference-evidence.json">Evidence bundle JSON</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="https://github.com/g-arjuna/fabriclab/tree/a208af6ecf4e838d6d2c475ede366494de81a706/labs/rdma-basics">Lab source and reproduction instructions</a>
            </div>
          </section>

          <details className="mt-4 rounded-[1.35rem] border border-white/10 bg-slate-950/35 p-4 text-sm leading-6 text-slate-400 lg:hidden">
            <summary className="cursor-pointer font-semibold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Reproduce the evidence</summary>
            <p className="mt-2">The guided lesson replays validated recorded evidence in your browser; it does not execute live RDMA operations.</p>
            <div className="mt-3 grid gap-2">
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="/practical/rdma/reference-evidence.json">Evidence bundle JSON</a>
              <a className="text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-cyan-100" href="https://github.com/g-arjuna/fabriclab/tree/a208af6ecf4e838d6d2c475ede366494de81a706/labs/rdma-basics">Lab source and reproduction instructions</a>
            </div>
          </details>
        </aside>

        <main className="min-w-0">
          {finished ? (
            <section className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-300/7 p-6 sm:p-8" data-testid="rdma-curriculum-complete">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Practical complete</div>
              <h2 className="mt-3 text-3xl font-semibold text-white">You followed application memory all the way to genuine RoCEv2 packets</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                You can revisit any lesson without losing the causal sequence, inspect the advanced execution replay, or reproduce the laboratory evidence using the preserved source and captures.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => selectLesson(0)} className="rounded-full border border-white/10 px-5 py-3 text-sm text-slate-200 transition hover:border-white/25">Review from Lesson 1</button>
                <Link href="/practical/rdma/explorer" className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200">Open advanced execution explorer</Link>
              </div>
            </section>
          ) : (
            <Lesson key={lesson.id} onComplete={completeLesson} />
          )}
        </main>
      </div>
    </div>
  );
}
