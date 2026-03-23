"use client"
import { useState } from "react"

export function RODvsRUDViz() {
  const [mode, setMode] = useState<"rod" | "rud">("rod")

  const nodeCount = 4
  const gpusPerNode = 4

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Rail-optimised (ROD) vs rail-unified (RUD) wiring
      </p>

      <div className="flex gap-2 mb-5">
        {([["rod", "Rail-Optimised Design (ROD)", "One GPU per switch rail"], ["rud", "Rail-Unified Design (RUD)", "All GPUs per node share switches"]] as const).map(([id, label, sub]) => (
          <button key={id} onClick={() => setMode(id)}
            className="flex-1 rounded-xl p-3 text-left text-xs transition-all"
            style={{
              backgroundColor: mode === id ? (id === "rod" ? "#14532d" : "#1e3a5f") + "44" : "#0f172a",
              border: `1px solid ${mode === id ? (id === "rod" ? "#22c55e" : "#60a5fa") : "#1e293b"}`,
            }}>
            <div className="font-bold" style={{ color: mode === id ? (id === "rod" ? "#22c55e" : "#60a5fa") : "#64748b" }}>{label}</div>
            <div className="text-slate-600 text-[9px] mt-0.5">{sub}</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-[#060d18] border border-white/8 p-4 mb-4">
        <svg viewBox="0 0 560 240" className="w-full">
          {Array.from({ length: gpusPerNode }, (_, rail) => {
            const x = 60 + rail * 120
            const color = ["#22c55e", "#60a5fa", "#a78bfa", "#f59e0b"][rail]
            return (
              <g key={rail}>
                <rect x={x - 32} y="10" width="64" height="28" rx="4"
                  fill={color + "22"} stroke={color} strokeWidth="1.5"/>
                <text x={x} y="28" textAnchor="middle" fill={color} fontSize="8" fontWeight="700">
                  {mode === "rod" ? `Rail ${rail}` : `Sw ${rail}`}
                </text>
              </g>
            )
          })}

          {Array.from({ length: nodeCount }, (_, nodeIdx) => {
            const nodeX = 70 + nodeIdx * 110
            const nodeY = 130
            return (
              <g key={nodeIdx}>
                <rect x={nodeX - 40} y={nodeY} width="80" height="90" rx="5"
                  fill="#0f172a" stroke="#334155" strokeWidth="1"/>
                <text x={nodeX} y={nodeY + 12} textAnchor="middle" fill="#64748b" fontSize="7">
                  DGX {nodeIdx}
                </text>

                {Array.from({ length: gpusPerNode }, (_, gpuIdx) => {
                  const gpuX = nodeX - 28 + gpuIdx * 18
                  const gpuColor = ["#22c55e", "#60a5fa", "#a78bfa", "#f59e0b"][gpuIdx]
                  const leafX = 60 + gpuIdx * 120
                  const targetLeafX = mode === "rod"
                    ? leafX
                    : gpuIdx < 2 ? 60 : 180

                  return (
                    <g key={gpuIdx}>
                      <line
                        x1={gpuX + 7} y1={nodeY + 18}
                        x2={targetLeafX} y2={38}
                        stroke={mode === "rod" ? gpuColor : (gpuIdx < 2 ? "#22c55e" : "#60a5fa")}
                        strokeWidth={1.5}
                        strokeDasharray={mode === "rud" ? "3 2" : undefined}
                        opacity={0.7}/>
                      <rect x={gpuX} y={nodeY + 20} width="14" height="14" rx="2"
                        fill={gpuColor + "33"} stroke={gpuColor} strokeWidth="1"/>
                      <text x={gpuX + 7} y={nodeY + 31} textAnchor="middle"
                        fill={gpuColor} fontSize="6">G{gpuIdx}</text>
                    </g>
                  )
                })}
              </g>
            )
          })}

          <text x="280" y="232" textAnchor="middle" fill="#64748b" fontSize="8">
            {mode === "rod"
              ? "ROD: GPU 0 → Rail 0, GPU 1 → Rail 1, etc. AllReduce between GPU 0s stays on Rail 0 switch — one hop."
              : "RUD: GPUs 0+1 share Sw 0, GPUs 2+3 share Sw 1. Better per-node BW aggregation, less rail isolation."}
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {(mode === "rod" ? [
          { label: "AllReduce hops (intra-rail)", value: "1 switch hop — GPU 0 on Node A to GPU 0 on Node B goes through Rail 0 switch only. Spine not involved.", color: "#22c55e" },
          { label: "Fault isolation", value: "A failing rail affects GPU index N across all nodes. Diagnostic is unambiguous: 'Rail 3 is down' = GPU 3 on every node.", color: "#22c55e" },
          { label: "AllReduce hops (cross-GPU)", value: "GPU 0 cannot AllReduce with GPU 1 without going through the spine. Cross-rail traffic uses more hops.", color: "#f59e0b" },
          { label: "Bandwidth flexibility", value: "Fixed: each GPU gets exactly 400G to its dedicated rail. No sharing possible between GPU indices.", color: "#f59e0b" },
        ] : [
          { label: "Bandwidth aggregation", value: "A DGX node has all its NICs connected to a smaller set of switches. Total node bandwidth can aggregate across fewer switches.", color: "#60a5fa" },
          { label: "Multi-tenant flexibility", value: "Multiple jobs sharing the cluster are not constrained to rail-aligned GPU sets. More scheduling flexibility.", color: "#60a5fa" },
          { label: "Diagnostic complexity", value: "A failing port affects a subset of GPUs across a subset of nodes. No clean rail = no clean isolation. Harder to debug.", color: "#ef4444" },
          { label: "AllReduce hops", value: "AllReduce between same-GPU-index nodes may take more hops if those GPUs are now co-located on the same switches.", color: "#ef4444" },
        ]).map(item => (
          <div key={item.label} className="rounded-xl p-3"
            style={{ backgroundColor: item.color + "11", border: `1px solid ${item.color}22` }}>
            <div className="font-semibold mb-1" style={{ color: item.color }}>{item.label}</div>
            <p className="text-slate-400 leading-5">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RODvsRUDViz
