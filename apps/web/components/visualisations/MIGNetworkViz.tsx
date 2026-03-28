"use client"
import { useState } from "react"

// ── MIGNetworkViz ─────────────────────────
// Shows MIG partitioning of an H100 GPU into
// up to 7 instances with SR-IOV VF assignment
// for network isolation. Toggle instance count.

const PROFILES = [
  { count: 1, name: "1× 1g.80gb", smPct: 100, hbmPct: 100, vfs: 1, desc: "Full GPU — training workloads" },
  { count: 2, name: "2× 3g.40gb", smPct: 50,  hbmPct: 50,  vfs: 2, desc: "Two large inference instances" },
  { count: 4, name: "4× 2g.20gb", smPct: 25,  hbmPct: 25,  vfs: 4, desc: "Four medium inference instances" },
  { count: 7, name: "7× 1g.10gb", smPct: 14,  hbmPct: 12,  vfs: 7, desc: "Maximum density — small models" },
]

const COLORS = ["#1D9E75", "#185FA5", "#534AB7", "#854F0B", "#993C1D", "#0F6E56", "#3C3489"]
const FILLS  = ["#9FE1CB", "#B5D4F4", "#CECBF6", "#FAC775", "#F5C4B3", "#9FE1CB", "#CECBF6"]

export function MIGNetworkViz() {
  const [profIdx, setProfIdx] = useState(3)
  const prof = PROFILES[profIdx]

  const gpuW = 520
  const gpuH = 80
  const gpuX = 80
  const gpuY = 60
  const nicX = 80
  const nicY = 190

  const sliceW = Math.floor(gpuW / prof.count)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">MIG partitioning + SR-IOV network isolation</div>
      <div className="mb-4 text-xs text-slate-600">Select an MIG profile to see how the GPU is partitioned and how SR-IOV VFs map to each instance</div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {PROFILES.map((p, i) => (
          <button
            key={i}
            onClick={() => setProfIdx(i)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: `1px solid ${profIdx === i ? "#1D9E75" : "#444441"}`,
              background: profIdx === i ? "#085041" : "transparent",
              color: profIdx === i ? "#9FE1CB" : "#888780",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <svg width="100%" viewBox="0 0 680 320" style={{ display: "block", marginBottom: "16px" }}>
        <defs>
          <marker id="mig-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        <text className="ts" x={gpuX + gpuW / 2} y={gpuY - 12} textAnchor="middle" fill="#888780">H100 GPU ({prof.count === 1 ? "full GPU mode" : `MIG: ${prof.count} instances`})</text>

        <rect x={gpuX} y={gpuY} width={gpuW} height={gpuH} rx="10" fill="#1e293b" stroke="#444441" strokeWidth="0.8" />

        {Array.from({ length: prof.count }, (_, i) => {
          const x = gpuX + i * sliceW
          return (
            <g key={i}>
              <rect
                x={x + 2} y={gpuY + 4}
                width={sliceW - 4} height={gpuH - 8}
                rx="6"
                fill={FILLS[i % FILLS.length]}
                fillOpacity={0.25}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="0.8"
              />
              <text
                className="ts"
                x={x + sliceW / 2}
                y={gpuY + gpuH / 2 - 6}
                textAnchor="middle"
                dominantBaseline="central"
                fill={COLORS[i % COLORS.length]}
              >
                {prof.count > 1 ? `MIG ${i + 1}` : "Full GPU"}
              </text>
              <text
                className="ts"
                x={x + sliceW / 2}
                y={gpuY + gpuH / 2 + 10}
                textAnchor="middle"
                fill={COLORS[i % COLORS.length]}
                fontSize="10"
              >
                {Math.round(80 / prof.count)}GB HBM
              </text>
            </g>
          )
        })}

        <text className="ts" x={gpuX + gpuW / 2} y={nicY - 12} textAnchor="middle" fill="#888780">ConnectX-7 NIC (1 physical, {prof.vfs} SR-IOV VF{prof.vfs > 1 ? "s" : ""})</text>

        <rect x={nicX} y={nicY} width={gpuW} height={50} rx="8" fill="#1e293b" stroke="#444441" strokeWidth="0.8" />

        {Array.from({ length: prof.count }, (_, i) => {
          const vfW = Math.floor(gpuW / prof.count)
          const x = nicX + i * vfW
          return (
            <g key={i}>
              <rect
                x={x + 2} y={nicY + 4}
                width={vfW - 4} height={42}
                rx="5"
                fill={FILLS[i % FILLS.length]}
                fillOpacity={0.2}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="0.8"
              />
              <text
                className="ts"
                x={x + vfW / 2}
                y={nicY + 25}
                textAnchor="middle"
                dominantBaseline="central"
                fill={COLORS[i % COLORS.length]}
                fontSize="10"
              >
                {prof.vfs === 1 ? "PF" : `VF ${i + 1}`}
              </text>
            </g>
          )
        })}

        {Array.from({ length: prof.count }, (_, i) => {
          const sliceX = gpuX + i * sliceW + sliceW / 2
          const vfW = Math.floor(gpuW / prof.count)
          const vfX = nicX + i * vfW + vfW / 2
          return (
            <line
              key={i}
              x1={sliceX} y1={gpuY + gpuH + 2}
              x2={vfX} y2={nicY - 2}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.7"
              markerEnd="url(#mig-arr)"
            />
          )
        })}

        <text className="ts" x={gpuX + gpuW / 2} y={nicY + 76} textAnchor="middle" fill="#888780">
          Each VF: separate MAC, RoCEv2 QP space, bandwidth limit
        </text>
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
        {[
          { label: "MIG instances", value: String(prof.count) },
          { label: "SM per instance", value: `${prof.smPct}%` },
          { label: "HBM per instance", value: `~${Math.round(80 / prof.count)}GB` },
          { label: "SR-IOV VFs", value: String(prof.vfs) },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px" }}>{label}</div>
            <div style={{ fontSize: "18px", fontWeight: 500, color: "#9FE1CB" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 14px", background: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#5F5E5A", borderLeft: "2px solid #1D9E75" }}>
        {prof.desc}. DCGM reports per-instance metrics. Alert thresholds calibrated for full-GPU must be rescaled by 1/{prof.count} for MIG workloads.
      </div>
    </div>
  )
}

export default MIGNetworkViz
