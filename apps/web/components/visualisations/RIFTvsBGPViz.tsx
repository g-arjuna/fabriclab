"use client"
import { useState } from "react"

// ── RIFTvsBGPViz ─────────────────────────
// Shows the core difference: BGP has no topology view, RIFT has full northbound link-state

type View = "bgp" | "rift"

export function RIFTvsBGPViz() {
  const [view, setView] = useState<View>("bgp")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">BGP vs RIFT — topology awareness</div>
      <div className="mb-5 text-xs text-slate-600">Switch views to see what each protocol knows about the fabric at the leaf node.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => setView("bgp")}
          style={{ flex: 1, padding: "8px 0", background: view === "bgp" ? "#185FA5" : "transparent", border: `1px solid ${view === "bgp" ? "#185FA5" : "#334155"}`, borderRadius: 8, color: view === "bgp" ? "#fff" : "#94a3b8", fontSize: 12, cursor: "pointer" }}
        >
          eBGP view from Leaf1
        </button>
        <button
          onClick={() => setView("rift")}
          style={{ flex: 1, padding: "8px 0", background: view === "rift" ? "#712B13" : "transparent", border: `1px solid ${view === "rift" ? "#D85A30" : "#334155"}`, borderRadius: 8, color: view === "rift" ? "#fff" : "#94a3b8", fontSize: 12, cursor: "pointer" }}
        >
          RIFT view from Leaf1
        </button>
      </div>

      <div className="overflow-x-auto pb-2">
      <svg width="100%" viewBox="0 0 580 300" style={{ display: "block", marginBottom: 12, minWidth: 580 }}>
        {/* Leaf1 — always visible, always knows local */}
        <rect x="20" y="200" width="80" height="48" rx="6" fill={view === "bgp" ? "#0c3260" : "#4a1b0c"} stroke={view === "bgp" ? "#378ADD" : "#D85A30"} strokeWidth="1"/>
        <text x="60" y="220" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">Leaf 1</text>
        <text x="60" y="234" textAnchor="middle" fill="#94a3b8" fontSize="9">You are here</text>
        <text x="60" y="245" textAnchor="middle" fill="#64748b" fontSize="9">ASN 65001</text>

        {/* Spines — BGP: just next-hops. RIFT: full topology */}
        {["SpineA", "SpineB", "SpineC"].map((s, i) => {
          const sx = 100 + i * 150
          const known = view === "rift" || true // BGP knows spines as next-hops
          const detail = view === "rift"
          return (
            <g key={s}>
              <line x1="100" y1="224" x2={sx} y2="148" stroke={view === "bgp" ? "#378ADD" : "#D85A30"} strokeWidth="1" opacity="0.7"/>
              <rect x={sx - 35} y="120" width="70" height="44" rx="6" fill={detail ? "#2a0f08" : "#0c1f3c"} stroke={detail ? "#D85A30" : "#185FA5"} strokeWidth="0.5"/>
              <text x={sx} y="138" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="500">{s}</text>
              <text x={sx} y="151" textAnchor="middle" fill={detail ? "#fb923c" : "#93c5fd"} fontSize="9">
                {detail ? "utilisation known" : "next-hop only"}
              </text>
              <text x={sx} y="162" textAnchor="middle" fill="#475569" fontSize="9">ASN 65000</text>
            </g>
          )
        })}

        {/* Far leaves — BGP: invisible. RIFT: visible via link-state */}
        {["Leaf2", "Leaf3", "Leaf4"].map((l, i) => {
          const lx = 80 + i * 180
          const visible = view === "rift"
          return (
            <g key={l} opacity={visible ? 1 : 0.15} style={{ transition: "opacity 0.4s" }}>
              {visible && (
                <>
                  <line x1={115 + i * 150} y1="120" x2={lx + 40} y2="60" stroke="#D85A30" strokeWidth="0.5" opacity="0.5"/>
                  <line x1={265 + (i < 2 ? 0 : -150)} y1="120" x2={lx + 40} y2="60" stroke="#D85A30" strokeWidth="0.5" opacity="0.3"/>
                </>
              )}
              <rect x={lx} y="30" width="80" height="42" rx="6" fill={visible ? "#2a0f08" : "#1e293b"} stroke={visible ? "#D85A30" : "#1e293b"} strokeWidth="0.5"/>
              <text x={lx + 40} y="48" textAnchor="middle" fill={visible ? "#e2e8f0" : "#334155"} fontSize="10" fontWeight="500">{l}</text>
              <text x={lx + 40} y="62" textAnchor="middle" fill={visible ? "#fb923c" : "#334155"} fontSize="9">
                {visible ? "topology known" : "invisible"}
              </text>
            </g>
          )
        })}

        {/* Annotation */}
        {view === "bgp" && (
          <text x="370" y="240" textAnchor="middle" fill="#475569" fontSize="10">Leaf1 only knows next-hops.</text>
        )}
        {view === "bgp" && (
          <text x="370" y="255" textAnchor="middle" fill="#475569" fontSize="10">Topology beyond spines is invisible.</text>
        )}
        {view === "rift" && (
          <text x="370" y="240" textAnchor="middle" fill="#D85A30" fontSize="10">Leaf1 has full northbound link-state.</text>
        )}
        {view === "rift" && (
          <text x="370" y="255" textAnchor="middle" fill="#fb923c" fontSize="10">Spine utilisation, far-leaf adjacencies — all known.</text>
        )}
      </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        {[
          { label: "Propagation model", bgp: "Path-vector (reachability only)", rift: "Northbound link-state, southbound distance-vector" },
          { label: "Convergence on failure", bgp: "Multiple BGP round-trips (~100ms+)", rift: "Link-state propagation (<10ms typical)" },
          { label: "Topology visibility", bgp: "No — only next-hops visible", rift: "Yes — full adjacency graph northbound" },
          { label: "Auto disaggregation", bgp: "No — requires operator config", rift: "Yes — automatic on failure" },
          { label: "Zero-touch provisioning", bgp: "Partial (unnumbered helps)", rift: "Yes — no ASN assignment needed" },
          { label: "Multi-plane routing", bgp: "Via DPF extensions", rift: "Via Flex Algo in K-store" },
        ].map((row) => (
          <div key={row.label} style={{ background: "#1e293b", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{row.label}</div>
            <div style={{ fontSize: 11, color: view === "bgp" ? "#93c5fd" : "#fb923c" }}>
              {view === "bgp" ? row.bgp : row.rift}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RIFTvsBGPViz
