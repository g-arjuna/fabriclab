"use client"
import { useState } from "react"

// ── ParallelFSViz ─────────────────────────────────────────────────────────────
// Shows how a parallel file system stripes a checkpoint across N storage nodes.
// Slider: 1–16 storage nodes. Displays aggregate throughput and chunk size per node.
// Animated "stripe" flow from DGX nodes to storage nodes.

const CHECKPOINT_GB = 140
const PER_NODE_BW_GBS = 7 // GB/s per storage node (single NVMe SSD equivalent aggregate)

export function ParallelFSViz() {
  const [nodeCount, setNodeCount] = useState(8)
  const [fsType, setFsType] = useState<"beegfs" | "weka">("weka")
  const [animating, setAnimating] = useState(false)
  const [frame, setFrame] = useState(0)

  const chunkGB = CHECKPOINT_GB / nodeCount
  const aggregateBW = nodeCount * PER_NODE_BW_GBS
  const writeTime = CHECKPOINT_GB / aggregateBW
  const singleNodeTime = CHECKPOINT_GB / PER_NODE_BW_GBS

  const startAnim = () => {
    setAnimating(true)
    setFrame(0)
    let f = 0
    const tick = () => {
      f++
      setFrame(f)
      if (f < 20) setTimeout(tick, 80)
      else { setAnimating(false); setFrame(0) }
    }
    setTimeout(tick, 80)
  }

  const displayNodes = Math.min(nodeCount, 8)
  const nodeW = Math.floor(480 / displayNodes) - 8

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Parallel file system striping — 140 GB checkpoint
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Drag the slider to see how adding storage nodes increases aggregate write throughput
      </p>

      {/* FS type toggle */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        {(["beegfs", "weka"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFsType(f)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={{
              backgroundColor: fsType === f ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${fsType === f ? "#60a5fa" : "#1e293b"}`,
              color: fsType === f ? "#93c5fd" : "#475569",
            }}
          >
            {f === "beegfs" ? "BeeGFS (open source)" : "WEKA (commercial)"}
          </button>
        ))}
      </div>

      {/* Node count slider */}
      <div className="mb-5 rounded-xl bg-slate-800/50 p-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-400">Storage nodes</span>
          <span className="text-white font-bold font-mono text-lg">{nodeCount}</span>
        </div>
        <input
          type="range" min={1} max={16} value={nodeCount}
          onChange={e => setNodeCount(Number(e.target.value))}
          className="w-full accent-cyan-400 mb-1"
        />
        <div className="flex justify-between text-[9px] text-slate-600">
          <span>1 node (bottleneck)</span>
          <span>16 nodes (full scale)</span>
        </div>
      </div>

      {/* Stripe animation diagram */}
      <div className="mb-5 overflow-x-auto rounded-xl border border-white/8 bg-[#060d18] p-4">
        <svg viewBox="0 0 560 200" className="min-w-[560px]">

          {/* DGX source nodes (3 shown) */}
          {[0, 1, 2].map(i => {
            const x = 30 + i * 36
            const isActive = animating && frame > i * 3
            return (
              <g key={i}>
                <rect x={x} y={20} width={30} height={22} rx="4"
                  fill={isActive ? "#1e3a5f" : "#0f172a"}
                  stroke={isActive ? "#60a5fa" : "#1e293b"}
                  strokeWidth={isActive ? 1.5 : 1} />
                <text x={x + 15} y={35} textAnchor="middle" fill="#64748b" fontSize="7">
                  DGX {i}
                </text>
              </g>
            )
          })}
          <text x="90" y="60" textAnchor="middle" fill="#334155" fontSize="8">
            {nodeCount > 3 ? "+" : ""} checkpoint writers
          </text>

          {/* Stripe lines from source to storage nodes */}
          {Array.from({ length: displayNodes }, (_, i) => {
            const storageX = 140 + i * (nodeW + 8) + nodeW / 2
            const opacity = animating && frame > i ? 1 : 0.2
            const colors = ["#22c55e", "#60a5fa", "#a78bfa", "#f59e0b",
              "#10b981", "#38bdf8", "#818cf8", "#fbbf24"]
            return (
              <line key={i}
                x1={90} y1={55}
                x2={storageX} y2={105}
                stroke={colors[i % colors.length]}
                strokeWidth={animating && frame > i ? 2 : 0.5}
                opacity={opacity}
                strokeDasharray={animating && frame > i ? "4 3" : "none"}
              />
            )
          })}

          {/* Chunk label */}
          <text x={90} y={82} textAnchor="middle" fill="#475569" fontSize="8">
            {chunkGB.toFixed(1)} GB per node
          </text>

          {/* Storage nodes */}
          {Array.from({ length: displayNodes }, (_, i) => {
            const x = 140 + i * (nodeW + 8)
            const isLoaded = animating && frame > i
            const colors = ["#22c55e", "#60a5fa", "#a78bfa", "#f59e0b",
              "#10b981", "#38bdf8", "#818cf8", "#fbbf24"]
            const c = colors[i % colors.length]
            const fillH = isLoaded ? Math.min(60, (frame - i) * 5) : 0

            return (
              <g key={i}>
                {/* Storage node box */}
                <rect x={x} y={105} width={nodeW} height={60} rx="4"
                  fill="#0f172a" stroke={isLoaded ? c : "#1e293b"}
                  strokeWidth={isLoaded ? 1.5 : 1} />
                {/* Fill animation */}
                {fillH > 0 && (
                  <rect x={x + 2} y={105 + 60 - fillH} width={nodeW - 4} height={fillH} rx="3"
                    fill={c + "44"} />
                )}
                <text x={x + nodeW / 2} y={122} textAnchor="middle"
                  fill={isLoaded ? c : "#334155"} fontSize={nodeW > 40 ? 8 : 7} fontWeight="600">
                  Node {i}
                </text>
                {isLoaded && (
                  <text x={x + nodeW / 2} y={137} textAnchor="middle"
                    fill={c} fontSize={nodeW > 40 ? 7 : 6}>
                    {chunkGB.toFixed(1)} GB
                  </text>
                )}
              </g>
            )
          })}

          {nodeCount > displayNodes && (
            <text x={560} y={138} textAnchor="end" fill="#475569" fontSize="8">
              +{nodeCount - displayNodes} more
            </text>
          )}

          {/* Throughput label */}
          <text x="350" y="185" textAnchor="middle"
            fill="#60a5fa" fontSize="10" fontWeight="700">
            Aggregate write: {aggregateBW} GB/s
          </text>
          <text x="350" y="198" textAnchor="middle"
            fill="#475569" fontSize="8">
            Checkpoint time: {writeTime.toFixed(1)}s
            {nodeCount > 1 ? ` (vs ${singleNodeTime.toFixed(0)}s on 1 node)` : ""}
          </text>
        </svg>
      </div>

      <button
        onClick={startAnim}
        disabled={animating}
        className="mb-5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
        style={{
          backgroundColor: animating ? "#1e293b" : "#14532d",
          border: "1px solid #22c55e33",
          color: animating ? "#475569" : "#86efac",
        }}
      >
        {animating ? "Writing..." : "▶ Animate checkpoint write"}
      </button>

      {/* Throughput scaling */}
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[
          { nodes: 1, label: "Single node", note: "I/O bottleneck" },
          { nodes: 8, label: "8 nodes", note: "BasePOD standard" },
          { nodes: 16, label: "16 nodes", note: "Large cluster" },
        ].map(r => {
          const bw = r.nodes * PER_NODE_BW_GBS
          const t = CHECKPOINT_GB / bw
          return (
            <div key={r.nodes}
              className="rounded-xl p-3 text-center"
              style={{
                backgroundColor: nodeCount === r.nodes ? "#1e3a5f33" : "#0f172a",
                border: `1px solid ${nodeCount === r.nodes ? "#60a5fa" : "#1e293b"}`,
              }}
            >
              <div className="text-[10px] font-bold text-slate-300">{r.label}</div>
              <div className="text-[9px] text-slate-500">{r.note}</div>
              <div className="text-xs font-bold mt-1 text-cyan-400">{bw} GB/s</div>
              <div className="text-[9px] text-slate-500">{t.toFixed(1)}s / checkpoint</div>
            </div>
          )
        })}
      </div>

      {/* BeeGFS vs WEKA note */}
      <div className="rounded-xl bg-slate-800/40 border border-white/5 p-3">
        <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">
          {fsType === "beegfs" ? "BeeGFS — open source HPC parallel FS" : "WEKA — AI-optimised commercial FS"}
        </div>
        <div className="text-[10px] text-slate-400 leading-4">
          {fsType === "beegfs"
            ? "Runs on commodity x86 Linux servers. BeeGFS administrators manage storage servers, disks, and network paths directly. Widely deployed in HPC and academic AI clusters. Default stripe size: 512 KB–4 MB per chunk. Operations team owns the full stack."
            : "NVMe-optimised storage appliances with managed cluster protocol. WEKA handles internal data placement, rebalancing, and failure recovery automatically. Purpose-built for AI checkpoint I/O patterns. Managed appliance model — WEKA monitors and alerts, team consumes the POSIX file system interface."}
        </div>
      </div>
    </div>
  )
}

export default ParallelFSViz
