"use client"

import { useState } from "react"

type Mode = "static" | "sufficient" | "insufficient"

const modeInfo: Record<Mode, {
  label: string
  title: string
  detail: string
  spineUtil: number[]
  packets: { id: string; time: number; path: 1 | 3; state: "ordered" | "moved" | "reordered" }[]
}> = {
  static: {
    label: "Static ECMP",
    title: "One flow remains pinned to one hash-selected member",
    detail: "Flow A and Flow B are distinct five-tuples, but the illustrative hash maps both to Spine 1. Their offered traffic collides while Spine 3 has spare capacity. ECMP does not split the continuous Flow A burst merely because utilization is unequal.",
    spineUtil: [100, 12, 8, 10],
    packets: [
      { id: "A1", time: 10, path: 1, state: "ordered" }, { id: "A2", time: 20, path: 1, state: "ordered" }, { id: "A3", time: 30, path: 1, state: "ordered" },
      { id: "A4", time: 68, path: 1, state: "ordered" }, { id: "A5", time: 78, path: 1, state: "ordered" },
    ],
  },
  sufficient: {
    label: "Sufficient flowlet gap",
    title: "A sufficiently large idle gap creates a flowlet boundary",
    detail: "Packets A1–A3 form one flowlet within Flow A. After a gap large enough for the implementation and differential path delay, packets A4–A5 may form a second flowlet of the same flow and be placed on another eligible path. Because earlier packets have had time to drain, reordering is unlikely in this simplified example.",
    spineUtil: [72, 12, 62, 10],
    packets: [
      { id: "A1", time: 10, path: 1, state: "ordered" }, { id: "A2", time: 20, path: 1, state: "ordered" }, { id: "A3", time: 30, path: 1, state: "ordered" },
      { id: "A4", time: 68, path: 3, state: "moved" }, { id: "A5", time: 78, path: 3, state: "moved" },
    ],
  },
  insufficient: {
    label: "Insufficient gap",
    title: "Changing paths inside a continuous burst can reorder packets",
    detail: "If the gap is smaller than the safe flowlet threshold for the implementation and differential path delay, A4 can be moved while A3 is still effectively in flight. A shorter or less congested new path can deliver A4 before A3. Transport or receiver hardware must then tolerate or repair reordering.",
    spineUtil: [76, 12, 58, 10],
    packets: [
      { id: "A1", time: 10, path: 1, state: "ordered" }, { id: "A2", time: 20, path: 1, state: "ordered" }, { id: "A3", time: 30, path: 1, state: "reordered" },
      { id: "A4", time: 37, path: 3, state: "reordered" }, { id: "A5", time: 47, path: 3, state: "moved" },
    ],
  },
}

