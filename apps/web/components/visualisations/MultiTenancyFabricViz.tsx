"use client"
import { useState } from "react"

// ── MultiTenancyFabricViz ─────────────────────────
// EVPN-VXLAN multi-tenancy: MAC-VRF per tenant, MIG+SR-IOV server-level, GBP microsegmentation

type SelectedTenant = "all" | "A" | "B" | "C"

const tenants = [
  { id: "A" as const, name: "Tenant A", vni: "VNI 1001", vlan: "VLAN 101", color: "#185FA5", border: "#378ADD", bg: "#0c3260", mig: "MIG instances 0-2 (3× GPU slices)", vf: "SR-IOV VF 0–2" },
  { id: "B" as const, name: "Tenant B", vni: "VNI 1002", vlan: "VLAN 102", color: "#0F6E56", border: "#1D9E75", bg: "#0a2e22", mig: "MIG instances 3-4 (2× GPU slices)", vf: "SR-IOV VF 3–4" },
  { id: "C" as const, name: "Tenant C", vni: "VNI 1003", vlan: "VLAN 103", color: "#712B13", border: "#D85A30", bg: "#2a0f08", mig: "MIG instances 5-6 (2× GPU slices)", vf: "SR-IOV VF 5–6" },
]

export function MultiTenancyFabricViz() {
  const [sel, setSel] = useState<SelectedTenant>("all")
  const [showGBP, setShowGBP] = useState(false)

  function tenantVisible(id: string) {
    return sel === "all" || sel === id
  }

  function tenantOpacity(id: string) {
    return tenantVisible(id) ? 1 : 0.1
  }

  const selTenant = sel !== "all" ? tenants.find((t) => t.id === sel) : null

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">EVPN-VXLAN multi-tenancy + MIG/SR-IOV</div>
      <div className="mb-5 text-xs text-slate-600">Select a tenant to trace its isolation path through the network and server layers.</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setSel("all")} style={{ flex: 1, padding: "7px 0", background: sel === "all" ? "#1e293b" : "transparent", border: `1px solid ${sel === "all" ? "#475569" : "#334155"}`, borderRadius: 8, color: sel === "all" ? "#e2e8f0" : "#64748b", fontSize: 11, cursor: "pointer" }}>All tenants</button>
        {tenants.map((t) => (
          <button key={t.id} onClick={() => setSel(t.id)} style={{ flex: 1, padding: "7px 0", background: sel === t.id ? t.color : "transparent", border: `1px solid ${sel === t.id ? t.border : "#334155"}`, borderRadius: 8, color: sel === t.id ? "#fff" : "#64748b", fontSize: 11, cursor: "pointer", transition: "all 0.2s" }}>
            {t.name}
          </button>
        ))}
      </div>

      {/* Fabric diagram */}
      <div className="overflow-x-auto pb-2">
      <svg width="100%" viewBox="0 0 580 240" style={{ display: "block", marginBottom: 14, minWidth: 580 }}>
        {/* Spine (route reflector) */}
        <rect x="220" y="20" width="140" height="44" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
        <text x="290" y="38" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">Spine (EVPN RR)</text>
        <text x="290" y="52" textAnchor="middle" fill="#64748b" fontSize="9">RT5 route reflection</text>

        {/* Leaf1 */}
        <rect x="30" y="110" width="110" height="80" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
        <text x="85" y="128" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">Leaf 1</text>
        {tenants.map((t, i) => (
          <g key={t.id} opacity={tenantOpacity(t.id)} style={{ transition: "opacity 0.3s" }}>
            <rect x="42" y={136 + i * 16} width="86" height="12" rx="3" fill={t.bg} stroke={t.border} strokeWidth="0.5"/>
            <text x="85" y={146 + i * 16} textAnchor="middle" fill={t.border} fontSize="9">{t.vni} / {t.vlan}</text>
          </g>
        ))}

        {/* Leaf2 */}
        <rect x="440" y="110" width="110" height="80" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="0.5"/>
        <text x="495" y="128" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">Leaf 2</text>
        {tenants.map((t, i) => (
          <g key={t.id} opacity={tenantOpacity(t.id)} style={{ transition: "opacity 0.3s" }}>
            <rect x="452" y={136 + i * 16} width="86" height="12" rx="3" fill={t.bg} stroke={t.border} strokeWidth="0.5"/>
            <text x="495" y={146 + i * 16} textAnchor="middle" fill={t.border} fontSize="9">{t.vni} / {t.vlan}</text>
          </g>
        ))}

        {/* eBGP links to spine */}
        <line x1="140" y1="135" x2="220" y2="42" stroke="#475569" strokeWidth="0.5"/>
        <line x1="440" y1="135" x2="360" y2="42" stroke="#475569" strokeWidth="0.5"/>

        {/* VXLAN tunnels between leaves */}
        {tenants.map((t, i) => (
          <line key={t.id} x1="140" y1={143 + i * 16} x2="440" y2={143 + i * 16} stroke={t.border} strokeWidth={sel === t.id ? 2 : 0.8} strokeDasharray="6 3" opacity={tenantOpacity(t.id)} style={{ transition: "all 0.3s" }}/>
        ))}

        {/* VXLAN label */}
        <text x="290" y="130" textAnchor="middle" fill="#475569" fontSize="9">VXLAN tunnels (per-tenant VNI)</text>

        {/* Server icon Leaf1 side */}
        <rect x="30" y="205" width="110" height="28" rx="4" fill="#111827" stroke="#334155" strokeWidth="0.5"/>
        <text x="85" y="218" textAnchor="middle" fill="#64748b" fontSize="9">H100 server</text>
        <text x="85" y="228" textAnchor="middle" fill="#475569" fontSize="9">MIG + SR-IOV VFs</text>
        <line x1="85" y1="190" x2="85" y2="205" stroke="#334155" strokeWidth="0.5"/>

        {/* Server icon Leaf2 side */}
        <rect x="440" y="205" width="110" height="28" rx="4" fill="#111827" stroke="#334155" strokeWidth="0.5"/>
        <text x="495" y="218" textAnchor="middle" fill="#64748b" fontSize="9">H100 server</text>
        <text x="495" y="228" textAnchor="middle" fill="#475569" fontSize="9">MIG + SR-IOV VFs</text>
        <line x1="495" y1="190" x2="495" y2="205" stroke="#334155" strokeWidth="0.5"/>
      </svg>
      </div>

      {selTenant && (
        <div style={{ background: selTenant.bg, border: `1px solid ${selTenant.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0", marginBottom: 8 }}>{selTenant.name} isolation stack</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {[
              { label: "Network VNI", value: selTenant.vni },
              { label: "Access VLAN", value: selTenant.vlan },
              { label: "Server GPU slices", value: selTenant.mig },
              { label: "NIC VFs", value: selTenant.vf },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ fontSize: 10, color: "#64748b" }}>{row.label}</div>
                <div style={{ fontSize: 11, color: selTenant.border }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowGBP(!showGBP)}
        style={{ width: "100%", padding: "8px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 12, cursor: "pointer", marginBottom: showGBP ? 12 : 0 }}
      >
        {showGBP ? "Hide" : "Show"} GBP microsegmentation detail
      </button>

      {showGBP && (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0", marginBottom: 8 }}>GBP — intra-VNI microsegmentation</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            VXLAN GBP adds a 16-bit Group-Based Policy tag to the VXLAN header alongside the VNI. Two servers in the same VNI with different GBP tags cannot communicate — the ingress leaf switch enforces the tag-based ACL at the data plane, before the packet enters the fabric. This enables sub-tenant isolation (per-job GPU groups within Tenant A) without requiring a separate VNI or VLAN per job.
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, background: "#111827", borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#64748b" }}>GBP tag 0x0001</div>
              <div style={{ fontSize: 11, color: "#93c5fd" }}>Job A — GPU group 0–7</div>
            </div>
            <div style={{ flex: 1, background: "#111827", borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#64748b" }}>GBP tag 0x0002</div>
              <div style={{ fontSize: 11, color: "#86efac" }}>Job B — GPU group 8–15</div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>Drop policy: 0x0001 ↛ 0x0002. Enforced in hardware at line rate. No firewall appliance required.</div>
        </div>
      )}
    </div>
  )
}

export default MultiTenancyFabricViz
