"use client"

import { useState } from "react"

type TrafficMode = "allreduce" | "crossrail" | "spine"

const modes: { id: TrafficMode; label: string; subtitle: string }[] = [
  { id: "allreduce", label: "AllReduce traffic", subtitle: "GPU 0s talking to GPU 0s" },
  { id: "crossrail", label: "Cross-rail traffic", subtitle: "GPU 0 talking to GPU 1" },
  { id: "spine", label: "Non-rail Ethernet", subtitle: "What ECMP would look like" },
]

const descriptions: Record<TrafficMode, { title: string; body: string; insight: string }> = {
  allreduce: {
    title: "AllReduce stays within one leaf switch",
    body: "In a rail-optimised topology, every GPU 0 across every DGX node connects to Leaf Switch 0. When GPU 0s perform AllReduce — sending gradient updates to all other GPU 0s — that traffic flows down from each GPU 0, into Leaf Switch 0, and back up to all other GPU 0s. It never touches the spine. One switch hop in each direction. The spine layer is completely bypassed for this traffic pattern.",
    insight: "This is the key insight: by wiring all GPU Ns to the same leaf switch, AllReduce traffic between GPU Ns is topologically local — it never competes for spine bandwidth. You get dedicated, non-blocking throughput for the most critical communication pattern in AI training.",
  },
  crossrail: {
    title: "Cross-rail traffic uses the spine",
    body: "When GPU 0 on Node A needs to send data to GPU 1 on Node B (for pipeline parallelism stage handoff, for example), that traffic must go: GPU 0 → Leaf 0 → Spine → Leaf 1 → GPU 1. This uses the spine layer. In a well-designed cluster, most training traffic is AllReduce (staying within one rail), not cross-rail. Pipeline parallelism is typically constrained to a single node for this reason — using NVLink rather than the external fabric.",
    insight: "Cross-rail traffic is the exception, not the rule, in a rail-optimised design. The topology is deliberately built to make the most frequent operation (AllReduce) fast, and the less frequent operation (cross-rail) merely acceptable.",
  },
  spine: {
    title: "Without rail topology: all traffic competes for spine",
    body: "In a conventional fat-tree without rail optimisation — which is how standard Ethernet clusters were historically built — every GPU-to-GPU flow goes through the spine regardless of which GPUs are communicating. AllReduce traffic from GPU 0s mixes with AllReduce traffic from GPU 1s, with pipeline traffic, with storage traffic. Every flow competes for the same spine uplinks. ECMP hash collisions cause some spine links to be overloaded while others sit idle.",
    insight: "This is one of the root causes of why vanilla Ethernet struggled with AI training before Spectrum-X. The topology did not match the traffic pattern. Rail optimisation is an architectural fix for a physical layer problem.",
  },
}