export function LowEntropyFlowletsViz() {
  const [mode, setMode] = useState<Mode>("sufficient")
  const current = modeInfo[mode]

  return (
    <div data-testid="flowlet-viz" className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-lg shadow-slate-950/30">
      <p className="mb-4 text-xs uppercase tracking-[0.28em] text-slate-500">Entropy, ECMP, and flowlets — concrete mechanism</p>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Flowlet mode">
        {(Object.keys(modeInfo) as Mode[]).map((id) => (
          <button key={id} type="button" aria-pressed={id === mode} onClick={() => setMode(id)}
            className="rounded-xl px-3 py-2 text-left text-xs transition"
            style={{ backgroundColor: id === mode ? "#13243b" : "#0f172a", border: `1px solid ${id === mode ? "#38bdf8" : "#1e293b"}`, color: id === mode ? "#e0f2fe" : "#94a3b8" }}>
            {modeInfo[id].label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
          <div className="rounded-xl border border-white/8 bg-slate-900/70 p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">Illustrative hash inputs</p>
            <div className="space-y-1 font-mono text-[11px] leading-5 text-slate-300" data-testid="flowlet-hash-example">
              <p>Flow A: UDP 10.1.0.11:50001 → 10.1.0.22:4791 → hash bucket Spine 1</p>
              <p>Flow B: UDP 10.1.0.12:50002 → 10.1.0.23:4791 → hash bucket Spine 1</p>
              <p className="text-slate-500">Distinct five-tuples, same compressed ECMP member: a hash collision.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/8 bg-slate-900/70 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Flow A packet timeline</p>
              <p className="text-[10px] text-slate-500">time increases left to right; long blank interval is the flowlet gap</p>
            </div>
            <svg viewBox="0 0 540 150" className="w-full" role="img" aria-label={`Flowlet timeline: ${current.label}`} data-testid={`flowlet-timeline-${mode}`}>
              <line x1="35" y1="72" x2="510" y2="72" stroke="#334155" strokeWidth="2" />
              <line x1="35" y1="35" x2="510" y2="35" stroke="#1e293b" strokeDasharray="4 4" />
              <line x1="35" y1="112" x2="510" y2="112" stroke="#1e293b" strokeDasharray="4 4" />
              <text x="8" y="39" fill="#64748b" fontSize="9">S1</text>
              <text x="8" y="116" fill="#64748b" fontSize="9">S3</text>
              {current.packets.map((packet) => {
                const x = 45 + packet.time * 5.7
                const y = packet.path === 1 ? 35 : 112
                const color = packet.state === "reordered" ? "#ef4444" : packet.state === "moved" ? "#38bdf8" : "#22c55e"
                return (
                  <g key={packet.id} data-testid={`flowlet-packet-${packet.id}`} data-path={`spine-${packet.path}`} data-state={packet.state}>
                    <line x1={x} y1={72} x2={x} y2={y} stroke={color} strokeWidth="1.4" opacity="0.7" />
                    <rect x={x - 16} y={y - 12} width="32" height="24" rx="6" fill="#0f172a" stroke={color} strokeWidth="1.5" />
                    <text x={x} y={y + 4} textAnchor="middle" fill={color} fontSize="9" fontWeight="700">{packet.id}</text>
                  </g>
                )
              })}
              <path d="M220 74 C270 88 320 88 370 74" fill="none" stroke="#f59e0b" strokeDasharray="5 4" />
              <text x="295" y="94" textAnchor="middle" fill="#fbbf24" fontSize="8">inter-packet gap → possible flowlet boundary</text>
            </svg>
            <p className="mt-2 text-xs leading-6 text-slate-400">Packets 1–3 form one flowlet. Packets 4–5 can form another flowlet of the same five-tuple flow when the gap is sufficient. A flowlet is not a different network flow.</p>
          </div>

          <div className="mt-4 rounded-xl border border-white/8 bg-slate-900/70 p-3">
            <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-500">Illustrative carried utilization</p>
            <div className="space-y-2">
              {current.spineUtil.map((util, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-14 text-[10px] text-slate-500">Spine {index + 1}</span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full" data-testid={`flowlet-util-spine-${index + 1}`} data-width-pct={util} style={{ width: `${util}%`, backgroundColor: util >= 90 ? "#ef4444" : util >= 60 ? "#f59e0b" : "#334155" }} />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white drop-shadow">{util}%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-5 text-slate-500">Bar widths are proportional to the stated percentages. These values are illustrative, not measurements.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-slate-950/70 p-4">
            <h3 className="text-sm font-semibold text-sky-200">{current.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{current.detail}</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-blue-200">Flowlet routing is not packet spraying</p>
            <p className="mt-2 text-sm leading-7 text-slate-300">Flowlet routing changes path only at selected burst boundaries within a flow. Packet spraying distributes individual packets or controlled packet groups much more aggressively and therefore creates a stronger reordering requirement. Both are different from conventional static per-flow ECMP.</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm leading-7 text-amber-100">A safe flowlet gap depends on differential path delay, implementation timers, queueing, and transport reordering tolerance. There is no universal microsecond value.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LowEntropyFlowletsViz
