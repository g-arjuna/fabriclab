"use client"
import { useState } from "react"

const steps = [
  {
    id: 1, label: "NIC bandwidth",
    formula: "nodes × NICs/node × NIC speed",
    example: "128 × 8 × 400G = 409.6 Tb/s",
    question: "How much total NIC bandwidth does the cluster generate?",
    color: "#1e3a5f", border: "#60a5fa"
  },
  {
    id: 2, label: "Oversubscription target",
    formula: "AI training → 1:1 | Mixed → up to 2:1",
    example: "Target: 1:1 (non-blocking)",
    question: "What oversubscription ratio is acceptable for this workload?",
    color: "#14532d", border: "#22c55e"
  },
  {
    id: 3, label: "Switch radix",
    formula: "Choose based on budget and desired stage count",
    example: "64-port SN5600 at 400G = 25.6 Tb/s per switch",
    question: "What switch radix is available? Higher radix = fewer stages.",
    color: "#4c1d95", border: "#a78bfa"
  },
  {
    id: 4, label: "Stage count",
    formula: "Leaf count = total NICs / downlinks per leaf",
    example: "1024 NICs / 32 downlinks = 32 leaf switches → 2-stage fits",
    question: "How many leaf switches are needed? Does a 2-stage design work?",
    color: "#78350f", border: "#f59e0b"
  },
  {
    id: 5, label: "Non-blocking check",
    formula: "Total downlinks = Total uplinks at each layer",
    example: "32 leaf × 32 uplinks = 1024 = 32 spine × 32 ports âœ“",
    question: "Does the uplink count at each layer match downlink bandwidth?",
    color: "#14532d", border: "#22c55e"
  },
  {
    id: 6, label: "Buffer depth check",
    formula: "nodes × 400G × sync_window â‰¤ switch buffer",
    example: "32 nodes × 400G × 1ms = 200MB needed → SN5600 64MB → OK with RSHP",
    question: "Can the selected switch buffer absorb AllReduce burst traffic?",
    color: "#7f1d1d", border: "#ef4444"
  },
]

export function TopologySizingWorkflowViz() {
  const [active, setActive] = useState<number | null>(1)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Topology sizing workflow — 6 steps
      </p>
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isActive = active === step.id
          const isDone = active !== null && step.id < active
          return (
            <button key={step.id}
              onClick={() => setActive(isActive ? null : step.id)}
              className="w-full rounded-xl text-left transition-all"
              style={{
                backgroundColor: isActive ? step.color + "44" : isDone ? step.color + "15" : "#0f172a",
                border: `1px solid ${isActive ? step.border : isDone ? step.border + "44" : "#1e293b"}`,
              }}>
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: isActive || isDone ? step.border : "#1e293b", color: "#fff" }}>
                  {isDone ? "âœ“" : step.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{step.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{step.formula}</div>
                </div>
                <span className="text-slate-600 text-xs flex-shrink-0">{isActive ? "â–²" : "â–¼"}</span>
              </div>
              {isActive && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="text-xs text-slate-300 leading-5">{step.question}</div>
                  <div className="rounded-lg bg-[#0a0f1a] border border-white/8 p-3 font-mono text-[10px] leading-5"
                    style={{ color: step.border }}>
                    Example: {step.example}
                  </div>
                  {idx < steps.length - 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); setActive(step.id + 1) }}
                      className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                      Next step →
                    </button>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TopologySizingWorkflowViz
