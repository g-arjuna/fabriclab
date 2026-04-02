"use client"
import { useState } from "react"

// ── TailLatencyViz ─────────────────────────────────────────────────────────
// Shows how a small per-operation failure rate compounds into near-certain
// stalls at scale. Sliders for GPU count and per-op failure rate.
// Core insight: "low loss" ≠ acceptable at AI training scale.

export function TailLatencyViz() {
  const [gpuCount, setGpuCount] = useState(256)
  const [failureRatePct, setFailureRatePct] = useState(0.1)
  const [opsPerStep, setOpsPerStep] = useState(1000)

  // P(at least one failure in N ops) = 1 - (1 - p)^N
  const p = failureRatePct / 100
  const totalOps = gpuCount * opsPerStep
  const pStall = 1 - Math.pow(1 - p, totalOps)
  const pStallPct = Math.min(99.99, pStall * 100)

  // Single-server equivalent (1 GPU, 1000 ops)
  const pSingle = 1 - Math.pow(1 - p, opsPerStep)
  const pSinglePct = pSingle * 100

  // Colour based on severity
  const stallColor =
    pStallPct > 90 ? "#ef4444"
    : pStallPct > 50 ? "#f59e0b"
    : "#22c55e"

  const singleColor =
    pSinglePct > 50 ? "#ef4444"
    : pSinglePct > 10 ? "#f59e0b"
    : "#22c55e"

  // Verdict text
  function verdict() {
    if (pStallPct > 95) return "Near-certain stall on every training step."
    if (pStallPct > 75) return "Stall on most training steps — job will be severely degraded."
    if (pStallPct > 40) return "Stall on many steps — visible throughput loss."
    if (pStallPct > 10) return "Occasional stalls — noticeable but not catastrophic."
    return "Stalls are rare — this fabric may be acceptable."
  }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Tail Latency — Why Scale Breaks Everything</p>
      <p className="mb-5 text-xs text-slate-600">
        Adjust the parameters to see how a small per-operation failure rate becomes a near-certain stall at training scale.
      </p>

      {/* Sliders */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          {
            label: "GPU count",
            value: gpuCount,
            min: 8, max: 1024, step: 8,
            display: `${gpuCount} GPUs`,
            set: setGpuCount,
          },
          {
            label: "Per-op failure rate",
            value: failureRatePct,
            min: 0.001, max: 1, step: 0.001,
            display: `${failureRatePct.toFixed(3)}%`,
            set: setFailureRatePct,
          },
          {
            label: "RDMA ops per step",
            value: opsPerStep,
            min: 100, max: 5000, step: 100,
            display: `${opsPerStep.toLocaleString()} ops`,
            set: setOpsPerStep,
          },
        ].map(({ label, value, min, max, step, display, set }) => (
          <div key={label} style={{ background: "#0f172a", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#7dd3fc" }}>
                {display}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={e => set(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#3b82f6" }}
            />
          </div>
        ))}
      </div>

      {/* Math display */}
      <div style={{ background: "#020617", borderRadius: 10, padding: 14, marginBottom: 16, fontFamily: "ui-monospace, monospace" }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Single server */}
          <div>
            <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Single-server / 1 GPU — {opsPerStep.toLocaleString()} ops
            </p>
            <p style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>
              P(stall) = 1 − (1 − {failureRatePct.toFixed(3)}%)^{opsPerStep.toLocaleString()}
            </p>
            <div style={{ fontSize: 28, fontWeight: 700, color: singleColor, marginBottom: 4 }}>
              {pSinglePct < 0.01
                ? `${(pSinglePct).toFixed(4)}%`
                : pSinglePct < 1
                ? `${pSinglePct.toFixed(2)}%`
                : `${pSinglePct.toFixed(1)}%`}
            </div>
            <p style={{ fontSize: 11, color: "#475569" }}>
              {pSinglePct < 1 ? "Acceptable for a single server" : "Already problematic"}
            </p>
          </div>

          {/* Cluster */}
          <div className="border-t border-slate-800 pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <p style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              {gpuCount}-GPU cluster — {totalOps.toLocaleString()} total ops
            </p>
            <p style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>
              P(stall) = 1 − (1 − {failureRatePct.toFixed(3)}%)^{totalOps.toLocaleString()}
            </p>
            <div style={{ fontSize: 28, fontWeight: 700, color: stallColor, marginBottom: 4 }}>
              {pStallPct > 99.99 ? ">99.99%" : `${pStallPct.toFixed(2)}%`}
            </div>
            <p style={{ fontSize: 11, color: stallColor }}>
              {verdict()}
            </p>
          </div>
        </div>
      </div>

      {/* Visual bar comparison */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>Single server</span>
            <span style={{ fontSize: 11, color: singleColor, fontFamily: "ui-monospace, monospace" }}>
              {pSinglePct.toFixed(2)}% stall probability per step
            </span>
          </div>
          <div style={{ height: 12, background: "#1e293b", borderRadius: 6 }}>
            <div style={{
              height: 12,
              width: `${Math.min(100, pSinglePct)}%`,
              background: singleColor,
              borderRadius: 6,
              transition: "width 0.2s, background 0.3s",
            }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>{gpuCount}-GPU cluster</span>
            <span style={{ fontSize: 11, color: stallColor, fontFamily: "ui-monospace, monospace" }}>
              {pStallPct > 99.99 ? ">99.99" : pStallPct.toFixed(2)}% stall probability per step
            </span>
          </div>
          <div style={{ height: 12, background: "#1e293b", borderRadius: 6 }}>
            <div style={{
              height: 12,
              width: `${Math.min(100, pStallPct)}%`,
              background: stallColor,
              borderRadius: 6,
              transition: "width 0.2s, background 0.3s",
            }} />
          </div>
        </div>
      </div>

      {/* Insight callout */}
      <div style={{
        background: "#0f172a",
        borderRadius: 10,
        padding: 12,
        borderLeft: "3px solid #3b82f6",
        fontSize: 12,
        color: "#94a3b8",
        lineHeight: 1.6,
      }}>
        <strong style={{ color: "#7dd3fc" }}>The key insight:</strong> {" "}
        "Low loss" networking that is perfectly acceptable for a single server becomes a near-constant
        source of AllReduce stalls at cluster scale. The math demands zero loss — not as a quality goal,
        but as a correctness requirement. This is why PFC and ECN exist.
      </div>
    </div>
  )
}

export default TailLatencyViz
