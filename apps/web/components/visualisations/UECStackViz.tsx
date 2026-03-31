import { useState } from "react"

const LAYERS = [
  {
    id: "app",
    label: "Application / NCCL",
    sub: "AllReduce, collective ops",
    color: "#64748b",
    bg: "#1e293b",
    detail: null,
  },
  {
    id: "verbs",
    label: "RDMA Verbs API",
    sub: "ibv_post_send / ibv_poll_cq -- unchanged from RoCEv2",
    color: "#6366f1",
    bg: "#1e1b4b",
    detail: "The verbs API is preserved. NCCL and existing RDMA applications do not need to change. The transport change is below the verbs layer -- the NIC firmware handles UET instead of BTH.",
  },
  {
    id: "multipath",
    label: "Multipath (UEC component 4)",
    sub: "Explicit path IDs, NPM feedback, round-robin spray",
    color: "#8b5cf6",
    bg: "#1a1033",
    detail: "The sender NIC cycles packets from a single message across path IDs. The switch optionally uses path ID field for forwarding instead of 5-tuple hash. NPM feedback channel (UDP multicast) exports per-path utilisation from each switch to endpoints.",
  },
  {
    id: "cc",
    label: "Congestion Control (UEC component 3)",
    sub: "ECN CE -> ACK C-flag -> rate reduction -- 1 RTT loop",
    color: "#06b6d4",
    bg: "#0c2233",
    detail: "ECN CE marking on switches (identical config to DCQCN). Receiver sets C-flag in returning ACK packets. Sender NIC firmware reads C-flag and applies DCQCN-style multiplicative decrease. Feedback latency: 1 RTT (vs 2 RTT for DCQCN CNP path).",
  },
  {
    id: "retransmit",
    label: "Retransmit (UEC component 2)",
    sub: "SACK bitmask, per-message timer, NIC-level recovery",
    color: "#10b981",
    bg: "#052e16",
    detail: "Receiver ACK carries cumulative ack offset + SACK bitmask of out-of-order received packets. Sender maintains retransmit timer per outstanding message. NIC firmware handles retransmit -- no CPU involved. Individual loss recovers in ~1 RTT. QP never enters error state.",
  },
  {
    id: "uet",
    label: "UET Transport (UEC component 1)",
    sub: "20-byte header, Message ID + Packet Offset, DCID/SCID, UDP 4792",
    color: "#f59e0b",
    bg: "#1c1007",
    detail: "Replaces BTH (12 bytes) with UET header (20 bytes). Key fields: Message ID (32-bit, per-context), Packet Offset (32-bit byte offset within message), DCID/SCID (24-bit context IDs), OpCode (8-bit), Flags (ECN-capable, CE, solicited, first/last). UDP port 4792 (vs RoCEv2 4791).",
  },
  {
    id: "udp",
    label: "UDP / IPv4 / Ethernet",
    sub: "Unchanged. Same Ethernet physical layer as RoCEv2.",
    color: "#475569",
    bg: "#1e293b",
    detail: "Standard Ethernet frames. Same 400G OSFP optics, same switch ASIC forwarding. No PFC frame generation. ECN marking still used (same IP ECN bits). The physical and link layers are unchanged -- UEC is a transport-layer protocol.",
  },
]

export function UECStackViz() {
  const [selected, setSelected] = useState<string | null>("uet")

  const active = LAYERS.find(l => l.id === selected)

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: "24px", fontFamily: "monospace", color: "#e2e8f0" }}>
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
        UEC protocol stack -- four functional blocks within a single coherent transport
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* Stack column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {LAYERS.map((l, i) => (
            <div
              key={l.id}
              onClick={() => setSelected(l.id)}
              style={{
                background: selected === l.id ? l.bg : "#1e293b",
                border: `2px solid ${selected === l.id ? l.color : "transparent"}`,
                borderRadius: 6, padding: "10px 14px", cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: selected === l.id ? "#f1f5f9" : "#94a3b8", fontWeight: 600 }}>{l.label}</span>
                {l.detail && <span style={{ fontSize: 9, color: l.color, background: "#0f172a", borderRadius: 3, padding: "1px 5px" }}>NEW</span>}
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{l.sub}</div>
            </div>
          ))}
        </div>

        {/* Detail column */}
        <div style={{ background: "#1e293b", borderRadius: 8, padding: 20 }}>
          {active && (
            <>
              <div style={{ color: active.color, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                {active.label}
              </div>
              {active.detail ? (
                <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>{active.detail}</div>
              ) : (
                <div style={{ fontSize: 13, color: "#64748b", fontStyle: "italic" }}>
                  Unchanged from RoCEv2 deployments. UEC is transparent to the application layer.
                </div>
              )}

              {/* Packet byte diagram for UET layer */}
              {active.id === "uet" && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>UET header structure (20 bytes):</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[
                      { name: "Ver(4b)", bytes: 0.5, color: "#f59e0b" },
                      { name: "OpCode(8b)", bytes: 1, color: "#f59e0b" },
                      { name: "Flags(4b)", bytes: 0.5, color: "#f59e0b" },
                      { name: "DCID(24b)", bytes: 3, color: "#06b6d4" },
                      { name: "SCID(24b)", bytes: 3, color: "#06b6d4" },
                      { name: "Message ID(32b)", bytes: 4, color: "#10b981" },
                      { name: "Pkt Offset(32b)", bytes: 4, color: "#10b981" },
                      { name: "Payload Len(16b)", bytes: 2, color: "#8b5cf6" },
                      { name: "Ack/SACK(32b)", bytes: 4, color: "#ef4444" },
                    ].map((f, i) => (
                      <div key={i} style={{
                        background: f.color + "22",
                        border: `1px solid ${f.color}`,
                        borderRadius: 4, padding: "4px 8px",
                        fontSize: 10, color: f.color, whiteSpace: "nowrap",
                      }}>
                        {f.name}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "#475569" }}>
                    Compare: BTH (12 bytes): OpCode + PKey + QPN + PSN -- no offset, no ack
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 20, fontSize: 11, color: "#475569" }}>
        <span>UDP port 4792 (UEC)</span>
        <span>vs</span>
        <span>UDP port 4791 (RoCEv2)</span>
        <span style={{ marginLeft: "auto" }}>Click a layer for detail</span>
      </div>
    </div>
  )
}

export default UECStackViz
