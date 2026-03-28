"use client"
import { useState } from "react"

// ── BandwidthComparisonViz ─────────────────────────────────────────────────
// Logarithmic bar chart comparing bandwidths across fabric types.
// Toggle between "per GPU" and "full cluster (256 GPU)" views.
// Helps readers internalise the 18× gap between NVLink Switch and IB.

type Mode = "per-gpu" | "cluster"

type BandwidthEntry = {
  label: string
  sublabel: string
  perGpu: number    // GB/s
  cluster: number   // TB/s for cluster, expressed as GB/s internally
  unit: string
  color: string
  note: string
}

const ENTRIES: BandwidthEntry[] = [
  {
    label: "NVLink Switch (scale-up)",
    sublabel: "4th-gen NVLink · 900 GB/s per GPU",
    perGpu: 900,
    cluster: 57600,   // 57.6 TB/s = 57,600 GB/s
    unit: "GB/s",
    color: "#f59e0b",
    note: "Same bandwidth whether peer GPU is in the same DGX node or a different one (within NVLink Switch fabric)",
  },
  {
    label: "IB NDR (scale-out)",
    sublabel: "ConnectX-7 · 400 Gbps = 50 GB/s per GPU",
    perGpu: 50,
    cluster: 3200,    // 32 nodes × 8 × 50 GB/s but bisection-limited, ~12.8 TB/s; practical AllReduce ~3.2 TB/s
    unit: "GB/s",
    color: "#3b82f6",
    note: "Practical AllReduce bandwidth after fat-tree bisection and protocol overhead. Raw aggregate is higher.",
  },
  {
    label: "PCIe Gen 5 (CPU↔GPU)",
    sublabel: "64 GB/s per direction",
    perGpu: 64,
    cluster: 2048,    // 256 GPUs × 8 GB/s approximate (PCIe shared)
    unit: "GB/s",
    color: "#6b7280",
    note: "Reference: the CPU-to-GPU PCIe link. GPU-to-GPU via PCIe (no NVLink) is limited to PCIe bandwidth.",
  },
  {
    label: "100GbE (Ethernet reference)",
    sublabel: "12.5 GB/s per port",
    perGpu: 12.5,
    cluster: 400,
    unit: "GB/s",
    color: "#374151",
    note: "Included as a reference baseline. Enterprise Ethernet speeds are orders of magnitude below AI fabric requirements.",
  },
]

const LOG_MAX = Math.log10(57600)
const LOG_MIN = Math.log10(10)

function logBar(val: number): number {
  if (val <= 0) return 0
  const logVal = Math.log10(Math.max(val, 10))
  return Math.min(100, ((logVal - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100)
}

function fmtBW(val: number, mode: Mode): string {
  if (mode === "cluster") {
    if (val >= 1000) return `${(val / 1000).toFixed(1)} TB/s`
    return `${val} GB/s`
  }
  return `${val} GB/s`
}

export function BandwidthComparisonViz() {
  const [mode, setMode] = useState<Mode>("cluster")
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">Bandwidth Comparison</p>
      <p className="mb-4 text-xs text-slate-600">
        Logarithmic scale — the gap is larger than it looks. Toggle between per-GPU and full 256-GPU cluster views.
      </p>

      {/* Mode toggle */}
      <div style={{ display: "flex", background: "#0f172a", borderRadius: 8, padding: 3, gap: 3, marginBottom: 20, width: "fit-content" }}>
        {([["per-gpu", "Per GPU"], ["cluster", "256-GPU Cluster"]] as [Mode, string][]).map(([m, label]) => (
          <button key={m}
            onClick={() => setMode(m)}
            style={{
              background: mode === m ? "#1d4ed8" : "transparent",
              color: mode === m ? "#fff" : "#64748b",
              border: "none", borderRadius: 6,
              padding: "5px 14px", fontSize: 12,
              cursor: "pointer", fontWeight: mode === m ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ENTRIES.map(e => {
          const val = mode === "per-gpu" ? e.perGpu : e.cluster
          const pct = logBar(val)
          const isExp = expanded === e.label
          return (
            <div key={e.label} style={{ cursor: "pointer" }}
              onClick={() => setExpanded(isExp ? null : e.label)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <div>
                  <span style={{ fontSize: 12, color: "#e2e8f0" }}>{e.label}</span>
                  <span style={{ fontSize: 10, color: "#475569", marginLeft: 8 }}>{e.sublabel}</span>
                </div>
                <span style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 13, fontWeight: 700,
                  color: e.color,
                }}>
                  {fmtBW(val, mode)}
                </span>
              </div>
              <div style={{ height: 14, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: e.color,
                  borderRadius: 4,
                  transition: "width 0.3s",
                  opacity: 0.85,
                }} />
              </div>
              {isExp && (
                <div style={{
                  background: "#0f172a", borderRadius: 6, padding: "6px 10px",
                  marginTop: 4, fontSize: 11, color: "#94a3b8", lineHeight: 1.5,
                }}>
                  {e.note}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Log scale note */}
      <div style={{
        marginTop: 14, background: "#0f172a", borderRadius: 8,
        padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, color: "#475569" }}>
          ⚠ Logarithmic scale — each grid division = 10× difference
        </span>
        <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
          {mode === "cluster"
            ? "NVLink Switch is 18× faster than IB at 256 GPUs"
            : "NVLink is 18× faster than IB per GPU"}
        </span>
      </div>
    </div>
  )
}

export default BandwidthComparisonViz
