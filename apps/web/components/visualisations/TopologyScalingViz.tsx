"use client"
import { useState } from "react"

export function TopologyScalingViz() {
  const [stage, setStage] = useState<1 | 2 | 3>(2)
  const [radix, setRadix] = useState(32)

  const scenarios: { id: 1 | 2 | 3; label: string; desc: string }[] = [
    { id: 1, label: "1-stage", desc: "Single switch — small clusters only" },
    { id: 2, label: "2-stage leaf-spine", desc: "BasePOD scale — up to ~128 nodes" },
    { id: 3, label: "3-stage leaf-spine-core", desc: "SuperPOD scale — 256+ nodes" },
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
      <p className="mb-5 text-xs text-slate-600">Adjust switch radix to see how port count drives cluster capacity at each stage</p>

      <div className="mb-5 rounded-xl bg-slate-800/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">Switch radix (ports per switch)</span>
          <span className="text-lg font-bold text-white font-mono">{radix}</span>
        </div>
        <input type="range" min={16} max={128} step={16} value={radix}
          onChange={e => setRadix(Number(e.target.value))}
          className="w-full accent-cyan-400" />
        <div className="flex justify-between text-[9px] text-slate-600 mt-1">
          <span>16</span><span>32</span><span>48</span><span>64</span>
          <span>80</span><span>96</span><span>112</span><span>128</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {scenarios.map(s => (
          <button key={s.id} onClick={() => setStage(s.id)}
            className="rounded-xl p-3 text-left text-xs transition-all"
            style={{
              backgroundColor: stage === s.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${stage === s.id ? "#60a5fa" : "#1e293b"}`,
              color: stage === s.id ? "#fff" : "#64748b",
            }}>
            <div className="font-bold text-sm mb-0.5" style={{ color: stage === s.id ? "#60a5fa" : "#475569" }}>
              {s.label}
            </div>
            <div className="text-[9px] leading-4 opacity-80">{s.desc}</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-[#060d18] border border-white/8 p-4 mb-4">
        <svg viewBox="0 0 560 200" className="w-full">
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
                Max DGX nodes: {Math.floor(radix / 8)} ({radix} ports Ã· 8 NICs/node)
              </text>
            </>
          )}

          {stage === 2 && (
            <>
              {Array.from({ length: Math.min(spineCount2, 6) }, (_, i) => {
                const x = 80 + i * (400 / Math.min(spineCount2, 6))
                return (
                  <g key={i}>
                    <rect x={x - 28} y="20" width="56" height="28" rx="4" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.5"/>
                    <text x={x} y="38" textAnchor="middle" fill="#c4b5fd" fontSize="7" fontWeight="600">Spine {i}</text>
                  </g>
                )
              })}
              {spineCount2 > 6 && (
                <text x="480" y="36" fill="#64748b" fontSize="8">+{spineCount2 - 6} more</text>
              )}

              {Array.from({ length: Math.min(uplinks, 5) }, (_, i) => {
                const x = 90 + i * (380 / Math.min(uplinks, 5))
                return (
                  <g key={i}>
                    <line x1={x} y1="90" x2={80 + (i % Math.min(spineCount2, 6)) * (400 / Math.min(spineCount2, 6))} y2="48"
                      stroke="#a78bfa" strokeWidth="1" opacity={0.5}/>
                    <rect x={x - 32} y="90" width="64" height="28" rx="4" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5"/>
                    <text x={x} y="108" textAnchor="middle" fill="#93c5fd" fontSize="7" fontWeight="600">Leaf {i}</text>
                  </g>
                )
              })}

              {Array.from({ length: 8 }, (_, i) => {
                const x = 60 + i * 62
                return (
                  <g key={i}>
                    <line x1={x} y1="170" x2={90 + (i % Math.min(uplinks, 5)) * (380 / Math.min(uplinks, 5))} y2="118"
                      stroke="#4ade80" strokeWidth="1" opacity={0.5}/>
                    <rect x={x - 22} y="170" width="44" height="22" rx="3" fill="#14532d" stroke="#22c55e" strokeWidth="1"/>
                    <text x={x} y="185" textAnchor="middle" fill="#4ade80" fontSize="7">DGX</text>
                  </g>
                )
              })}

              <text x="280" y="196" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="600">
                Max DGX nodes: {maxNodes2} | Switches: {leafCount2} leaf + {spineCount2} spine
              </text>
            </>
          )}

          {stage === 3 && (
            <>
              {[140, 280, 420].map((x, i) => (
                <g key={i}>
                  <rect x={x - 30} y="10" width="60" height="24" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5"/>
                  <text x={x} y="26" textAnchor="middle" fill="#fca5a5" fontSize="7" fontWeight="600">Core</text>
                </g>
              ))}
              {[80, 190, 280, 370, 480].map((x, i) => (
                <g key={i}>
                  <line x1={x} y1="68" x2={[140,280,280,280,420][i]} y2="34" stroke="#ef4444" strokeWidth="1" opacity={0.4}/>
                  <rect x={x - 28} y="68" width="56" height="24" rx="4" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.5"/>
                  <text x={x} y="84" textAnchor="middle" fill="#c4b5fd" fontSize="7" fontWeight="600">Spine</text>
                </g>
              ))}
              {[60, 150, 240, 320, 400, 500].map((x, i) => (
                <g key={i}>
                  <line x1={x} y1="128" x2={[80,190,190,370,480,480][i]} y2="92" stroke="#a78bfa" strokeWidth="1" opacity={0.4}/>
                  <rect x={x - 26} y="128" width="52" height="24" rx="4" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5"/>
                  <text x={x} y="144" textAnchor="middle" fill="#93c5fd" fontSize="7" fontWeight="600">Leaf</text>
                </g>
              ))}
              {[60, 150, 240, 320, 400, 500].map((x, i) => (
                <g key={i}>
                  <line x1={x} y1="180" x2={x} y2="152" stroke="#4ade80" strokeWidth="1" opacity={0.5}/>
                  <rect x={x - 22} y="180" width="44" height="18" rx="3" fill="#14532d" stroke="#22c55e" strokeWidth="1"/>
                  <text x={x} y="192" textAnchor="middle" fill="#4ade80" fontSize="6">DGX×N</text>
                </g>
              ))}
              <text x="280" y="200" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="600">
                3-stage fat-tree — SuperPOD scale ({radix}-port switches → {maxNodes3}+ nodes)
              </text>
            </>
          )}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: "Downlinks per leaf", value: `${downlinks} × 400G` },
          { label: "Uplinks per leaf", value: `${uplinks} × 400G` },
          { label: "Max nodes (this stage)", value: stage === 1 ? maxNodes1 : stage === 2 ? maxNodes2 : maxNodes3 },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-slate-800/50 p-3 text-center">
            <div className="text-slate-500 text-[10px] mb-1">{s.label}</div>
            <div className="text-white font-bold text-sm">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopologyScalingViz
