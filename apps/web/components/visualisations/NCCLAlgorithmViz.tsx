"use client"
import { useState, useEffect } from "react"

type Algo = "ring" | "tree" | "dbt"

const algoData: Record<
  Algo,
  {
    label: string
    stepCount: (n: number) => number
    bwEfficiency: string
    bestFor: string
    worstFor: string
    color: string
    border: string
    phases: string[]
    description: string
  }
> = {
  ring: {
    label: "Ring AllReduce",
    stepCount: (n) => 2 * (n - 1),
    bwEfficiency: "~100% (every GPU always active)",
    bestFor: "Small clusters (<=32 nodes), low-latency balanced fabrics",
    worstFor: "Large clusters -- step count grows linearly with N",
    color: "#14532d",
    border: "#22c55e",
    phases: ["Reduce-scatter: share + sum shards around ring", "AllGather: broadcast reduced shards"],
    description:
      "Each GPU sends one shard to the next GPU and receives one from the previous. After N-1 steps every GPU holds one reduced shard. Then N-1 more steps distribute all shards to all GPUs.",
  },
  tree: {
    label: "Binary Tree AllReduce",
    stepCount: (n) => Math.ceil(Math.log2(n)) * 2,
    bwEfficiency: "~50% (half of GPUs idle at each level)",
    bestFor: "Latency-constrained small messages where step count dominates",
    worstFor: "Large messages on large clusters -- idle GPUs waste bandwidth",
    color: "#4c1d95",
    border: "#a78bfa",
    phases: ["Reduce: each leaf sends to parent, sum upward to root", "Broadcast: root sends complete result down to all leaves"],
    description:
      "log2(N) steps to reduce, log2(N) steps to broadcast. Dramatic reduction in step count vs ring. But at each level, half the GPUs are waiting -- effective bandwidth is ~50% of ring.",
  },
  dbt: {
    label: "Double Binary Tree (DBT)",
    stepCount: (n) => Math.ceil(Math.log2(n)) * 2,
    bwEfficiency: "~95% (two trees, each GPU active in at least one)",
    bestFor: "Large clusters (>32 nodes) -- NCCL default for large AllReduce",
    worstFor: "Very small clusters where ring's simplicity wins",
    color: "#78350f",
    border: "#f59e0b",
    phases: [
      "Tree 1: Reduce up left-rooted tree + Tree 2 simultaneously",
      "Tree 2: Broadcast down right-rooted tree + Tree 1 simultaneously",
    ],
    description:
      "Two binary trees with roots at different GPU positions. GPUs idle in Tree 1 are active in Tree 2. Every GPU is always doing useful work. Achieves log2(N) steps AND near-100% bandwidth -- NCCL's default for large operations.",
  },
}

const GPU_COUNTS = [8, 32, 128, 256, 1024]

