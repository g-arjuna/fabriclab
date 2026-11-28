"use client"

import { useState } from "react"

type Mode = "same_su" | "cross_rail" | "cross_su"
type NodeId = "gpuA0" | "nicA0" | "leafA0" | "spine" | "leafA1" | "leafB0" | "nicB0" | "nicB1" | "gpuB0" | "gpuB1" | "nvsA" | "nvsB"

type GraphNode = { id: NodeId; x: number; y: number; w: number; h: number; label: string; sub: string; su?: "A" | "B" }
type GraphEdge = { id: string; from: NodeId; to: NodeId }

const nodes: GraphNode[] = [
  { id: "gpuA0", x: 38, y: 92, w: 70, h: 34, label: "GPU 0", sub: "Node A", su: "A" },
  { id: "nicA0", x: 136, y: 92, w: 70, h: 34, label: "NIC A0", sub: "rail 0", su: "A" },
  { id: "leafA0", x: 242, y: 82, w: 78, h: 38, label: "Leaf 0", sub: "SU A", su: "A" },
  { id: "leafA1", x: 242, y: 174, w: 78, h: 38, label: "Leaf 1", sub: "SU A", su: "A" },
  { id: "spine", x: 360, y: 126, w: 76, h: 42, label: "Spine", sub: "fabric tier" },
  { id: "leafB0", x: 456, y: 82, w: 78, h: 38, label: "Leaf 0", sub: "SU B", su: "B" },
  { id: "nicB0", x: 456, y: 174, w: 70, h: 34, label: "NIC B0", sub: "rail 0", su: "B" },
  { id: "gpuB0", x: 456, y: 224, w: 70, h: 34, label: "GPU 0", sub: "Node B", su: "B" },
  { id: "nicB1", x: 38, y: 174, w: 70, h: 34, label: "NIC B1", sub: "rail 1", su: "A" },
  { id: "gpuB1", x: 38, y: 224, w: 70, h: 34, label: "GPU 1", sub: "Node B", su: "A" },
]

const positions = Object.fromEntries(nodes.map((node) => [node.id, node])) as Record<NodeId, GraphNode>

function center(id: NodeId) {
  const node = positions[id]
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 }
}

function edgeLine(edge: GraphEdge, active: boolean) {
  const a = center(edge.from)
  const b = center(edge.to)
  return (
    <line key={edge.id} data-testid={`edge-${edge.id}`} data-active={active ? "true" : "false"}
      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
      stroke={active ? "#38bdf8" : "#334155"} strokeWidth={active ? 4 : 1.5}
      strokeLinecap="round" opacity={active ? 1 : 0.35} />
  )
}

const modeInfo: Record<Mode, {
  label: string
  title: string
  body: string
  activeEdges: string[]
  activeNodes: NodeId[]
  visibleNodes: NodeId[]
  edges: GraphEdge[]
}> = {
  same_su: {
    label: "Same rail · same SU",
    title: "Rail-local same-scalable-unit path",
    body: "In the NVIDIA DGX H100 SuperPOD rail-optimized reference topology, two same-rail endpoints attached to the same rail leaf can communicate through that leaf without traversing the spine. The active graph is GPU A0 → compute NIC A0 → SU A Leaf 0 → compute NIC B0 → GPU B0. Switch hops and physical links are different counts: this path uses one leaf switch hop but four illustrated physical links.",
    activeEdges: ["a-gpu-nic", "a-nic-leaf0", "leaf0-b-nic", "b-nic-gpu"],
    activeNodes: ["gpuA0", "nicA0", "leafA0", "nicB0", "gpuB0"],
    visibleNodes: ["gpuA0", "nicA0", "leafA0", "nicB0", "gpuB0"],
    edges: [
      { id: "a-gpu-nic", from: "gpuA0", to: "nicA0" },
      { id: "a-nic-leaf0", from: "nicA0", to: "leafA0" },
      { id: "leaf0-b-nic", from: "leafA0", to: "nicB0" },
      { id: "b-nic-gpu", from: "nicB0", to: "gpuB0" },
    ],
  },
  cross_rail: {
    label: "Different rail · same SU",
    title: "Cross-rail path traverses the spine layer",
    body: "GPU A0 and GPU B1 belong to different rails and therefore attach to different rail leaves. In the H100 SuperPOD reference topology, inter-rail traffic traverses the spine layer. The active graph is GPU A0 → NIC A0 → SU A Leaf 0 → spine → SU A Leaf 1 → NIC B1 → GPU B1. There is no shortcut from Leaf 0 directly to the destination GPU.",
    activeEdges: ["a-gpu-nic", "a-nic-leaf0", "leaf0-spine", "spine-leaf1", "leaf1-b1-nic", "b1-nic-gpu"],
    activeNodes: ["gpuA0", "nicA0", "leafA0", "spine", "leafA1", "nicB1", "gpuB1"],
    visibleNodes: ["gpuA0", "nicA0", "leafA0", "spine", "leafA1", "nicB1", "gpuB1"],
    edges: [
      { id: "a-gpu-nic", from: "gpuA0", to: "nicA0" },
      { id: "a-nic-leaf0", from: "nicA0", to: "leafA0" },
      { id: "leaf0-spine", from: "leafA0", to: "spine" },
      { id: "spine-leaf1", from: "spine", to: "leafA1" },
      { id: "leaf1-b1-nic", from: "leafA1", to: "nicB1" },
      { id: "b1-nic-gpu", from: "nicB1", to: "gpuB1" },
    ],
  },
  cross_su: {
    label: "Same rail · different SUs",
    title: "Cross-scalable-unit path includes both rail leaves",
    body: "Endpoints in different scalable units attach to different physical Leaf 0 switches even when both are called rail 0. In the H100 SuperPOD reference topology, inter-SU traffic crosses the spine or applicable higher fabric tier: GPU A0 → NIC A0 → SU A Leaf 0 → spine → SU B Leaf 0 → NIC B0 → GPU B0. The destination leaf is mandatory; it is not bypassed.",
    activeEdges: ["a-gpu-nic", "a-nic-leaf0", "leaf0-spine", "spine-leafb0", "leafb0-b-nic", "b-nic-gpu"],
    activeNodes: ["gpuA0", "nicA0", "leafA0", "spine", "leafB0", "nicB0", "gpuB0"],
    visibleNodes: ["gpuA0", "nicA0", "leafA0", "spine", "leafB0", "nicB0", "gpuB0"],
    edges: [
      { id: "a-gpu-nic", from: "gpuA0", to: "nicA0" },
      { id: "a-nic-leaf0", from: "nicA0", to: "leafA0" },
      { id: "leaf0-spine", from: "leafA0", to: "spine" },
      { id: "spine-leafb0", from: "spine", to: "leafB0" },
      { id: "leafb0-b-nic", from: "leafB0", to: "nicB0" },
      { id: "b-nic-gpu", from: "nicB0", to: "gpuB0" },
    ],
  },
}

