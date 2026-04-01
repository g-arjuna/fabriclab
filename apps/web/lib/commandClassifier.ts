import type { ClassifiedCommand } from "@/types";
import { KNOWN_COMMANDS, KNOWN_VERBS } from "@/lib/commandCatalog";

function levenshteinDistance(source: string, target: string): number {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = source[row - 1] === target[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[source.length][target.length];
}

export function classifyCommand(input: string): ClassifiedCommand {
  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase();
  const exactMatch = KNOWN_COMMANDS.find(
    (command) => command.toLowerCase() === normalized,
  );

  if (exactMatch) {
    return {
      type: "exact",
      handler: exactMatch,
      penalty: "none",
    };
  }

  let closestMatch: string | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const command of KNOWN_COMMANDS) {
    const distance = levenshteinDistance(normalized, command.toLowerCase());

    if (distance < closestDistance) {
      closestDistance = distance;
      closestMatch = command;
    }
  }

  if (closestDistance <= 2 && closestMatch) {
    return {
      type: "near-miss",
      suggestion: closestMatch,
      penalty: "light",
    };
  }

  const [verb] = normalized.split(/\s+/);

  if (KNOWN_VERBS.includes(verb as (typeof KNOWN_VERBS)[number])) {
    return {
      type: "exploratory",
      penalty: "none",
    };
  }

  return {
    type: "gibberish",
    penalty: "full",
  };
}
