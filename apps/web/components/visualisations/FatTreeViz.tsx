"use client"
import { useState } from "react"

export function FatTreeViz() {
  const [k, setK] = useState(8)
  const [highlight, setHighlight] = useState<"bisection" | "path" | null>(null)

  const pods = k
  const edgePerPod = k / 2
  const aggPerPod = k / 2
  const coreCount = (k / 2) ** 2
  const servers = (k ** 3) / 4

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        k-ary fat-tree -- interactive topology calculator
      </p>
      <p className="mb-4 text-xs text-slate-600">k = switch radix (ports per switch)</p>

      <div className="flex items-center gap-6 mb-5">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">k (switch radix)</span>
            <span className="text-2xl font-bold text-white font-mono">{k}</span>
          </div>
          <input type="range" min={4} max={16} step={2} value={k}
            onChange={e => setK(Number(e.target.value))}
            className="w-full accent-cyan-400"/>
          <div className="flex justify-between text-[9px] text-slate-600 mt-1">
            {[4,6,8,10,12,14,16].map(v => <span key={v}>{v}</span>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5 sm:grid-cols-4">
        {[
          { label: "Pods", formula: "k", value: pods, color: "#f59e0b" },
          { label: "Edge switches/pod", formula: "k/2", value: edgePerPod, color: "#60a5fa" },
          { label: "Core switches", formula: "(k/2)^2", value: coreCount, color: "#ef4444" },
          { label: "Max servers", formula: "k^3/4", value: servers, color: "#4ade80" },
        ].map(item => (
          <div key={item.label} className="rounded-xl bg-slate-800/50 p-3 text-center">
            <div className="text-[9px] text-slate-500 mb-0.5">{item.label}</div>
            <div className="text-[10px] font-mono mb-1" style={{ color: item.color }}>{item.formula}</div>
            <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => setHighlight(highlight === "bisection" ? null : "bisection")}
          className="rounded-xl p-3 text-xs transition-all text-left"
          style={{
            backgroundColor: highlight === "bisection" ? "#78350f" : "#0f172a",
            border: `1px solid ${highlight === "bisection" ? "#f59e0b" : "#1e293b"}`,
          }}>
          <div className="font-semibold text-amber-300 mb-1">Bisection bandwidth</div>
          <div className="text-slate-400 leading-5">
            At the bisection cut, (k/2)^2 core switches x k/2 links each = {coreCount * (k/2)} total links x 400G = {((coreCount * (k/2) * 400) / 1000).toFixed(1)} Tb/s
          </div>
        </button>
        <button onClick={() => setHighlight(highlight === "path" ? null : "path")}
          className="rounded-xl p-3 text-xs transition-all text-left"
          style={{
            backgroundColor: highlight === "path" ? "#14532d" : "#0f172a",
            border: `1px solid ${highlight === "path" ? "#22c55e" : "#1e293b"}`,
          }}>
          <div className="font-semibold text-green-300 mb-1">AllReduce hop count</div>
          <div className="text-slate-400 leading-5">
            {"Server -> Edge -> Agg -> Core -> Agg -> Edge -> Server = 6 hops between servers in different pods (3 up, 3 down)"}
          </div>
        </button>
      </div>

      <div className="rounded-xl bg-[#0a0f1a] border border-white/8 p-3 text-xs">
        <div className="text-slate-500 mb-2">At k={k}, this fat-tree supports:</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-slate-300">
          <span>Total servers:</span><span className="text-green-400">{servers.toLocaleString()}</span>
          <span>DGX H100 nodes (8 NICs):</span><span className="text-green-400">{Math.floor(servers / 8).toLocaleString()}</span>
          <span>Total GPUs:</span><span className="text-green-400">{(Math.floor(servers / 8) * 8).toLocaleString()}</span>
          <span>Switch count:</span><span className="text-blue-400">{(pods * edgePerPod + pods * aggPerPod + coreCount).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export default FatTreeViz
