"use client"
import { useState } from "react"

export function OversubscriptionCalculatorViz() {
  const [downlinksPerLeaf, setDownlinksPerLeaf] = useState(32)
  const [uplinksPerLeaf, setUplinksPerLeaf] = useState(32)
  const [leafCount, setLeafCount] = useState(8)

  const oversubRatio = downlinksPerLeaf / uplinksPerLeaf
  const totalDownBw = leafCount * downlinksPerLeaf * 400
  const totalUpBw = leafCount * uplinksPerLeaf * 400
  const effectiveBw = Math.min(totalDownBw, totalUpBw)
  const isNonBlocking = oversubRatio <= 1

  const ratingColor = oversubRatio <= 1 ? "#22c55e" : oversubRatio <= 1.5 ? "#f59e0b" : "#ef4444"
  const ratingLabel = oversubRatio <= 1 ? "Non-blocking ✓" : oversubRatio <= 1.5 ? "Mild oversubscription" : "OVERSUBSCRIBED ✗"

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Oversubscription calculator
      </p>
      <p className="mb-5 text-xs text-slate-600">Adjust downlinks and uplinks per leaf switch to calculate oversubscription ratio</p>

      <div className="space-y-4 mb-5">
        {[
          { label: "Leaf switches in fabric", val: leafCount, set: setLeafCount, min: 2, max: 64, step: 2 },
          { label: "Downlinks per leaf (→ DGX nodes)", val: downlinksPerLeaf, set: setDownlinksPerLeaf, min: 8, max: 48, step: 8 },
          { label: "Uplinks per leaf (→ spine)", val: uplinksPerLeaf, set: setUplinksPerLeaf, min: 8, max: 48, step: 8 },
        ].map(s => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">{s.label}</span>
              <span className="font-bold text-white font-mono">{s.val}</span>
            </div>
            <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
              onChange={e => s.set(Number(e.target.value))}
              className="w-full accent-cyan-400"/>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4 mb-4 text-center"
        style={{ backgroundColor: ratingColor + "15", border: `2px solid ${ratingColor}44` }}>
        <div className="text-[10px] text-slate-500 mb-1">Oversubscription ratio</div>
        <div className="text-4xl font-bold font-mono" style={{ color: ratingColor }}>
          {oversubRatio.toFixed(1)}:1
        </div>
        <div className="text-sm font-semibold mt-1" style={{ color: ratingColor }}>{ratingLabel}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
        {[
          { l: "Total server bandwidth", v: `${(totalDownBw / 1000).toFixed(0)} Tb/s` },
          { l: "Total fabric uplink BW", v: `${(totalUpBw / 1000).toFixed(0)} Tb/s` },
          { l: "Effective AllReduce BW", v: `${(effectiveBw / 1000).toFixed(0)} Tb/s` },
        ].map(s => (
          <div key={s.l} className="rounded-lg bg-slate-800/50 p-2 text-center">
            <div className="text-slate-500 text-[9px]">{s.l}</div>
            <div className="font-bold text-white mt-0.5">{s.v}</div>
          </div>
        ))}
      </div>

      {!isNonBlocking && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-slate-300">
          <span className="font-semibold text-red-400">Warning: </span>
          At {oversubRatio.toFixed(1)}:1 oversubscription, AllReduce during full training load will
          saturate the spine layer. PFC storms will occur on every synchronisation barrier.
          JCT will increase by approximately {Math.round((oversubRatio - 1) * 100)}% or more.
          To fix: add {downlinksPerLeaf - uplinksPerLeaf} more uplinks per leaf switch to reach 1:1.
        </div>
      )}
      {isNonBlocking && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs text-slate-300">
          <span className="font-semibold text-green-400">Non-blocking: </span>
          This configuration can sustain full AllReduce at NIC line rate across all
          {" "}{leafCount * downlinksPerLeaf / 8} DGX nodes simultaneously. PFC and ECN may still
          fire during burst periods — that is expected and healthy.
        </div>
      )}
    </div>
  )
}

export default OversubscriptionCalculatorViz

