'use client'
import { useState } from "react"

const ROCEV2_FIELDS = [
  { name: "Ethernet II", bytes: 14, color: "#475569", note: "Dst/Src MAC, EtherType 0x0800" },
  { name: "IPv4", bytes: 20, color: "#6366f1", note: "Src/Dst IP, Protocol UDP(17), DSCP, TTL" },
  { name: "UDP", bytes: 8, color: "#8b5cf6", note: "Src port(entropy), Dst 4791, Length, Checksum" },
  { name: "BTH", bytes: 12, color: "#ef4444", note: "OpCode(8b) | SE | MigReq | PadCnt | TVer | PKey(16b) | Reserved(8b) | DestQP(24b) | A | Reserved(7b) | PSN(24b)" },
  { name: "Payload (RDMA)", bytes: null, color: "#10b981", note: "RDMA Write data, RDMA Send capsule, or Read response" },
  { name: "ICRC", bytes: 4, color: "#64748b", note: "Invariant CRC -- covers all invariant header fields" },
]

const UEC_FIELDS = [
  { name: "Ethernet II", bytes: 14, color: "#475569", note: "Dst/Src MAC, EtherType 0x0800 -- identical to RoCEv2" },
  { name: "IPv4", bytes: 20, color: "#6366f1", note: "Src/Dst IP, Protocol UDP(17), DSCP, ECN bits -- identical" },
  { name: "UDP", bytes: 8, color: "#8b5cf6", note: "Src port(entropy), Dst 4792 (UEC, not 4791), Length, Checksum" },
  { name: "UET header", bytes: 20, color: "#f59e0b", note: "Ver(4b) | OpCode(8b) | Flags(4b) | DCID(24b) | SCID(24b) | MessageID(32b) | PktOffset(32b) | PayloadLen(16b) | Ack/SACK(32b)" },
  { name: "Payload", bytes: null, color: "#10b981", note: "Same payload content. Transport change is only in the header." },
  { name: "ICRC", bytes: 4, color: "#64748b", note: "Invariant CRC -- same as RoCEv2" },
]

const FIELD_COMPARE = [
  { rocev2: "PSN (24-bit)", uec: "MessageID (32b) + PktOffset (32b)", why: "OOO reassembly by offset, not sequence. Enables native multipath spraying." },
  { rocev2: "DestQP (24-bit)", uec: "DCID + SCID (24b each)", why: "Context IDs replace Queue Pair numbers. Connection state is simpler without per-QP PSN." },
  { rocev2: "No ack in BTH", uec: "Ack/SACK (32b) in UET", why: "SACK bitmask enables NIC-level selective retransmit without CPU. Congestion feedback rides on ack." },
  { rocev2: "UDP dst 4791", uec: "UDP dst 4792", why: "Separate well-known port allows switches and firewalls to distinguish UEC from RoCEv2 traffic." },
  { rocev2: "Flags: SE, A, MigReq", uec: "Flags: E, C, S, F, L", why: "E=ECN-capable, C=CE-marked (congestion), S=solicited, F=first-packet, L=last-packet of message." },
]

export function UECPacketFormatViz() {
  const [view, setView] = useState<"frames" | "compare">("frames")
  const [hoveredField, setHoveredField] = useState<string | null>(null)

  const renderFrame = (fields: typeof ROCEV2_FIELDS, label: string) => (
    <div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10, textAlign: "center" }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {fields.map((f, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredField(label + f.name)}
            onMouseLeave={() => setHoveredField(null)}
            style={{
              background: hoveredField === label + f.name ? f.color + "33" : f.color + "18",
              border: `1px solid ${f.color}`,
              borderRadius: 4, padding: "7px 12px",
              cursor: "default", transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#f1f5f9", fontWeight: 600 }}>{f.name}</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>{f.bytes ? `${f.bytes}B` : "variable"}</span>
            </div>
            {hoveredField === label + f.name && (
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6, lineHeight: 1.5 }}>{f.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: "24px", fontFamily: "monospace", color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>UET packet format vs RoCEv2 BTH -- byte-level comparison</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["frames", "compare"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "#1e3a5f" : "transparent",
              border: `1px solid ${view === v ? "#3b82f6" : "#334155"}`,
              borderRadius: 5, padding: "5px 14px", cursor: "pointer",
              color: view === v ? "#93c5fd" : "#64748b", fontSize: 11,
            }}>{v === "frames" ? "Frame Layout" : "Field Diff"}</button>
          ))}
        </div>
      </div>

      {view === "frames" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {renderFrame(ROCEV2_FIELDS, "RoCEv2")}
          {renderFrame(UEC_FIELDS, "UEC / UET")}
        </div>
      )}

      {view === "compare" && (
        <div>
          <div style={{ overflowX: "auto", paddingBottom: 6 }}>
            <div style={{ minWidth: 620 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 2, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, padding: "4px 10px" }}>RoCEv2 BTH</div>
                <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, padding: "4px 10px" }}>UEC UET header</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, padding: "4px 10px" }}>Why it changed</div>
              </div>
              {FIELD_COMPARE.map((row, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr",
                  background: i % 2 === 0 ? "#1e293b" : "#0f172a",
                  borderRadius: 5, marginBottom: 2,
                }}>
                  <div style={{ padding: "8px 10px", fontSize: 11, color: "#fca5a5", borderRight: "1px solid #334155" }}>{row.rocev2}</div>
                  <div style={{ padding: "8px 10px", fontSize: 11, color: "#fde68a", borderRight: "1px solid #334155" }}>{row.uec}</div>
                  <div style={{ padding: "8px 10px", fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{row.why}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 11, color: "#475569", textAlign: "center" }}>
        Outer framing (Ethernet / IPv4 / UDP) identical. UET replaces only the transport header above UDP.
      </div>
    </div>
  )
}

export default UECPacketFormatViz
