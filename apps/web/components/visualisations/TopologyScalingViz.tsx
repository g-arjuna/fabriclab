"use client"
import { useState } from "react"

export function TopologyScalingViz() {
  const [stage, setStage] = useState<1 | 2 | 3>(2)
  const [radix, setRadix] = useState(32)

  const scenarios: { id: 1 | 2 | 3; label: string; desc: string }[] = [
    { id: 1, label: "1-stage", desc: "Single switch - small clusters only" },
    { id: 2, label: "2-stage leaf-spine", desc: "BasePOD scale - up to ~128 nodes" },
    { id: 3, label: "3-stage leaf-spine-core", desc: "SuperPOD scale - 256+ nodes" },
  ]

  const downlinks = Math.floor(radix / 2)
  const uplinks = radix - downlinks

  const maxNodes1 = radix
  const maxNodes2 = Math.floor((downlinks * uplinks) / 8)
  const maxNodes3 = Math.floor((downlinks * Math.floor(uplinks * uplinks / 2)) / 8)
  const leafCount2 = uplinks
  const spineCount2 = uplinks

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        How topology stages determine cluster scale
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Adjust switch radix to see how port count drives cluster capacity at each stage
      </p>

      <div className="mb-5 rounded-xl bg-slate-800/50 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Switch radix (ports per switch)</span>
          <span className="font-mono text-lg font-bold text-white">{radix}</span>
        </div>
        <input type="range" min={16} max={128} step={16} value={radix}
          onChange={e => setRadix(Number(e.target.value))}
          className="w-full accent-cyan-400" />
        <div className="mt-1 flex justify-between text-[9px] text-slate-600">
          <span>16</span><span>32</span><span>48</span><span>64</span>
          <span>80</span><span>96</span><span>112</span><span>128</span>
        </div>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        {scenarios.map(s => (
          <button key={s.id} onClick={() => setStage(s.id)}
            className="rounded-xl p-3 text-left text-xs transition-all"
            style={{
              backgroundColor: stage === s.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${stage === s.id ? "#60a5fa" : "#1e293b"}`,
              color: stage === s.id ? "#fff" : "#64748b",
            }}>
            <div className="mb-0.5 text-sm font-bold" style={{ color: stage === s.id ? "#60a5fa" : "#475569" }}>
              {s.label}
            </div>
            <div className="text-[9px] leading-4 opacity-80">{s.desc}</div>
          </button>
        ))}
      </div>

      <div className="mb-4 overflow-x-auto rounded-xl border border-white/8 bg-[#060d18] p-4">
        <svg viewBox="0 0 560 200" className="min-w-[560px]">
          {stage === 1 && (
            <>
              <rect x="205" y="80" width="150" height="40" rx="6" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5"/>
              <text x="280" y="104" textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="700">Single Switch</text>
              {Array.from({ length: Math.min(radix, 8) }, (_, i) => {
                const x = 50 + i * (460 / Math.min(radix, 8))
                return (
                  <g key={i}>
                    <line x1={x} y1="170" x2={280} y2="120" stroke="#4ade80" strokeWidth="1.5" opacity={0.6}/>
                    <rect x={x - 18} y="170" width="36" height="20" rx="3" fill="#14532d" stroke="#22c55e" strokeWidth="1"/>
                    <text x={x} y="184" textAnchor="middle" fill="#4ade80" fontSize="7">DGX</text>
                  </g>
                )
              })}
              <text x="280" y="25" textAnchor="middle" fill="#64748b" fontSize="9">
                Max DGX nodes: {Math.floor(radix / 8)} ({radix} ports x 8 NICs/node)
              </text>
            </>
          )}

          {stage === 2 && (() => {
            const displaySpines = Math.min(spineCount2, 4)
            const displayLeafs = Math.min(uplinks, 4)
            const spineXs = Array.from({ length: displaySpines }, (_, i) =>
              80 + i * (400 / (displaySpines - 1 || 1))
            )
            const leafXs = Array.from({ length: displayLeafs }, (_, i) =>
              90 + i * (380 / (displayLeafs - 1 || 1))
            )
            return (
              <>
                {spineXs.map((x, i) => (
                  <g key={i}>
                    <rect x={x - 28} y="20" width="56" height="28" rx="4"
                      fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.5"/>
                    <text x={x} y="38" textAnchor="middle"
                      fill="#c4b5fd" fontSize="7" fontWeight="600">Spine {i}</text>
                  </g>
                ))}
                {spineCount2 > 4 && (
                  <text x="490" y="36" fill="#64748b" fontSize="8">+{spineCount2 - 4} more</text>
                )}

                {leafXs.map((lx, li) => (
                  <g key={li}>
                    {spineXs.map((sx, si) => (
                      <line key={si}
                        x1={lx} y1="90" x2={sx} y2="48"
                        stroke="#a78bfa" strokeWidth="1" opacity={0.45}/>
                    ))}
                    <rect x={lx - 32} y="90" width="64" height="28" rx="4"
                      fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5"/>
                    <text x={lx} y="108" textAnchor="middle"
                      fill="#93c5fd" fontSize="7" fontWeight="600">Leaf {li}</text>
                  </g>
                ))}
                {uplinks > 4 && (
                  <text x="490" y="104" fill="#64748b" fontSize="8">+{uplinks - 4} more</text>
                )}

                {Array.from({ length: Math.min(displayLeafs * 2, 8) }, (_, i) => {
                  const lx = leafXs[Math.floor(i / 2) % displayLeafs]
                  const offset = (i % 2 === 0 ? -18 : 18)
                  const x = lx + offset
                  return (
                    <g key={i}>
                      <line x1={x} y1="170" x2={lx} y2="118"
                        stroke="#4ade80" strokeWidth="1" opacity={0.5}/>
                      <rect x={x - 22} y="170" width="44" height="22" rx="3"
                        fill="#14532d" stroke="#22c55e" strokeWidth="1"/>
                      <text x={x} y="185" textAnchor="middle"
                        fill="#4ade80" fontSize="7">DGX</text>
                    </g>
                  )
                })}

                <text x="280" y="196" textAnchor="middle"
                  fill="#60a5fa" fontSize="9" fontWeight="600">
                  Max DGX nodes: {maxNodes2} | {leafCount2} leaf + {spineCount2} spine
                </text>
              </>
            )
          })()}

          {stage === 3 && (() => {
            const coreXs = [140, 280, 420]
            const spineXs = [80, 200, 320, 440]
            const leafXs = [60, 155, 250, 340, 435, 530]

            return (
              <>
                {coreXs.map((x, i) => (
                  <g key={i}>
                    <rect x={x - 30} y="10" width="60" height="24" rx="4"
                      fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5"/>
                    <text x={x} y="26" textAnchor="middle"
                      fill="#fca5a5" fontSize="7" fontWeight="600">Core {i}</text>
                  </g>
                ))}

                {spineXs.map((sx, si) => (
                  <g key={si}>
                    {coreXs.map((cx, ci) => (
                      <line key={ci}
                        x1={sx} y1="68" x2={cx} y2="34"
                        stroke="#ef4444" strokeWidth="1" opacity={0.35}/>
                    ))}
                    <rect x={sx - 28} y="68" width="56" height="24" rx="4"
                      fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.5"/>
                    <text x={sx} y="84" textAnchor="middle"
                      fill="#c4b5fd" fontSize="7" fontWeight="600">Spine {si}</text>
                  </g>
                ))}

                {leafXs.map((lx, li) => (
                  <g key={li}>
                    {spineXs.map((sx, si) => (
                      <line key={si}
                        x1={lx} y1="128" x2={sx} y2="92"
                        stroke="#a78bfa" strokeWidth="1" opacity={0.3}/>
                    ))}
                    <rect x={lx - 26} y="128" width="52" height="24" rx="4"
                      fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5"/>
                    <text x={lx} y="144" textAnchor="middle"
                      fill="#93c5fd" fontSize="7" fontWeight="600">Leaf {li}</text>
                  </g>
                ))}

                {leafXs.map((lx, li) => (
                  <g key={li}>
                    <line x1={lx} y1="180" x2={lx} y2="152"
                      stroke="#4ade80" strokeWidth="1" opacity={0.5}/>
                    <rect x={lx - 22} y="180" width="44" height="18" rx="3"
                      fill="#14532d" stroke="#22c55e" strokeWidth="1"/>
                    <text x={lx} y="192" textAnchor="middle"
                      fill="#4ade80" fontSize="6">DGXxN</text>
                  </g>
                ))}

                <text x="280" y="200" textAnchor="middle"
                  fill="#60a5fa" fontSize="8" fontWeight="600">
                  3-stage fat-tree - SuperPOD scale ({radix}-port switches {"->"} {maxNodes3}+ nodes)
                </text>
              </>
            )
          })()}
        </svg>
      </div>

      <div className="grid gap-2 text-xs sm:grid-cols-3">
        {[
          { label: "Downlinks per leaf", value: `${downlinks} x 400G` },
          { label: "Uplinks per leaf", value: `${uplinks} x 400G` },
          { label: "Max nodes (this stage)", value: stage === 1 ? maxNodes1 : stage === 2 ? maxNodes2 : maxNodes3 },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-slate-800/50 p-3 text-center">
            <div className="mb-1 text-[10px] text-slate-500">{s.label}</div>
            <div className="text-sm font-bold text-white">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopologyScalingViz
