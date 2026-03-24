"use client"
import { useState } from "react"

// ── StorageDataPathViz ────────────────────────────────────────────────────────
// Before GDS: 5-hop path through CPU RAM (two copies).
// After GDS: 3-hop direct path, CPU never touches data.
// Animated flow shows data moving hop by hop. Toggle between modes.

type Mode = "before" | "after"

const beforeHops = [
  { id: "storage", label: "Storage appliance", sub: "NVMe SSD", color: "#14532d", border: "#22c55e", x: 40 },
  { id: "nic",     label: "DPU / NIC",         sub: "RX buffer", color: "#1e3a5f", border: "#60a5fa", x: 165 },
  { id: "kram",    label: "System RAM",         sub: "kernel buffer", color: "#4c1d95", border: "#a78bfa", x: 290 },
  { id: "uram",    label: "System RAM",         sub: "user buffer", color: "#4c1d95", border: "#818cf8", x: 415 },
  { id: "gpu",     label: "GPU HBM",            sub: "training data", color: "#7f1d1d", border: "#ef4444", x: 540 },
]

const afterHops = [
  { id: "storage", label: "Storage appliance", sub: "NVMe SSD", color: "#14532d", border: "#22c55e", x: 80 },
  { id: "dpu",     label: "BlueField-3 DPU",   sub: "DMA engine", color: "#065f46", border: "#10b981", x: 270 },
  { id: "gpu",     label: "GPU HBM",            sub: "training data", color: "#7f1d1d", border: "#ef4444", x: 460 },
]

