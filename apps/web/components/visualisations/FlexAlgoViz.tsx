"use client"
import { useState } from "react"

// ── FlexAlgoViz ─────────────────────────
// IS-IS Flex Algo: multiple logical routing planes from one IS-IS domain

type Algo = 0 | 128 | 129

const algos: { id: Algo; name: string; constraint: string; metric: string; color: string; border: string; traffic: string }[] = [
  { id: 0, name: "Algo 0 (default)", constraint: "None — all nodes participate", metric: "IGP metric", color: "#1e293b", border: "#475569", traffic: "Management, control plane, fallback" },
  { id: 128, name: "Algo 128 (low-latency)", constraint: "Max link delay < 5μs", metric: "Min unidirectional delay", color: "#0c3260", border: "#378ADD", traffic: "GPU AllReduce, RoCEv2 training traffic" },
  { id: 129, name: "Algo 129 (high-bandwidth)", constraint: "Min available bandwidth > 300G", metric: "TE bandwidth metric", color: "#14532d", border: "#1D9E75", traffic: "Storage: NVMe-oF, checkpoint writes" },
]

const spines = [
  { name: "SpineA", delay: 2, bw: 380, x: 150, y: 100 },
  { name: "SpineB", delay: 4, bw: 340, x: 290, y: 100 },
  { name: "SpineC", delay: 8, bw: 250, x: 430, y: 100 },
]

export function FlexAlgoViz() {
  const [algo, setAlgo] = useState<Algo>(0)

  const cfg = algos.find((a) => a.id === algo)!

  function spineInAlgo(s: typeof spines[0]): boolean {
    if (algo === 0) return true
    if (algo === 128) return s.delay < 5
    if (algo === 129) return s.bw > 300
    return true
  }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">IS-IS Flex Algo — logical routing planes</div>
      <div className="mb-5 text-xs text-slate-600">Select an algorithm to see which spines participate based on their constraint values.</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {algos.map((a) => (
          <button
            key={a.id}
            onClick={() => setAlgo(a.id)}
            style={{
              flex: 1,
              padding: "8px 6px",
              background: algo === a.id ? a.border : "transparent",
              border: `1px solid ${algo === a.id ? a.border : "#334155"}`,
              borderRadius: 8,
              color: algo === a.id ? "#fff" : "#64748b",
              fontSize: 11,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Algo {a.id}
          </button>
        ))}
      </div>

      <svg width="100%" viewBox="0 0 580 260" style={{ display: "block", marginBottom: 16 }}>
        {/* Leaf nodes */}
        <rect x="20" y="180" width="70" height="44" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
        <text x="55" y="198" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="500">Leaf 1</text>
        <text x="55" y="212" textAnchor="middle" fill="#64748b" fontSize="9">GPU servers</text>
        <text x="55" y="223" textAnchor="middle" fill="#64748b" fontSize="9">ASN 65001</text>

        <rect x="490" y="180" width="70" height="44" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
        <text x="525" y="198" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="500">Leaf 4</text>
        <text x="525" y="212" textAnchor="middle" fill="#64748b" fontSize="9">GPU servers</text>
        <text x="525" y="223" textAnchor="middle" fill="#64748b" fontSize="9">ASN 65004</text>

        {spines.map((s) => {
          const active = spineInAlgo(s)
          return (
            <g key={s.name}>
              {/* Leaf1 → Spine */}
              <line x1="90" y1="202" x2={s.x - 35} y2={s.y + 36} stroke={cfg.border} strokeWidth={active ? 1.5 : 0.5} opacity={active ? 0.8 : 0.1} style={{ transition: "all 0.3s" }}/>
              {/* Spine → Leaf4 */}
              <line x1={s.x + 35} y1={s.y + 36} x2="490" y2="202" stroke={cfg.border} strokeWidth={active ? 1.5 : 0.5} opacity={active ? 0.8 : 0.1} style={{ transition: "all 0.3s" }}/>

              <rect x={s.x - 45} y={s.y} width="90" height="72" rx="6" fill={active ? cfg.color : "#111827"} stroke={active ? cfg.border : "#1e293b"} strokeWidth="0.5" style={{ transition: "all 0.3s" }}/>
              <text x={s.x} y={s.y + 18} textAnchor="middle" fill={active ? "#e2e8f0" : "#374151"} fontSize="11" fontWeight="500">{s.name}</text>
              <text x={s.x} y={s.y + 33} textAnchor="middle" fill={active ? "#94a3b8" : "#374151"} fontSize="9">Delay: {s.delay}μs</text>
              <text x={s.x} y={s.y + 46} textAnchor="middle" fill={active ? "#94a3b8" : "#374151"} fontSize="9">BW: {s.bw}G avail</text>
              {active ? (
                <text x={s.x} y={s.y + 62} textAnchor="middle" fill={cfg.border} fontSize="9" fontWeight="500">PARTICIPATING</text>
              ) : (
                <text x={s.x} y={s.y + 62} textAnchor="middle" fill="#374151" fontSize="9">EXCLUDED</text>
              )}
            </g>
          )
        })}

        {/* Constraint annotation */}
        <text x="290" y="240" textAnchor="middle" fill={cfg.border} fontSize="10">
          {algo === 0 ? "All spines participate (no constraint)" : algo === 128 ? "Only spines with delay < 5μs qualify (SpineA, SpineB)" : "Only spines with BW > 300G qualify (SpineA, SpineB)"}
        </text>
      </svg>

      <div style={{ background: "#1e293b", borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${cfg.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0", marginBottom: 8 }}>{cfg.name}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748b" }}>Metric type</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{cfg.metric}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#64748b" }}>Constraint</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{cfg.constraint}</div>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <div style={{ fontSize: 10, color: "#64748b" }}>Assigned traffic</div>
            <div style={{ fontSize: 11, color: cfg.border }}>{cfg.traffic}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
          Flex Algo definition (FAD) is advertised in IS-IS TLVs. All nodes must agree on the FAD for each algorithm number. Traffic is mapped to an algorithm via DSCP or route policy matching on the ingress leaf.
        </div>
      </div>
    </div>
  )
}

export default FlexAlgoViz
