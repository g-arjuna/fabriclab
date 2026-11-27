"use client";

import { createContext, useContext, type ReactNode } from "react";

export type GuidedVisualContextValue = {
  sectionId: string;
  stage: number;
  stageId: string;
};

const GuidedVisualContext = createContext<GuidedVisualContextValue | null>(null);

export function GuidedVisualStageProvider({ sectionId, stage, stageId, children }: GuidedVisualContextValue & { children: ReactNode }) {
  return <GuidedVisualContext.Provider value={{ sectionId, stage, stageId }}>{children}</GuidedVisualContext.Provider>;
}

export function useGuidedVisualStage() {
  return useContext(GuidedVisualContext)?.stage ?? 0;
}

export function guidedEnum<T>(stage: number, values: readonly T[]): T {
  return values[Math.max(0, Math.min(values.length - 1, stage))];
}
