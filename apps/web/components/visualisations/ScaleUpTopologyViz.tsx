"use client"
import { useState } from "react"

// ── ScaleUpTopologyViz ─────────────────────────────────────────────────────
// Interactive 2:1 tapered fat-tree topology for NVLink Switch System.
// Slider: 8 / 16 / 32 DGX nodes. Shows tier count, switch module count,
// and bandwidth numbers. Click a node or switch to highlight its links.

type Scale = 8 | 16 | 32

const CONFIGS: Record<Scale, {
  nodes: number
  gpus: number
  leafSwitches: number
  spineSwitches: number
  tiers: number
  allToAll: string
  hbmPool: string
  leafBW: string
  spineBW: string
}> = {
  8: {
    nodes: 8, gpus: 64,
    leafSwitches: 2, spineSwitches: 0,
    tiers: 1,
    allToAll: "14.4 TB/s",
    hbmPool: "5.1 TB",
    leafBW: "900 GB/s per GPU",
    spineBW: "—",
  },
  16: {
    nodes: 16, gpus: 128,
    leafSwitches: 4, spineSwitches: 2,
    tiers: 2,
    allToAll: "28.8 TB/s",
    hbmPool: "10.2 TB",
    leafBW: "900 GB/s per GPU",
    spineBW: "2:1 taper",
  },
  32: {
    nodes: 32, gpus: 256,
    leafSwitches: 8, spineSwitches: 4,
    tiers: 2,
    allToAll: "57.6 TB/s",
    hbmPool: "20.5 TB",
    leafBW: "900 GB/s per GPU",
    spineBW: "2:1 taper",
  },
}

const GPU_CLR    = "#7c3aed"
const LEAF_CLR   = "#d97706"
const SPINE_CLR  = "#b45309"
const LINK_CLR   = "#fbbf24"
const DIM_CLR    = "#1e293b"

