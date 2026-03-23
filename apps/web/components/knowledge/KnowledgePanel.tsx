"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { commandConcepts } from "@/content/knowledge/commands";
import { ecnConcepts } from "@/content/knowledge/ecn";
import { pfcConcepts } from "@/content/knowledge/pfc";
import { rocev2Concepts } from "@/content/knowledge/rocev2";
import { ConceptCard } from "@/components/knowledge/ConceptCard";
import { useLabStore } from "@/store/labStore";
import type { KnowledgeConcept } from "@/types";

const tabs = [
  { id: "pfc", label: "PFC" },
  { id: "ecn", label: "ECN" },
  { id: "rocev2", label: "RoCEv2" },
  { id: "commands", label: "Commands" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const conceptsByTab: Record<TabId, KnowledgeConcept[]> = {
  pfc: pfcConcepts,
  ecn: ecnConcepts,
  rocev2: rocev2Concepts,
  commands: commandConcepts,
};

export function KnowledgePanel() {
  const activeConceptId = useLabStore((state) => state.activeConceptId);
  const [activeTab, setActiveTab] = useState<TabId>("pfc");
  const [query, setQuery] = useState("");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const visibleConcepts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const tabConcepts = conceptsByTab[activeTab];

    if (!normalizedQuery) {
      return tabConcepts;
    }

    return tabConcepts.filter((concept) => {
      const haystack = `${concept.title} ${concept.summary}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeTab, query]);

  useEffect(() => {
    if (!activeConceptId) {
      return;
    }

    const matchingTab = (Object.entries(conceptsByTab) as [TabId, KnowledgeConcept[]][])
      .find(([, concepts]) => concepts.some((concept) => concept.id === activeConceptId))
      ?.[0];

    if (!matchingTab) {
      return;
    }

    setActiveTab(matchingTab);

    requestAnimationFrame(() => {
      cardRefs.current[activeConceptId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [activeConceptId]);

  const handleInsertCommand = (command: string) => {
    window.dispatchEvent(
      new CustomEvent("insert-command", { detail: { command } }),
    );
  };

  return (
    <div className="flex flex-col">
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">Keyword search</span>
        <input
          type="text"
          placeholder="Search concepts"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
        />
      </label>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex-1 space-y-4 overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-900/70 p-4">
        {visibleConcepts.length > 0 ? (
          visibleConcepts.map((concept) => (
            <div
              key={concept.id}
              ref={(element) => {
                cardRefs.current[concept.id] = element;
              }}
            >
              <ConceptCard
                concept={concept}
                isActive={concept.id === activeConceptId}
                onInsertCommand={handleInsertCommand}
              />
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
            No concepts match this search in the {tabs.find((tab) => tab.id === activeTab)?.label} tab.
          </div>
        )}
      </div>
    </div>
  );
}
