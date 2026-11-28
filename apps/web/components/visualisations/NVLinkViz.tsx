"use client"

import { useState } from "react"

type View = "nvlink" | "pcie" | "compare"

export function NVLinkViz() {
  const [view, setView] = useState<View>("nvlink")
  const [hoveredGpu, setHoveredGpu] = useState<number | null>(null)
  const [directionMode, setDirectionMode] = useState<"direction" | "bidirectional">("direction")

  const gpus = [0, 1, 2, 3, 4, 5, 6, 7]
  const gpuPositions = [
    { x: 80, y: 60 }, { x: 200, y: 60 }, { x: 320, y: 60 }, { x: 440, y: 60 },
    { x: 80, y: 200 }, { x: 200, y: 200 }, { x: 320, y: 200 }, { x: 440, y: 200 },
  ]

  const nvSwitchPositions = [
    { x: 140, y: 130 }, { x: 260, y: 130 }, { x: 380, y: 130 }, { x: 260, y: 160 },
  ]

  return (
    <div data-testid="nvlink-viz" className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        NVLink — GPU-to-GPU fabric inside a DGX node
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["nvlink", "pcie", "compare"] as View[]).map(v => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: view === v ? "#14532d" : "#0f172a",
              border: `1px solid ${view === v ? "#22c55e" : "#1e293b"}`,
              color: view === v ? "#bbf7d0" : "#64748b",
            }}
          >
            {v === "nvlink" ? "NVLink topology" : v === "pcie" ? "PCIe (what came before)" : "Bandwidth comparison"}
          </button>
        ))}
      </div>

      {view === "nvlink" && (
        <div>
          <svg viewBox="0 0 540 280" className="w-full max-w-lg mx-auto">
            {/* NVSwitch chips */}
            {nvSwitchPositions.map((pos, i) => (
              <g key={i}>
                <rect x={pos.x - 30} y={pos.y - 14} width={60} height={28} rx={6}
                  fill="#1e3a8a" stroke="#3b82f6" strokeWidth={1} />
                <text x={pos.x} y={pos.y - 2} textAnchor="middle" fill="#93c5fd" fontSize={8} fontWeight="600">NVSwitch</text>
                <text x={pos.x} y={pos.y + 9} textAnchor="middle" fill="#60a5fa" fontSize={7}>{i + 1}</text>
              </g>
            ))}

            {/* Lines from GPUs to NVSwitches (simplified as spokes) */}
            {gpuPositions.map((gpos, gi) => (
              nvSwitchPositions.map((spos, si) => (
                <line key={`${gi}-${si}`}
                  x1={gpos.x} y1={gpos.y}
                  x2={spos.x} y2={spos.y}
                  stroke={hoveredGpu === gi ? "#22c55e" : "#1e3a5f"}
                  strokeWidth={hoveredGpu === gi ? 2 : 1}
                  opacity={hoveredGpu === null || hoveredGpu === gi ? 0.6 : 0.15}
                />
              ))
            ))}

            {/* GPU nodes */}
            {gpuPositions.map((pos, i) => (
              <g key={i}
                onMouseEnter={() => setHoveredGpu(i)}
                onMouseLeave={() => setHoveredGpu(null)}
                style={{ cursor: "pointer" }}
              >
                <rect x={pos.x - 32} y={pos.y - 22} width={64} height={44} rx={8}
                  fill={hoveredGpu === i ? "#14532d" : "#166534"}
                  stroke={hoveredGpu === i ? "#4ade80" : "#15803d"}
                  strokeWidth={hoveredGpu === i ? 2 : 1}
                />
                <text x={pos.x} y={pos.y - 6} textAnchor="middle" fill="#bbf7d0" fontSize={9} fontWeight="700">H100</text>
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="#86efac" fontSize={8}>GPU {i}</text>
                <text x={pos.x} y={pos.y + 15} textAnchor="middle" fill="#4ade80" fontSize={7}>80 GB</text>
              </g>
            ))}

            {/* Legend */}
            <text x={10} y={268} fill="#475569" fontSize={8}>
              Each GPU connects to all 4 NVSwitch chips · 900 GB/s aggregate bidirectional endpoint bandwidth per GPU
            </text>
          </svg>

          <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-slate-800 p-3">
              <div className="text-slate-400 mb-1">Per-GPU endpoint bandwidth</div>
              <div className="text-green-300 font-bold text-base">900 GB/s</div>
              <div className="text-slate-500">aggregate bidirectional · 450 GB/s nominal per direction</div>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <div className="text-slate-400 mb-1">System endpoint bandwidth</div>
              <div className="text-green-300 font-bold text-base">7.2 TB/s</div>
              <div className="text-slate-500">8 GPUs × 900 GB/s bidirectional endpoints</div>
            </div>
          </div>
        </div>
      )}

      {view === "pcie" && (
        <div>
          <div className="rounded-xl bg-slate-800/50 p-4 mb-4">
            <p className="text-sm leading-7 text-slate-300">
              Before NVSwitch, multi-GPU systems commonly relied on PCIe for GPU-to-GPU communication. PCIe peer-to-peer traffic does not inherently require the CPU to copy data, but the PCIe topology, root-complex placement, and NUMA boundaries constrain bandwidth and latency. PCIe Gen4 x16 provides approximately 31.5 GB/s per direction before transaction-level overhead, far below NVLink 4 at 450 GB/s nominal per direction.
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              NVLink is commonly quoted as aggregate bidirectional endpoint bandwidth per GPU: gen1 160 GB/s, gen2 300 GB/s, gen3 600 GB/s, and gen4 900 GB/s. The chart below normalizes every row to nominal bandwidth in one direction so PCIe and NVLink can be compared consistently.
            </p>
          </div>
          <div className="space-y-2">
            {[
              { label: "PCIe Gen3 x16 / direction", bw: "15.75 GB/s", pct: 3.5, color: "#374151" },
              { label: "PCIe Gen4 x16 / direction", bw: "31.5 GB/s", pct: 7, color: "#374151" },
              { label: "NVLink gen1 / direction", bw: "80 GB/s", pct: 17.7, color: "#065f46" },
              { label: "NVLink gen2 / direction", bw: "150 GB/s", pct: 33.3, color: "#065f46" },
              { label: "NVLink gen3 / direction", bw: "300 GB/s", pct: 66.6, color: "#166534" },
              { label: "NVLink gen4 / direction", bw: "450 GB/s", pct: 100, color: "#15803d" },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 text-xs">
                <span className="w-24 flex-shrink-0 text-[10px] leading-4 text-slate-400 sm:w-44 sm:text-xs">{row.label}</span>
                <div className="flex-1 h-5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full flex items-center pl-2"
                    style={{ width: `${row.pct}%`, backgroundColor: row.color }}>
                    <span className="text-white font-semibold text-[10px]">{row.bw}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "compare" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">Bandwidth comparison using one direction convention at a time:</p>
            <div className="flex gap-2" role="group" aria-label="Bandwidth comparison convention">
              {(["direction", "bidirectional"] as const).map((mode) => (
                <button key={mode} type="button" aria-pressed={directionMode === mode} onClick={() => setDirectionMode(mode)}
                  className="rounded-lg px-3 py-1.5 text-xs"
                  style={{ backgroundColor: directionMode === mode ? "#082f49" : "#0f172a", border: `1px solid ${directionMode === mode ? "#38bdf8" : "#1e293b"}`, color: directionMode === mode ? "#bae6fd" : "#94a3b8" }}>
                  {mode === "direction" ? "Per direction" : "Aggregate bidirectional"}
                </button>
              ))}
            </div>
          </div>
          {(directionMode === "direction" ? [
          { label: "NVLink gen4 per direction", bw: 450, unit: "GB/s", color: "#15803d", note: "900 GB/s aggregate bidirectional endpoint bandwidth" },
            { label: "400G external per direction", bw: 50, unit: "GB/s", color: "#1d4ed8", note: "400 Gb/s ÷ 8 = 50 GB/s line-rate conversion" },
            { label: "PCIe Gen5 x16 per direction", bw: 63, unit: "GB/s", color: "#374151", note: "approximate payload-rate figure before transaction-level overhead" },
          ] : [
          { label: "NVLink gen4 aggregate bidirectional", bw: 900, unit: "GB/s", color: "#15803d", note: "450 GB/s per direction" },
            { label: "400G external aggregate bidirectional", bw: 100, unit: "GB/s", color: "#1d4ed8", note: "50 GB/s per direction" },
            { label: "PCIe Gen5 x16 aggregate bidirectional", bw: 126, unit: "GB/s", color: "#374151", note: "approximately 63 GB/s per direction before overhead" },
          ]).map(row => (
            <div key={row.label} data-testid={`bandwidth-row-${row.bw}`}>
              <div className="flex flex-wrap justify-between gap-x-3 text-xs mb-1">
                <span className="text-slate-300">{row.label}</span>
                <span className="text-slate-400">{row.note}</span>
              </div>
              <div className="relative h-6 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full" data-testid={`bandwidth-bar-${row.bw}`}
                  style={{ width: `${(row.bw / (directionMode === "direction" ? 450 : 900)) * 100}%`, backgroundColor: row.color }} />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-xs font-bold drop-shadow">{row.bw} {row.unit}</span>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500 mt-2">
            The comparison convention is explicit and homogeneous. Per direction, 450 GB/s NVLink versus 50 GB/s for 400G is 9:1. Aggregating both directions gives 900 GB/s versus 100 GB/s, also 9:1. Bar widths are proportional to the displayed numerical values; labels are overlaid rather than inflating small bars.
          </p>
        </div>
      )}
    </div>
  )
}

export default NVLinkViz