export function StorageDataPathViz() {
  const [mode, setMode] = useState<Mode>("before")
  const [activeHop, setActiveHop] = useState<number>(-1)
  const [playing, setPlaying] = useState(false)

  const hops = mode === "before" ? beforeHops : afterHops

  const play = () => {
    setPlaying(true)
    setActiveHop(-1)
    let i = 0
    const step = () => {
      setActiveHop(i)
      i++
      if (i < hops.length) {
        setTimeout(step, 700)
      } else {
        setTimeout(() => { setPlaying(false); setActiveHop(-1) }, 800)
      }
    }
    setTimeout(step, 200)
  }

  const cpuCopies = mode === "before" ? 2 : 0
  const hopCount = hops.length

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        GPUDirect Storage — data path comparison
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Before GDS: data passes through CPU RAM twice. After GDS: DPU DMA writes directly to GPU HBM.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        {(["before", "after"] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setActiveHop(-1) }}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1"
            style={{
              backgroundColor: mode === m
                ? m === "before" ? "#7f1d1d" : "#14532d"
                : "#0f172a",
              border: `1px solid ${mode === m
                ? m === "before" ? "#ef4444" : "#22c55e"
                : "#1e293b"}`,
              color: mode === m ? "#fff" : "#475569",
            }}
          >
            {m === "before" ? "Before GDS — 5 hops, 2 CPU copies" : "After GDS — 3 hops, 0 CPU copies"}
          </button>
        ))}
      </div>

      {/* Diagram */}
      <div className="rounded-xl bg-[#060d18] border border-white/8 p-4 mb-4">
        <svg viewBox={`0 0 640 ${mode === "before" ? 200 : 160}`} className="w-full">

          {/* CPU RAM label for before mode */}
          {mode === "before" && (
            <>
              <rect x="265" y="8" width="190" height="80" rx="6"
                fill="#4c1d9511" stroke="#4c1d9544" strokeWidth="1" strokeDasharray="4 2" />
              <text x="360" y="22" textAnchor="middle" fill="#818cf8" fontSize="8">CPU involved</text>
            </>
          )}

          {/* Hop boxes */}
          {hops.map((h, i) => {
            const isActive = activeHop === i
            const isDone = activeHop > i
            return (
              <g key={h.id}>
                <rect
                  x={h.x} y={mode === "before" ? 92 : 60}
                  width={100} height={52} rx="6"
                  fill={isActive || isDone ? h.color + "55" : h.color + "22"}
                  stroke={isActive || isDone ? h.border : h.border + "44"}
                  strokeWidth={isActive ? 2 : 1}
                />
                <text x={h.x + 50} y={mode === "before" ? 112 : 80}
                  textAnchor="middle" fill={isActive || isDone ? "#fff" : "#64748b"}
                  fontSize="9" fontWeight="600">
                  {h.label}
                </text>
                <text x={h.x + 50} y={mode === "before" ? 128 : 96}
                  textAnchor="middle"
                  fill={isActive || isDone ? h.border : "#334155"}
                  fontSize="8">
                  {h.sub}
                </text>

                {/* Arrow to next hop */}
                {i < hops.length - 1 && (
                  <g>
                    <line
                      x1={h.x + 100}
                      y1={mode === "before" ? 118 : 86}
                      x2={hops[i + 1].x}
                      y2={mode === "before" ? 118 : 86}
                      stroke={activeHop > i ? hops[i + 1].border : "#1e293b"}
                      strokeWidth="1.5"
                    />
                    <polygon
                      points={`${hops[i + 1].x},${mode === "before" ? 114 : 82} ${hops[i + 1].x},${mode === "before" ? 122 : 90} ${hops[i + 1].x + 6},${mode === "before" ? 118 : 86}`}
                      fill={activeHop > i ? hops[i + 1].border : "#1e293b"}
                    />

                    {/* CPU copy badge for before mode between user and kernel */}
                    {mode === "before" && i === 1 && (
                      <>
                        <rect x={h.x + 105} y={mode === "before" ? 100 : 68} width={55} height={18} rx="4"
                          fill="#7f1d1d33" stroke="#ef444433" strokeWidth="1" />
                        <text x={h.x + 132} y={mode === "before" ? 113 : 81}
                          textAnchor="middle" fill="#ef4444" fontSize="7">CPU copy</text>
                      </>
                    )}
                    {mode === "before" && i === 2 && (
                      <>
                        <rect x={h.x + 105} y={mode === "before" ? 100 : 68} width={55} height={18} rx="4"
                          fill="#7f1d1d33" stroke="#ef444433" strokeWidth="1" />
                        <text x={h.x + 132} y={mode === "before" ? 113 : 81}
                          textAnchor="middle" fill="#ef4444" fontSize="7">CPU copy</text>
                      </>
                    )}
                  </g>
                )}
              </g>
            )
          })}

          {/* Hop counter */}
          <text x="320" y={mode === "before" ? 185 : 145}
            textAnchor="middle"
            fill="#475569" fontSize="9">
            {`${hopCount} hops · ${cpuCopies} CPU copies`}
            {mode === "after" ? " · zero-copy" : ""}
          </text>
        </svg>
      </div>

      {/* Play button */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={play}
          disabled={playing}
          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            backgroundColor: playing ? "#1e293b" : "#1e3a5f",
            border: "1px solid #60a5fa33",
            color: playing ? "#475569" : "#93c5fd",
          }}
        >
          {playing ? "Animating..." : "▶ Animate data flow"}
        </button>
      </div>

      {/* Stats comparison */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Before GDS",
            stats: [
              { k: "Hops", v: "5" },
              { k: "CPU copies", v: "2" },
              { k: "System RAM touched", v: "Yes — twice" },
              { k: "cudaMemcpy required", v: "Yes" },
              { k: "640 GB HBM load time", v: "~3.2 sec" },
            ],
            c: "#ef4444", bg: "#7f1d1d",
          },
          {
            label: "After GDS",
            stats: [
              { k: "Hops", v: "3" },
              { k: "CPU copies", v: "0" },
              { k: "System RAM touched", v: "Never" },
              { k: "cudaMemcpy required", v: "No" },
              { k: "640 GB HBM load time", v: "~1.4 sec" },
            ],
            c: "#22c55e", bg: "#14532d",
          },
        ].map(col => (
          <div key={col.label} className="rounded-xl p-3"
            style={{ backgroundColor: col.bg + "22", border: `1px solid ${col.c}33` }}>
            <div className="text-[10px] font-bold mb-2" style={{ color: col.c }}>{col.label}</div>
            {col.stats.map(s => (
              <div key={s.k} className="flex justify-between gap-2 mb-1">
                <span className="text-[9px] text-slate-500">{s.k}</span>
                <span className="text-[9px] text-slate-300 font-medium text-right">{s.v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default StorageDataPathViz