export function ScaleUpTopologyViz() {
  const [scale, setScale] = useState<Scale>(32)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const cfg = CONFIGS[scale]

  // Layout: DGX nodes across bottom, leaf switches middle, spine switches top
  const W = 560
  const nodeW = Math.min(48, (W - 40) / cfg.nodes)
  const nodeSpacing = (W - 40) / cfg.nodes

  const nodeY   = 230
  const leafY   = 140
  const spineY  = 60

  const leafXs = Array.from({ length: cfg.leafSwitches }, (_, i) =>
    40 + (i + 0.5) * ((W - 80) / cfg.leafSwitches)
  )
  const spineXs = Array.from({ length: cfg.spineSwitches }, (_, i) =>
    40 + (i + 0.5) * ((W - 80) / Math.max(cfg.spineSwitches, 1))
  )
  const nodeXs = Array.from({ length: cfg.nodes }, (_, i) =>
    20 + (i + 0.5) * nodeSpacing
  )

  function isHighlighted(id: string) {
    if (!highlighted) return true
    return highlighted === id
  }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">NVLink Switch Topology</p>
      <p className="mb-4 text-xs text-slate-600">
        2:1 tapered fat-tree. Adjust node count to see how tiers and bandwidth scale. Click a node or switch to highlight its links.
      </p>

      {/* Scale selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([8, 16, 32] as Scale[]).map(s => (
          <button key={s}
            onClick={() => { setScale(s); setHighlighted(null) }}
            style={{
              background: scale === s ? "#92400e" : "#1e293b",
              color: scale === s ? "#fef3c7" : "#64748b",
              border: `1px solid ${scale === s ? "#d97706" : "#334155"}`,
              borderRadius: 8,
              padding: "5px 14px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {s} nodes / {s * 8} GPUs
          </button>
        ))}
      </div>

      {/* SVG diagram */}
      <svg viewBox={`0 0 ${W} 290`} style={{ width: "100%", maxWidth: W }}>
        {/* Spine → leaf links */}
        {spineXs.map((sx, si) =>
          leafXs.map((lx, li) => {
            const id = `spine-${si}`
            const dim = highlighted && highlighted !== id && highlighted !== `leaf-${li}`
            return (
              <line key={`sl-${si}-${li}`}
                x1={sx} y1={spineY + 16} x2={lx} y2={leafY - 2}
                stroke={dim ? DIM_CLR : LINK_CLR}
                strokeWidth={dim ? 0.5 : 1.5}
                opacity={dim ? 0.3 : 0.5} />
            )
          })
        )}

        {/* Leaf → node links */}
        {nodeXs.map((nx, ni) => {
          const leafIdx = Math.floor(ni / (cfg.nodes / cfg.leafSwitches))
          const lx = leafXs[Math.min(leafIdx, leafXs.length - 1)]
          const id = `node-${ni}`
          const leafId = `leaf-${leafIdx}`
          const dim = highlighted && highlighted !== id && highlighted !== leafId
          return (
            <line key={`ln-${ni}`}
              x1={lx} y1={leafY + 18} x2={nx} y2={nodeY - 2}
              stroke={dim ? DIM_CLR : LINK_CLR}
              strokeWidth={dim ? 0.5 : 1.2}
              opacity={dim ? 0.2 : 0.45} />
          )
        })}

        {/* Spine switches */}
        {spineXs.map((sx, i) => {
          const id = `spine-${i}`
          const dim = highlighted && !isHighlighted(id)
          return (
            <g key={id} style={{ cursor: "pointer" }}
              onClick={() => setHighlighted(highlighted === id ? null : id)}>
              <rect x={sx - 36} y={spineY} width={72} height={32} rx={6}
                fill={dim ? "#1a1000" : SPINE_CLR} opacity={dim ? 0.4 : 0.9} />
              <text x={sx} y={spineY + 20} fontSize={8} fill={dim ? "#475569" : "#fef3c7"}
                textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight="700">
                NVLink Spine {i + 1}
              </text>
            </g>
          )
        })}

        {/* Leaf switches */}
        {leafXs.map((lx, i) => {
          const id = `leaf-${i}`
          const dim = highlighted && !isHighlighted(id)
          return (
            <g key={id} style={{ cursor: "pointer" }}
              onClick={() => setHighlighted(highlighted === id ? null : id)}>
              <rect x={lx - 36} y={leafY} width={72} height={32} rx={6}
                fill={dim ? "#1a0f00" : LEAF_CLR} opacity={dim ? 0.4 : 0.9} />
              <text x={lx} y={leafY + 20} fontSize={8} fill={dim ? "#475569" : "#1c1917"}
                textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight="700">
                NVLink Leaf {i + 1}
              </text>
            </g>
          )
        })}

        {/* DGX nodes */}
        {nodeXs.map((nx, i) => {
          const id = `node-${i}`
          const dim = highlighted && !isHighlighted(id)
          return (
            <g key={id} style={{ cursor: "pointer" }}
              onClick={() => setHighlighted(highlighted === id ? null : id)}>
              <rect x={nx - nodeW / 2} y={nodeY} width={nodeW} height={36} rx={4}
                fill={dim ? "#0f0a1a" : GPU_CLR} opacity={dim ? 0.3 : 0.85} />
              <text x={nx} y={nodeY + 23} fontSize={7} fill={dim ? "#334155" : "#ede9fe"}
                textAnchor="middle" fontFamily="ui-monospace, monospace">
                {cfg.nodes <= 16 ? `N${i + 1}` : i < 9 ? `N${i+1}` : `N${i+1}`}
              </text>
            </g>
          )
        })}

        {/* Tier labels */}
        {cfg.tiers === 2 && (
          <text x={8} y={spineY + 20} fontSize={8} fill="#475569" fontFamily="ui-monospace, monospace">
            Spine
          </text>
        )}
        <text x={8} y={leafY + 20} fontSize={8} fill="#475569" fontFamily="ui-monospace, monospace">
          Leaf
        </text>
        <text x={8} y={nodeY + 20} fontSize={8} fill="#475569" fontFamily="ui-monospace, monospace">
          Nodes
        </text>

        {/* Bandwidth annotation */}
        <text x={W / 2} y={282} fontSize={9} fill="#fbbf24" textAnchor="middle" fontWeight="700">
          {cfg.allToAll} all-to-all · {cfg.hbmPool} unified HBM
        </text>
      </svg>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 12 }}>
        {[
          { label: "DGX nodes", value: `${cfg.nodes}` },
          { label: "Total GPUs", value: `${cfg.gpus}` },
          { label: "Leaf switches", value: `${cfg.leafSwitches}` },
          { label: "Spine switches", value: cfg.spineSwitches === 0 ? "—" : `${cfg.spineSwitches}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#0f172a", borderRadius: 8, padding: "8px 10px" }}>
            <p style={{ fontSize: 10, color: "#475569", margin: 0 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#fbbf24", margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ScaleUpTopologyViz
