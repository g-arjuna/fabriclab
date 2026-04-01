'use client'
import { useState } from "react"

type ReadinessLevel = "ga" | "beta" | "roadmap" | "noplan" | "na"

interface Silicon {
  vendor: string
  product: string
  type: "nic" | "dpu" | "switch" | "asic"
  uec: ReadinessLevel
  rocevToo: boolean
  dgxUsed: boolean
  notes: string
}

const SILICON: Silicon[] = [
  {
    vendor: "AMD",
    product: "Pensando Salina DPU",
    type: "dpu",
    uec: "ga",
    rocevToo: true,
    dgxUsed: false,
    notes: "First production-available UEC 1.0 compliant endpoint silicon. Announced February 2025. UEC + RoCEv2 dual-mode. Used in HPE Slingshot v2 and AMD AI cluster designs.",
  },
  {
    vendor: "Intel",
    product: "Gaudi 3 (integrated NIC)",
    type: "nic",
    uec: "ga",
    rocevToo: true,
    dgxUsed: false,
    notes: "Gaudi 3 AI accelerator has 24 integrated 200GbE ports. UEC-capable per Intel roadmap, GA availability in 2025. Used in Intel HPC cluster designs, not DGX nodes.",
  },
  {
    vendor: "Broadcom",
    product: "Astera NIC (ex-Emulex)",
    type: "nic",
    uec: "beta",
    rocevToo: true,
    dgxUsed: false,
    notes: "UEC NIC silicon in qualification with hyperscale customers. Q1 2026 reported timeline. Volume shipping date not confirmed. Strong SACK/retransmit implementation.",
  },
  {
    vendor: "NVIDIA",
    product: "ConnectX-7",
    type: "nic",
    uec: "noplan",
    rocevToo: true,
    dgxUsed: true,
    notes: "Used in DGX H100 and H200 (10x CX7 per node). No UEC announcement from NVIDIA as of March 2026. Spectrum-X (CX7 + SN5600) is NVIDIA current AI fabric strategy.",
  },
  {
    vendor: "NVIDIA",
    product: "BlueField-3 DPU",
    type: "dpu",
    uec: "noplan",
    rocevToo: true,
    dgxUsed: true,
    notes: "Used in DGX B200 storage/management (2x BF3 per node). No UEC announcement. NVIDIA's DOCA SDK focus is on RoCEv2 and Spectrum-X lossless extensions.",
  },
  {
    vendor: "Broadcom",
    product: "Tomahawk 5 (StraDNX)",
    type: "switch",
    uec: "beta",
    rocevToo: true,
    dgxUsed: false,
    notes: "ECN and basic UEC forwarding in firmware Q4 2024. NPM support in beta SDK early 2026. Path-ID forwarding not yet available. Used in Arista 7800R4 and Cisco Nexus 9000v.",
  },
  {
    vendor: "NVIDIA",
    product: "Spectrum-4 (SN5600)",
    type: "switch",
    uec: "roadmap",
    rocevToo: true,
    dgxUsed: true,
    notes: "SN5600 is the standard compute-fabric spine in DGX BasePOD. Standard ECN (forwards UEC traffic). UET-specific extensions under development. No NPM announcement March 2026.",
  },
  {
    vendor: "Intel",
    product: "Tofino2 (programmable)",
    type: "asic",
    uec: "ga",
    rocevToo: true,
    dgxUsed: false,
    notes: "UEC reference P4 program available from Intel P4 Studio since H1 2025. Full path-ID forwarding and NPM export implementable. Requires P4 expertise to deploy.",
  },
]

const READINESS_COLORS: Record<ReadinessLevel, string> = {
  ga: "#22c55e",
  beta: "#f59e0b",
  roadmap: "#6366f1",
  noplan: "#475569",
  na: "#1e293b",
}

const READINESS_LABELS: Record<ReadinessLevel, string> = {
  ga: "GA",
  beta: "Beta",
  roadmap: "Roadmap",
  noplan: "No plan",
  na: "N/A",
}

const TYPE_ICONS: Record<string, string> = { nic: "NIC", dpu: "DPU", switch: "SW", asic: "ASIC" }

