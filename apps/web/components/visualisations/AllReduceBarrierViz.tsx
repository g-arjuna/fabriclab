"use client"
import { useState, useEffect, useRef } from "react"

// ── AllReduceBarrierViz ────────────────────────────────────────────────────
// Animates the AllReduce barrier across N GPUs. One GPU is the straggler.
// Shows: all fast GPUs arrive at barrier, wait, straggler arrives late,
// then all advance together. Demonstrates why JCT = slowest participant.

const TOTAL_GPUS = 8
const STRAGGLER_IDX = 5

type Phase = "computing" | "sending" | "waiting" | "barrier" | "next-step"

export function AllReduceBarrierViz() {
  const [phase, setPhase] = useState<Phase>("computing")
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(false)
  const [stragglerDelay, setStragglerDelay] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const PHASES: Phase[] = ["computing", "sending", "waiting", "barrier", "next-step"]

  function startAnimation() {
    setPhase("computing")
    setTick(0)
    setStragglerDelay(false)
    setRunning(true)
  }

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setTick(t => {
        const next = t + 1
        if (next === 8)  { setPhase("sending"); return next }
        if (next === 16) { setPhase("waiting"); setStragglerDelay(true); return next }
        if (next === 28) { setPhase("barrier"); setStragglerDelay(false); return next }
        if (next === 34) { setPhase("next-step"); return next }
        if (next === 42) {
          setRunning(false)
          if (intervalRef.current) clearInterval(intervalRef.current)
          return next
        }
        return next
      })
    }, 120)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  // GPU progress 0–100
  function gpuProgress(idx: number): number {
    if (phase === "computing") return Math.min(100, (tick / 8) * 60)
    if (phase === "sending") {
      if (idx === STRAGGLER_IDX) return 60 + Math.min(20, ((tick - 8) / 8) * 20)
      return 60 + Math.min(35, ((tick - 8) / 8) * 35)
    }
    if (phase === "waiting") {
      if (idx === STRAGGLER_IDX) return 80 + Math.min(20, ((tick - 16) / 12) * 20)
      return 95
    }
    if (phase === "barrier") return 100
    if (phase === "next-step") return 100
    return 0
  }

  function gpuState(idx: number): "computing" | "sending" | "waiting" | "done" | "straggling" {
    if (phase === "computing") return "computing"
    if (phase === "sending") {
      if (idx === STRAGGLER_IDX) return "straggling"
      return "sending"
    }
    if (phase === "waiting") {
      if (idx === STRAGGLER_IDX) return "straggling"
      return "waiting"
    }
    return "done"
  }

  const stateColor = {
    computing: "#3b82f6",
    sending:   "#8b5cf6",
    waiting:   "#f59e0b",
    done:      "#22c55e",
    straggling: "#ef4444",
  }

  const phaseLabel: Record<Phase, string> = {
    computing:  "All GPUs computing gradients...",
    sending:    "GPUs sending gradients over fabric — GPU 5 is slower",
    waiting:    "GPUs 0–4, 6–7 at barrier. Waiting for GPU 5 (straggler).",
    barrier:    "All GPUs arrived. AllReduce completes. Barrier releases.",
    "next-step": "All GPUs advance to next training step together.",
  }

  const idleGPUs = (phase === "waiting") ? TOTAL_GPUS - 1 : 0

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">AllReduce Barrier</p>
      <p className="mb-4 text-xs text-slate-600">
        The barrier enforces synchronisation: no GPU advances until every GPU completes. One straggler idles all others.
      </p>

      {/* Phase label */}
      <div style={{
        background: "#0f172a",
        borderRadius: 8,
        padding: "8px 14px",
        marginBottom: 16,
        minHeight: 36,
        display: "flex",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{phaseLabel[phase]}</span>
        {idleGPUs > 0 && (
          <span style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "#fbbf24",
            background: "#451a03",
            padding: "2px 10px",
            borderRadius: 4,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {idleGPUs} GPU{idleGPUs > 1 ? "s" : ""} idle — waiting
          </span>
        )}
      </div>

      {/* GPU lanes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {Array.from({ length: TOTAL_GPUS }, (_, i) => {
          const state = gpuState(i)
          const progress = gpuProgress(i)
          const isStraggler = i === STRAGGLER_IDX
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* GPU label */}
              <div style={{
                width: 52,
                fontSize: 11,
                color: isStraggler ? "#fca5a5" : "#64748b",
                fontFamily: "ui-monospace, monospace",
                flexShrink: 0,
                textAlign: "right",
              }}>
                GPU {i}{isStraggler ? " ★" : ""}
              </div>

              {/* Progress track */}
              <div style={{
                flex: 1,
                height: 20,
                background: "#1e293b",
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
              }}>
                <div style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: stateColor[state],
                  borderRadius: 4,
                  transition: "width 0.12s linear, background 0.3s",
                  opacity: state === "waiting" ? 0.5 : 1,
                }} />
                {/* Barrier line at 100% */}
                <div style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "#334155",
                }} />
              </div>

              {/* State label */}
              <div style={{
                width: 70,
                fontSize: 10,
                color: stateColor[state],
                flexShrink: 0,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {state === "computing" ? "compute"
                  : state === "sending" ? "sending"
                  : state === "waiting" ? "WAITING"
                  : state === "straggling" ? "SLOW"
                  : "✓ done"}
              </div>
            </div>
          )
        })}
      </div>

      {/* Barrier line label */}
      <div style={{ display: "flex", paddingLeft: 62, marginBottom: 12 }}>
        <div style={{ flex: 1, borderTop: "1px dashed #334155", marginTop: 4 }} />
        <span style={{ fontSize: 10, color: "#475569", marginLeft: 8 }}>← barrier</span>
      </div>

      {/* Key insight */}
      {phase === "waiting" && (
        <div style={{
          background: "#451a03",
          border: "1px solid #f59e0b40",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 12,
          fontSize: 12,
          color: "#fcd34d",
          lineHeight: 1.5,
        }}>
          7 of 8 GPUs are idle. GPU utilisation = 12.5%. The fabric is not the bottleneck right now — the barrier is. Every ms GPU 5 takes extra is a ms all others waste.
        </div>
      )}
      {phase === "next-step" && (
        <div style={{
          background: "#052e16",
          border: "1px solid #22c55e40",
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 12,
          fontSize: 12,
          color: "#86efac",
          lineHeight: 1.5,
        }}>
          Barrier released. All 8 GPUs advance together. JCT for this step = GPU 5's time, not the average.
        </div>
      )}

      {/* Control */}
      <button
        onClick={startAnimation}
        disabled={running}
        style={{
          background: running ? "#1e293b" : "#1d4ed8",
          color: running ? "#475569" : "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 20px",
          fontSize: 12,
          cursor: running ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        {running ? "Running…" : phase === "computing" && tick === 0 ? "▶ Run simulation" : "↺ Replay"}
      </button>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { color: stateColor.computing,  label: "Computing" },
          { color: stateColor.sending,    label: "Sending (fabric)" },
          { color: stateColor.waiting,    label: "Waiting at barrier" },
          { color: stateColor.straggling, label: "Straggler (GPU 5)" },
          { color: stateColor.done,       label: "Barrier passed" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 10, color: "#64748b" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AllReduceBarrierViz
