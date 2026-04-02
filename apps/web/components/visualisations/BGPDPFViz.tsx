"use client"
import { useState } from "react"

// ── BGPDPFViz ─────────────────────────
// Illustrates BGP DPF (draft-wang-idr-dpf): logical fabric coloring
// Physical 3-stage Clos split into Black + Gray logical fabrics

type Tenant = "none" | "critical" | "bulk"

const tenantConfig = {
  none: { label: "No tenant selected", color: "#334155", fabric: "none" as const },
  critical: { label: "Critical LLM (Tenant A)", color: "#185FA5", fabric: "black" as const },
  bulk: { label: "Bulk training (Tenant B)", color: "#0F6E56", fabric: "gray" as const },
}

export function BGPDPFViz() {
  const [tenant, setTenant] = useState<Tenant>("none")
  const [showMapping, setShowMapping] = useState(false)

  const cfg = tenantConfig[tenant]

  type FabricColor = "none" | "black" | "gray"
  const isActive = (fabric: FabricColor) => tenant === "none" || cfg.fabric === fabric || cfg.fabric === "none"

  const spineColor = (fabric: FabricColor) => {
    if (tenant === "none") return "#334155"
    if (cfg.fabric === fabric) return fabric === "black" ? "#185FA5" : "#0F6E56"
    return "#1a1a2e"
  }

  const linkOpacity = (fabric: FabricColor) => {
    if (tenant === "none") return 0.6
    return cfg.fabric === fabric ? 1 : 0.1
  }

  const linkColor = (fabric: FabricColor) =>
    fabric === "black" ? "#378ADD" : "#1D9E75"

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">BGP DPF — logical fabric coloring</div>
      <div className="mb-5 text-xs text-slate-600">Select a tenant to trace its dedicated path through the colored logical fabric.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["none", "critical", "bulk"] as Tenant[]).map((t) => (
          <button
            key={t}
            onClick={() => setTenant(t)}
            style={{
              flex: 1,
              padding: "8px 6px",
              background: tenant === t ? tenantConfig[t].color : "transparent",
              border: `1px solid ${tenant === t ? tenantConfig[t].color : "#334155"}`,
              borderRadius: 8,
              color: tenant === t ? "#fff" : "#64748b",
              fontSize: 11,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t === "none" ? "All paths" : t === "critical" ? "Tenant A (critical)" : "Tenant B (bulk)"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto pb-2">
      <svg width="100%" viewBox="0 0 580 280" style={{ display: "block", marginBottom: 16, minWidth: 580 }}>
        {/* Leaf1 */}
        <rect x="20" y="110" width="80" height="60" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
        <text x="60" y="136" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">Leaf 1</text>
        <text x="60" y="151" textAnchor="middle" fill="#64748b" fontSize="9">ASN 65001</text>
        <text x="60" y="163" textAnchor="middle" fill="#60a5fa" fontSize="9">GPU servers</text>

        {/* Leaf4 */}
        <rect x="480" y="110" width="80" height="60" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
        <text x="520" y="136" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">Leaf 4</text>
        <text x="520" y="151" textAnchor="middle" fill="#64748b" fontSize="9">ASN 65004</text>
        <text x="520" y="163" textAnchor="middle" fill="#60a5fa" fontSize="9">GPU servers</text>

        {/* SpineA (black fabric) */}
        <rect x="185" y="50" width="90" height="50" rx="6" fill={spineColor("black")} stroke={tenant !== "none" && cfg.fabric === "black" ? "#378ADD" : "#334155"} strokeWidth="0.5" style={{ transition: "all 0.3s" }}/>
        <text x="230" y="70" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">SpineA</text>
        <text x="230" y="84" textAnchor="middle" fill="#93c5fd" fontSize="9">Black session</text>
        <text x="230" y="95" textAnchor="middle" fill="#64748b" fontSize="9">ASN 65000</text>

        {/* SpineB (gray fabric) */}
        <rect x="305" y="180" width="90" height="50" rx="6" fill={spineColor("gray")} stroke={tenant !== "none" && cfg.fabric === "gray" ? "#1D9E75" : "#334155"} strokeWidth="0.5" style={{ transition: "all 0.3s" }}/>
        <text x="350" y="200" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">SpineB</text>
        <text x="350" y="214" textAnchor="middle" fill="#86efac" fontSize="9">Gray session</text>
        <text x="350" y="225" textAnchor="middle" fill="#64748b" fontSize="9">ASN 65000</text>

        {/* Links: Leaf1 → SpineA (black) */}
        <line x1="100" y1="132" x2="185" y2="88" stroke={linkColor("black")} strokeWidth="1.5" opacity={linkOpacity("black")} style={{ transition: "opacity 0.3s" }}/>
        {/* Links: SpineA → Leaf4 (black) */}
        <line x1="275" y1="88" x2="480" y2="132" stroke={linkColor("black")} strokeWidth="1.5" opacity={linkOpacity("black")} style={{ transition: "opacity 0.3s" }}/>

        {/* Links: Leaf1 → SpineB (gray) */}
        <line x1="100" y1="148" x2="305" y2="200" stroke={linkColor("gray")} strokeWidth="1.5" opacity={linkOpacity("gray")} style={{ transition: "opacity 0.3s" }}/>
        {/* Links: SpineB → Leaf4 (gray) */}
        <line x1="395" y1="200" x2="480" y2="148" stroke={linkColor("gray")} strokeWidth="1.5" opacity={linkOpacity("gray")} style={{ transition: "opacity 0.3s" }}/>

        {/* Session color labels */}
        <text x="130" y="104" textAnchor="middle" fill="#378ADD" fontSize="9" opacity={linkOpacity("black")}>Black</text>
        <text x="180" y="178" textAnchor="middle" fill="#1D9E75" fontSize="9" opacity={linkOpacity("gray")}>Gray</text>
        <text x="400" y="104" textAnchor="middle" fill="#378ADD" fontSize="9" opacity={linkOpacity("black")}>Black</text>
        <text x="450" y="178" textAnchor="middle" fill="#1D9E75" fontSize="9" opacity={linkOpacity("gray")}>Gray</text>

        {/* Legend */}
        <rect x="20" y="230" width="10" height="10" rx="2" fill="#378ADD"/>
        <text x="36" y="240" fill="#94a3b8" fontSize="10">Black fabric (Tenant A — critical)</text>
        <rect x="20" y="250" width="10" height="10" rx="2" fill="#1D9E75"/>
        <text x="36" y="260" fill="#94a3b8" fontSize="10">Gray fabric (Tenant B — bulk)</text>
      </svg>
      </div>

      <button
        onClick={() => setShowMapping(!showMapping)}
        style={{ width: "100%", padding: "8px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 12, cursor: "pointer", marginBottom: showMapping ? 12 : 0 }}
      >
        {showMapping ? "Hide" : "Show"} traffic-to-color mapping methods
      </button>

      {showMapping && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { method: "FBF / PBR", desc: "Match QPair range or UDP port range → assign path color. No server changes needed." },
            { method: "On-box agent", desc: "Probes path quality, distributes workloads across path IDs dynamically." },
            { method: "Central controller", desc: "Full fabric visibility. Globally optimal flow-to-color assignments." },
            { method: "EVPN-VXLAN", desc: "MAC-VRF-black tenant → black physical path. Control + data plane both isolated." },
          ].map((m) => (
            <div key={m.method} style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", display: "flex", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#e2e8f0", minWidth: 110 }}>{m.method}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{m.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BGPDPFViz
