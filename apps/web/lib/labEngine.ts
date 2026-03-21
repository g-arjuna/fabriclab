import type { LabConfig, LabHint, LabState } from "@/types";

export function isComplete(lab: LabState, config: LabConfig): boolean {
  return config.requiredConditions.every(
    (condition) =>
      lab.conditions[condition] === true && lab.verifiedConditions.has(condition),
  );
}

export function getCurrentHint(lab: LabState, config: LabConfig): LabHint | null {
  const elapsed =
    lab.startTime === null ? 0 : (Date.now() - lab.startTime) / 1000;

  const triggeredHints = [...config.hints]
    .sort((left, right) => right.level - left.level)
    .filter(
      (hint) =>
        lab.mistakeCount >= hint.triggerAfterMistakes ||
        elapsed >= hint.triggerAfterSeconds,
    );

  if (triggeredHints.length === 0) {
    return null;
  }

  const highestTriggeredHint = triggeredHints[0];
  return lab.shownHintLevels.has(highestTriggeredHint.level)
    ? null
    : highestTriggeredHint;
}

export function getScoreBand(score: number): {
  label: string;
  color: "green" | "blue" | "amber" | "red";
} {
  if (score >= 90) {
    return { label: "Clean execution", color: "green" };
  }

  if (score >= 70) {
    return { label: "Completed", color: "blue" };
  }

  if (score >= 50) {
    return { label: "Completed with help", color: "amber" };
  }

  return { label: "Needs review", color: "red" };
}
