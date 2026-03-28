"use client"
import { useState } from "react"

// ── CorrelationTimelineViz ──────────────────────────────────────────────────
// Multi-row timeline showing how a single physical event (marginal DAC cable)
// cascades across four monitoring layers. Click an event to see its detail.
// Demonstrates why the earliest anomaly layer = root cause layer.

type LayerEvent = {
  id: string
  layer: string
  t: number          // minutes after T0
  label: string
  detail: string
  severity: "info" | "warning" | "critical"
  tool: string
}

const EVENTS: LayerEvent[] = [
  {
    id: "e1",
    layer: "Physical",
    t: 0,
    label: "Signal noise begins",
    detail: "Marginal DAC connector starts introducing pre-FEC bit errors. DSP in transceiver sees increased BER. No counter has incremented yet — this phase is invisible to monitoring.",
    severity: "info",
    tool: "Not yet visible",
  },
  {
    id: "e2",
    layer: "IB Fabric (UFM)",
    t: 0.25,
    label: "SymbolErrors increments",
    detail: "UFM detects symbol error rate rising on leaf-3 port 22 and DGX-07 HCA port 1. Both ends of the link show the same pattern — confirms it is a physical layer issue, not a logic error on one device.",
    severity: "warning",
    tool: "UFM REST /ports — symbol_error field",
  },
  {
    id: "e3",
    layer: "IB Fabric (UFM)",
    t: 3,
    label: "IBSymbolErrorRising alert fires",
    detail: "Prometheus rule: rate(symbol_errors[10m]) > 0.17 for 5m → alert fires. PagerDuty notification sent. Engineer investigates during business hours. Link is still Active — no job impact yet.",
    severity: "warning",
    tool: "Prometheus alert + Grafana",
  },
  {
    id: "e4",
    layer: "NCCL",
    t: 7,
    label: "AllReduce busbw drops",
    detail: "IB retransmissions are increasing. nccl-tests would show ~89 GB/s vs expected 146 GB/s. NCCL logs show timeout_count incrementing. Job is still running but 39% slower on AllReduce phases.",
    severity: "warning",
    tool: "NCCL logs / dcgm_fi_dev_nvlink_bandwidth (indirect)",
  },
  {
    id: "e5",
    layer: "GPU (DCGM)",
    t: 12,
    label: "GPU util drops to 71%",
    detail: "DGX-07 GPUs spend more time waiting at the AllReduce barrier. DCGM_FI_DEV_GPU_UTIL drops from 97% to 71%. GPUUtilDrop alert fires. Training is visibly slow — ML engineer may be noticing now.",
    severity: "critical",
    tool: "DCGM → Prometheus → Grafana",
  },
  {
    id: "e6",
    layer: "Training",
    t: 18,
    label: "NCCL timeout / watchdog abort",
    detail: "PyTorch DDP watchdog fires after sustained AllReduce timeout. Job either checkpoints and restarts (if checkpointing was configured) or fails entirely. 18 minutes of compute lost at minimum.",
    severity: "critical",
    tool: "Training framework logs",
  },
  {
    id: "e7",
    layer: "Social",
    t: 20,
    label: "ML engineer's Slack message",
    detail: "\"Hey, training seems really slow / crashed.\" — This is T+20 minutes. With proactive monitoring, the alert fired at T+3. The cable replacement window was T+3 to T+18 with zero job impact.",
    severity: "critical",
    tool: "Slack",
  },
]

const LAYERS = ["Physical", "IB Fabric (UFM)", "NCCL", "GPU (DCGM)", "Training", "Social"]
const LAYER_COLOR: Record<string, string> = {
  "Physical":       "#8b5cf6",
  "IB Fabric (UFM)": "#3b82f6",
  "NCCL":           "#06b6d4",
  "GPU (DCGM)":     "#f59e0b",
  "Training":       "#ef4444",
  "Social":         "#64748b",
}
const SEVERITY_COLOR = {
  info:     { dot: "#4ade80", bg: "#052e16" },
  warning:  { dot: "#fbbf24", bg: "#451a03" },
  critical: { dot: "#f87171", bg: "#450a0a" },
}

const TOTAL_MINUTES = 22

