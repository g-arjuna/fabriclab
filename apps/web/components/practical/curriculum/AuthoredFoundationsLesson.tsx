"use client";

import type { ReactNode } from "react";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { guidedStagesForSection } from "./guidedStagePlans";
import { selectGuidedInstructionWithReferences, stripGuidedBlockMarkers, type GuidedInstructionSelection } from "./guidedContent";
import { GuidedVisualStageProvider } from "./guidedVisualState";
import { AuthoredCopy, FoundationEvidenceNote, FoundationVisual, foundationSections, sectionsForLesson, useFoundationBindings, type FoundationSourceSection } from "./foundationsShared";

function StageExplanation({ selection, children, testId }: { selection: GuidedInstructionSelection; children: ReactNode; testId: string }) {
  return (
    <div
      className="rounded-xl border border-cyan-300/20 bg-cyan-300/7 px-3 py-3"
      data-testid={testId}
      data-copy-blocks={selection.referenceLabels.join(";")}
      data-copy-block-count={selection.blockCount}
    >
      <div className="space-y-3 text-sm leading-6 text-cyan-50">{children}</div>
    </div>
  );
}

export function AuthoredFoundationsLesson({ lesson, onComplete, onPreviousLesson, hasPreviousLesson }: { lesson: FoundationSourceSection["lesson"]; onComplete: () => void; onPreviousLesson?: () => void; hasPreviousLesson?: boolean }) {
  const bindings = useFoundationBindings();
  const steps: GuidedStep[] = sectionsForLesson(lesson).flatMap((section) => {
    const stages = guidedStagesForSection(section.id);
    return stages.map((stage, stageIndex): GuidedStep => {
      const finalStage = stageIndex === stages.length - 1;
      const instructionSelection = selectGuidedInstructionWithReferences(foundationSections, section.id, stage.instructionReferences);
      const stageObservationSelection = stage.observationReferences ? selectGuidedInstructionWithReferences(foundationSections, section.id, stage.observationReferences) : undefined;
      const body: ReactNode = (
        <>
          <StageExplanation selection={instructionSelection} testId="guided-stage-explanation">
            <AuthoredCopy text={instructionSelection.text} bindings={bindings} testId={`learner-copy-${section.componentId}-stage-${stageIndex}`} />
          </StageExplanation>
          <details className="rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm" data-testid="full-authored-explanation">
            <summary className="cursor-pointer font-medium text-slate-300">Review the complete subsection explanation</summary>
            <div className="mt-3"><AuthoredCopy text={stripGuidedBlockMarkers(section.learnerCopy)} bindings={bindings} testId={`learner-copy-${section.componentId}-reference`} /></div>
          </details>
          {stageIndex === 0 ? <FoundationEvidenceNote section={section} /> : null}
        </>
      );
      const observation: ReactNode | undefined = stageObservationSelection?.text
        ? <AuthoredCopy text={stageObservationSelection.text} bindings={bindings} testId={`guided-stage-observation-${section.componentId}-${stageIndex}`} />
        : finalStage && section.revealCopy
          ? <AuthoredCopy text={section.revealCopy} bindings={bindings} testId={`guided-reveal-${section.componentId}`} />
          : undefined;
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
  return <GuidedLesson lessonId={lesson} steps={steps} onComplete={onComplete} finalActionLabel="Complete lesson" onPreviousLesson={onPreviousLesson} hasPreviousLesson={hasPreviousLesson} />;
}
