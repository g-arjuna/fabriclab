"use client"

import { useState } from "react"

type Mode = "same_su" | "cross_rail" | "cross_su"

const modes = [
  { id: "same_su" as Mode, label: "Same rail · same SU", color: "#3b82f6", title: "GPU N to GPU N can remain rail-local",
    body: "In the documented 32-node scalable-unit rail design, endpoints using the same rail can share the corresponding rail leaf (the full SuperPOD implementation removes one node position for UFM connectivity). The illustrated GPU 0-to-GPU 0 path enters Leaf 0 and returns without using the spine. This is topological placement, not a promise that every collective avoids every spine." },
  { id: "cross_rail" as Mode, label: "Different rail · same SU", color: "#f59e0b", title: "Different rails use a different physical path",
    body: "GPU 0 and GPU 1 attach to different compute NICs and different rail leaves. Traffic between them crosses through the fabric according to the deployed topology. It may use spine or higher tiers, but exact path selection depends on routing and switch architecture." },
  { id: "cross_su" as Mode, label: "Same rail · different SUs", color: "#ef4444", title: "Scalable-unit boundaries require higher tiers",
    body: "When endpoints are in different scalable units, same-rail identity alone does not make them same-leaf. Traffic must cross spine or higher fabric tiers connecting those units. The active path shown here is the higher-tier path." },
]

function Diagram({ mode }: { mode: Mode }) {
  const color = modes.find((m) => m.id === mode)?.color ?? "#3b82f6"
  const crossSU = mode === "cross_su"
  const crossRail = mode === "cross_rail"
  return (
    <svg viewBox="0 0 560 280" className="h-auto w-full" role="img" aria-label="Rail topology active path">
      <rect x="15" y="24" width="530" height="232" rx="14" fill="#020617" stroke="#1e293b" />
      <text x="32" y="45" fill="#64748b" fontSize="10">Scalable unit A</text>
      <rect x="30" y="55" width="130" height="178" rx="10" fill="#0f172a" stroke="#334155" />
      <text x="95" y="75" textAnchor="middle" fill="#94a3b8" fontSize="10">Node A</text>
      {["GPU 0", "GPU 1"].map((label, i) => (
        <g key={label}>
          <rect x="48" y={92 + i * 54} width="94" height="34" rx="7" fill={i === 0 ? "#172554" : "#3b0764"} stroke={i === 0 ? "#60a5fa" : "#c084fc"} />
          <text x="95" y={113 + i * 54} textAnchor="middle" fill="#e2e8f0" fontSize="10">{label}</text>
        </g>
      ))}
      <rect x="400" y="55" width="130" height="178" rx="10" fill="#0f172a" stroke="#334155" />
      <text x="465" y="75" textAnchor="middle" fill="#94a3b8" fontSize="10">{crossSU ? "Node B · SU B" : "Node B · SU A"}</text>
      {["GPU 0", "GPU 1"].map((label, i) => (
        <g key={label}>
          <rect x="418" y={92 + i * 54} width="94" height="34" rx="7" fill={i === 0 ? "#172554" : "#3b0764"} stroke={i === 0 ? "#60a5fa" : "#c084fc"} />
          <text x="465" y={113 + i * 54} textAnchor="middle" fill="#e2e8f0" fontSize="10">{label}</text>
        </g>
      ))}
      <rect x="205" y="80" width="72" height="38" rx="8" fill="#082f49" stroke="#38bdf8" />
      <text x="241" y="103" textAnchor="middle" fill="#bae6fd" fontSize="10">Leaf 0</text>
      <rect x="205" y="156" width="72" height="38" rx="8" fill="#3b0764" stroke="#c084fc" />
      <text x="241" y="179" textAnchor="middle" fill="#e9d5ff" fontSize="10">Leaf 1</text>
      <rect x="300" y="116" width="76" height="42" rx="8" fill="#450a0a" stroke="#f87171" strokeDasharray="4 3" />
      <text x="338" y="141" textAnchor="middle" fill="#fecaca" fontSize="10">Spine / tier</text>

      <line x1="142" y1="109" x2="205" y2="99" stroke="#475569" />
      <line x1="142" y1="163" x2="205" y2="175" stroke="#475569" />
      <line x1="277" y1="99" x2="418" y2="109" stroke="#475569" />
      <line x1="277" y1="175" x2="418" y2="163" stroke="#475569" />
      <line x1="277" y1="99" x2="300" y2="132" stroke="#475569" strokeDasharray="3 3" />
      <line x1="277" y1="175" x2="300" y2="142" stroke="#475569" strokeDasharray="3 3" />
      <line x1="376" y1="137" x2="418" y2={crossRail ? 163 : 109} stroke="#475569" strokeDasharray="3 3" />

      {mode === "same_su" && <path d="M142 109 L205 99 L277 99 L418 109" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />}
      {crossRail && <path d="M142 109 L205 99 L300 132 L376 137 L418 163" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />}
      {crossSU && <path d="M142 109 L205 99 L300 132 L376 137 L418 109" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />}
    </svg>
  )
}

export function RailTopologyViz() {
  const [mode, setMode] = useState<Mode>("same_su")
  const current = modes.find((item) => item.id === mode) ?? modes[0]
  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Rail topology — three distinct cases</p>
      <p className="mb-4 text-xs leading-5 text-slate-500">Simplified active-path illustration based on the DGX H100 scalable-unit concept. It does not claim that all collective traffic or all non-rail traffic follows one universal path.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {modes.map((item) => (
          <button key={item.id} type="button" onClick={() => setMode(item.id)}
            className="rounded-xl px-3 py-2 text-xs"
            style={{ border: `1px solid ${mode === item.id ? item.color : "#1e293b"}`, backgroundColor: mode === item.id ? `${item.color}18` : "#0f172a", color: mode === item.id ? item.color : "#94a3b8" }}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3"><Diagram mode={mode} /></div>
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
          <h3 className="text-sm font-semibold" style={{ color: current.color }}>{current.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{current.body}</p>
          <p className="mt-3 text-xs leading-6 text-slate-500">Physical rail wiring and NCCL's logical rings/trees are related but not identical. NCCL chooses communication channels and algorithms using topology discovery, collective type, message size, software configuration, and implementation version.</p>
        </div>
      </div>
    </div>
  )
}

export default RailTopologyViz