export function CorrelationTimelineViz() {
  const [selected, setSelected] = useState<string | null>("e3")

  const selectedEvent = selected ? EVENTS.find(e => e.id === selected) : null

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Cross-Layer Correlation Timeline</p>
      <p className="mb-4 text-xs text-slate-600">
        A single marginal DAC cable triggers a cascade across four monitoring layers. Click any event to see its detail.
        The layer that anomalies <em>first</em> is the root cause layer.
      </p>

      {/* T0 label */}
      <div style={{ display: "flex", gap: 16, marginBottom: 4, paddingLeft: 110 }}>
        <span style={{ fontSize: 10, color: "#475569" }}>T+0 min</span>
        <span style={{ fontSize: 10, color: "#475569", marginLeft: "auto", marginRight: 0 }}>T+22 min</span>
      </div>

      {/* Timeline rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {LAYERS.map(layer => {
          const layerEvents = EVENTS.filter(e => e.layer === layer)
          return (
            <div key={layer} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Layer label */}
              <div style={{ width: 100, flexShrink: 0 }}>
                <span style={{
                  fontSize: 10,
                  color: LAYER_COLOR[layer],
                  fontWeight: 600,
                  display: "block",
                  textAlign: "right",
                  paddingRight: 8,
                }}>
                  {layer}
                </span>
              </div>

              {/* Track */}
              <div style={{ flex: 1, height: 28, background: "#0f172a", borderRadius: 6, position: "relative" }}>
                {/* Faint tick marks every 5 min */}
                {[5, 10, 15, 20].map(t => (
                  <div key={t} style={{
                    position: "absolute",
                    left: `${(t / TOTAL_MINUTES) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: "#1e293b",
                  }} />
                ))}

                {layerEvents.map(ev => {
                  const isSelected = selected === ev.id
                  const colors = SEVERITY_COLOR[ev.severity]
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelected(isSelected ? null : ev.id)}
                      style={{
                        position: "absolute",
                        left: `${(ev.t / TOTAL_MINUTES) * 100}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: isSelected ? 14 : 10,
                        height: isSelected ? 14 : 10,
                        borderRadius: "50%",
                        background: colors.dot,
                        border: isSelected ? `2px solid #fff` : "none",
                        cursor: "pointer",
                        zIndex: 2,
                        transition: "all 0.15s",
                        padding: 0,
                      }}
                      title={ev.label}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time axis labels */}
      <div style={{ display: "flex", paddingLeft: 112, marginBottom: 16 }}>
        {[0, 5, 10, 15, 20].map(t => (
          <div key={t} style={{
            position: "relative",
            flex: t === 20 ? 0 : 1,
            fontSize: 9,
            color: "#334155",
          }}>
            T+{t}m
          </div>
        ))}
      </div>

      {/* Event detail panel */}
      {selectedEvent ? (
        <div style={{
          background: SEVERITY_COLOR[selectedEvent.severity].bg,
          borderRadius: 12,
          padding: 14,
          borderLeft: `3px solid ${SEVERITY_COLOR[selectedEvent.severity].dot}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 10, color: LAYER_COLOR[selectedEvent.layer], fontWeight: 700, letterSpacing: "0.06em" }}>
                {selectedEvent.layer}
              </span>
              <span style={{ fontSize: 10, color: "#475569", marginLeft: 8 }}>
                T+{selectedEvent.t}m
              </span>
            </div>
            <span style={{
              fontSize: 10,
              color: SEVERITY_COLOR[selectedEvent.severity].dot,
              background: "rgba(0,0,0,0.3)",
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 700,
            }}>
              {selectedEvent.severity.toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, margin: "0 0 6px" }}>
            {selectedEvent.label}
          </p>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px", lineHeight: 1.6 }}>
            {selectedEvent.detail}
          </p>
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "4px 10px", display: "inline-block" }}>
            <span style={{ fontSize: 10, color: "#64748b" }}>Tool: </span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#7dd3fc" }}>
              {selectedEvent.tool}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ background: "#0f172a", borderRadius: 12, padding: 14, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Click an event on the timeline to see its detail</p>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {Object.entries(SEVERITY_COLOR).map(([sev, colors]) => (
          <div key={sev} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.dot }} />
            <span style={{ fontSize: 10, color: "#475569", textTransform: "capitalize" }}>{sev}</span>
          </div>
        ))}
        <span style={{ fontSize: 10, color: "#334155", marginLeft: "auto" }}>
          With proactive monitoring: action at T+3m. Without: T+20m.
        </span>
      </div>
    </div>
  )
}

export default CorrelationTimelineViz
