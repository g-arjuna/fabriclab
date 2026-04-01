'use client'
import { useState } from "react"

const PAIN_POINTS = [
  {
    id: "pfc",
    label: "PFC System Dependency",
    icon: "P",
    color: "#ef4444",
    shortDesc: "Pause frames propagate across entire fabric",
    detail: [
      "Every switch and NIC in the path must agree on PFC priority mapping",
      "A single misconfigured device breaks RDMA across all flows through it",
      "Pause storms can cascade into fabric-wide deadlock in fat-trees",
      "PFC watchdog + ECN tuning required on every device at every deployment",
    ],
    uecFix: "UEC eliminates PFC entirely. Reliability is end-to-end via SACK retransmit -- no lossless fabric required.",
    uecColor: "#22c55e",
    chapterRef: "Ch5",
  },
  {
    id: "dcqcn",
    label: "2-RTT Congestion Feedback",
    icon: "D",
    color: "#f97316",
    shortDesc: "DCQCN CNP loop adds latency before rate reduction",
    detail: [
      "Congestion path: CE mark -> receiver -> CNP -> sender -> rate reduction",
      "Feedback loop = 2 x RTT before sender responds to congestion",
      "At 400G: ~400MB queued before CNP arrives and rate drops",
      "Tuning alpha, timer intervals per deployment is ongoing work",
    ],
    uecFix: "UEC piggybacks congestion signal on ACKs already returning. Feedback loop = 1 RTT. Sender responds 2x faster.",
    uecColor: "#22c55e",
    chapterRef: "Ch5",
  },
  {
    id: "entropy",
    label: "Low-Entropy ECMP",
    icon: "E",
    color: "#eab308",
    shortDesc: "AI flows are long-lived and hash to same paths",
    detail: [
      "AllReduce between fixed GPU pairs creates predictable 5-tuples",
      "Static ECMP pins all traffic from one GPU pair to one path",
      "Requires RSHP, DLB, or GLB to spray -- explicit per-deployment config",
      "Not all NIC+switch combinations support all spraying modes",
    ],
    uecFix: "UEC multipath is native: sender assigns packets to path IDs explicitly. No RSHP hack. NPM feedback from switches guides path selection.",
    uecColor: "#22c55e",
    chapterRef: "Ch6",
  },
  {
    id: "ooo",
    label: "Out-of-Order Sensitivity",
    icon: "O",
    color: "#8b5cf6",
    shortDesc: "RSHP reordering strains NIC reassembly buffers",
    detail: [
      "Per-packet spraying means packets arrive out of PSN order",
      "RoCEv2 NIC must buffer and reorder before presenting to RDMA layer",
      "Reorder window limited by NIC buffer; too much OOO = performance drop",
      "Larger clusters with more path diversity worsen the OOO problem",
    ],
    uecFix: "UEC Message ID + Packet Offset is designed for OOO from the start. Reassembly is by offset, not sequence. NIC buffers are sized for this model.",
    uecColor: "#22c55e",
    chapterRef: "Ch6",
  },
]

export function UECPainPointsViz() {
  const [selected, setSelected] = useState<string | null>("pfc")

  const active = PAIN_POINTS.find(p => p.id === selected) || PAIN_POINTS[0]

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: "24px", fontFamily: "monospace", color: "#e2e8f0" }}>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
        RoCEv2 operational friction at scale -- the design constraints UEC addresses
      </div>

      {/* Pain point selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {PAIN_POINTS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: selected === p.id ? "#1e293b" : "transparent",
              border: `2px solid ${selected === p.id ? p.color : "#334155"}`,
              borderRadius: 8, padding: "10px 16px", cursor: "pointer",
              color: selected === p.id ? "#f1f5f9" : "#94a3b8",
              transition: "all 0.2s",
            }}
          >
            <span style={{
              background: p.color, color: "#fff",
              borderRadius: 4, width: 22, height: 22,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>{p.icon}</span>
            <span style={{ fontSize: 12 }}>{p.label}</span>
            <span style={{ fontSize: 10, color: "#64748b" }}>{p.chapterRef}</span>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: 18, borderLeft: `4px solid ${active.color}` }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>The Problem</div>
          <div style={{ fontSize: 14, color: "#f1f5f9", marginBottom: 12, fontWeight: 600 }}>{active.shortDesc}</div>
          {active.detail.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
              <span style={{ color: active.color, fontSize: 14, flexShrink: 0, marginTop: 1 }}>--</span>
              <span style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>{d}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#1e293b", borderRadius: 8, padding: 18, borderLeft: `4px solid ${active.uecColor}` }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>UEC Solution</div>
          <div style={{ fontSize: 13, color: "#86efac", lineHeight: 1.7 }}>{active.uecFix}</div>

          {/* Visual comparison */}
          <div style={{ marginTop: 20, borderTop: "1px solid #334155", paddingTop: 16 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>Feedback loop comparison</div>
            {active.id === "dcqcn" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#f97316", marginBottom: 4 }}>DCQCN (RoCEv2)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {["packet", "CE mark", "-> receiver", "CNP ->", "sender", "rate down"].map((s, i) => (
                      <span key={i} style={{ background: i % 2 === 0 ? "#1e3a5f" : "#2d1f3f", padding: "3px 6px", borderRadius: 3, fontSize: 10, color: "#94a3b8" }}>{s}</span>
                    ))}
                    <span style={{ color: "#f97316", fontSize: 11, marginLeft: 4 }}>= 2x RTT</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 4 }}>UEC</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {["packet", "CE mark", "-> receiver", "ACK+C ->", "sender", "rate down"].map((s, i) => (
                      <span key={i} style={{ background: i % 2 === 0 ? "#1e3a5f" : "#14532d", padding: "3px 6px", borderRadius: 3, fontSize: 10, color: "#94a3b8" }}>{s}</span>
                    ))}
                    <span style={{ color: "#22c55e", fontSize: 11, marginLeft: 4 }}>= 1x RTT</span>
                  </div>
                </div>
              </div>
            )}
            {active.id !== "dcqcn" && (
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ background: "#2d1b1b", border: "1px solid #7f1d1d", borderRadius: 6, padding: "10px 8px" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>x</div>
                    <div style={{ fontSize: 10, color: "#fca5a5" }}>RoCEv2</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", color: "#475569" }}>vs</div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ background: "#14532d", border: "1px solid #166534", borderRadius: 6, padding: "10px 8px" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>o</div>
                    <div style={{ fontSize: 10, color: "#86efac" }}>UEC</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: "#475569", textAlign: "right" }}>
        Click a problem to see the UEC design response
      </div>
    </div>
  )
}

export default UECPainPointsViz
