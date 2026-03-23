"use client"

import { useState } from "react"

interface Phase {
  phase: string
  label: string
  color: string
  border: string
  commands: { cmd: string; question: string }[]
  decision: string
}

const phases: Phase[] = [
  {
    phase: "1",
    label: "Physical layer — Links",
    color: "#1e3a5f",
    border: "#60a5fa",
    commands: [
      { cmd: "ibstat", question: "Is every NIC State: Active?" },
      { cmd: "rdma link show", question: "Are all rails showing ACTIVE?" },
      { cmd: "show topology", question: "Does NIC state match switch port state?" },
    ],
    decision: "If any link is down → fix physical problem before anything else.",
  },
  {
    phase: "2",
    label: "Traffic layer — Counters",
    color: "#065f46",
    border: "#34d399",
    commands: [
      { cmd: "show interface counters", question: "Drops? Pauses? Buffer utilisation?" },
      { cmd: "ethtool -S eth0", question: "rx_pfc_pause_frames growing? tx_dropped non-zero?" },
    ],
    decision: "Read counters before config. Counters give you the symptom to look for.",
  },
  {
    phase: "3",
    label: "Configuration layer",
    color: "#4c1d95",
    border: "#a78bfa",
    commands: [
      { cmd: "show dcb pfc", question: "Is PFC enabled on the right priority?" },
      { cmd: "show dcb ets", question: "Is ECN active? Is DCQCN running?" },
      { cmd: "show roce", question: "Does RoCEv2 show a clean summary?" },
    ],
    decision: "Configuration explains why counters look the way they do.",
  },
  {
    phase: "4",
    label: "Switch-side investigation",
    color: "#78350f",
    border: "#fbbf24",
    commands: [
      { cmd: "show topology", question: "Which rail shows the anomaly?" },
      { cmd: "show switch port rail<N>", question: "What does the switch say?" },
    ],
    decision: "Only go here if DGX-side commands do not fully explain the problem.",
  },
  {
    phase: "5",
    label: "Full fabric diagnostics",
    color: "#374151",
    border: "#9ca3af",
    commands: [{ cmd: "ibdiagnet", question: "Full fabric sweep — routing, LIDs, error counters" }],
    decision: "Use when simpler phases have not identified the root cause. Takes 5–15 minutes.",
  },
]

export function DiagnosticWorkflowViz() {
  const [active, setActive] = useState<number | null>(0)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">The diagnostic workflow — OSI model bottom-up</p>
      <div className="space-y-2">
        {phases.map((phase, i) => (
          <button
            key={i}
            onClick={() => setActive(active === i ? null : i)}
            className="w-full rounded-xl px-4 py-3 text-left transition-all"
            style={{
              backgroundColor: active === i ? phase.color + "44" : "#0f172a",
              border: `1px solid ${active === i ? phase.border : phase.border + "33"}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: phase.color, color: phase.border }}
              >
                {phase.phase}
              </span>
              <span className="text-sm font-semibold text-white">{phase.label}</span>
            </div>
            {active === i && (
              <div className="ml-9 mt-3 space-y-2">
                {phase.commands.map((c, j) => (
                  <div key={j} className="flex items-start gap-3 text-xs">
                    <code className="flex-shrink-0 font-mono text-cyan-300">{c.cmd}</code>
                    <span className="text-slate-400">→ {c.question}</span>
                  </div>
                ))}
                <div className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-xs text-cyan-200">
                  {phase.decision}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default DiagnosticWorkflowViz
