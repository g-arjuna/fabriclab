"use client";

import { GuidedLesson, type GuidedStep } from "./GuidedLesson";
import { AuthoredCopy, FoundationEvidenceNote, FoundationInteraction, FoundationVisual, sectionsForLesson, useFoundationBindings, type FoundationSourceSection } from "./foundationsShared";

function actionFor(section: FoundationSourceSection) {
  if (section.id === "1.7") return "Open the socket interface";
  if (section.id === "2.1") return "Connect the applications";
  if (section.id === "2.2") return "Follow the recorded handshake";
  if (section.id === "2.3") return "Treat TCP as a byte stream";
  if (section.id === "2.12") return "Continue to DMA";
  if (section.id === "3.6") return "Continue to memory registration";
  if (section.id === "4.9") return "Continue to queues and endpoints";
  if (section.id === "4.14") return "Continue to the recorded laboratory";
  return "Continue";
}

export function AuthoredFoundationsLesson({ lesson, onComplete }: { lesson: FoundationSourceSection["lesson"]; onComplete: () => void }) {
  const bindings = useFoundationBindings();
  const steps: GuidedStep[] = sectionsForLesson(lesson).map((section) => ({
    id: section.componentId,
    title: section.title,
    actionLabel: actionFor(section),
    body: <><AuthoredCopy text={section.learnerCopy} bindings={bindings} testId={`learner-copy-${section.componentId}`} /><FoundationEvidenceNote section={section} /></>,
    visual: <FoundationVisual key={section.componentId} sectionId={section.id} />,
    mobileVisualFirst: true,
    inspect: section.inspectCopy ? <AuthoredCopy text={section.inspectCopy} bindings={bindings} testId={`inspect-copy-${section.componentId}`} /> : undefined,
    interaction: <FoundationInteraction key={`interaction-${section.componentId}`} section={section} bindings={bindings} />,
  }));
  return <GuidedLesson lessonId={lesson} steps={steps} onComplete={onComplete} finalActionLabel="Complete lesson" />;
}
