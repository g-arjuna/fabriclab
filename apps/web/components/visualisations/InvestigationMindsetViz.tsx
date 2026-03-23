// InvestigationMindsetViz.tsx
"use client"
import { useState } from "react"

const questions = [
  {
    number: "01",
    question: "Is the physical link up?",
    commands: ["ibstat", "rdma link show"],
    when: "Always first. A down link answers everything else immediately.",
    color: "#1e3a5f",
    border: "#60a5fa",
    wrongApproach: "Jumping to configuration before checking link state — the most common mistake.",
  },
  {
    number: "02",
    question: "What is the traffic doing?",
    commands: ["show interface counters", "ethtool -S eth0"],
    when: "After confirming links are up. Counters are the symptoms.",
    color: "#065f46",
    border: "#34d399",
    wrongApproach: "Reading configuration before counters — you will not know what you are looking for.",
  },
  {
    number: "03",
    question: "What is the configuration?",
    commands: ["show dcb pfc", "show dcb ets", "show roce"],
    when: "After reading counters. Configuration explains why symptoms exist.",
    color: "#4c1d95",
    border: "#a78bfa",
    wrongApproach: "Reading configuration first — in HPC, traffic behaviour causes most problems, not misconfiguration.",
  },
]

export function InvestigationMindsetViz() {
  const [active, setActive] = useState<number | null>(null)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">The three diagnostic questions — in order</p>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => setActive(active === i ? null : i)}
            className="w-full text-left rounded-xl px-4 py-3 transition-all"
            style={{
              backgroundColor: active === i ? q.color + "44" : "#0f172a",
              border: `1px solid ${active === i ? q.border : q.border + "33"}`,
            }}
          >
            <div className="flex items-start gap-4">
              <span className="font-mono text-2xl font-bold flex-shrink-0 mt-0.5" style={{ color: q.border }}>{q.number}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{q.question}</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {q.commands.map(cmd => (
                    <code key={cmd} className="rounded px-2 py-0.5 text-[10px] font-mono text-cyan-300 bg-slate-800">{cmd}</code>
                  ))}
                </div>
                {active === i && (
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="text-slate-300 leading-5">{q.when}</p>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-red-300">
                      <span className="font-semibold">Common mistake: </span>{q.wrongApproach}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
export default InvestigationMindsetViz
