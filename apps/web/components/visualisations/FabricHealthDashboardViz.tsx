"use client"
import { useState } from "react"

// ── FabricHealthDashboardViz ────────────────────────────────────────────────
// Grafana-style dashboard mockup for AI fabric health monitoring.
// Shows panels for link state, PFC rate, buffer util, symbol errors,
// GPU temp, and NVLink BW — with alert threshold lines.
// Toggle between "Healthy" and "Degrading" states.

type TimePoint = { t: number; value: number }

function deterministicNoise(i: number, base: number, noise: number) {
  const seeded = Math.sin((i + 1) * 12.9898 + base * 0.173 + noise * 0.317) * 43758.5453
  return seeded - Math.floor(seeded)
}

function genSeries(
  points: number,
  base: number,
  noise: number,
  spike?: { at: number; to: number; duration: number }
): TimePoint[] {
  return Array.from({ length: points }, (_, i) => {
    const rand = deterministicNoise(i, base, noise)
    let value = base + (Math.sin(i * 0.4) * noise * 0.3) + (rand * noise * 0.7 - noise * 0.35)
    if (spike && i >= spike.at && i < spike.at + spike.duration) {
      const progress = (i - spike.at) / spike.duration
      value = base + (spike.to - base) * Math.sin(progress * Math.PI)
    }
    return { t: i, value: Math.max(0, value) }
  })
}

type PanelDef = {
  id: string
  title: string
  unit: string
  threshold: number
  thresholdLabel: string
  thresholdDirection: "above" | "below"
  healthy: TimePoint[]
  degrading: TimePoint[]
  yMax: number
  color: string
  alertColor: string
}

const N = 30

const PANELS: PanelDef[] = [
  {
    id: "gpu_util",
    title: "GPU Utilisation",
    unit: "%",
    threshold: 80,
    thresholdLabel: "Min threshold (80%)",
    thresholdDirection: "below",
    healthy: genSeries(N, 96, 3),
    degrading: genSeries(N, 96, 3, { at: 18, to: 68, duration: 10 }),
    yMax: 100,
    color: "#22c55e",
    alertColor: "#ef4444",
  },
  {
    id: "nvlink_bw",
    title: "NVLink Bandwidth",
    unit: "GB/s",
    threshold: 400,
    thresholdLabel: "Min threshold (400 GB/s)",
    thresholdDirection: "below",
    healthy: genSeries(N, 820, 40),
    degrading: genSeries(N, 820, 40, { at: 16, to: 310, duration: 12 }),
    yMax: 1000,
    color: "#8b5cf6",
    alertColor: "#ef4444",
  },
  {
    id: "pfc_rate",
    title: "PFC Pause Rate",
    unit: "% link time",
    threshold: 10,
    thresholdLabel: "Alert threshold (10%)",
    thresholdDirection: "above",
    healthy: genSeries(N, 2, 1.5),
    degrading: genSeries(N, 2, 1.5, { at: 14, to: 22, duration: 14 }),
    yMax: 30,
    color: "#f59e0b",
    alertColor: "#ef4444",
  },
  {
    id: "symbol_err",
    title: "Symbol Error Rate",
    unit: "err/s",
    threshold: 0.17,
    thresholdLabel: "Alert threshold (0.17/s)",
    thresholdDirection: "above",
    healthy: genSeries(N, 0.02, 0.01),
    degrading: genSeries(N, 0.02, 0.01, { at: 12, to: 1.8, duration: 16 }),
    yMax: 2.5,
    color: "#3b82f6",
    alertColor: "#ef4444",
  },
  {
    id: "gpu_temp",
    title: "GPU Temperature",
    unit: "°C",
    threshold: 80,
    thresholdLabel: "Warning threshold (80°C)",
    thresholdDirection: "above",
    healthy: genSeries(N, 68, 3),
    degrading: genSeries(N, 68, 3, { at: 10, to: 84, duration: 18 }),
    yMax: 90,
    color: "#06b6d4",
    alertColor: "#f59e0b",
  },
  {
    id: "buffer_util",
    title: "Switch Buffer Util",
    unit: "%",
    threshold: 60,
    thresholdLabel: "Alert threshold (60%)",
    thresholdDirection: "above",
    healthy: genSeries(N, 18, 12),
    degrading: genSeries(N, 18, 12, { at: 15, to: 72, duration: 13 }),
    yMax: 100,
    color: "#ec4899",
    alertColor: "#ef4444",
  },
]

