"use client"
import { useState } from "react"

// ── SRv6PathViz ─────────────────────────
// Illustrates SRv6: SRH prepended at ingress, SID decremented at each hop, removed at egress

const hops = [
  {
    id: 0,
    node: "Leaf 1 (ingress)",
    role: "Encapsulates packet with SRH",
    segLeft: 2,
    dst: "SID:Spine3 (Node SID)",
    segments: ["SID:Spine3", "SID:Leaf4"],
    action: "Prepend SRH with segment list [Spine3, Leaf4]. Set Segments Left = 2. Set outer IPv6 dst = SID:Spine3.",
    color: "#185FA5",
    border: "#378ADD",
    sidWidth: 100,
  },
  {
    id: 1,
    node: "Spine 3 (transit)",
    role: "Processes Node SID, pops segment",
    segLeft: 1,
    dst: "SID:Leaf4 (Node SID)",
    segments: ["[consumed]", "SID:Leaf4"],
    action: "Match local Node SID. Decrement Segments Left to 1. Update outer dst to SID:Leaf4. Forward normally via IPv6 routing.",
    color: "#0F6E56",
    border: "#1D9E75",
    sidWidth: 100,
  },
  {
    id: 2,
    node: "Leaf 4 (egress)",
    role: "Final SID — remove SRH, deliver",
    segLeft: 0,
    dst: "Inner IPv4 dst (GPU server)",
    segments: ["[consumed]", "[consumed]"],
    action: "Match local Node SID. Segments Left = 0 — SRH is fully consumed. Remove SRH. Deliver inner payload (RoCEv2/UDP) to GPU server.",
    color: "#712B13",
    border: "#D85A30",
    sidWidth: 100,
  },
]

export function SRv6PathViz() {
  const [hop, setHop] = useState(0)
  const h = hops[hop]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">SRv6 segment routing — packet walk</div>
      <div className="mb-5 text-xs text-slate-600">Step through the SRH at each hop: ingress encapsulates, transit pops, egress decapsulates.</div>

      {/* Topology bar */}
      <div className="overflow-x-auto pb-2">
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20, minWidth: 460 }}>
        {hops.map((h2, i) => (
          <div key={h2.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <button
              onClick={() => setHop(i)}
              style={{
                flex: 1,
                padding: "10px 6px",
                background: hop === i ? h2.color : "#1e293b",
                border: `1px solid ${hop === i ? h2.border : "#334155"}`,
                borderRadius: 8,
                color: hop === i ? "#fff" : "#64748b",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontWeight: 500 }}>{h2.node.split(" ")[0]} {h2.node.split(" ")[1]}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{h2.role.split(" ")[0]}</div>
            </button>
            {i < hops.length - 1 && (
              <div style={{ width: 24, height: 2, background: hop > i ? "#334155" : "#1e293b", position: "relative" }}>
                <div style={{ position: "absolute", right: -6, top: -6, color: "#475569", fontSize: 12 }}>→</div>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>

      {/* Packet structure */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Packet at this hop</div>
        <div style={{ display: "flex", gap: 4, alignItems: "stretch", flexWrap: "wrap" }}>
          {/* Outer IPv6 */}
          <div style={{ background: "#0c3260", border: "1px solid #378ADD", borderRadius: 6, padding: "8px 10px", minWidth: 110, flex: "1 1 160px" }}>
            <div style={{ fontSize: 10, color: "#93c5fd", marginBottom: 4 }}>Outer IPv6</div>
            <div style={{ fontSize: 10, color: "#bfdbfe", lineHeight: 1.6, fontFamily: "monospace" }}>
              Dst: {h.dst}{"\n"}SL: {h.segLeft}
            </div>
          </div>
          {/* SRH */}
          <div style={{ background: hop === 2 ? "#111827" : "#2a0f08", border: `1px solid ${hop === 2 ? "#334155" : "#D85A30"}`, borderRadius: 6, padding: "8px 10px", flex: "2 1 220px", opacity: hop === 2 ? 0.3 : 1, transition: "opacity 0.3s" }}>
            <div style={{ fontSize: 10, color: hop === 2 ? "#374151" : "#fb923c", marginBottom: 4 }}>SRH {hop === 2 ? "(removed)" : ""}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {h.segments.map((s, i) => (
                <div key={i} style={{ background: s.startsWith("[") ? "#1e293b" : "#3b1f08", border: `1px solid ${s.startsWith("[") ? "#334155" : "#D85A30"}`, borderRadius: 4, padding: "4px 6px", fontSize: 10, color: s.startsWith("[") ? "#374151" : "#fbbf24", fontFamily: "monospace", flex: 1, textAlign: "center" }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
          {/* Inner payload */}
          <div style={{ background: "#14532d", border: "1px solid #1D9E75", borderRadius: 6, padding: "8px 10px", minWidth: 100, flex: "1 1 160px" }}>
            <div style={{ fontSize: 10, color: "#86efac", marginBottom: 4 }}>Inner payload</div>
            <div style={{ fontSize: 10, color: "#bbf7d0", lineHeight: 1.6, fontFamily: "monospace" }}>
              IPv4 + UDP{"\n"}RoCEv2 BTH{"\n"}GPU data
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid ${h.border}`, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0", marginBottom: 6 }}>{h.node} — {h.role}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{h.action}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setHop(Math.max(0, hop - 1))} disabled={hop === 0} style={{ flex: 1, padding: "8px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: hop === 0 ? "#334155" : "#94a3b8", fontSize: 12, cursor: hop === 0 ? "not-allowed" : "pointer" }}>← Previous</button>
        <button onClick={() => setHop(Math.min(hops.length - 1, hop + 1))} disabled={hop === hops.length - 1} style={{ flex: 1, padding: "8px 0", background: "transparent", border: "1px solid #334155", borderRadius: 8, color: hop === hops.length - 1 ? "#334155" : "#94a3b8", fontSize: 12, cursor: hop === hops.length - 1 ? "not-allowed" : "pointer" }}>Next →</button>
      </div>

      <div style={{ marginTop: 16, background: "#111827", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>SRv6 uSID overhead comparison</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, padding: "6px 8px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Standard SRv6</div>
            <div style={{ fontSize: 12, color: "#f87171" }}>+48 bytes (3 SIDs × 128-bit)</div>
          </div>
          <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, padding: "6px 8px" }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>SRv6 uSID</div>
            <div style={{ fontSize: 12, color: "#4ade80" }}>+6 bytes (3 micro-SIDs × 16-bit)</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SRv6PathViz
