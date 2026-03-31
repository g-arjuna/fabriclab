import { useState } from "react"

interface Step {
  id: string
  label: string
  actor: "sender" | "switch" | "receiver" | "app"
  note: string
  rtt?: number
}

const DCQCN_STEPS: Step[] = [
  { id: "d1", label: "Sender injects at 400G", actor: "sender", note: "Sender pushes packets at line rate. No congestion signal yet received.", rtt: 0 },
  { id: "d2", label: "Switch buffer fills -> marks CE bit", actor: "switch", note: "Switch output queue exceeds Kmin. ECN CE bit set in IP header of outgoing packets.", rtt: 0.5 },
  { id: "d3", label: "Receiver sees CE-marked packet", actor: "receiver", note: "NIC receives CE-marked packet. CE bit detected in IPv4 ECN field.", rtt: 1 },
  { id: "d4", label: "Receiver generates CNP", actor: "receiver", note: "Receiver NIC generates a Congestion Notification Packet (CNP). CNP is a new packet sent back toward the sender.", rtt: 1 },
  { id: "d5", label: "CNP travels back to sender", actor: "switch", note: "CNP must traverse the full return path from receiver to sender. At BasePOD scale: ~2us.", rtt: 1.5 },
  { id: "d6", label: "Sender receives CNP -> cuts rate", actor: "sender", note: "Sender NIC reads CNP, applies multiplicative decrease to injection rate. Total feedback delay: 2x RTT.", rtt: 2 },
]

const UEC_STEPS: Step[] = [
  { id: "u1", label: "Sender injects at 400G", actor: "sender", note: "Sender pushes packets at line rate. UEC ACKs for previous messages arrive on return path.", rtt: 0 },
  { id: "u2", label: "Switch buffer fills -> marks CE bit", actor: "switch", note: "Same ECN marking as DCQCN. Kmin/Kmax thresholds, same configuration on switch. CE set in IPv4 ECN field.", rtt: 0.5 },
  { id: "u3", label: "Receiver sees CE-marked packet", actor: "receiver", note: "NIC receives CE-marked packet. Sets C-flag in NEXT ACK packet it was going to send anyway.", rtt: 1 },
  { id: "u4", label: "ACK+C-flag travels to sender", actor: "receiver", note: "The ACK was already scheduled for SACK purposes. C-flag is a zero-cost piggyback on the existing ACK. No extra packet.", rtt: 1 },
  { id: "u5", label: "Sender receives ACK+C -> cuts rate", actor: "sender", note: "Sender NIC reads C-flag from incoming ACK. Applies rate reduction. Total feedback delay: 1x RTT.", rtt: 1.5 },
]

const ACTOR_COLORS: Record<string, string> = {
  sender: "#6366f1",
  switch: "#f59e0b",
  receiver: "#10b981",
  app: "#ef4444",
}

const ACTOR_LABELS: Record<string, string> = {
  sender: "Sender NIC",
  switch: "Switch",
  receiver: "Receiver NIC",
  app: "Application",
}

export function UECCongestionViz() {
  const [mode, setMode] = useState<"dcqcn" | "uec">("dcqcn")
  const [selected, setSelected] = useState<string | null>("d1")

  const steps = mode === "dcqcn" ? DCQCN_STEPS : UEC_STEPS
  const active = steps.find(s => s.id === selected) || steps[0]

  const maxRtt = Math.max(...steps.map(s => s.rtt ?? 0))

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: "24px", fontFamily: "monospace", color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          Congestion feedback loop: DCQCN (2x RTT) vs UEC (1x RTT)
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["dcqcn", "uec"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setSelected(m === "dcqcn" ? "d1" : "u1") }} style={{
              background: mode === m ? (m === "dcqcn" ? "#1c1007" : "#14532d") : "transparent",
              border: `1px solid ${mode === m ? (m === "dcqcn" ? "#f59e0b" : "#22c55e") : "#334155"}`,
              borderRadius: 5, padding: "5px 14px", cursor: "pointer",
              color: mode === m ? (m === "dcqcn" ? "#fde68a" : "#86efac") : "#64748b", fontSize: 11,
            }}>{m === "dcqcn" ? "DCQCN / RoCEv2" : "UEC"}</button>
          ))}
        </div>
      </div>

      {/* Timeline bar */}
      <div style={{ position: "relative", marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>RTT progression (click step for detail)</div>
        <div style={{ display: "flex", gap: 3 }}>
          {steps.map((step, i) => (
            <div
              key={step.id}
              onClick={() => setSelected(step.id)}
              style={{
                flex: 1, background: selected === step.id ? ACTOR_COLORS[step.actor] : ACTOR_COLORS[step.actor] + "44",
                borderRadius: 5, padding: "10px 6px", cursor: "pointer",
                textAlign: "center", transition: "all 0.15s",
                border: `2px solid ${selected === step.id ? ACTOR_COLORS[step.actor] : "transparent"}`,
              }}
            >
              <div style={{ fontSize: 9, color: "#fff", fontWeight: 600, marginBottom: 2 }}>Step {i + 1}</div>
              <div style={{ fontSize: 9, color: "#ffffffcc" }}>{ACTOR_LABELS[step.actor]}</div>
              {step.rtt !== undefined && (
                <div style={{ fontSize: 9, color: "#ffffff88", marginTop: 3 }}>t={step.rtt}x RTT</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active step detail */}
      {active && (
        <div style={{
          background: "#1e293b", borderRadius: 8, padding: 16,
          borderLeft: `4px solid ${ACTOR_COLORS[active.actor]}`,
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <span style={{
              background: ACTOR_COLORS[active.actor], color: "#fff",
              borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700,
            }}>
              {ACTOR_LABELS[active.actor]}
            </span>
            <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>{active.label}</span>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>{active.note}</div>
        </div>
      )}

      {/* RTT cost summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div style={{
          background: mode === "dcqcn" ? "#1c1007" : "#1e293b",
          border: `1px solid ${mode === "dcqcn" ? "#f59e0b" : "#334155"}`,
          borderRadius: 8, padding: 14,
        }}>
          <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 8 }}>DCQCN feedback cost</div>
          <div style={{ fontSize: 24, color: "#fde68a", fontWeight: 700, marginBottom: 4 }}>2x RTT</div>
          <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6 }}>
            Packet {"→"} CE {"→"} receiver {"→"} CNP packet {"→"} sender
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: "#78350f" }}>
            At 400G / 2us RTT: ~400 MB queued before sender responds
          </div>
        </div>
        <div style={{
          background: mode === "uec" ? "#14532d" : "#1e293b",
          border: `1px solid ${mode === "uec" ? "#22c55e" : "#334155"}`,
          borderRadius: 8, padding: 14,
        }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 8 }}>UEC feedback cost</div>
          <div style={{ fontSize: 24, color: "#86efac", fontWeight: 700, marginBottom: 4 }}>1x RTT</div>
          <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6 }}>
            Packet {"→"} CE {"→"} receiver sets C-flag {"→"} ACK {"→"} sender
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: "#14532d" }}>
            Same ECN switch config. No extra CNP packet. Signal on existing ACK.
          </div>
        </div>
      </div>

      {/* Switch config note */}
      <div style={{ background: "#1e293b", borderRadius: 6, padding: "10px 14px", fontSize: 11, color: "#64748b" }}>
        Switch ECN configuration is identical for both: Kmin/Kmax thresholds per traffic class, ECN marking enabled. The
        difference is entirely in what the endpoints do with the CE signal -- not in the switch.
      </div>
    </div>
  )
}

export default UECCongestionViz
