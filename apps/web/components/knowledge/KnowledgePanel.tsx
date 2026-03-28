"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { commandConcepts } from "@/content/knowledge/commands";
import { ecnConcepts } from "@/content/knowledge/ecn";
import { fabricConcepts } from "@/content/knowledge/fabric";
import { monitoringConcepts } from "@/content/knowledge/monitoring";
import { pfcConcepts } from "@/content/knowledge/pfc";
import { rocev2Concepts } from "@/content/knowledge/rocev2";
import { ConceptCard } from "@/components/knowledge/ConceptCard";
import { useLabStore } from "@/store/labStore";
import type { KnowledgeConcept } from "@/types";

const tabs = [
  { id: "all",        label: "All" },
  { id: "commands",   label: "Commands" },
  { id: "fabric",     label: "Fabric" },
  { id: "pfc",        label: "PFC" },
  { id: "ecn",        label: "ECN" },
  { id: "rocev2",     label: "RoCEv2" },
  { id: "monitoring", label: "Monitoring" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const conceptsByTab: Record<Exclude<TabId, "all">, KnowledgeConcept[]> = {
  commands:   commandConcepts,
  fabric:     fabricConcepts,
  pfc:        pfcConcepts,
  ecn:        ecnConcepts,
  rocev2:     rocev2Concepts,
  monitoring: monitoringConcepts,
};

const allConcepts: KnowledgeConcept[] = [
  ...commandConcepts,
  ...fabricConcepts,
  ...pfcConcepts,
  ...ecnConcepts,
  ...rocev2Concepts,
  ...monitoringConcepts,
];

function scoreMatch(concept: KnowledgeConcept, query: string): number {
  const q = query.toLowerCase();
  let score = 0;
  if (concept.title.toLowerCase().includes(q)) score += 10;
  if (concept.summary.toLowerCase().includes(q)) score += 5;
  if (concept.relatedCommands.some(c => c.toLowerCase().includes(q))) score += 8;
  if (concept.content.toLowerCase().includes(q)) score += 2;
  return score;
}

export function KnowledgePanel() {
  const activeConceptId = useLabStore((state) => state.activeConceptId);
  const [activeTab, setActiveTab] = useState<TabId>("commands");
  const [query, setQuery] = useState("");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const visibleConcepts = useMemo(() => {
    const q = query.trim();
    const pool = activeTab === "all" ? allConcepts : conceptsByTab[activeTab];

    if (!q) return pool;

    // When there's a query, search across all concepts regardless of tab
    const searchPool = allConcepts;

    return searchPool
      .map(c => ({ concept: c, score: scoreMatch(c, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ concept }) => concept);
  }, [activeTab, query]);

  const isSearching = query.trim().length > 0;
  const resultTab = isSearching ? "all" : activeTab;

  useEffect(() => {
    if (!activeConceptId) return;

    const matchingTab = (Object.entries(conceptsByTab) as [Exclude<TabId,"all">, KnowledgeConcept[]][])
      .find(([, concepts]) => concepts.some(c => c.id === activeConceptId))
      ?.[0];

    if (matchingTab) setActiveTab(matchingTab);

    requestAnimationFrame(() => {
      cardRefs.current[activeConceptId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [activeConceptId]);

  const handleInsertCommand = (command: string) => {
    window.dispatchEvent(new CustomEvent("insert-command", { detail: { command } }));
  };

  const tabLabel = tabs.find(t => t.id === resultTab)?.label ?? "All";
  const totalCount = allConcepts.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-500">
          Search all {totalCount} concepts
        </span>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g. UFM, symbol error, AllReduce, busbw…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 pr-10 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-lg leading-none"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {isSearching && (
          <p className="mt-1.5 text-xs text-slate-500">
            {visibleConcepts.length} result{visibleConcepts.length !== 1 ? "s" : ""} across all topics
          </p>
        )}
      </label>

      {/* Tabs — hidden while searching */}
      {!isSearching && (
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => {
            const count = tab.id === "all" ? totalCount : conceptsByTab[tab.id as Exclude<TabId,"all">]?.length ?? 0;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 tabular-nums ${isActive ? "text-slate-700" : "text-slate-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Concept list */}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-900/70 p-4">
        {visibleConcepts.length > 0 ? (
          visibleConcepts.map((concept) => (
            <div
              key={concept.id}
              ref={(el) => { cardRefs.current[concept.id] = el; }}
            >
              <ConceptCard
                concept={concept}
                isActive={concept.id === activeConceptId}
                onInsertCommand={handleInsertCommand}
              />
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
            <p className="text-sm text-slate-400">
              {isSearching
                ? `No concepts found for "${query}"`
                : `No concepts in the ${tabLabel} tab`}
            </p>
            {isSearching && (
              <p className="mt-2 text-xs text-slate-600">
                Try: PFC, ECN, AllReduce, NCCL, UFM, symbol error, busbw, fat-tree
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