export function RailTopologyViz() {
  const [mode, setMode] = useState<TrafficMode>("allreduce")
  const desc = descriptions[mode]

  // Node positions: 3 DGX nodes for clarity
  const nodes = [
    { id: "A", x: 60, label: "DGX Node A" },
    { id: "B", x: 210, label: "DGX Node B" },
    { id: "C", x: 360, label: "DGX Node C" },
  ]

  // Leaf switches
  const leafSwitches = [
    { id: 0, x: 60,  y: 200, label: "Leaf 0\n(Rail 0)", color: "#1e40af" },
    { id: 1, x: 210, y: 200, label: "Leaf 1\n(Rail 1)", color: "#065f46" },
    { id: 2, x: 360, y: 200, label: "Leaf 2\n(Rail 2)", color: "#6d28d9" },
  ]

  // GPU positions inside each node (showing GPU 0 and GPU 1 only for clarity)
  const gpuColors: Record<number, string> = { 0: "#1e40af", 1: "#065f46" }

  const isActiveLeaf = (leafId: number) => {
    if (mode === "allreduce") return leafId === 0
    if (mode === "crossrail") return true
    return true
  }

  const isSpineActive = mode === "crossrail" || mode === "spine"

  const lineColor = (from: "gpu0" | "gpu1", isSpine: boolean) => {
    if (isSpine && !isSpineActive) return "#1e293b"
    if (mode === "allreduce" && from === "gpu1") return "#1e293b"
    return mode === "allreduce" ? "#3b82f6" : mode === "crossrail" ? "#f59e0b" : "#ef4444"
  }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Rail-optimised topology — why AllReduce never touches the spine
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="rounded-xl px-3 py-2 text-xs transition-all text-left"
            style={{
              backgroundColor: mode === m.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${mode === m.id ? "#60a5fa" : "#1e293b"}`,
              color: mode === m.id ? "#bfdbfe" : "#64748b",
            }}
          >
            <div className="font-semibold">{m.label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{m.subtitle}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-shrink-0">
          <svg viewBox="0 0 460 320" className="w-full max-w-md">

            {/* Spine switch */}
            <rect x="150" y="20" width="160" height="36" rx="6"
              fill={isSpineActive ? "#4c1d95" : "#0f172a"}
              stroke={isSpineActive ? "#8b5cf6" : "#1e293b"}
              strokeWidth={isSpineActive ? 2 : 1}
            />
            <text x="230" y="40" textAnchor="middle" fill={isSpineActive ? "#c4b5fd" : "#374151"} fontSize="9" fontWeight="600">SPINE SWITCH</text>
            <text x="230" y="52" textAnchor="middle" fill={isSpineActive ? "#8b5cf6" : "#1e293b"} fontSize="7">Q3400 / Quantum-X800</text>

            {/* Spine to leaf connections */}
            {leafSwitches.map(leaf => (
              <line key={leaf.id}
                x1={230} y1={56}
                x2={leaf.x + 50} y2={192}
                stroke={isSpineActive ? "#7c3aed" : "#1e293b"}
                strokeWidth={isSpineActive ? 2 : 1}
                strokeDasharray={isSpineActive ? undefined : "4 4"}
              />
            ))}

            {/* Leaf switches */}
            {leafSwitches.map(leaf => (
              <g key={leaf.id}>
                <rect x={leaf.x} y={leaf.y} width={100} height={44} rx="6"
                  fill={isActiveLeaf(leaf.id) ? leaf.color + "55" : "#0f172a"}
                  stroke={isActiveLeaf(leaf.id) ? leaf.color : "#1e293b"}
                  strokeWidth={isActiveLeaf(leaf.id) ? 2 : 1}
                />
                <text x={leaf.x + 50} y={leaf.y + 17} textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="600">
                  {leaf.label.split("\n")[0]}
                </text>
                <text x={leaf.x + 50} y={leaf.y + 30} textAnchor="middle" fill="#94a3b8" fontSize="7">
                  {leaf.label.split("\n")[1]}
                </text>
              </g>
            ))}

            {/* DGX nodes and GPU connections */}
            {nodes.map((node, ni) => {
              const leafX = leafSwitches[ni < 3 ? 0 : 1].x
              return (
                <g key={node.id}>
                  {/* Node box */}
                  <rect x={node.x} y={270} width={100} height={40} rx="6"
                    fill="#0f172a" stroke="#1e293b" strokeWidth={1}
                  />
                  <text x={node.x + 50} y={286} textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="600">
                    {node.label}
                  </text>

                  {/* GPU 0 dot */}
                  <circle
                    cx={node.x + 28} cy={295} r={6}
                    fill={gpuColors[0]}
                    stroke={mode === "allreduce" || mode === "spine" ? "#60a5fa" : mode === "crossrail" && ni === 0 ? "#fbbf24" : gpuColors[0]}
                    strokeWidth={2}
                  />
                  <text x={node.x + 28} y={298} textAnchor="middle" fill="#fff" fontSize="5">G0</text>

                  {/* GPU 1 dot */}
                  <circle
                    cx={node.x + 72} cy={295} r={6}
                    fill={gpuColors[1]}
                    stroke={mode === "crossrail" && ni === 1 ? "#fbbf24" : gpuColors[1]}
                    strokeWidth={2}
                  />
                  <text x={node.x + 72} y={298} textAnchor="middle" fill="#fff" fontSize="5">G1</text>

                  {/* GPU 0 → Leaf 0 connection */}
                  <line
                    x1={node.x + 28} y1={289}
                    x2={leafSwitches[0].x + 50} y2={leafSwitches[0].y + 44}
                    stroke={lineColor("gpu0", false)}
                    strokeWidth={mode === "allreduce" ? 2.5 : 1}
                    opacity={mode === "allreduce" || mode === "crossrail" || mode === "spine" ? 0.9 : 0.2}
                  />

                  {/* GPU 1 → Leaf 1 connection */}
                  <line
                    x1={node.x + 72} y1={289}
                    x2={leafSwitches[1].x + 50} y2={leafSwitches[1].y + 44}
                    stroke={lineColor("gpu1", false)}
                    strokeWidth={mode === "crossrail" ? 2.5 : 1}
                    opacity={mode === "allreduce" ? 0.15 : 0.9}
                  />
                </g>
              )
            })}

            {/* Legend */}
            <text x={10} y={312} fill="#475569" fontSize="7">G0 = GPU 0 (Rail 0) · G1 = GPU 1 (Rail 1)</text>
          </svg>
        </div>

        <div className="flex-1 space-y-3">
          <div className="rounded-xl bg-slate-800/50 p-4">
            <h3 className="text-sm font-semibold text-white mb-2">{desc.title}</h3>
            <p className="text-sm leading-7 text-slate-300">{desc.body}</p>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-xs font-semibold text-cyan-400 mb-1 uppercase tracking-wider">The insight</p>
            <p className="text-sm leading-7 text-slate-300">{desc.insight}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RailTopologyViz
