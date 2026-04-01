'use client'
import { useState, useEffect, useRef } from "react"

type Phase = "idle" | "running" | "loss" | "sack" | "retransmit" | "done"

interface Packet {
  id: number
  offset: number
  status: "queued" | "inflight" | "delivered" | "lost" | "retransmit"
  path: number
  x: number
}

const PATHS = [
  { id: 0, label: "Path A (Spine-0)", color: "#6366f1" },
  { id: 1, label: "Path B (Spine-1)", color: "#06b6d4" },
  { id: 2, label: "Path C (Spine-2)", color: "#10b981" },
  { id: 3, label: "Path D (Spine-3)", color: "#f59e0b" },
]

export function UECReliabilityViz() {
  const [mode, setMode] = useState<"rocev2" | "uec">("uec")
  const [phase, setPhase] = useState<Phase>("idle")
  const [packets, setPackets] = useState<Packet[]>([])
  const [lost, setLost] = useState<Set<number>>(new Set())
  const [acked, setAcked] = useState<Set<number>>(new Set())
  const [recoveryMs, setRecoveryMs] = useState<number | null>(null)
  const [appStalled, setAppStalled] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPhase("idle")
    setPackets([])
    setLost(new Set())
    setAcked(new Set())
    setRecoveryMs(null)
    setAppStalled(false)
  }

  const runSimulation = () => {
    reset()
    const msgId = 42
    const totalPkts = 8
    const lostPkt = 3 // packet 3 is dropped by fabric

    const initPkts: Packet[] = Array.from({ length: totalPkts }, (_, i) => ({
      id: i,
      offset: i * 4096,
      status: "queued" as const,
      path: i % 4,
      x: 0,
    }))

    setPackets(initPkts)
    setPhase("running")

    // Step 1: packets go inflight
    timerRef.current = setTimeout(() => {
      setPackets(prev => prev.map(p => ({ ...p, status: "inflight" as const })))
    }, 300)

    // Step 2: most arrive, packet 3 is lost
    timerRef.current = setTimeout(() => {
      setPackets(prev => prev.map(p => ({
        ...p,
        status: p.id === lostPkt ? "lost" : "delivered" as Packet["status"],
      })))
      setLost(new Set([lostPkt]))
      setPhase("loss")
    }, 1200)

    if (mode === "rocev2") {
      // RoCEv2: QP enters ERROR state, app must intervene
      timerRef.current = setTimeout(() => {
        setAppStalled(true)
        setPhase("sack")
      }, 2000)

      timerRef.current = setTimeout(() => {
        setRecoveryMs(8)
        setPhase("done")
      }, 4500)
    } else {
      // UEC: SACK ACK sent, retransmit fires, recovery transparent
      timerRef.current = setTimeout(() => {
        setPhase("sack")
      }, 1800)

      timerRef.current = setTimeout(() => {
        setPackets(prev => prev.map(p => ({
          ...p,
          status: p.id === lostPkt ? "retransmit" as const : p.status,
        })))
        setPhase("retransmit")
      }, 2600)

      timerRef.current = setTimeout(() => {
        setPackets(prev => prev.map(p => ({
          ...p,
          status: "delivered" as const,
        })))
        setAcked(new Set(Array.from({ length: totalPkts }, (_, i) => i)))
        setRecoveryMs(0.014) // ~14us
        setPhase("done")
      }, 3400)
    }
  }

  const statusColor = (s: Packet["status"], path: number) => {
    if (s === "lost") return "#ef4444"
    if (s === "retransmit") return "#fbbf24"
    if (s === "delivered") return PATHS[path].color
    if (s === "inflight") return PATHS[path].color + "88"
    return "#334155"
  }

  const phaseLabels: Record<Phase, string> = {
    idle: "Click Run to start simulation",
    running: "Sender spraying 8 packets across 4 paths...",
    loss: mode === "rocev2" ? "Packet #3 dropped by fabric -- QP entering ERROR state!" : "Packet #3 dropped by fabric -- receiver sends SACK ACK",
    sack: mode === "rocev2" ? "Application stalled. NCCL detects QP error, resetting queue pair..." : "SACK identifies missing offset. NIC firmware queues retransmit.",
    retransmit: "Retransmit fired -- packet #3 re-sent on available path",
    done: mode === "rocev2"
      ? `Recovery complete -- ${recoveryMs}ms elapsed. Application resumed.`
      : `Recovery complete -- ~14us elapsed. Application saw no stall.`,
  }

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: "24px", fontFamily: "monospace", color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Packet loss recovery: RoCEv2 QP error vs UEC SACK retransmit</div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["rocev2", "uec"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); reset() }} style={{
              background: mode === m ? (m === "rocev2" ? "#2d1b1b" : "#14532d") : "transparent",
              border: `1px solid ${mode === m ? (m === "rocev2" ? "#ef4444" : "#22c55e") : "#334155"}`,
              borderRadius: 5, padding: "5px 14px", cursor: "pointer",
              color: mode === m ? (m === "rocev2" ? "#fca5a5" : "#86efac") : "#64748b", fontSize: 11,
            }}>{m === "rocev2" ? "RoCEv2 mode" : "UEC mode"}</button>
          ))}
        </div>
      </div>

      {/* Packet grid */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>Message ID 42 -- 8 packets, 4096B each, 32 KB total</div>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: 8 }, (_, i) => {
            const pkt = packets.find(p => p.id === i)
            const status = pkt?.status ?? "queued"
            const path = pkt?.path ?? (i % 4)
            return (
              <div key={i} style={{
                flex: 1, background: statusColor(status, path),
                borderRadius: 6, padding: "12px 6px",
                textAlign: "center", transition: "all 0.3s",
                border: status === "lost" ? "2px solid #ef4444" : status === "retransmit" ? "2px solid #fbbf24" : "2px solid transparent",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: status === "queued" ? "#475569" : "#fff" }}>
                  #{i}
                </div>
                <div style={{ fontSize: 9, color: status === "queued" ? "#334155" : "#ffffffaa", marginTop: 2 }}>
                  {PATHS[path].label.replace("Path ", "")}
                </div>
                <div style={{ fontSize: 9, color: status === "queued" ? "#334155" : "#ffffffcc", marginTop: 2 }}>
                  {status}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Path legend */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {PATHS.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
            <span style={{ fontSize: 10, color: "#64748b" }}>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div style={{
        background: phase === "loss" || phase === "sack" ? "#2d1b1b" : phase === "done" ? "#14532d" : "#1e293b",
        borderRadius: 8, padding: "12px 16px", marginBottom: 16,
        border: `1px solid ${phase === "loss" || phase === "sack" ? "#7f1d1d" : phase === "done" ? "#166534" : "#334155"}`,
      }}>
        <span style={{
          fontSize: 12,
          color: phase === "loss" || phase === "sack" ? "#fca5a5" : phase === "done" ? "#86efac" : "#94a3b8",
        }}>
          {phaseLabels[phase]}
        </span>
        {appStalled && mode === "rocev2" && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#f97316" }}>
            App stalled: NCCL QP reset + AllReduce restart required
          </div>
        )}
      </div>

      {/* Recovery comparison table */}
      {(phase === "done" || phase === "idle") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "#2d1b1b", borderRadius: 8, padding: 14, border: "1px solid #7f1d1d" }}>
            <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginBottom: 8 }}>RoCEv2 packet loss</div>
            {[
              ["QP state", "ERROR -- must be reset"],
              ["Recovery path", "App layer (NCCL)"],
              ["Recovery time", "~8-50 ms"],
              ["GPUs stalled?", "Yes -- AllReduce blocked"],
              ["Retransmit unit", "Entire AllReduce message"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#64748b" }}>{k}</span>
                <span style={{ fontSize: 10, color: "#fca5a5" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#14532d", borderRadius: 8, padding: 14, border: "1px solid #166534" }}>
            <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 8 }}>UEC packet loss</div>
            {[
              ["QP state", "Normal -- no error"],
              ["Recovery path", "NIC firmware (SACK)"],
              ["Recovery time", "~10-20 us (1 RTT)"],
              ["GPUs stalled?", "No -- NIC transparent"],
              ["Retransmit unit", "Missing packet(s) only"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#86efac44" }}>{k}</span>
                <span style={{ fontSize: 10, color: "#86efac" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button onClick={phase === "idle" ? runSimulation : reset} style={{
          background: "#1e3a5f", border: "1px solid #3b82f6",
          borderRadius: 8, padding: "10px 32px", cursor: "pointer",
          color: "#93c5fd", fontSize: 12, fontWeight: 600,
        }}>
          {phase === "idle" ? "Run simulation" : "Reset"}
        </button>
      </div>
    </div>
  )
}

export default UECReliabilityViz
