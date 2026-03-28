"use client"
import { useState } from "react"

// ── AlertThresholdViz ───────────────────────────────────────────────────────
// Interactive threshold calibration. Adjust alert thresholds for PFC pause
// rate and symbol error rate to see the false-positive / false-negative
// trade-off. The signal and noise distributions are illustrative.

type MetricConfig = {
  id: string
  label: string
  unit: string
  min: number
  max: number
  step: number
  defaultThreshold: number
  trueEventRate: number    // events per day that are real faults
  noiseRate: number        // events per day that are normal variance
  thresholdMin: number     // safe lower bound
  thresholdMax: number     // safe upper bound
  lowNote: string
  highNote: string
  goodRange: string
}

const METRICS: MetricConfig[] = [
  {
    id: "pfc",
    label: "PFC pause rate",
    unit: "% of link time paused",
    min: 0,
    max: 30,
    step: 1,
    defaultThreshold: 10,
    trueEventRate: 2,
    noiseRate: 12,
    thresholdMin: 5,
    thresholdMax: 15,
    lowNote: "Too sensitive — PFC fires normally under load. You will alert on every burst absorption event. Alert fatigue sets in within days.",
    highNote: "Too permissive — by the time pause rate exceeds 25%, the fabric may be in deadlock. You are catching faults after significant job impact.",
    goodRange: "8–12%: catches sustained congestion (DCQCN misconfiguration, sender not backing off) while ignoring normal burst absorption.",
  },
  {
    id: "symbol_err",
    label: "Symbol error rate",
    unit: "errors / second",
    min: 0,
    max: 5,
    step: 0.1,
    defaultThreshold: 0.17,
    trueEventRate: 1,
    noiseRate: 8,
    thresholdMin: 0.1,
    thresholdMax: 0.5,
    lowNote: "Alerting on >0 symbol errors/sec will fire on almost every link in a large IB fabric. Cosmic ray events and marginal transceivers produce occasional errors that FEC corrects invisibly.",
    highNote: "At >0.5/s you are already in active link degradation territory. The cable may fail within hours. Earlier detection is better here.",
    goodRange: "0.17/s (10/min) for 5 min: catches sustained degradation while ignoring isolated FEC-corrected events. Track baseline per-link for tighter calibration.",
  },
  {
    id: "buffer",
    label: "Switch buffer utilisation",
    unit: "% occupied",
    min: 0,
    max: 100,
    step: 5,
    defaultThreshold: 60,
    trueEventRate: 3,
    noiseRate: 10,
    thresholdMin: 40,
    thresholdMax: 75,
    lowNote: "Buffer utilisation hits 40%+ routinely during AllReduce scatter phases on GPU-facing ports. This threshold will produce multiple alerts per training job.",
    highNote: "At 80%+ you are already dropping packets or relying entirely on PFC to pause the sender. Some jobs complete anyway — but this is late detection.",
    goodRange: "60% sustained for >1 min: captures ports that are not draining between AllReduce phases, which indicates persistent congestion rather than normal burst.",
  },
]

function computeSignal(metric: MetricConfig, threshold: number) {
  // Illustrative model: events above threshold per day
  // true faults above threshold, noise above threshold
  const range = metric.max - metric.min
  const t = (threshold - metric.min) / range // normalised 0–1

  // True fault distribution: skewed toward higher values
  const trueDetected = metric.trueEventRate * Math.max(0, 1 - t * 0.8)
  const trueMissed = metric.trueEventRate * Math.min(1, t * 0.8)

  // Noise distribution: mostly at lower values
  const noiseAlerts = metric.noiseRate * Math.max(0, 1 - t * 1.5)

  return {
    trueDetected: Math.round(trueDetected * 10) / 10,
    trueMissed: Math.round(trueMissed * 10) / 10,
    falsePositives: Math.round(noiseAlerts * 10) / 10,
    actionRatio: trueDetected > 0
      ? Math.round((trueDetected / (trueDetected + noiseAlerts)) * 100)
      : 0,
  }
}

export function AlertThresholdViz() {
  const [selectedMetric, setSelectedMetric] = useState<string>("pfc")
  const [thresholds, setThresholds] = useState<Record<string, number>>(
    Object.fromEntries(METRICS.map(m => [m.id, m.defaultThreshold]))
  )

  const metric = METRICS.find(m => m.id === selectedMetric)!
  const threshold = thresholds[selectedMetric]
  const signal = computeSignal(metric, threshold)

  const isLow = threshold < metric.thresholdMin
  const isHigh = threshold > metric.thresholdMax
  const isGood = !isLow && !isHigh

  const noteText = isLow ? metric.lowNote : isHigh ? metric.highNote : metric.goodRange
  const noteColor = isLow ? "#fca5a5" : isHigh ? "#fcd34d" : "#86efac"
  const noteBg = isLow ? "#450a0a" : isHigh ? "#451a03" : "#052e16"

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Alert Threshold Calibration</p>
      <p className="mb-5 text-xs text-slate-600">
        Adjust the threshold and observe the false-positive / false-negative trade-off. Rates shown are illustrative events per day.
      </p>

      {/* Metric selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {METRICS.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedMetric(m.id)}
            style={{
              background: selectedMetric === m.id ? "#1d4ed8" : "#1e293b",
              color: selectedMetric === m.id ? "#fff" : "#94a3b8",
              border: `1px solid ${selectedMetric === m.id ? "#3b82f6" : "#334155"}`,
              borderRadius: 8,
              padding: "5px 14px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Alert threshold</span>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 14, color: "#7dd3fc" }}>
            {threshold}{" "}<span style={{ fontSize: 11, color: "#475569" }}>{metric.unit}</span>
          </span>
        </div>
        <input
          type="range"
          min={metric.min}
          max={metric.max}
          step={metric.step}
          value={threshold}
          onChange={e => setThresholds(prev => ({ ...prev, [selectedMetric]: parseFloat(e.target.value) }))}
          style={{ width: "100%", accentColor: "#3b82f6" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#334155" }}>{metric.min} {metric.unit}</span>
          <span style={{ fontSize: 10, color: "#334155" }}>{metric.max} {metric.unit}</span>
        </div>
      </div>

      {/* Signal / noise bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Faults caught", value: signal.trueDetected, color: "#22c55e", max: metric.trueEventRate },
          { label: "Faults missed", value: signal.trueMissed, color: "#ef4444", max: metric.trueEventRate },
          { label: "False alerts / day", value: signal.falsePositives, color: "#f59e0b", max: metric.noiseRate },
          { label: "Alert→action %", value: signal.actionRatio, color: "#3b82f6", max: 100 },
        ].map(item => (
          <div key={item.label} style={{ background: "#0f172a", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: item.color, marginBottom: 8 }}>
              {typeof item.value === "number" && item.label.includes("%")
                ? `${item.value}%`
                : item.value}
            </div>
            {/* Mini bar */}
            <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
              <div style={{
                height: 4,
                width: `${Math.min(100, (item.value / item.max) * 100)}%`,
                background: item.color,
                borderRadius: 2,
                transition: "width 0.2s",
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Calibration note */}
      <div style={{ background: noteBg, border: `1px solid ${noteColor}30`, borderRadius: 10, padding: 12 }}>
        <p style={{ fontSize: 10, color: noteColor, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          {isGood ? "Good range" : isLow ? "Too sensitive" : "Too permissive"}
        </p>
        <p style={{ fontSize: 12, color: noteColor, margin: 0, lineHeight: 1.6 }}>
          {noteText}
        </p>
      </div>
    </div>
  )
}

export default AlertThresholdViz
