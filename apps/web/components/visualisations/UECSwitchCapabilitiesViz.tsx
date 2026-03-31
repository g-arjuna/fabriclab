import { useState } from "react"

const FEATURES = [
  {
    id: "ecn",
    label: "ECN marking",
    tier: "baseline",
    desc: "IPv4 ECN CE-bit marking when output queue exceeds threshold. Same as DCQCN. Required for UEC congestion control.",
    config: "nv set qos ecn enable on\nnv set qos ecn profile roce min-threshold 100KB max-threshold 500KB",
    impact: "Without ECN: no congestion signal. Sender runs at full rate into congested switch. Retransmit will handle eventual loss but bandwidth waste is high.",
    switches: { tomahawk5: true, spectrum4: true, spectrum2: true, tofino2: true, sn5600: true },
  },
  {
    id: "noopfc",
    label: "PFC disabled",
    tier: "baseline",
    desc: "Simply do not configure PFC. No headroom buffers, no pause frame generation. Correct default for a UEC fabric.",
    config: "# Remove PFC config -- leave ECN only\n# nv unset qos pfc\n# PFC headroom buffers not needed",
    impact: "If PFC accidentally enabled on a UEC fabric: pause frames will be generated on congestion, creating the same pause-storm risk as RoCEv2.",
    switches: { tomahawk5: true, spectrum4: true, spectrum2: true, tofino2: true, sn5600: true },
  },
  {
    id: "perflow",
    label: "Per-flow ECN marking",
    tier: "enhanced",
    desc: "ECN marking probability based on the individual flow's queue depth contribution, not per-queue average. More precise than standard per-queue RED marking.",
    config: "# Broadcom TH5 specific:\nbcm-config: ecn_mode=per_flow_red\n# Or via SDK: per-flow WRED table programming",
    impact: "With standard per-queue ECN: a bursty short flow can trigger ECN marking for long flows sharing the same queue. Per-flow ECN isolates marking correctly.",
    switches: { tomahawk5: true, spectrum4: false, spectrum2: false, tofino2: true, sn5600: false },
    note: "TH5 and P4 platforms in 2025+",
  },
  {
    id: "npm",
    label: "NPM feedback export",
    tier: "enhanced",
    desc: "Network Performance Monitor: switch periodically exports per-port utilisation metrics to connected UEC endpoints via UDP multicast. Enables proactive path selection.",
    config: "# UEC NPM (early firmware, varies by vendor)\nuec-npm enable\nuec-npm interval 100us\nuec-npm multicast-group 239.0.0.1",
    impact: "Without NPM: sender falls back to reactive path selection (detects congestion after the fact via ACK+C feedback). Still better than pure ECMP but not optimal.",
    switches: { tomahawk5: "beta", spectrum4: false, spectrum2: false, tofino2: "p4", sn5600: false },
    note: "Beta on TH5 as of early 2026. P4 reference implementation available.",
  },
  {
    id: "pathid",
    label: "Path-ID forwarding",
    tier: "enhanced",
    desc: "Switch uses UET header path ID field for forwarding decisions instead of (or alongside) 5-tuple ECMP hash. Enables deterministic path assignment by sender.",
    config: "# P4 programmable (Tofino2):\n# UEC P4 program from Intel P4 Studio\n# Fixed-function: TCAM/ACL match on UET path ID field",
    impact: "Without path-ID forwarding: UEC multipath degrades to hash-based ECMP. NPM feedback still helps (sender avoids overloaded paths) but forwarding is still probabilistic.",
    switches: { tomahawk5: false, spectrum4: false, spectrum2: false, tofino2: true, sn5600: false },
    note: "P4-programmable platforms only as of March 2026",
  },
]

const SWITCH_MODELS = [
  { id: "sn5600", label: "Mellanox SN5600", gen: "Spectrum-4" },
  { id: "spectrum4", label: "Generic Spectrum-4", gen: "Spectrum-4" },
  { id: "spectrum2", label: "Spectrum-2/3", gen: "Spectrum-2/3" },
  { id: "tomahawk5", label: "Broadcom TH5", gen: "StraDNX" },
  { id: "tofino2", label: "Intel Tofino2", gen: "Programmable" },
]

type SwitchId = "tomahawk5" | "spectrum4" | "spectrum2" | "tofino2" | "sn5600"

