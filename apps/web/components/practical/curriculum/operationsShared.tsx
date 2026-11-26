"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import rawSections from "@/lib/practical/operationsContent.generated.json";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { OperationsVisual } from "./operationsVisuals";
import { cx } from "./visuals";

export type OperationReference = {
  id: string;
  title: string;
  url: string;
};

export type OperationSourceSection = {
  id: string;
  lesson: "send-receive" | "write" | "read" | "packets";
  title: string;
  learnerCopy: string;
  visualSpec: string;
  revealCopy: string;
  inspectCopy: string;
  sourceFile: string;
  componentId: string;
  references: OperationReference[];
};

export const operationSections = rawSections as OperationSourceSection[];

export function operationsSectionsForLesson(lesson: OperationSourceSection["lesson"]) {
  return operationSections.filter((section) => section.lesson === lesson);
}

function markdownComponents(testId: string) {
  return {
    pre: ({ children }: { children?: ReactNode }) => <pre className="overflow-x-auto rounded-xl bg-slate-950/80 p-3 font-mono text-xs leading-6 text-slate-200" data-testid={`${testId}-fenced-code`}>{children}</pre>,
    code: ({ className, children, ...props }: { className?: string; children?: ReactNode }) => {
      const isBlock = Boolean(className?.includes("language-"));
      return isBlock
        ? <code className={className} {...props}>{children}</code>
        : <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[0.92em] text-cyan-100" {...props}>{children}</code>;
    },
    ul: ({ children }: { children?: ReactNode }) => <ul className="list-disc space-y-2 pl-5">{children}</ul>,
    ol: ({ children }: { children?: ReactNode }) => <ol className="list-decimal space-y-2 pl-5">{children}</ol>,
    p: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
    a: ({ children, href }: { children?: ReactNode; href?: string }) => <a href={href} className="text-cyan-200 underline underline-offset-4">{children}</a>,
    table: ({ children }: { children?: ReactNode }) => <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[42rem] border-collapse text-left text-sm">{children}</table></div>,
    th: ({ children }: { children?: ReactNode }) => <th className="border-b border-white/10 bg-slate-900/80 px-3 py-2 font-semibold text-slate-200">{children}</th>,
    td: ({ children }: { children?: ReactNode }) => <td className="border-b border-white/8 px-3 py-2 align-top leading-6 text-slate-300">{children}</td>,
  };
}

export function ReferenceList({ references, compact = false }: { references: OperationReference[]; compact?: boolean }) {
  if (!references.length) return null;
  return (
    <div className={cx("rounded-xl border border-white/10 bg-slate-950/40", compact ? "px-2.5 py-2" : "px-3 py-2.5")} data-testid="operations-reference-links">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Cited references</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {references.map((reference) => (
          <a key={reference.id} href={reference.url || undefined} target="_blank" rel="noreferrer" title={reference.title} className="inline-flex max-w-full items-baseline gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/7 px-2 py-1 text-[11px] font-semibold text-cyan-100 underline-offset-4 hover:underline" data-testid={`reference-${reference.id}`}>
            <span className="font-mono">{reference.id}</span><span className="font-normal text-cyan-100/75">{reference.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function OperationsCopy({ text, references = [], testId, className }: { text: string; references?: OperationReference[]; testId: string; className?: string }) {
  return (
    <div className={cx("space-y-4 text-sm leading-6 text-slate-300 sm:text-[15px]", className)} data-testid={testId}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents(testId)}>{text.trim()}</ReactMarkdown>
      <ReferenceList references={references} compact />
    </div>
  );
}

export function ProvenanceLegend() {
  return (
    <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]" data-testid="evidence-provenance-legend">
      <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-0.5 text-emerald-100">Recorded</span>
      <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2 py-0.5 text-sky-100">Source-derived</span>
      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-amber-100">Conceptual</span>
    </div>
  );
}

function OperationsReveal({ section }: { section: OperationSourceSection }) {
  if (!section.revealCopy) return null;
  return (
    <details className="rounded-2xl border border-white/10 bg-white/4 p-4" data-testid={`reveal-${section.componentId}`}>
      <summary className="cursor-pointer text-sm font-semibold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{section.id === "5.8" ? "Compare with TCP" : "Check the explanation"}</summary>
      <OperationsCopy className="mt-4" text={section.revealCopy} references={section.references} testId={`reveal-copy-${section.componentId}`} />
    </details>
  );
}

function actionFor(section: OperationSourceSection) {
  const explicit: Record<string, string> = {
    "5.1": "Prepare the endpoints",
    "5.2": "Choose the destination buffer",
    "5.3": "What if no receive was posted?",
    "5.4": "Construct the recorded SEND",
    "5.5": "Follow the data packet",
    "5.6": "Inspect transport acknowledgement",
    "5.7": "Read B's verified memory",
    "5.8": "Review the SEND experiment",
    "5.9": "Continue to ordinary RDMA WRITE",
    "6.1": "Open the recorded WRITE experiment",
    "6.2": "Build A's WRITE instruction",
    "6.3": "Follow the WRITE packet",
    "6.4": "Follow the reverse acknowledgement",
    "6.5": "Predict how B learns the result",
    "6.6": "Read B's buffer",
    "6.7": "Compare SEND and WRITE",
    "6.8": "Continue to RDMA READ",
    "7.1": "Open the recorded READ experiment",
    "7.2": "Describe a READ",
    "7.3": "Follow the request to B",
    "7.4": "Follow the response back to A",
    "7.5": "Observe the reader's completion",
    "7.6": "Compare the three operations",
    "7.7": "Investigate the packets on the wire",
    "8.1": "Inspect the RDMA header",
    "8.2": "Compare remote-memory headers",
    "8.3": "Count packet bytes",
    "8.4": "Split one operation into packets",
    "8.5": "Inspect reliability cases",
    "8.6": "Correlate code with the wire",
    "8.7": "Investigate the SEND destination",
    "8.8": "Investigate the ACK meaning",
    "8.9": "Investigate the READ response",
    "8.10": "Connect this laboratory to AI fabrics",
    "8.11": "Review the investigation checklist",
    "8.12": "Complete practical",
  };
  return explicit[section.id] || "Continue";
}

export function AuthoredOperationsLesson({ lesson, onComplete }: { lesson: OperationSourceSection["lesson"]; onComplete: () => void }) {
  const steps: GuidedStep[] = operationsSectionsForLesson(lesson).map((section) => ({
    id: section.componentId,
    title: section.title,
    actionLabel: actionFor(section),
    body: (
      <>
        <ProvenanceLegend />
        <OperationsCopy text={section.learnerCopy} references={section.references} testId={`learner-copy-${section.componentId}`} />
      </>
    ),
    visual: <OperationsVisual key={section.componentId} sectionId={section.id} />,
    mobileVisualFirst: true,
    inspect: section.inspectCopy ? <OperationsCopy text={section.inspectCopy} references={section.references} testId={`inspect-copy-${section.componentId}`} /> : undefined,
    interaction: <OperationsReveal section={section} />,
  }));
  return <GuidedLesson lessonId={lesson} steps={steps} onComplete={onComplete} finalActionLabel="Complete lesson" />;
}
