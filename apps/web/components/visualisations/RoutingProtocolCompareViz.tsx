"use client"
import { useState } from "react"

// ── RoutingProtocolCompareViz ─────────────────────────
// Shows how BGP, IS-IS, and RIFT differ across key AI fabric dimensions

const protocols = [
  {
    id: "bgp",
    name: "eBGP",
    ref: "RFC 7938",
    color: "#185FA5",
    bg: "#E6F1FB",
    border: "#378ADD",
    dims: {
      scale: 5,
      convergence: 2,
      topoAwareness: 2,
      linkQuality: 1,
      multiplane: 3,
      zeroTouch: 2,
      maturity: 5,
    },
    notes: [
      "Dominates data centre deployments",
      "Path-vector: no full topology view",
      "Requires extensions (DPF, NNHN) for AI",
      "Richest policy model",
      "Slow convergence under churn",
    ],
  },
  {
    id: "isis",
    name: "IS-IS",
    ref: "RFC 9502 Flex Algo",
    color: "#0F6E56",
    bg: "#E1F5EE",
    border: "#1D9E75",
    dims: {
      scale: 4,
      convergence: 4,
      topoAwareness: 4,
      linkQuality: 4,
      multiplane: 5,
      zeroTouch: 2,
      maturity: 4,
    },
    notes: [
      "Flex Algo: multiple routing planes natively",
      "Link-state: full topology on every node",
      "Scales to ~2,500 switch nodes",
      "Flood reduction via distributed flooding",
      "Less common than BGP in DC",
    ],
  },
  {
    id: "rift",
    name: "RIFT",
    ref: "RFC 9692",
    color: "#712B13",
    bg: "#FAECE7",
    border: "#D85A30",
    dims: {
      scale: 4,
      convergence: 5,
      topoAwareness: 5,
      linkQuality: 5,
      multiplane: 4,
      zeroTouch: 5,
      maturity: 2,
    },
    notes: [
      "Designed for fat-tree from first principles",
      "Northbound link-state / southbound distance-vector",
      "Zero-touch: no ASN assignment needed",
      "Auto disaggregation on failure",
      "Newest — multi-vendor maturity limited",
    ],
  },
]

const dimensions = [
  { key: "scale", label: "Scale (nodes)" },
  { key: "convergence", label: "Convergence speed" },
  { key: "topoAwareness", label: "Topology awareness" },
  { key: "linkQuality", label: "Link quality signalling" },
  { key: "multiplane", label: "Multi-plane routing" },
  { key: "zeroTouch", label: "Zero-touch provisioning" },
  { key: "maturity", label: "Deployment maturity" },
]

export function RoutingProtocolCompareViz() {
  const [active, setActive] = useState<string | null>(null)
  const sel = active ? protocols.find((p) => p.id === active) : null

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Routing protocol comparison</div>
      <div className="mb-5 text-xs text-slate-600">Click a protocol to see detail. Bar = score 1–5 for each AI fabric dimension.</div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {protocols.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(active === p.id ? null : p.id)}
            style={{
              background: active === p.id ? p.color : "#1e293b",
              border: `1px solid ${active === p.id ? p.color : "#334155"}`,
              borderRadius: 10,
              padding: "12px 10px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 500, color: active === p.id ? "#fff" : "#e2e8f0" }}>{p.name}</div>
            <div style={{ fontSize: 11, color: active === p.id ? "rgba(255,255,255,0.7)" : "#64748b", marginTop: 2 }}>{p.ref}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {dimensions.map((dim) => (
          <div key={dim.key}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{dim.label}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {protocols.map((p) => {
                const score = p.dims[dim.key as keyof typeof p.dims]
                const isActive = active === p.id
                return (
                  <div key={p.id} style={{ flex: 1, position: "relative" }}>
                    <div style={{ height: 20, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${(score / 5) * 100}%`,
                          background: isActive ? p.color : p.border,
                          opacity: active && !isActive ? 0.25 : 0.85,
                          borderRadius: 4,
                          transition: "all 0.2s",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2, textAlign: "center" }}>{score}/5</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {sel && (
        <div
          style={{
            marginTop: 20,
            background: "#1e293b",
            borderRadius: 10,
            padding: "14px 16px",
            borderLeft: `3px solid ${sel.color}`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", marginBottom: 8 }}>{sel.name} — key characteristics</div>
          {sel.notes.map((n, i) => (
            <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "flex", gap: 8 }}>
              <span style={{ color: sel.color, flexShrink: 0 }}>—</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RoutingProtocolCompareViz
