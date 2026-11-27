import rawFoundationSections from "@/lib/practical/foundationsContent.generated.json";
import rawOperationSections from "@/lib/practical/operationsContent.generated.json";

import { guidedStagesForSection } from "./guidedStagePlans";

type NavigableSection = {
  id: string;
  lesson: string;
  componentId: string;
};

const navigableSections = [...(rawFoundationSections as NavigableSection[]), ...(rawOperationSections as NavigableSection[])];

export function finalGuidedStepIdForLesson(lessonId: string) {
  const sections = navigableSections.filter((section) => section.lesson === lessonId);
  const section = sections[sections.length - 1];
  if (!section) return null;
  const stages = guidedStagesForSection(section.id);
  const stage = stages[stages.length - 1];
  return stage ? `${section.componentId}--${stage.id}` : null;
}