export function NCCLAlgorithmViz() {
  const [algo, setAlgo] = useState<Algo>("ring")
  const [gpuCount, setGpuCount] = useState(32)
  const [animStep, setAnimStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const d = algoData[algo]
  const maxSteps = Math.min(d.stepCount(gpuCount), 8)

  useEffect(() => {
    if (!playing) return
    if (animStep >= maxSteps) { setPlaying(false); return }
    const t = setTimeout(() => setAnimStep((s) => s + 1), 700)
    return () => clearTimeout(t)
  }, [playing, animStep, maxSteps])

  const ringSize = Math.min(gpuCount, 8)
  const ringRadius = 70
  const cx = 140
  const cy = 110

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        NCCL AllReduce algorithms -- interactive comparison
      </p>

      {/* Algorithm selector */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {(["ring", "tree", "dbt"] as Algo[]).map((a) => (
          <button
            key={a}
            onClick={() => { setAlgo(a); setAnimStep(0); setPlaying(false) }}
            className="rounded-xl px-3 py-3 text-xs transition-all text-left"
            style={{
              backgroundColor: algo === a ? algoData[a].color + "55" : "#0f172a",
              border: `1px solid ${algo === a ? algoData[a].border : "#1e293b"}`,
            }}
          >
            <div className="font-bold text-sm mb-0.5" style={{ color: algo === a ? algoData[a].border : "#64748b" }}>
              {algoData[a].label}
            </div>
            <div className="text-[9px] text-slate-600">{algoData[a].bwEfficiency}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        {/* Animation panel */}
        <div className="rounded-xl bg-[#060d18] border border-white/8 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500">Communication pattern</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setAnimStep(0); setPlaying(true) }}
                className="text-[10px] rounded px-2 py-1"
                style={{ backgroundColor: d.color + "44", color: d.border }}
              >
                Play
              </button>
              <button
                onClick={() => { setPlaying(false); setAnimStep(0) }}
                className="text-[10px] rounded px-2 py-1 bg-slate-800 text-slate-400"
              >
                Reset
              </button>
            </div>
          </div>

          <svg viewBox="0 0 280 220" className="w-full">
            {algo === "ring" && (
              <>
                {/* Ring arrangement */}
                {Array.from({ length: ringSize }, (_, i) => {
                  const angle = (i / ringSize) * 2 * Math.PI - Math.PI / 2
                  const x = cx + ringRadius * Math.cos(angle)
                  const y = cy + ringRadius * Math.sin(angle)
                  const nextAngle = ((i + 1) / ringSize) * 2 * Math.PI - Math.PI / 2
                  const nx = cx + ringRadius * Math.cos(nextAngle)
                  const ny = cy + ringRadius * Math.sin(nextAngle)
                  const isActive = animStep > 0 && (i % ringSize) < animStep

                  return (
                    <g key={i}>
                      <line x1={x} y1={y} x2={nx} y2={ny}
                        stroke={isActive ? d.border : "#1e293b"} strokeWidth="1.5"
                        markerEnd={isActive ? "url(#arrow-green)" : undefined}/>
                      <circle cx={x} cy={y} r={16}
                        fill={isActive ? d.color + "aa" : "#0f172a"}
                        stroke={isActive ? d.border : "#334155"} strokeWidth="1.5"/>
                      <text x={x} y={y + 4} textAnchor="middle" fill={isActive ? d.border : "#64748b"} fontSize="8" fontWeight="700">
                        G{i}
                      </text>
                    </g>
                  )
                })}
                <defs>
                  <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M 0 0 L 6 3 L 0 6 z" fill={d.border}/>
                  </marker>
                </defs>
                <text x={cx} y={cy - 4} textAnchor="middle" fill="#64748b" fontSize="8">
                  Step {animStep}/{maxSteps}
                </text>
                <text x={cx} y={cy + 10} textAnchor="middle" fill={d.border} fontSize="7" fontWeight="600">
                  {animStep < maxSteps / 2 ? "reduce-scatter" : "allgather"}
                </text>
              </>
            )}
            {algo === "tree" && (
              <>
                {/* Binary tree layout */}
                {[
                  { id: 0, x: 140, y: 30, children: [1, 2], level: 0 },
                  { id: 1, x: 80, y: 90, children: [3, 4], level: 1 },
                  { id: 2, x: 200, y: 90, children: [5, 6], level: 1 },
                  { id: 3, x: 50, y: 160, children: [], level: 2 },
                  { id: 4, x: 110, y: 160, children: [], level: 2 },
                  { id: 5, x: 170, y: 160, children: [], level: 2 },
                  { id: 6, x: 230, y: 160, children: [], level: 2 },
                ].map((node) => {
                  const isReducing = animStep <= 2
                  const isActiveReduce = isReducing && node.level >= (2 - animStep)
                  const isActiveBroadcast = !isReducing && node.level <= (animStep - 3)
                  const isActive = isActiveReduce || isActiveBroadcast

                  return (
                    <g key={node.id}>
                      {node.children.map((childId) => {
                        const child = [
                          { x: 140, y: 30 }, { x: 80, y: 90 }, { x: 200, y: 90 },
                          { x: 50, y: 160 }, { x: 110, y: 160 }, { x: 170, y: 160 }, { x: 230, y: 160 }
                        ][childId]
                        return (
                          <line key={childId} x1={node.x} y1={node.y} x2={child.x} y2={child.y}
                            stroke={isActive ? d.border : "#1e293b"} strokeWidth="1.5"/>
                        )
                      })}
                      <circle cx={node.x} cy={node.y} r={15}
                        fill={isActive ? d.color + "aa" : node.id === 0 ? "#1a2744" : "#0f172a"}
                        stroke={isActive ? d.border : node.id === 0 ? "#334155" : "#1e293b"} strokeWidth="1.5"/>
                      <text x={node.x} y={node.y + 4} textAnchor="middle"
                        fill={isActive ? d.border : "#64748b"} fontSize="8" fontWeight="700">
                        G{node.id}
                      </text>
                    </g>
                  )
                })}
                <text x={140} y={205} textAnchor="middle" fill="#64748b" fontSize="8">
                  Step {animStep}/{maxSteps} -- {animStep <= 2 ? "Reduce up to root" : "Broadcast down from root"}
                </text>
              </>
            )}
            {algo === "dbt" && (
              <>
                {/* DBT -- show two overlapping trees */}
                {Array.from({ length: 8 }, (_, i) => {
                  const x = 25 + i * 30
                  const y = 160
                  const tree1Active = animStep > 0 && i % 2 === 0
                  const tree2Active = animStep > 0 && i % 2 === 1
                  return (
                    <g key={i}>
                      <rect x={x - 12} y={y - 12} width="24" height="24" rx="4"
                        fill={tree1Active ? "#14532daa" : tree2Active ? "#78350faa" : "#0f172a"}
                        stroke={tree1Active ? "#22c55e" : tree2Active ? "#f59e0b" : "#334155"}
                        strokeWidth="1.5"/>
                      <text x={x} y={y + 4} textAnchor="middle"
                        fill={tree1Active ? "#22c55e" : tree2Active ? "#f59e0b" : "#64748b"}
                        fontSize="7" fontWeight="700">G{i}</text>
                    </g>
                  )
                })}
                {/* Tree connections */}
                {[0,2,4].map(i => (
                  <line key={`t1-${i}`} x1={25+i*30} y1={148} x2={25+(i+2)*30} y2={100}
                    stroke={animStep > 0 ? "#22c55e" : "#1e293b"} strokeWidth="1" opacity={0.7}/>
                ))}
                {[1,3,5].map(i => (
                  <line key={`t2-${i}`} x1={25+i*30} y1={148} x2={25+(i+2)*30} y2={100}
                    stroke={animStep > 0 ? "#f59e0b" : "#1e293b"} strokeWidth="1" opacity={0.7}/>
                ))}
                <rect x={90} y={85} width="24" height="24" rx="4" fill="#14532daa" stroke="#22c55e" strokeWidth="1.5"/>
                <text x={102} y={100} textAnchor="middle" fill="#22c55e" fontSize="7">T1</text>
                <rect x={130} y={85} width="24" height="24" rx="4" fill="#78350faa" stroke="#f59e0b" strokeWidth="1.5"/>
                <text x={142} y={100} textAnchor="middle" fill="#f59e0b" fontSize="7">T2</text>

                <text x={140} y={40} textAnchor="middle" fill="#22c55e" fontSize="8">Tree 1 (even GPUs)</text>
                <text x={140} y={55} textAnchor="middle" fill="#f59e0b" fontSize="8">Tree 2 (odd GPUs)</text>
                <text x={140} y={205} textAnchor="middle" fill="#64748b" fontSize="8">
                  Both trees run simultaneously -- every GPU always active
                </text>
              </>
            )}
          </svg>
        </div>

        {/* Stats and info panel */}
        <div className="space-y-2 text-xs">
          <div className="rounded-xl bg-slate-800/50 p-3">
            <div className="text-[10px] text-slate-500 uppercase mb-2">Performance at {gpuCount} GPUs</div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Steps required</span>
                <span className="font-bold" style={{ color: d.border }}>
                  {d.stepCount(gpuCount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bandwidth efficiency</span>
                <span className="font-bold" style={{ color: d.border }}>{d.bwEfficiency}</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[10px] text-slate-600 mb-1.5">Adjust GPU count:</div>
              <div className="flex flex-wrap gap-1.5">
                {GPU_COUNTS.map((n) => (
                  <button key={n} onClick={() => setGpuCount(n)}
                    className="rounded px-2 py-1 text-[10px] transition-all"
                    style={{
                      backgroundColor: gpuCount === n ? d.color : "#0f172a",
                      border: `1px solid ${gpuCount === n ? d.border : "#334155"}`,
                      color: gpuCount === n ? d.border : "#64748b",
                    }}>
                    {n} GPUs
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/50 p-3">
            <div className="text-[10px] text-slate-500 uppercase mb-1.5">Algorithm phases</div>
            {d.phases.map((phase, i) => (
              <div key={i} className="flex items-start gap-2 mb-1">
                <span className="text-[10px] rounded px-1 mt-0.5 flex-shrink-0"
                  style={{ backgroundColor: d.color + "44", color: d.border }}>
                  {i + 1}
                </span>
                <p className="text-slate-400">{phase}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <div className="rounded-lg p-2" style={{ backgroundColor: "#14532d22", border: "1px solid #22c55e22" }}>
              <div className="text-[9px] text-green-500 mb-0.5">Best for</div>
              <p className="text-slate-400 text-[10px]">{d.bestFor}</p>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: "#7f1d1d22", border: "1px solid #ef444422" }}>
              <div className="text-[9px] text-red-400 mb-0.5">Degrades when</div>
              <p className="text-slate-400 text-[10px]">{d.worstFor}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#0a0f1a] border border-white/8 p-3 text-xs">
        <span className="text-slate-500">NCCL env override: </span>
        <code className="text-cyan-300 font-mono">
          NCCL_ALGO={algo === "ring" ? "RING" : algo === "tree" ? "TREE" : "COLLNET_RING"}
        </code>
        <span className="text-slate-600 ml-2">(leave unset in production -- NCCL auto-selects)</span>
      </div>
    </div>
  )
}
export default NCCLAlgorithmViz
