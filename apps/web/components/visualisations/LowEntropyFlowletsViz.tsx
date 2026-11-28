"use client"

import { useState } from "react"

type ScenarioId = "high_entropy" | "low_entropy"

const scenarios = [
  {
    id: "high_entropy" as const,
    label: "High entropy (normal web traffic)",
    caption: "Many different five-tuples usually spread hash outputs, but even distribution is not guaranteed",
    spineUtil: [25, 24, 27, 24],
    spineColors: ["#22c55e", "#22c55e", "#22c55e", "#22c55e"],
    tupleLines: [
      "Clients 10.0.x.x -> services 172.16.x.x",
      "src ports: varied",
      "dst ports: 80, 443, 5432, 6379",
      "hash output: evenly spread",
    ],
    leftNodes: ["Client A", "Client B", "Client C", "Client D"],
    rightNodes: ["Web 1", "API 2", "DB 3", "Cache 4"],
  },
  {
    id: "low_entropy" as const,
    label: "Low entropy (RoCEv2 AllReduce)",
    caption: "Distinct large flows can still hash to the same path -> concentrated load + idle capacity",
    spineUtil: [92, 88, 8, 4],
    spineColors: ["#ef4444", "#ef4444", "#334155", "#334155"],
    tupleLines: [
      "DGX 10.1.0.x <-> DGX 10.1.0.y",
      "protocol: UDP",
      "dst port: 4791 always",
      "src port: often entropy-bearing; not globally unique per QP",
    ],
    leftNodes: ["DGX A", "DGX B", "DGX C", "DGX D"],
    rightNodes: ["DGX E", "DGX F", "DGX G", "DGX H"],
  },
]

const conceptPanels = [
  {
    title: "Hash collision",
    summary: "Distinct five-tuples can produce the same ECMP bucket because hashing compresses many inputs into few paths.",
    detail: "GPU traffic often uses a small number of very large, long-lived flows. Even when source addresses and UDP source ports differ, two elephant flows can be assigned to the same member. Offered load can exceed a link's capacity; carried utilization cannot exceed line rate.",
    accent: "#ef4444",
  },
  {
    title: "Flowlet",
    summary: "A flowlet is a burst or segment of packets within one flow, separated from the next burst by a sufficiently large inter-packet gap.",
    detail: "At a flowlet boundary, a flowlet-aware implementation may select another path because the gap makes reordering less likely. A flowlet is not a separate network flow and does not require identical five-tuples.",
    accent: "#60a5fa",
  },
  {
    title: "Adaptive packet spraying",
    summary: "Packet-level adaptive routing distributes individual packets or controlled groups across paths and must manage reordering.",
    detail: "Hardware support and transport behavior matter. This is different from conventional static per-flow ECMP and different from merely choosing a new path at a flowlet boundary.",
    accent: "#22c55e",
  },
]

export function LowEntropyFlowletsViz() {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("low_entropy")
  const scenario = scenarios.find((item) => item.id === activeScenario) ?? scenarios[0]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-lg shadow-slate-950/30">
      <p className="mb-4 text-xs uppercase tracking-[0.28em] text-slate-500">
        Entropy, ECMP, and flowlets
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {scenarios.map((item) => {
          const isActive = item.id === activeScenario
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveScenario(item.id)}
              className="w-full rounded-xl px-3 py-2 text-left text-xs transition sm:w-auto"
              style={{
                backgroundColor: isActive ? "#13243b" : "#0f172a",
                border: `1px solid ${isActive ? "#38bdf8" : "#1e293b"}`,
                color: isActive ? "#e0f2fe" : "#94a3b8",
              }}
            >
              <div className="font-semibold">{item.label}</div>
              <div className="mt-0.5 text-[10px] opacity-75">{item.caption}</div>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Illustrative carried utilization view (not a measurement)
          </p>

          <div className="flex flex-col gap-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              {scenario.leftNodes.map((node) => (
                <div
                  key={node}
                  className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100"
                >
                  {node}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {scenario.spineUtil.map((util, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-14 text-[10px] text-slate-500">Spine {index + 1}</span>
                  <div className="h-10 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-800 md:w-24 md:flex-none">
                    <div
                      className="flex h-full items-center justify-center text-[10px] font-semibold text-white transition-all duration-500"
                      style={{
                        width: `${Math.max(util, 16)}%`,
                        backgroundColor: scenario.spineColors[index],
                      }}
                    >
                      {util}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              {scenario.rightNodes.map((node) => (
                <div
                  key={node}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100"
                >
                  {node}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/8 bg-slate-900/70 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
              Representative 5-tuple characteristics
            </p>
            <div className="space-y-1">
              {scenario.tupleLines.map((line) => (
                <p key={line} className="break-all font-mono text-[11px] text-slate-300">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Collision, flowlet, and routing definitions
          </p>
          <p className="text-sm leading-7 text-slate-300">{scenario.caption} Uneven utilization is a symptom, not definitive proof of an ECMP or flowlet problem; verify offered load, queueing, drops, and endpoint behavior.</p>

          <div className="mt-4 space-y-3">
            {conceptPanels.map((panel) => (
              <div
                key={panel.title}
                className="rounded-xl border bg-slate-900/70 p-3"
                style={{ borderColor: `${panel.accent}33` }}
              >
                <p className="text-xs font-semibold" style={{ color: panel.accent }}>
                  {panel.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{panel.summary}</p>
                <p className="mt-2 text-xs leading-6 text-slate-400">{panel.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LowEntropyFlowletsViz
