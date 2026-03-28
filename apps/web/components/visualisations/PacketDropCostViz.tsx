"use client"

import { useState } from "react"

type Scenario = "tcp" | "rdma_loss" | "rdma_lossless"

const scenarios: { id: Scenario; label: string; color: string }[] = [
  { id: "tcp", label: "TCP/IP (enterprise)", color: "#374151" },
  { id: "rdma_loss", label: "RDMA with packet loss", color: "#991b1b" },
  { id: "rdma_lossless", label: "RDMA lossless (target)", color: "#166534" },
]

// Step labels are scenario-specific so the lossless view shows what actually happens
const stepLabels: Record<Scenario, string[]> = {
  tcp: [
    "GPU0 starts AllReduce — sends 140 GB gradient tensor",
    "Network forwards tensor across fabric",
    "Packet dropped / lost in transit",
    "Sender detects loss (timeout / NACK)",
    "Retransmit unacknowledged packets (Go-Back-N)",
    "Other 255 GPUs wait at synchronisation barrier",
    "AllReduce finally completes",
    "All GPUs start next training step",
  ],
  rdma_loss: [
    "GPU0 starts AllReduce — sends 140 GB gradient tensor",
    "Network forwards tensor across fabric",
    "Packet dropped / lost in transit",
    "Sender detects loss (timeout / NACK)",
    "Retransmit all unacknowledged packets (Go-Back-N — catastrophic at scale)",
    "Other 255 GPUs wait at synchronisation barrier",
    "AllReduce finally completes",
    "Multiply by thousands of drops per day…",
  ],
  rdma_lossless: [
    "GPU0 starts AllReduce — sends 140 GB gradient tensor",
    "Network forwards tensor at full wire speed",
    "Packet drop prevented by link-level flow control (PFC)",
    "N/A — no loss to detect",
    "N/A — no retransmit needed",
    "No idle — all GPUs stay active throughout",
    "AllReduce completes — fastest possible",
    "All GPUs start next training step immediately",
  ],
}

const stepStates: Record<Scenario, ("ok" | "warn" | "fail" | "wait" | "idle")[]> = {
  tcp: ["ok", "ok", "warn", "wait", "ok", "wait", "ok", "ok"],
  rdma_loss: ["ok", "ok", "fail", "wait", "warn", "fail", "warn", "ok"],
  rdma_lossless: ["ok", "ok", "ok", "idle", "idle", "ok", "ok", "ok"],
}

const stepNotes: Record<Scenario, string[]> = {
  tcp: [
    "Normal operation",
    "TCP buffers packets in kernel",
    "TCP detects loss via timeout (~200ms)",
    "TCP retransmit timer fires — slow",
    "Packet retransmitted — full tensor OK",
    "Other GPUs idle during TCP recovery",
    "Complete — but ~200ms wasted",
    "Training continues — slowdown absorbed",
  ],
  rdma_loss: [
    "Normal operation",
    "RDMA bypasses kernel — faster than TCP",
    "Packet dropped — RDMA QP enters error state",
    "QP error detected — Go-Back-N forces retransmit from dropped packet onwards",
    "RDMA uses Go-Back-N: retransmits all unacknowledged packets from the dropped sequence number (PSN) onwards. With millions of packets in flight for a large tensor, this means retransmitting the vast majority of the transfer — far worse than TCP selective acknowledgement.",
    "All 255 GPUs idle — wasted GPU-hours",
    "Complete — but seconds wasted per drop",
    "Multiply by thousands of drops per day…",
  ],
  rdma_lossless: [
    "Normal operation",
    "RDMA bypasses kernel — full wire speed",
    "PFC (Priority Flow Control) sends a PAUSE frame to the upstream sender before buffers overflow, preventing the drop entirely. No packet is lost. The QP never enters error state.",
    "N/A — no loss to detect",
    "N/A — no retransmit needed",
    "No idle — all GPUs stay active",
    "Complete — fastest possible",
    "Maximum training throughput achieved",
  ],
}

const stepColors = {
  ok: { bg: "#14532d", border: "#22c55e", text: "#bbf7d0" },
  warn: { bg: "#78350f", border: "#f59e0b", text: "#fde68a" },
  fail: { bg: "#7f1d1d", border: "#ef4444", text: "#fecaca" },
  wait: { bg: "#1e1b4b", border: "#6366f1", text: "#c7d2fe" },
  idle: { bg: "#0f172a", border: "#1e293b", text: "#475569" },
}

export function PacketDropCostViz() {
  const [scenario, setScenario] = useState<Scenario>("rdma_loss")
  const [activeStep, setActiveStep] = useState<number | null>(null)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        The cost of a packet drop — click each step
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {scenarios.map(s => (
          <button
            key={s.id}
            onClick={() => { setScenario(s.id); setActiveStep(null) }}
            className="rounded-xl px-3 py-2 text-xs font-medium transition-all"
            style={{
              backgroundColor: scenario === s.id ? s.color : "#0f172a",
              border: `1px solid ${scenario === s.id ? s.color : "#1e293b"}`,
              color: scenario === s.id ? "#fff" : "#64748b",
              opacity: scenario === s.id ? 1 : 0.7,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {stepLabels[scenario].map((step, i) => {
          const state = stepStates[scenario][i]
          const colors = stepColors[state]
          const isActive = activeStep === i
          return (
            <button
              key={i}
              onClick={() => setActiveStep(isActive ? null : i)}
              className="w-full text-left rounded-xl px-4 py-2.5 transition-all flex items-start gap-3"
              style={{
                backgroundColor: isActive ? colors.bg : "#0f172a",
                border: `1px solid ${isActive ? colors.border : colors.border + "44"}`,
              }}
            >
              <span className="text-[10px] font-mono mt-0.5 flex-shrink-0" style={{ color: colors.border }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <span className="text-sm" style={{ color: colors.text }}>{step}</span>
                {isActive && (
                  <p className="mt-1.5 text-xs leading-5" style={{ color: colors.text, opacity: 0.8 }}>
                    {stepNotes[scenario][i]}
                  </p>
                )}
              </div>
              <span className="flex-shrink-0 text-[9px] uppercase tracking-widest mt-1" style={{ color: colors.border }}>
                {state === "idle" ? "n/a" : state}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl bg-slate-800/50 p-3 text-xs text-slate-400">
        {scenario === "tcp" && "TCP handles loss gracefully but slowly. For AI training, 'slowly' is expensive when you have 256 GPUs all waiting."}
        {scenario === "rdma_loss" && "RDMA with packet loss is worse than TCP — Go-Back-N retransmission from the dropped PSN onwards means the vast majority of the tensor must retransmit. This is why lossless networking is non-negotiable for RDMA."}
        {scenario === "rdma_lossless" && "With a lossless fabric (InfiniBand credit flow, or RoCEv2 with PFC+ECN), drops never occur. PFC pauses the sender before buffers overflow. RDMA runs at full wire speed. This is what we are trying to achieve."}
      </div>
    </div>
  )
}

export default PacketDropCostViz
