"use client"
import { useState } from "react"

export function SwitchBufferViz() {
  const [burstMs, setBurstMs] = useState(1)
  const [nodeCount, setNodeCount] = useState(32)

  const linkSpeedGbps = 400
  const burstSizeGb = nodeCount * linkSpeedGbps * (burstMs / 1000)
  const burstSizeMB = (burstSizeGb / 8) * 1000

  const deepBufferMB = 64
  const shallowBufferMB = 8

  const deepHandles = burstSizeMB <= deepBufferMB
  const shallowHandles = burstSizeMB <= shallowBufferMB

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        Switch buffer depth vs AllReduce burst size
      </p>
      <p className="mb-5 text-xs text-slate-600">Adjust cluster size and synchronisation window to see if buffers are sufficient</p>

      <div className="space-y-4 mb-5">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Nodes per rail (DGX nodes)</span>
            <span className="font-bold text-white font-mono">{nodeCount}</span>
          </div>
          <input type="range" min={4} max={64} step={4} value={nodeCount}
            onChange={e => setNodeCount(Number(e.target.value))}
            className="w-full accent-cyan-400"/>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">AllReduce synchronisation window</span>
            <span className="font-bold text-white font-mono">{burstMs}ms</span>
          </div>
          <input type="range" min={0.1} max={5} step={0.1} value={burstMs}
            onChange={e => setBurstMs(Number(e.target.value))}
            className="w-full accent-cyan-400"/>
        </div>
      </div>

      <div className="rounded-xl bg-[#0a0f1a] border border-white/8 p-3 mb-4 text-xs font-mono">
        <div className="text-slate-500 mb-1">Burst calculation:</div>
        <div className="text-slate-300">
          {nodeCount} nodes × {linkSpeedGbps} Gb/s × {burstMs}ms = {burstSizeGb.toFixed(1)} Gb = <span className="text-amber-300 font-bold">{burstSizeMB.toFixed(0)} MB</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Deep-buffer switch", example: "Spectrum-X SN5600", buffer: deepBufferMB, handles: deepHandles, color: deepHandles ? "#22c55e" : "#ef4444" },
          { label: "Shallow-buffer switch", example: "Broadcom Tomahawk-based", buffer: shallowBufferMB, handles: shallowHandles, color: shallowHandles ? "#22c55e" : "#ef4444" },
        ].map(sw => (
          <div key={sw.label} className="rounded-xl p-4"
            style={{ backgroundColor: sw.color + "11", border: `1px solid ${sw.color}33` }}>
            <div className="font-semibold text-white text-sm mb-0.5">{sw.label}</div>
            <div className="text-[10px] text-slate-500 mb-3">{sw.example}</div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-xs text-slate-400">Buffer depth</span>
              <span className="font-bold" style={{ color: sw.color }}>{sw.buffer} MB</span>
            </div>
            <div className="h-4 rounded-full bg-slate-800 overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (sw.buffer / Math.max(burstSizeMB, sw.buffer)) * 100)}%`,
                  backgroundColor: sw.color,
                }}/>
            </div>
            <div className="text-sm font-semibold" style={{ color: sw.color }}>
              {sw.handles
                ? `âœ“ Buffer sufficient (${((sw.buffer / burstSizeMB) * 100).toFixed(0)}% headroom)`
                : `âœ— Buffer overflow — needs ${(burstSizeMB / sw.buffer).toFixed(1)}× more buffer or per-packet LB`}
            </div>
          </div>
        ))}
      </div>

      {!shallowHandles && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-slate-300">
          <span className="font-semibold text-amber-400">Shallow buffer mitigation: </span>
          With per-packet load balancing (RSHP), the {burstSizeMB.toFixed(0)} MB burst is spread across
          {" "}{nodeCount} uplinks simultaneously. Each uplink sees only {(burstSizeMB / nodeCount).toFixed(1)} MB —
          {(burstSizeMB / nodeCount) <= shallowBufferMB ? " within the shallow buffer capacity. RSHP makes shallow-buffer switches viable." : " still exceeds shallow buffer. Use deep-buffer switches or reduce cluster size per rail."}
        </div>
      )}
    </div>
  )
}

export default SwitchBufferViz
