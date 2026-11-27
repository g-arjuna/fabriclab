export type GuidedInstructionSelection = {
  text: string;
  unitIndexes: number[];
  unitCount: number;
  referenceLabels?: string[];
};

function isStructuralMarkdownBlock(block: string) {
  const trimmed = block.trim();
  return trimmed.startsWith("```") || trimmed.startsWith("|") || /^[-*+]\s/m.test(trimmed) || /^\d+\.\s/m.test(trimmed) || trimmed.startsWith(">");
}

function splitProseSentences(block: string) {
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < block.length; index += 1) {
    const character = block[index];
    if (![".", "!", "?"].includes(character)) continue;
    const next = block[index + 1];
    const following = block[index + 2];
    if ((next === " " || next === "\n") && following && /[A-Z0-9`“"'\[]/.test(following)) {
      const sentence = block.slice(start, index + 1).trim();
      if (sentence) sentences.push(sentence);
      start = index + 1;
    }
  }
  const remainder = block.slice(start).trim();
  if (remainder) sentences.push(remainder);
  return sentences.length ? sentences : [block.trim()];
}

export function authoredInstructionUnits(markdown: string) {
  return markdown
    .trim()
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const trimmed = block.trim();
      if (!trimmed) return [];
      return isStructuralMarkdownBlock(trimmed) ? [trimmed] : splitProseSentences(trimmed);
    })
    .filter(Boolean);
}

/**
 * Selects deterministic canonical authored-copy units for one guided state.
 * The default windows partition the subsection in presentation order; exact
 * stage plans may instead reference the specific units that explain the active
 * mechanism. No replacement educational prose is generated here.
 */
export function selectGuidedInstruction(markdown: string, stageIndex: number, stageCount: number, explicitUnitIndexes?: number[]): GuidedInstructionSelection {
  const units = authoredInstructionUnits(markdown);
  if (!units.length) return { text: "", unitIndexes: [], unitCount: 0 };
  const boundedStage = Math.max(0, Math.min(Math.max(0, stageCount - 1), stageIndex));
  let indexes: number[];
  if (explicitUnitIndexes?.length) {
    indexes = explicitUnitIndexes.filter((index) => index >= 0 && index < units.length);
  } else {
    const start = Math.floor((boundedStage * units.length) / stageCount);
    let end = Math.floor(((boundedStage + 1) * units.length) / stageCount);
    if (boundedStage === stageCount - 1) end = units.length;
    if (end <= start) end = Math.min(units.length, start + 1);
    indexes = Array.from({ length: Math.max(1, end - start) }, (_, offset) => Math.min(units.length - 1, start + offset));
  }
  const uniqueIndexes = Array.from(new Set(indexes));
  return {
    text: uniqueIndexes.map((index) => units[index]).join("\n\n"),
    unitIndexes: uniqueIndexes,
    unitCount: units.length,
  };
}

export type CanonicalInstructionSection = {
  id: string;
  learnerCopy: string;
};

export function selectGuidedInstructionWithReferences(
  sections: CanonicalInstructionSection[],
  currentSectionId: string,
  currentMarkdown: string,
  stageIndex: number,
  stageCount: number,
  instructionUnitIndexes?: number[],
  instructionReferences?: { sectionId: string; unitIndexes: number[] }[],
): GuidedInstructionSelection {
  if (!instructionReferences?.length) {
    return { ...selectGuidedInstruction(currentMarkdown, stageIndex, stageCount, instructionUnitIndexes), referenceLabels: [] };
  }
  const parts: string[] = [];
  const referenceLabels: string[] = [];
  const flatIndexes: number[] = [];
  for (const reference of instructionReferences) {
    const section = reference.sectionId === currentSectionId
      ? { learnerCopy: currentMarkdown }
      : sections.find((item) => item.id === reference.sectionId);
    if (!section) continue;
    const selected = selectGuidedInstruction(section.learnerCopy, 0, 1, reference.unitIndexes);
    if (selected.text) parts.push(selected.text);
    flatIndexes.push(...selected.unitIndexes);
    referenceLabels.push(`${reference.sectionId}:${reference.unitIndexes.map((index) => index + 1).join("+")}`);
  }
  return {
    text: parts.join("\n\n"),
    unitIndexes: flatIndexes,
    unitCount: authoredInstructionUnits(currentMarkdown).length,
    referenceLabels,
  };
}
