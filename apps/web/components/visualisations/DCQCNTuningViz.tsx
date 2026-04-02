"use client"
import { useState } from "react"

export function DCQCNTuningViz() {
  const [rpTimeReset, setRpTimeReset] = useState(300)
  const [ecnMarkRate, setEcnMarkRate] = useState(15)

  // Simulate: AllReduce burst period = 20ms
  // After burst, NIC stays at reduced rate for rp_time_reset ms
  // If next burst starts before recovery, it starts at reduced rate
  const burstPeriodMs = 20
  const recoverFraction = Math.min(1, burstPeriodMs / rpTimeReset)
  const rateAtNextBurst = Math.max(0.3, recoverFraction)
  const effectiveBusbwPct = Math.round(rateAtNextBurst * (1 - ecnMarkRate / 200) * 100)
  const isProblematic = rpTimeReset > 150 && ecnMarkRate > 10

  // Timeline data points for mini-chart
  const TOTAL_MS = 120
  const points: { t: number; rate: number }[] = []
  let currentRate = 1.0
  let burstStart = 0
  for (let t = 0; t <= TOTAL_MS; t += 2) {
    const inBurst = (t - burstStart) < burstPeriodMs
    if (!inBurst) {
      if (t - burstStart === burstPeriodMs) currentRate = Math.max(0.3, 1 - ecnMarkRate / 100)
      const recoveryProgress = (t - burstStart - burstPeriodMs) / rpTimeReset
      currentRate = Math.min(1, (1 - ecnMarkRate / 100) + recoveryProgress)
    } else {
      if (t === burstStart) currentRate = Math.min(1, currentRate)
    }
    points.push({ t, rate: currentRate })
    if (t - burstStart >= burstPeriodMs + rpTimeReset) burstStart = t
  }

  const svgWidth = 480
  const svgHeight = 100
  const getX = (t: number) => (t / TOTAL_MS) * svgWidth
  const getY = (rate: number) => svgHeight - rate * svgHeight * 0.85 - 8
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.t)} ${getY(p.rate)}`).join(" ")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
        DCQCN parameter tuning -- effect on AllReduce throughput
      </p>
      <p className="mb-5 text-xs text-slate-600">
        Adjust rp_time_reset and ECN mark rate to see how DCQCN rate recovery affects busbw
      </p>

      <div className="space-y-4 mb-5">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">rp_time_reset (NIC rate recovery window)</span>
            <span className="font-bold font-mono" style={{ color: rpTimeReset > 150 ? "#f59e0b" : "#22c55e" }}>
              {rpTimeReset}ms
            </span>
          </div>
          <input type="range" min={25} max={500} step={25} value={rpTimeReset}
            onChange={e => setRpTimeReset(Number(e.target.value))}
            className="w-full accent-cyan-400"/>
          <div className="flex justify-between text-[9px] text-slate-600 mt-1">
            <span>25ms (aggressive recovery)</span>
            <span>500ms (slow recovery)</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">ECN mark rate (from show interface counters)</span>
            <span className="font-bold font-mono" style={{ color: ecnMarkRate > 20 ? "#ef4444" : ecnMarkRate > 10 ? "#f59e0b" : "#22c55e" }}>
              {ecnMarkRate}% of packets marked
            </span>
          </div>
          <input type="range" min={0} max={50} step={5} value={ecnMarkRate}
            onChange={e => setEcnMarkRate(Number(e.target.value))}
            className="w-full accent-cyan-400"/>
          <div className="flex justify-between text-[9px] text-slate-600 mt-1">
            <span>0% (no congestion)</span>
            <span>50% (severe congestion)</span>
          </div>
        </div>
      </div>

      {/* Rate chart */}
      <div className="mb-4 rounded-xl border border-white/8 bg-[#060d18] p-3">
        <div className="text-[10px] text-slate-500 mb-2">NIC injection rate over time (AllReduce burst every {burstPeriodMs}ms)</div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="min-w-[480px]">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1.0].map(rate => (
            <line key={rate} x1={0} y1={getY(rate)} x2={svgWidth} y2={getY(rate)}
              stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4"/>
          ))}
          {[0.25, 0.5, 0.75, 1.0].map(rate => (
            <text key={rate} x={4} y={getY(rate) - 2} fill="#475569" fontSize="7">
              {Math.round(rate * 100)}%
            </text>
          ))}
          {/* Rate line */}
          <path d={pathD} stroke="#22c55e" strokeWidth="1.5" fill="none"/>
          {/* AllReduce burst markers */}
          {Array.from({ length: 5 }, (_, i) => {
            const x = getX(i * (burstPeriodMs + rpTimeReset))
            return (
              <rect key={i} x={x} y={0} width={getX(burstPeriodMs)} height={svgHeight}
                fill="#1e3a5f22"/>
            )
          })}
          <text x={svgWidth - 2} y={svgHeight - 2} fill="#334155" fontSize="7" textAnchor="end">
            {"time -> "}{TOTAL_MS}ms
          </text>
          </svg>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[9px]">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-6 bg-blue-900/40"/>
            <span className="text-slate-600">AllReduce burst period</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-6 bg-green-400"/>
            <span className="text-slate-600">NIC injection rate</span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl p-3 text-center"
          style={{
            backgroundColor: effectiveBusbwPct > 85 ? "#14532d22" : effectiveBusbwPct > 65 ? "#78350f22" : "#7f1d1d22",
            border: `1px solid ${effectiveBusbwPct > 85 ? "#22c55e" : effectiveBusbwPct > 65 ? "#f59e0b" : "#ef4444"}33`,
          }}>
          <div className="text-[10px] text-slate-500 mb-1">Estimated busbw</div>
          <div className="text-2xl font-bold" style={{ color: effectiveBusbwPct > 85 ? "#22c55e" : effectiveBusbwPct > 65 ? "#f59e0b" : "#ef4444" }}>
            {effectiveBusbwPct}%
          </div>
          <div className="text-[10px] text-slate-600">of NIC line rate</div>
        </div>
        <div className="rounded-xl p-3 sm:col-span-2"
          style={{ backgroundColor: isProblematic ? "#78350f22" : "#14532d22", border: `1px solid ${isProblematic ? "#f59e0b33" : "#22c55e33"}` }}>
          <div className="text-xs font-semibold mb-1" style={{ color: isProblematic ? "#f59e0b" : "#22c55e" }}>
            {isProblematic ? "DCQCN over-reaction likely" : "DCQCN parameters healthy"}
          </div>
          <p className="text-slate-400 text-[10px] leading-5">
            {isProblematic
              ? `rp_time_reset=${rpTimeReset}ms is too long for ${burstPeriodMs}ms AllReduce burst intervals. NIC hasn't recovered before next burst. Reduce to 50-100ms. Run: mlxconfig set RP_TIME_RESET=100`
              : `NIC recovers to full rate between AllReduce bursts. DCQCN is working correctly. If busbw is still low, investigate fabric topology or load balancing instead.`}
          </p>
        </div>
      </div>
    </div>
  )
}
export default DCQCNTuningViz