function Diagram({ mode }: { mode: Mode }) {
  const current = modeInfo[mode]
  return (
    <svg viewBox="0 0 570 286" className="h-auto w-full" role="img" aria-label={`Rail topology graph: ${current.label}`} data-testid={`rail-topology-${mode}`}>
      {mode === "cross_su" ? (
        <g>
          <rect x="18" y="48" width="326" height="92" rx="12" fill="#020617" stroke="#1e293b" />
          <text x="30" y="66" fill="#64748b" fontSize="9">Scalable unit A</text>
          <rect data-testid="su-b-boundary" x="342" y="48" width="210" height="220" rx="12" fill="#020617" stroke="#1e293b" />
          <text x="354" y="66" fill="#64748b" fontSize="9">Scalable unit B</text>
        </g>
      ) : (
        <g>
          <rect x="18" y="48" width="500" height="220" rx="12" fill="#020617" stroke="#1e293b" />
          <text x="30" y="66" fill="#64748b" fontSize="9">Scalable unit A</text>
        </g>
      )}
      {current.edges.map((edge) => edgeLine(edge, current.activeEdges.includes(edge.id)))}
      {current.visibleNodes.map((id) => {
        const node = positions[id]
        const active = current.activeNodes.includes(id)
        return (
          <g key={id} data-testid={`node-${id}`} data-active={active ? "true" : "false"}>
            <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={7}
              fill={active ? "#082f49" : "#0f172a"} stroke={active ? "#38bdf8" : "#334155"} strokeWidth={active ? 2 : 1} />
            <text x={node.x + node.w / 2} y={node.y + node.h / 2 - 2} textAnchor="middle" fill={active ? "#bae6fd" : "#94a3b8"} fontSize="9" fontWeight="700">{node.label}</text>
            <text x={node.x + node.w / 2} y={node.y + node.h / 2 + 10} textAnchor="middle" fill={active ? "#7dd3fc" : "#64748b"} fontSize="7">{node.sub}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function RailTopologyViz() {
  const [mode, setMode] = useState<Mode>("same_su")
  const current = modeInfo[mode]
  return (
    <div data-testid="rail-topology-viz" className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Rail topology — explicit physical graph</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">Simplified active-path illustration for the NVIDIA DGX H100 SuperPOD rail-optimized reference topology. It shows endpoint links and switch hops; it does not model NCCL algorithm selection.</p>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Rail topology case">
        {(Object.keys(modeInfo) as Mode[]).map((id) => (
          <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}
            className="rounded-xl px-3 py-2 text-xs"
            style={{ border: `1px solid ${mode === id ? "#38bdf8" : "#1e293b"}`, backgroundColor: mode === id ? "#082f49" : "#0f172a", color: mode === id ? "#bae6fd" : "#94a3b8" }}>
            {modeInfo[id].label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3"><Diagram mode={mode} /></div>
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <h3 className="text-sm font-semibold text-sky-200">{current.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{current.body}</p>
          <p className="mt-3 text-xs leading-6 text-slate-500">Physical rail wiring and NCCL logical rings/trees are related but not identical. NCCL chooses communication channels and algorithms using topology discovery, collective type, message size, software configuration, and implementation version.</p>
        </div>
      </div>
    </div>
  )
}

export default RailTopologyViz
