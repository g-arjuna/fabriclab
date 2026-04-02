// EthtoolOutputViz.tsx
"use client"
import { useState } from "react"

interface Counter { name: string; normal: string; problem: string; meaning: string }
const counters: Counter[] = [
  { name: "rx_pfc_pause_frames", normal: "0–low", problem: "Growing rapidly", meaning: "Switch is telling this NIC to stop sending. A rapidly growing counter = the upstream switch is pausing this NIC continuously. Classic pause storm signature." },
  { name: "tx_pfc_pause_frames", normal: "0–low", problem: "Growing rapidly", meaning: "This NIC is telling the switch to stop sending to it. Its receive buffer is filling. The NIC itself is a congestion point." },
  { name: "rx_ecn_marked", normal: "Moderate growth", problem: "Zero when ECN enabled", meaning: "How many packets are arriving with the CE bit set. Should grow during congestion if ECN is working. If zero with ECN enabled, ECN marking is not happening upstream." },
  { name: "tx_dropped", normal: "0", problem: "Any non-zero value", meaning: "Packets the NIC dropped on transmit because the egress queue was full. In a lossless RDMA fabric this must be zero. Any value here means the fabric is not lossless." },
]

export function EthtoolOutputViz() {
  const [active, setActive] = useState<number | null>(null)
  const pfcEnabled = true
  const hasCongestion = true

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">ethtool -S eth0 — click each counter to understand it</p>
      <div className="mb-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0a0f1a] p-4 font-mono text-xs leading-7 text-slate-300">
        <div className="min-w-[340px]">
        <div className="text-slate-500">NIC statistics:</div>
        {counters.map((c, i) => (
          <button key={i} onClick={() => setActive(active === i ? null : i)}
            className="flex w-full items-center gap-2 rounded pl-4 text-left transition-all hover:bg-slate-800/50">
            <span className="text-slate-400">{c.name}:</span>
            <span className={c.name === "tx_dropped" && hasCongestion ? "text-red-400" : c.name.includes("pfc") && pfcEnabled ? "text-amber-400" : "text-green-400"}>
              {c.name === "rx_pfc_pause_frames" ? "12847" : c.name === "tx_pfc_pause_frames" ? "8293" : c.name === "rx_ecn_marked" ? "0" : c.name === "tx_dropped" ? "47291" : "0"}
            </span>
            {active === i && <span className="text-cyan-400 ml-2">← click to collapse</span>}
            {active !== i && <span className="text-slate-700 ml-2">← click to explain</span>}
          </button>
        ))}
        <div className="pl-4 text-slate-400">link_speed: <span className="text-green-400">400Gb/s</span></div>
        <div className="pl-4 text-slate-400">link_state: <span className="text-green-400">up</span></div>
        </div>
      </div>
      {active !== null && (
        <div className="rounded-xl bg-slate-800/50 p-4 text-xs space-y-2">
          <div className="font-mono text-cyan-300">{counters[active].name}</div>
          <div className="flex flex-col gap-1 text-[10px] sm:flex-row sm:gap-4">
            <div><span className="text-green-400">Normal: </span><span className="text-slate-400">{counters[active].normal}</span></div>
            <div><span className="text-red-400">Problem: </span><span className="text-slate-400">{counters[active].problem}</span></div>
          </div>
          <p className="text-slate-300 leading-5">{counters[active].meaning}</p>
        </div>
      )}
    </div>
  )
}
export default EthtoolOutputViz
