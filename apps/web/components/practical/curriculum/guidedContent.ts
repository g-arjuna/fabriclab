export type GuidedContentBlock = {
  id: string;
  markdown: string;
};

export type GuidedInstructionSelection = {
  text: string;
  referenceLabels: string[];
  missingReferences: string[];
  blockCount: number;
};

export type GuidedContentReferenceInput = {
  sectionId: string;
  blockIds: string[];
};

export type CanonicalInstructionSection = {
  id: string;
  learnerCopy: string;
  contentBlocks?: GuidedContentBlock[];
};

export function stripGuidedBlockMarkers(markdown: string) {
  return markdown.replace(/^[^\S\n]*<!--\s*guided-block:[^\n]*?-->[^\S\n]*$/gm, "");
}

function sectionBlocks(section: CanonicalInstructionSection | undefined) {
  return new Map((section?.contentBlocks || []).map((block) => [block.id, block.markdown]));
}

/**
 * Resolves exact authored content blocks for one guided state.
 *
 * There is intentionally no positional or proportional fallback: a stage must
 * name the authored blocks that explain its mechanism. Validation treats every
 * missing reference as a curriculum error rather than silently omitting copy.
 */
export function selectGuidedInstructionWithReferences(
  sections: CanonicalInstructionSection[],
  currentSectionId: string,
  instructionReferences?: GuidedContentReferenceInput[],
): GuidedInstructionSelection {
  const referenceLabels: string[] = [];
  const missingReferences: string[] = [];
  const parts: string[] = [];
  const seen = new Set<string>();

  for (const reference of instructionReferences || []) {
    const section = sections.find((item) => item.id === reference.sectionId);
    const blocks = sectionBlocks(section);
    for (const blockId of reference.blockIds) {
      const label = `${reference.sectionId}:${blockId}`;
      const markdown = blocks.get(blockId);
      if (!section || markdown === undefined) {
        missingReferences.push(label);
        continue;
      }
      if (!markdown.trim()) {
        missingReferences.push(`${label} (empty)`);
        continue;
      }
      if (seen.has(label)) continue;
      seen.add(label);
      referenceLabels.push(label);
      parts.push(markdown.trim());
    }
  }

  const currentBlockCount = sections.find((item) => item.id === currentSectionId)?.contentBlocks?.length || 0;
  return {
    text: parts.join("\n\n"),
    referenceLabels,
    missingReferences,
    blockCount: currentBlockCount,
  };
}
