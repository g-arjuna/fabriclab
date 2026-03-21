import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

type ModuleSection = {
  title: string;
  visualLabel: string;
  concept: string[];
};

export type ParsedModule = {
  id: string;
  title: string;
  learningObjective: string;
  sections: ModuleSection[];
  bridge: string;
  lab: {
    id: string;
    title: string;
  };
};

function parseModule(markdown: string, id: string): ParsedModule {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());

  const titleLine = lines.find((line) => line.startsWith("# "));

  if (!titleLine) {
    throw new Error(`Module ${id} is missing a title.`);
  }

  const title = titleLine.slice(2).trim();
  let learningObjective = "";
  const sections: ModuleSection[] = [];
  let bridge = "";
  let labId = "";
  let labTitle = "";

  let currentSection: ModuleSection | null = null;
  let currentMode: "objective" | "section" | "bridge" | "lab" | null = null;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (line.startsWith("# ")) {
      continue;
    }

    if (line.startsWith("## ")) {
      const heading = line.slice(3).trim();

      if (heading === "Learning Objective") {
        currentSection = null;
        currentMode = "objective";
        continue;
      }

      if (heading === "Bridge") {
        currentSection = null;
        currentMode = "bridge";
        continue;
      }

      if (heading === "Lab") {
        currentSection = null;
        currentMode = "lab";
        continue;
      }

      currentSection = {
        title: heading,
        visualLabel: "",
        concept: [],
      };
      sections.push(currentSection);
      currentMode = "section";
      continue;
    }

    if (currentMode === "objective") {
      learningObjective = learningObjective
        ? `${learningObjective} ${line}`
        : line;
      continue;
    }

    if (currentMode === "section" && currentSection) {
      if (line.startsWith("@visual ")) {
        currentSection.visualLabel = line.slice(8).trim();
        continue;
      }

      if (line.startsWith("- ")) {
        currentSection.concept.push(line.slice(2).trim());
      }
      continue;
    }

    if (currentMode === "bridge") {
      bridge = bridge ? `${bridge} ${line}` : line;
      continue;
    }

    if (currentMode === "lab") {
      if (!labId) {
        labId = line;
      } else if (!labTitle) {
        labTitle = line;
      }
    }
  }

  return {
    id,
    title,
    learningObjective,
    sections,
    bridge,
    lab: {
      id: labId,
      title: labTitle,
    },
  };
}

export const getModuleContent = cache(async (slug: string) => {
  const filePath = path.join(process.cwd(), "..", "..", "content", "modules", slug, "module.md");
  const markdown = await readFile(filePath, "utf8");
  return parseModule(markdown, slug);
});