function SupportIcon({ val }: { val: boolean | string | undefined }) {
  if (val === true) return <span style={{ color: "#22c55e", fontSize: 16 }}>o</span>
  if (val === false) return <span style={{ color: "#475569", fontSize: 16 }}>-</span>
  if (val === "beta") return <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>beta</span>
  if (val === "p4") return <span style={{ color: "#6366f1", fontSize: 11, fontWeight: 700 }}>P4</span>
  return <span style={{ color: "#475569", fontSize: 16 }}>-</span>
}

const TIER_COLORS = { baseline: "#22c55e", enhanced: "#6366f1" }

export function UECSwitchCapabilitiesViz() {
  const [selected, setSelected] = useState<string | null>("ecn")
  const active = FEATURES.find(f => f.id === selected)

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: "24px", fontFamily: "monospace", color: "#e2e8f0" }}>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>
        UEC switch capability matrix -- baseline vs enhanced features
      </div>
      <div style={{ fontSize: 11, color: "#475569", marginBottom: 20 }}>
        Baseline = minimum for UEC operation. Enhanced = full UEC performance. March 2026 availability.
      </div>

      {/* Feature x Switch matrix */}
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#64748b", width: 180 }}>Feature</th>
              <th style={{ padding: "8px 6px", fontSize: 10, color: "#64748b", width: 20 }}>Tier</th>
              {SWITCH_MODELS.map(s => (
                <th key={s.id} style={{ padding: "8px 6px", fontSize: 10, color: "#64748b", textAlign: "center", width: 90 }}>
                  <div>{s.label}</div>
                  <div style={{ color: "#475569", fontSize: 9 }}>{s.gen}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map(f => (
              <tr
                key={f.id}
                onClick={() => setSelected(f.id)}
                style={{
                  background: selected === f.id ? "#1e293b" : "transparent",
                  cursor: "pointer",
                  borderBottom: "1px solid #1e293b",
                }}
              >
                <td style={{ padding: "10px 10px", fontSize: 12, color: selected === f.id ? "#f1f5f9" : "#94a3b8" }}>
                  {f.label}
                </td>
                <td style={{ padding: "10px 6px" }}>
                  <span style={{
                    background: TIER_COLORS[f.tier as keyof typeof TIER_COLORS] + "22",
                    color: TIER_COLORS[f.tier as keyof typeof TIER_COLORS],
                    borderRadius: 3, padding: "2px 6px", fontSize: 9, fontWeight: 700,
                  }}>
                    {f.tier.toUpperCase()}
                  </span>
                </td>
                {SWITCH_MODELS.map(s => (
                  <td key={s.id} style={{ padding: "10px 6px", textAlign: "center" }}>
                    <SupportIcon val={f.switches[s.id as SwitchId] as boolean | string | undefined} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {active && (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: 18, borderLeft: `4px solid ${TIER_COLORS[active.tier as keyof typeof TIER_COLORS]}` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{active.label}</span>
            <span style={{
              background: TIER_COLORS[active.tier as keyof typeof TIER_COLORS] + "22",
              color: TIER_COLORS[active.tier as keyof typeof TIER_COLORS],
              borderRadius: 3, padding: "2px 8px", fontSize: 10,
            }}>{active.tier}</span>
            {active.note && <span style={{ fontSize: 10, color: "#64748b" }}>{active.note}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, marginBottom: 12 }}>{active.desc}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>Sample config:</div>
              <pre style={{
                background: "#0f172a", borderRadius: 5, padding: "10px 12px",
                fontSize: 10, color: "#7dd3fc", lineHeight: 1.6, overflow: "auto",
              }}>{active.config}</pre>
            </div>
            <div style={{ background: "#0f172a", borderRadius: 5, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>Impact if missing:</div>
              <div style={{ fontSize: 11, color: "#f97316", lineHeight: 1.6 }}>{active.impact}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 10, color: "#475569" }}>
        <span><span style={{ color: "#22c55e" }}>o</span> = supported</span>
        <span><span style={{ color: "#475569" }}>-</span> = not supported</span>
        <span><span style={{ color: "#f59e0b" }}>beta</span> = early firmware</span>
        <span><span style={{ color: "#6366f1" }}>P4</span> = P4-programmable only</span>
      </div>
    </div>
  )
}

export default UECSwitchCapabilitiesViz
