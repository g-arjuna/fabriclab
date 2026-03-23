"use client"
import { useState } from "react"

type ECNView = "ce_bit" | "red_algorithm" | "thresholds" | "cnp_flow"

const ecnViews: { id: ECNView; label: string }[] = [
  { id: "ce_bit", label: "The CE bit" },
  { id: "red_algorithm", label: "RED marking algorithm" },
  { id: "thresholds", label: "Threshold configuration" },
  { id: "cnp_flow", label: "CNP feedback loop" },
]

export function ECNMechanicsViz() {
  const [view, setView] = useState<ECNView>("red_algorithm")
  const [bufferDepth, setBufferDepth] = useState(60)

  const minThresh = 30  // percent of buffer
  const maxThresh = 80

  const getMarkingProbability = (depth: number) => {
    if (depth < minThresh) return 0
    if (depth >= maxThresh) return 100
    return Math.round(((depth - minThresh) / (maxThresh - minThresh)) * 100)
  }

  const markProb = getMarkingProbability(bufferDepth)
  const probColor = markProb === 0 ? "#22c55e" : markProb < 50 ? "#f59e0b" : "#ef4444"

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        ECN mechanics — how congestion marking works
      </p>
      <div className="flex flex-wrap gap-2 mb-5">
        {ecnViews.map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              backgroundColor: view === v.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${view === v.id ? "#60a5fa" : "#1e293b"}`,
              color: view === v.id ? "#bfdbfe" : "#64748b",
            }}>
            {v.label}
          </button>
        ))}
      </div>

      {view === "ce_bit" && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-6">ECN uses two bits in the IP header — the ECN field in the DSCP byte. The sender sets them to indicate ECN capability. The switch sets them to CE when it detects congestion.</p>
          <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4 font-mono text-[10px]">
            <div className="text-slate-500 mb-3">IP Header DSCP Byte (8 bits)</div>
            <div className="flex gap-1 mb-2">
              {[7,6,5,4,3,2,1,0].map(bit => (
                <div key={bit} className="flex-1 h-8 rounded flex items-center justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: bit >= 2 ? "#1e3a5f" : bit === 1 ? "#065f46" : "#4c1d95",
                    border: `1px solid ${bit >= 2 ? "#3b82f6" : bit === 1 ? "#34d399" : "#a78bfa"}`,
                    color: bit >= 2 ? "#93c5fd" : bit === 1 ? "#6ee7b7" : "#c4b5fd",
                  }}>
                  {bit}
                </div>
              ))}
            </div>
            <div className="flex gap-1 text-[9px]">
              <div className="flex-1 text-blue-400 text-center" style={{flexBasis: '75%'}}>← DSCP (6 bits) — QoS class, e.g. 26 for RoCEv2 →</div>
              <div className="flex-1 text-green-400 text-center">ECT</div>
              <div className="flex-1 text-purple-400 text-center">CE</div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { code: "00", label: "Not-ECT", color: "#374151", desc: "Sender does not support ECN. Switch will drop, not mark." },
              { code: "01", label: "ECT(1)", color: "#1e3a5f", desc: "ECN-capable. Switch may mark with CE if congested." },
              { code: "10", label: "ECT(0)", color: "#065f46", desc: "ECN-capable (more common). ConnectX-7 uses this by default." },
              { code: "11", label: "CE", color: "#7f1d1d", desc: "Congestion Experienced. Set BY THE SWITCH to signal congestion." },
            ].map(item => (
              <div key={item.code} className="rounded-lg px-3 py-2.5"
                style={{ backgroundColor: item.color + "44", border: `1px solid ${item.color}` }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{item.code}</span>
                  <span className="font-semibold text-white">{item.label}</span>
                </div>
                <p className="text-slate-300 leading-5 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "red_algorithm" && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-6">RED (Random Early Detection) is the algorithm switches use to decide which packets to mark with CE. Drag the slider to see how marking probability changes with buffer depth.</p>
          <div className="rounded-xl bg-slate-800/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400">Buffer depth: <span className="text-white font-semibold">{bufferDepth}%</span></span>
              <span style={{ color: probColor }} className="font-semibold">
                Marking probability: {markProb}%
              </span>
            </div>
            <input type="range" min="0" max="100" value={bufferDepth}
              onChange={e => setBufferDepth(Number(e.target.value))}
              className="w-full mb-4" />

            {/* Visual buffer + threshold markers */}
            <div className="relative h-8 rounded-full bg-slate-700 overflow-hidden mb-2">
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                style={{ width: `${bufferDepth}%`, backgroundColor: bufferDepth < minThresh ? "#22c55e" : bufferDepth < maxThresh ? "#f59e0b" : "#ef4444" }} />
              <div className="absolute inset-y-0 border-l-2 border-cyan-400" style={{ left: `${minThresh}%` }} />
              <div className="absolute inset-y-0 border-l-2 border-red-400" style={{ left: `${maxThresh}%` }} />
            </div>
            <div className="flex justify-between text-[9px] text-slate-600">
              <span>0%</span>
              <span style={{ marginLeft: `${minThresh - 8}%` }} className="text-cyan-400">min ({minThresh}%)</span>
              <span style={{ marginLeft: `${maxThresh - minThresh - 10}%` }} className="text-red-400">max ({maxThresh}%)</span>
              <span>100%</span>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { condition: `Buffer < ${minThresh}%`, prob: "0%", action: "No marking. Traffic flows freely.", color: "#14532d" },
              { condition: `${minThresh}% ≤ Buffer ≤ ${maxThresh}%`, prob: "0–100%", action: "Linear probability increase. Some packets marked, not all.", color: "#78350f" },
              { condition: `Buffer > ${maxThresh}%`, prob: "100%", action: "All packets marked. PFC headroom is next threshold.", color: "#7f1d1d" },
            ].map(row => (
              <div key={row.condition} className="flex items-start gap-3 rounded-xl px-3 py-2"
                style={{ backgroundColor: row.color + "33", border: `1px solid ${row.color}44` }}>
                <code className="text-cyan-300 font-mono text-[10px] flex-shrink-0 mt-0.5">{row.condition}</code>
                <div className="flex-1 text-slate-300 leading-5">{row.action}</div>
                <span className="text-white font-semibold text-[10px] flex-shrink-0">{row.prob}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "thresholds" && (
        <div className="space-y-3 text-xs">
          <p className="text-slate-300 leading-6">The threshold values must be correctly ordered relative to each other and to the PFC headroom threshold. A mis-ordered configuration defeats the purpose of ECN.</p>
          <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4 font-mono text-[10px] leading-7">
            <div className="text-slate-500"># Correct ordering (Spectrum-X Cumulus):</div>
            <div className="text-cyan-300">ECN min-threshold:  150,000 bytes  (≈ 146 KB)</div>
            <div className="text-cyan-300">ECN max-threshold:  1,500,000 bytes (≈ 1.4 MB)</div>
            <div className="text-amber-300">PFC headroom:       2,000,000 bytes (≈ 1.9 MB)</div>
            <div className="text-red-300">Buffer maximum:     ~12,000,000 bytes (≈ 11.4 MB)</div>
            <div className="mt-2 text-green-400"># Required: ECN min &lt; ECN max &lt; PFC headroom &lt; Buffer max</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="font-semibold text-amber-300 mb-1">Common misconfiguration</div>
            <p className="text-slate-300 leading-5">If ECN max-threshold is set ABOVE the PFC headroom threshold, ECN marking only starts happening after PFC pauses are already occurring. This means ECN provides no benefit — pauses happen first, marking happens after. The correct ordering ensures ECN marking begins early enough that DCQCN rate reduction can drain the buffer before the PFC threshold is reached.</p>
          </div>
        </div>
      )}

      {view === "cnp_flow" && (
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-6">When a receiver's NIC receives a CE-marked packet, it generates a CNP (Congestion Notification Packet) and sends it back to the sender. The sender's DCQCN algorithm reacts to the CNP by reducing injection rate.</p>
          <div className="space-y-2">
            {[
              { step: "1", actor: "Switch", action: "Buffer crosses ECN min-threshold → marks passing packet with CE bit (00→11 in ECN field)", color: "#1e3a5f" },
              { step: "2", actor: "Receiver NIC", action: "Receives CE-marked packet → hardware generates CNP (Congestion Notification Packet) immediately, no kernel involvement", color: "#065f46" },
              { step: "3", actor: "Receiver NIC", action: "Sends CNP to sender (reverse path). CNP contains: sender GID, QP number, sequence number of CE-marked packet", color: "#065f46" },
              { step: "4", actor: "Sender NIC", action: "Receives CNP → DCQCN firmware algorithm reduces injection rate for this QP: new_rate = current_rate × (1 - alpha/2)", color: "#4c1d95" },
              { step: "5", actor: "Sender NIC", action: "Maintains reduced rate for rp_time_reset interval (default ~55µs). If no more CNPs: starts rate recovery", color: "#4c1d95" },
              { step: "6", actor: "Switch", action: "Reduced injection rate drains buffer below ECN threshold. Marking stops. No more CNPs generated.", color: "#1e3a5f" },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: s.color + "22", border: `1px solid ${s.color}44` }}>
                <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: s.color, color: "#fff" }}>{s.step}</div>
                <div>
                  <span className="font-semibold text-white">{s.actor}: </span>
                  <span className="text-slate-300 leading-5">{s.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
export default ECNMechanicsViz