export function UECDeploymentReadinessViz() {
  const [selected, setSelected] = useState<string | null>("NVIDIA-ConnectX-7")
  const [filter, setFilter] = useState<"all" | "nic" | "switch">("all")

  const filtered = SILICON.filter(s => {
    if (filter === "nic") return s.type === "nic" || s.type === "dpu"
    if (filter === "switch") return s.type === "switch" || s.type === "asic"
    return true
  })

  const active = SILICON.find(s => `${s.vendor}-${s.product}` === selected)

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: "24px", fontFamily: "monospace", color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>UEC silicon availability -- March 2026</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "nic", "switch"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? "#1e3a5f" : "transparent",
              border: `1px solid ${filter === f ? "#3b82f6" : "#334155"}`,
              borderRadius: 5, padding: "4px 12px", cursor: "pointer",
              color: filter === f ? "#93c5fd" : "#64748b", fontSize: 10,
            }}>{f === "all" ? "All" : f === "nic" ? "NICs / DPUs" : "Switches"}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 16 }}>
        DGX-used column: silicon present in current DGX H100/H200/B200 nodes
      </div>

      {/* Silicon cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {filtered.map(s => {
          const key = `${s.vendor}-${s.product}`
          const isSelected = selected === key
          return (
            <div
              key={key}
              onClick={() => setSelected(key)}
              style={{
                background: isSelected ? "#1e293b" : "transparent",
                border: `1px solid ${isSelected ? READINESS_COLORS[s.uec] : "#1e293b"}`,
                borderRadius: 7, padding: "10px 14px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s",
              }}
            >
              {/* Type badge */}
              <span style={{
                background: "#334155", borderRadius: 4, padding: "3px 6px",
                fontSize: 9, color: "#94a3b8", minWidth: 34, textAlign: "center",
              }}>{TYPE_ICONS[s.type]}</span>

              {/* Vendor + product */}
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{s.vendor} </span>
                <span style={{ fontSize: 12, color: "#f1f5f9", fontWeight: 600 }}>{s.product}</span>
              </div>

              {/* UEC status */}
              <span style={{
                background: READINESS_COLORS[s.uec] + "22",
                color: READINESS_COLORS[s.uec],
                borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700,
              }}>{READINESS_LABELS[s.uec]}</span>

              {/* DGX badge */}
              {s.dgxUsed && (
                <span style={{
                  background: "#312e81", color: "#a5b4fc",
                  borderRadius: 4, padding: "3px 8px", fontSize: 9, fontWeight: 700,
                }}>IN DGX</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {active && (
        <div style={{
          background: "#1e293b", borderRadius: 8, padding: 16,
          borderLeft: `4px solid ${READINESS_COLORS[active.uec]}`,
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 700 }}>{active.vendor} {active.product}</span>
            <span style={{
              background: READINESS_COLORS[active.uec] + "22",
              color: READINESS_COLORS[active.uec],
              borderRadius: 3, padding: "2px 8px", fontSize: 11,
            }}>{READINESS_LABELS[active.uec]}</span>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>{active.notes}</div>
        </div>
      )}

      {/* DGX impact callout */}
      <div style={{ background: "#1c1007", border: "1px solid #78350f", borderRadius: 8, padding: "12px 16px" }}>
        <div style={{ fontSize: 11, color: "#f97316", fontWeight: 700, marginBottom: 6 }}>
          DGX cluster deployment constraint (March 2026)
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
          DGX H100/H200 use ConnectX-7 (no UEC plan). DGX B200 uses BlueField-3 (no UEC plan).
          A DGX cluster cannot run UEC today without replacing NICs in every node.
          UEC is a purchase-cycle decision for 2026/2027 NIC refreshes, not a firmware upgrade.
          Ask vendors: "Is this UEC 1.0 compliant?" before committing to next-gen NIC orders.
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 }}>
        {(Object.entries(READINESS_LABELS) as [ReadinessLevel, string][]).map(([k, v]) => (
          <span key={k} style={{ fontSize: 10, color: READINESS_COLORS[k] }}>
            {v} = {k === "ga" ? "production available" : k === "beta" ? "early customer / SDK" : k === "roadmap" ? "announced, not shipped" : "no public announcement"}
          </span>
        ))}
      </div>
    </div>
  )
}

export default UECDeploymentReadinessViz
