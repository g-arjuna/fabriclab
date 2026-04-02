"use client"
import { useState } from "react"

// ── TopologyDecisionViz ─────────────────────────
// Interactive decision matrix: select workload characteristics
// and see which topology wins and why.

const WORKLOADS = [
  {
    id: "ai-train",
    label: "AI training (transformers)",
    pattern: "All-to-all AllReduce",
    scale: "32–2048 nodes",
    winner: "Fat-tree",
    winnerColor: "#185FA5",
    winnerFill: "#B5D4F4",
    reasons: [
      "Full bisection BW for any traffic matrix",
      "Worst-case 4–6 hops at 256–2048 GPUs",
      "ECMP + adaptive routing for fault tolerance",
      "Switch cost trivial vs GPU cost at this scale",
    ],
    loser: "Torus",
    loserReason: "High hop count for distant nodes + low bisection BW for all-to-all",
  },
  {
    id: "cfd",
    label: "CFD / climate simulation",
    pattern: "Nearest-neighbour stencil",
    scale: "10,000–100,000 nodes",
    winner: "Torus",
    winnerColor: "#0F6E56",
    winnerFill: "#9FE1CB",
    reasons: [
      "Nearest-neighbour comm = 1 torus hop",
      "No switch silicon — massive cost saving at scale",
      "Topology matches application communication exactly",
      "Folding eliminates long wrap-around cables",
    ],
    loser: "Fat-tree",
    loserReason: "Bisection BW advantage wasted on local traffic; switch cost prohibitive at 100k+ nodes",
  },
  {
    id: "petascale-hpc",
    label: "Petascale HPC (mixed workloads)",
    pattern: "Mixed local + global",
    scale: "10,000–100,000 nodes",
    winner: "Dragonfly",
    winnerColor: "#534AB7",
    winnerFill: "#CECBF6",
    reasons: [
      "Local group = all-to-all (efficient for local comms)",
      "Sparse global links reduce cable count vs fat-tree",
      "Adaptive routing handles random permutation traffic",
      "Used at Frontier (1.1 ExaFLOPS) and Perlmutter",
    ],
    loser: "Torus",
    loserReason: "Global links bottleneck under random traffic; handles mixed workloads better than pure torus",
  },
  {
    id: "inference",
    label: "Inference (small batch)",
    pattern: "Low bandwidth, latency-sensitive",
    scale: "8–64 GPUs",
    winner: "Fat-tree",
    winnerColor: "#185FA5",
    winnerFill: "#B5D4F4",
    reasons: [
      "Same fabric as training — no separate deployment",
      "Low hop count keeps latency predictable",
      "ECMP balances uneven request traffic",
      "NVLink Switch for ≤256 GPUs (Chapter 12)",
    ],
    loser: "Torus",
    loserReason: "Inference batch sizes too small to benefit from torus locality at this scale",
  },
]

export function TopologyDecisionViz() {
  const [sel, setSel] = useState(0)
  const w = WORKLOADS[sel]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Topology decision framework</div>
      <div className="mb-4 text-xs text-slate-600">Select a workload type to see which topology wins and why</div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {WORKLOADS.map((wl, i) => (
          <button
            key={wl.id}
            onClick={() => setSel(i)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: `1px solid ${sel === i ? "#3B8BD4" : "#444441"}`,
              background: sel === i ? "#0C447C" : "transparent",
              color: sel === i ? "#B5D4F4" : "#888780",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {wl.label}
          </button>
        ))}
      </div>

      {/* Workload profile */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
          <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px" }}>Communication pattern</div>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#B4B2A9" }}>{w.pattern}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
          <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px" }}>Typical scale</div>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#B4B2A9" }}>{w.scale}</div>
        </div>
      </div>

      {/* Winner */}
      <div style={{ background: "#1e293b", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px", borderLeft: `3px solid ${w.winnerColor}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: w.winnerFill, border: `1px solid ${w.winnerColor}` }} />
          <span style={{ fontSize: "15px", fontWeight: 500, color: w.winnerFill }}>Recommended: {w.winner}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {w.reasons.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <span style={{ color: w.winnerColor, marginTop: "1px", flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: "13px", color: "#B4B2A9" }}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Why the loser loses */}
      <div style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 14px", borderLeft: "2px solid #444441" }}>
        <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "4px" }}>Why {w.loser} loses here</div>
        <div style={{ fontSize: "13px", color: "#888780" }}>{w.loserReason}</div>
      </div>

      {/* Quick comparison strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px", marginTop: "12px" }}>
        {[
          { label: "Fat-tree wins when", value: "All-to-all dominates", color: "#B5D4F4" },
          { label: "Torus wins when", value: "Nearest-neighbour dominates", color: "#9FE1CB" },
          { label: "Dragonfly wins when", value: "Scale + mixed traffic", color: "#CECBF6" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#1e293b", borderRadius: "8px", padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px" }}>{label}</div>
            <div style={{ fontSize: "12px", fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopologyDecisionViz
