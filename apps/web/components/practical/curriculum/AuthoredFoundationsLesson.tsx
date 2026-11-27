"use client";

import type { ReactNode } from "react";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { guidedStagesForSection } from "./guidedStagePlans";
import { GuidedVisualStageProvider } from "./guidedVisualState";
import { AuthoredCopy, FoundationEvidenceNote, FoundationVisual, sectionsForLesson, useFoundationBindings, type FoundationSourceSection } from "./foundationsShared";

const lesson11Instruction = [
  "Before discussing networking, we need to understand the computer that is sending or receiving data. A server contains a CPU that executes instructions, RAM that stores instructions and data, and a network interface that communicates with other computers.",
  "The same computer runs different kinds of software. Applications perform tasks for users. The operating-system kernel manages shared resources and provides services that applications need, including memory management and access to devices.",
  "Suppose an application wants to read a value from its memory. The CPU executes the application's instruction and accesses the appropriate memory through the computer's memory system.",
  "Applications sometimes need services they cannot perform directly. For example, an application may ask the operating system to establish a network connection. The CPU then executes kernel instructions that perform the privileged parts of that service.",
];

const lesson11Observation = [
  "**What this demonstrates:** These are physical components. They do not become an application or an operating system by themselves. Software tells the computer what work to perform.",
  "**What changed:** We have added a view of the software running on the computer. The physical CPU, RAM and network interface are still the same.",
  "**What this demonstrates:** Application instructions execute on the CPU. The application does not have a separate processor inside its software box.\n\nThis is a simplified logical memory-access illustration. A CPU load may be served by caches rather than directly accessing physical DRAM.",
  "**What changed:** The CPU is now executing kernel code rather than application code. We have changed the software being executed, not the physical processor.\n\n| Application execution | Kernel execution |\n|---|---|\n| Executes application instructions | Executes operating-system instructions |\n| Normally runs with user-mode privileges | Performs privileged operating-system work |\n| Requests services when needed | Manages and protects shared resources |\n| Uses the computer's CPU and memory | Uses the same computer's CPU and memory |\n\nThe kernel is software running on the CPU. It is not another physical device between the application and memory.",
];

function StageLead({ label }: { label: string }) {
  return <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 px-3 py-2 text-sm text-cyan-50" data-testid="guided-stage-explanation">Current demonstration: <span className="font-semibold">{label}</span></div>;
}

export function AuthoredFoundationsLesson({ lesson, onComplete }: { lesson: FoundationSourceSection["lesson"]; onComplete: () => void }) {
  const bindings = useFoundationBindings();
  const steps: GuidedStep[] = sectionsForLesson(lesson).flatMap((section) => {
    const stages = guidedStagesForSection(section.id);
    return stages.map((stage, stageIndex): GuidedStep => {
      const exactLesson11 = section.id === "1.1";
      const finalStage = stageIndex === stages.length - 1;
      let body: ReactNode = stageIndex === 0
        ? <><AuthoredCopy text={section.learnerCopy} bindings={bindings} testId={`learner-copy-${section.componentId}`} /><FoundationEvidenceNote section={section} /></>
        : (
          <>
            <StageLead label={stage.label} />
            <details className="rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm" data-testid="full-authored-explanation">
              <summary className="cursor-pointer font-medium text-slate-300">Review the complete subsection explanation</summary>
              <div className="mt-3"><AuthoredCopy text={section.learnerCopy} bindings={bindings} testId={`learner-copy-${section.componentId}-reference`} /></div>
            </details>
          </>
        );
      let observation: ReactNode | undefined = finalStage && section.revealCopy
        ? <AuthoredCopy text={section.revealCopy} bindings={bindings} testId={`guided-reveal-${section.componentId}`} />
        : undefined;
      if (exactLesson11) {
        body = (
          <>
            {stageIndex > 0 ? <StageLead label={stage.label} /> : null}
            <AuthoredCopy text={lesson11Instruction[stageIndex]} bindings={bindings} testId={`learner-copy-${section.componentId}-${stageIndex}`} />
          </>
        );
        observation = <AuthoredCopy text={lesson11Observation[stageIndex]} bindings={bindings} testId={`guided-observation-copy-${section.componentId}-${stageIndex}`} />;
      }
      return {
        id: `${section.componentId}--${stage.id}`,
        title: section.title,
        subsectionId: section.id,
        stageIndex,
        stageCount: stages.length,
        stageLabel: stage.label,
        nextPreview: stage.nextPreview,
        actionLabel: "Next →",
        body,
        observation,
        visual: (
          <GuidedVisualStageProvider sectionId={section.id} stage={stageIndex} stageId={stage.id}>
            <FoundationVisual key={`${section.componentId}-${stage.id}`} sectionId={section.id} />
          </GuidedVisualStageProvider>
        ),
        inspect: section.inspectCopy ? <AuthoredCopy text={section.inspectCopy} bindings={bindings} testId={`inspect-copy-${section.componentId}`} /> : undefined,
      };
    });
  });
  return <GuidedLesson lessonId={lesson} steps={steps} onComplete={onComplete} finalActionLabel="Complete lesson" />;
}
