"use client"

import { useState } from "react"

type View = "nvlink" | "pcie" | "compare"

export function NVLinkViz() {
  const [view, setView] = useState<View>("nvlink")
  const [hoveredGpu, setHoveredGpu] = useState<number | null>(null)

  const gpus = [0, 1, 2, 3, 4, 5, 6, 7]
  const gpuPositions = [
    { x: 80, y: 60 }, { x: 200, y: 60 }, { x: 320, y: 60 }, { x: 440, y: 60 },
    { x: 80, y: 200 }, { x: 200, y: 200 }, { x: 320, y: 200 }, { x: 440, y: 200 },
  ]

  const nvSwitchPositions = [
    { x: 140, y: 130 }, { x: 260, y: 130 }, { x: 380, y: 130 }, { x: 260, y: 160 },
  ]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        NVLink — GPU-to-GPU fabric inside a DGX node
      </p>

      <div className="flex gap-2 mb-4">
        {(["nvlink", "pcie", "compare"] as View[]).map(v => (
          <button
            key={v}
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
              nvSwitchPositions.slice(0, 3).map((spos, si) => (
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
              Each GPU connects to all 4 NVSwitch chips → 900 GB/s total per GPU → hover to highlight
            </text>
          </svg>

          <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-slate-800 p-3">
              <div className="text-slate-400 mb-1">Per GPU bandwidth</div>
              <div className="text-green-300 font-bold text-base">900 GB/s</div>
              <div className="text-slate-500">to all other GPUs simultaneously</div>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <div className="text-slate-400 mb-1">Total fabric bandwidth</div>
              <div className="text-green-300 font-bold text-base">7.2 TB/s</div>
              <div className="text-slate-500">non-blocking, all-to-all</div>
            </div>
          </div>
        </div>
      )}

      {view === "pcie" && (
        <div>
          <div className="rounded-xl bg-slate-800/50 p-4 mb-4">
            <p className="text-sm leading-7 text-slate-300">
              Before NVSwitch, multi-GPU systems used PCIe. GPUs were connected to a PCIe root complex (the CPU), and GPU-to-GPU communication went through the CPU's PCIe bus. This meant two GPUs sharing one PCIe link had about 32 GB/s in each direction — roughly 35× slower than NVLink.
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              The first NVLink (2016, used in P100) gave 160 GB/s per GPU. NVLink gen2 (V100): 300 GB/s. NVLink gen3 (A100): 600 GB/s. NVLink gen4 (H100): 900 GB/s. Each generation doubled or nearly doubled the bandwidth.
            </p>
          </div>
          <div className="space-y-2">
            {[
              { label: "PCIe Gen 3 x16 (2016)", bw: "32 GB/s", pct: 3.5, color: "#374151" },
              { label: "PCIe Gen 4 x16 (2019)", bw: "64 GB/s", pct: 7, color: "#374151" },
              { label: "NVLink gen1 — P100 (2016)", bw: "160 GB/s", pct: 17.7, color: "#065f46" },
              { label: "NVLink gen2 — V100 (2017)", bw: "300 GB/s", pct: 33.3, color: "#065f46" },
              { label: "NVLink gen3 — A100 (2020)", bw: "600 GB/s", pct: 66.6, color: "#166534" },
              { label: "NVLink gen4 — H100 (2022)", bw: "900 GB/s", pct: 100, color: "#15803d" },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 text-xs">
                <span className="w-32 flex-shrink-0 text-slate-400 sm:w-44">{row.label}</span>
                <div className="flex-1 h-5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full flex items-center pl-2"
                    style={{ width: `${row.pct}%`, backgroundColor: row.color, minWidth: 40 }}>
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
          <p className="text-sm text-slate-400">Why tensor parallelism stays within a single node:</p>
          {[
            { label: "NVLink gen4 (H100 intra-node)", bw: 900, unit: "GB/s", color: "#15803d", note: "Intra-node — NVSwitch" },
            { label: "InfiniBand NDR 400G (inter-node)", bw: 50, unit: "GB/s", color: "#1d4ed8", note: "Inter-node — external fabric" },
            { label: "RoCEv2 400GbE (inter-node)", bw: 50, unit: "GB/s", color: "#0369a1", note: "Inter-node — external fabric" },
            { label: "PCIe Gen5 x16 (host interface)", bw: 128, unit: "GB/s", color: "#374151", note: "NIC to GPU — bidirectional" },
          ].map(row => (
            <div key={row.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{row.label}</span>
                <span className="text-slate-400">{row.note}</span>
              </div>
              <div className="h-6 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full flex items-center px-3"
                  style={{ width: `${(row.bw / 900) * 100}%`, backgroundColor: row.color, minWidth: 60 }}>
                  <span className="text-white text-xs font-bold">{row.bw} {row.unit}</span>
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500 mt-2">
            NVLink is 18× faster than InfiniBand NDR. This is why tensor parallelism (which requires constant all-to-all communication) runs within a single chassis, never across nodes.
          </p>
        </div>
      )}
    </div>
  )
}

export default NVLinkViz