function Sparkline({
  series,
  threshold,
  direction,
  yMax,
  color,
  alertColor,
  width = 200,
  height = 60,
}: {
  series: TimePoint[]
  threshold: number
  direction: "above" | "below"
  yMax: number
  color: string
  alertColor: string
  width?: number
  height?: number
}) {
  if (series.length === 0) return null

  const pad = 4
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const xScale = (i: number) => pad + (i / (series.length - 1)) * innerW
  const yScale = (v: number) => pad + innerH - (v / yMax) * innerH

  const thresholdY = yScale(threshold)

  const points = series
    .map((p, i) => `${xScale(i).toFixed(1)},${yScale(p.value).toFixed(1)}`)
    .join(" ")

  // Check if latest value is in alert state
  const latest = series[series.length - 1].value
  const inAlert =
    direction === "above" ? latest > threshold : latest < threshold

  const lineColor = inAlert ? alertColor : color

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {/* Threshold line */}
      <line
        x1={pad} y1={thresholdY} x2={width - pad} y2={thresholdY}
        stroke="#ef4444"
        strokeWidth={1}
        strokeDasharray="4,3"
        opacity={0.6}
      />

      {/* Area fill */}
      <polygon
        points={`${xScale(0)},${yScale(0)} ${points} ${xScale(series.length - 1)},${yScale(0)}`}
        fill={lineColor}
        opacity={0.1}
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Latest value dot */}
      <circle
        cx={xScale(series.length - 1)}
        cy={yScale(latest)}
        r={3}
        fill={lineColor}
      />
    </svg>
  )
}

export function FabricHealthDashboardViz() {
  const [mode, setMode] = useState<"healthy" | "degrading">("healthy")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Fabric Health Dashboard</p>
          <p className="text-xs text-slate-600">
            Grafana-style panel layout. Dashed red lines = alert thresholds. Toggle to simulate a degrading fabric.
          </p>
        </div>
        <div style={{ display: "flex", background: "#0f172a", borderRadius: 8, padding: 3, gap: 3, flexShrink: 0 }}>
          {(["healthy", "degrading"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? (m === "healthy" ? "#166534" : "#7f1d1d") : "transparent",
                color: mode === m ? "#fff" : "#64748b",
                border: "none",
                borderRadius: 6,
                padding: "4px 12px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: mode === m ? 600 : 400,
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {PANELS.map(panel => {
          const series = mode === "healthy" ? panel.healthy : panel.degrading
          const latest = series[series.length - 1].value
          const inAlert =
            panel.thresholdDirection === "above"
              ? latest > panel.threshold
              : latest < panel.threshold

          return (
            <div key={panel.id} style={{
              background: "#0f172a",
              borderRadius: 10,
              padding: 12,
              border: `1px solid ${inAlert ? "#ef444430" : "#1e293b"}`,
            }}>
              {/* Panel header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>{panel.title}</span>
                {inAlert && (
                  <span style={{
                    fontSize: 9,
                    color: "#fca5a5",
                    background: "#7f1d1d",
                    padding: "1px 6px",
                    borderRadius: 3,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}>
                    ALERT
                  </span>
                )}
              </div>

              {/* Current value */}
              <div style={{ fontSize: 20, fontWeight: 700, color: inAlert ? panel.alertColor : panel.color, marginBottom: 4 }}>
                {latest.toFixed(panel.unit === "err/s" ? 2 : 0)}
                <span style={{ fontSize: 11, color: "#475569", fontWeight: 400, marginLeft: 3 }}>{panel.unit}</span>
              </div>

              {/* Sparkline */}
              <Sparkline
                series={series}
                threshold={panel.threshold}
                direction={panel.thresholdDirection}
                yMax={panel.yMax}
                color={panel.color}
                alertColor={panel.alertColor}
                width={180}
                height={50}
              />

              {/* Threshold label */}
              <div style={{ fontSize: 9, color: "#334155", marginTop: 4 }}>
                {panel.thresholdLabel}
              </div>
            </div>
          )
        })}
      </div>

      {/* Status bar */}
      <div style={{
        marginTop: 12,
        background: mode === "healthy" ? "#052e16" : "#450a0a",
        borderRadius: 8,
        padding: "8px 12px",
      }}>
        <span style={{ display: "block", fontSize: 12, color: mode === "healthy" ? "#86efac" : "#fca5a5", fontWeight: 600 }}>
          {mode === "healthy"
            ? "● All panels within threshold — fabric healthy"
            : "● 4 panels in alert state — investigate IB fabric and GPU utilisation"}
        </span>
        <span style={{ fontSize: 10, color: "#475569" }}>Last 30 samples · 60s interval</span>
      </div>
    </div>
  )
}

export default FabricHealthDashboardViz
