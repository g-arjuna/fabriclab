"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { KnowledgeConcept } from "@/types";

export function ConceptCard({
  concept,
  isActive,
  onInsertCommand,
}: {
  concept: KnowledgeConcept;
  isActive: boolean;
  onInsertCommand?: (command: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      className={`rounded-2xl border border-white/10 bg-slate-900/80 p-4 ${
        isActive ? "border-l-4 border-l-sky-400 shadow-lg shadow-sky-950/30" : ""
      }`}
    >
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-white">{concept.title}</h3>
            <span className="mt-0.5 flex-shrink-0 text-xs text-slate-600 transition">
              {isExpanded ? "▲" : "▼"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{concept.summary}</p>
        </button>

      {isExpanded ? (
        <div className="prose prose-invert mt-4 max-w-none text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{concept.content}</ReactMarkdown>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
              {concept.relatedCommands.map((command) => (
                <button
                  key={command}
                  type="button"
                  onClick={() => onInsertCommand?.(command)}
                  title={`Click to insert "${command}" into the active terminal`}
                  className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-500/40 hover:bg-slate-700 hover:text-cyan-300"
                >
                  <span className="font-mono">{command}</span>
                  <span className="text-[9px] text-slate-600 transition group-hover:text-cyan-600">
                    ↵
                  </span>
                </button>
              ))}
      </div>
    </article>
  );
}
