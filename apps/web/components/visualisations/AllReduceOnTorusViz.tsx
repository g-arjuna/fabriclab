"use client"
import { useState } from "react"

// ── AllReduceOnTorusViz ─────────────────────────
// Compares torus vs fat-tree for AllReduce:
// max hop count, bisection bandwidth, and routing options
// Interactive: adjust GPU count to see how gap widens

const CONFIGS = [
  { label: "64 GPUs", gpus: 64, k: 8, dims: 2 },
  { label: "256 GPUs", gpus: 256, k: 16, dims: 2 },
  { label: "512 GPUs", gpus: 512, k: 8, dims: 3 },
  { label: "2048 GPUs", gpus: 2048, k: 16, dims: 3 },
]

// Fat-tree: 2-stage for ≤256, 3-stage otherwise
// Max hops = 2*(stages) in a fat-tree (leaf→..→spine→..→leaf)
function fatTreeHops(gpus: number) {
  if (gpus <= 256) return 4
  return 6
}

// Torus: N-dim, K per dim → max hop = dims × (K/2)
function torusHops(k: number, dims: number) {
  return dims * Math.floor(k / 2)
}

// Simplified relative bisection: fat-tree = 1.0 baseline
// Torus bisection = 2×K^(dims-1)×BW / (total BW)
// We show relative ratio
function bisectionRatio(gpus: number, k: number, dims: number) {
  // fat-tree full bisection = 1.0
  // torus bisection links = 2 * K^(dims-1), total nodes = K^dims
  // ratio = (2 * K^(dims-1)) / K^dims = 2 / K
  const torusRatio = 2 / k
  return torusRatio // relative to fat-tree = 1.0
}

function HopBar({ label, hops, maxHops, color, bg }: { label: string; hops: number; maxHops: number; color: string; bg: string }) {
  const pct = Math.round((hops / maxHops) * 100)
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#B4B2A9" }}>{label}</span>
        <span style={{ fontSize: "13px", fontWeight: 500, color }}>{hops} hops max</span>
      </div>
      <div style={{ height: "12px", background: "#1e293b", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: bg, borderRadius: "6px", transition: "width 0.3s" }} />
      </div>
    </div>
  )
}

function BisectionBar({ label, ratio, color, bg }: { label: string; ratio: number; color: string; bg: string }) {
  const pct = Math.round(ratio * 100)
  const displayPct = Math.max(pct, 2)
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#B4B2A9" }}>{label}</span>
        <span style={{ fontSize: "13px", fontWeight: 500, color }}>{pct}% of fat-tree</span>
      </div>
      <div style={{ height: "12px", background: "#1e293b", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${displayPct}%`, background: bg, borderRadius: "6px", transition: "width 0.3s" }} />
      </div>
    </div>
  )
}

export function AllReduceOnTorusViz() {
  const [sel, setSel] = useState(1)
  const cfg = CONFIGS[sel]
  const ftHops = fatTreeHops(cfg.gpus)
  const trHops = torusHops(cfg.k, cfg.dims)
  const maxHops = Math.max(ftHops, trHops, 4)
  const trBisect = bisectionRatio(cfg.gpus, cfg.k, cfg.dims)
  const hopPenalty = Math.round(((trHops - ftHops) / ftHops) * 100)
  const bisectPenalty = Math.round((1 - trBisect) * 100)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">AllReduce: torus vs fat-tree</div>
      <div className="mb-4 text-xs text-slate-600">How the gap in hop count and bisection bandwidth changes with cluster size</div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {CONFIGS.map((c, i) => (
          <button
            key={i}
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
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={{ background: "#1e293b", borderRadius: "10px", padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Max hop count (AllReduce worst case)</div>
          <HopBar label="Fat-tree" hops={ftHops} maxHops={maxHops} color="#9FE1CB" bg="#0F6E56" />
          <HopBar label={`${cfg.dims}D torus (K=${cfg.k})`} hops={trHops} maxHops={maxHops} color="#F0997B" bg="#993C1D" />
          <div style={{ marginTop: "10px", padding: "8px 10px", background: "#0f172a", borderRadius: "6px", fontSize: "12px", color: trHops > ftHops ? "#F0997B" : "#9FE1CB" }}>
            {trHops > ftHops
              ? `Torus: ${hopPenalty}% more hops → ${hopPenalty}% more AllReduce latency`
              : "Equal hop count at this scale"}
          </div>
        </div>

        <div style={{ background: "#1e293b", borderRadius: "10px", padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Bisection bandwidth (relative)</div>
          <BisectionBar label="Fat-tree (1:1 OS)" ratio={1.0} color="#9FE1CB" bg="#0F6E56" />
          <BisectionBar label={`${cfg.dims}D torus (K=${cfg.k})`} ratio={trBisect} color="#F0997B" bg="#993C1D" />
          <div style={{ marginTop: "10px", padding: "8px 10px", background: "#0f172a", borderRadius: "6px", fontSize: "12px", color: "#F0997B" }}>
            Torus bisection = 2/K of fat-tree — {bisectPenalty}% less bandwidth at the cut
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {[
          { label: "Torus fault tolerance", value: "Limited", note: "Few alternate paths", color: "#F0997B" },
          { label: "Fat-tree fault tolerance", value: "High", note: "ECMP + adaptive routing", color: "#9FE1CB" },
          { label: "Torus switch cost", value: "$0", note: "No switch ASICs", color: "#9FE1CB" },
        ].map(({ label, value, note, color }) => (
          <div key={label} style={{ background: "#1e293b", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "11px", color: "#5F5E5A", marginBottom: "3px" }}>{label}</div>
            <div style={{ fontSize: "17px", fontWeight: 500, color }}>{value}</div>
            <div style={{ fontSize: "11px", color: "#5F5E5A", marginTop: "2px" }}>{note}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 14px", background: "#1e293b", borderRadius: "8px", borderLeft: "2px solid #D85A30", fontSize: "12px", color: "#5F5E5A" }}>
        AllReduce is all-to-all. Torus optimises for nearest-neighbour. The mismatch compounds as cluster size grows.
      </div>
    </div>
  )
}

export default AllReduceOnTorusViz
