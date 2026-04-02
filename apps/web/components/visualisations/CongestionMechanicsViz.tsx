"use client"
import { useState } from "react"

type Mechanism = "none" | "pfc_only" | "pfc_ecn"

const mechanisms: { id: Mechanism; label: string; subtitle: string }[] = [
  { id: "none", label: "No mechanism", subtitle: "Tail drop" },
  { id: "pfc_only", label: "PFC only", subtitle: "Pauses, risk of deadlock" },
  { id: "pfc_ecn", label: "PFC + ECN", subtitle: "Rate reduction first, pause as backstop" },
]

const details: Record<Mechanism, {
  color: string
  border: string
  bufferFill: number
  drops: boolean
  pauses: boolean
  marks: boolean
  rdmaState: string
  trainingImpact: string
  timeline: string[]
}> = {
  none: {
    color: "#7f1d1d",
    border: "#ef4444",
    bufferFill: 100,
    drops: true,
    pauses: false,
    marks: false,
    rdmaState: "Queue pair error — retransmission required",
    trainingImpact: "AllReduce stalls on every drop event. At 400G, a congestion burst causes hundreds of packet drops. Each drop stalls all 256 GPUs in the job until retransmission completes.",
    timeline: [
      "T=0ms: Traffic exceeds port capacity",
      "T=0.1ms: Buffer fills to 100%",
      "T=0.1ms: Tail drop — packets discarded",
      "T=50ms: Sender detects loss via timeout",
      "T=50ms: RDMA QP enters error state",
      "T=50ms: ALL GPUs stall at AllReduce barrier",
      "T=200ms: Retransmission completes",
      "T=200ms: AllReduce can resume",
    ],
  },
  pfc_only: {
    color: "#78350f",
    border: "#f59e0b",
    bufferFill: 75,
    drops: false,
    pauses: true,
    marks: false,
    rdmaState: "Active — lossless, but paused intermittently",
    trainingImpact: "No drops. AllReduce completes but throughput is reduced by pause stop-start cycles. Risk of pause storm if congestion is sustained.",
    timeline: [
      "T=0ms: Traffic exceeds port capacity",
      "T=0.08ms: Buffer reaches PFC threshold (75% full)",
      "T=0.08ms: Switch sends PAUSE frame upstream",
      "T=0.28ms: Sender receives PAUSE, stops transmitting",
      "T=0.5ms: Buffer drains below threshold",
      "T=0.5ms: Switch sends RESUME frame",
      "T=0.6ms: Sender resumes at full rate",
      "T=0.7ms: Buffer fills again — cycle repeats",
    ],
  },
  pfc_ecn: {
    color: "#14532d",
    border: "#22c55e",
    bufferFill: 35,
    drops: false,
    pauses: false,
    marks: true,
    rdmaState: "Active — lossless, DCQCN managing rate",
    trainingImpact: "No drops. No pauses in most cases. DCQCN reduces injection rate smoothly. AllReduce completes at near-optimal throughput.",
    timeline: [
      "T=0ms: Traffic exceeds port capacity",
      "T=0.05ms: Buffer crosses ECN min-threshold",
      "T=0.05ms: Switch marks packets with CE bit",
      "T=0.1ms: Receiver sends CNP to sender",
      "T=0.15ms: Sender's NIC reduces injection rate",
      "T=0.5ms: Buffer depth stabilises and begins falling",
      "T=1ms: Buffer below ECN threshold",
      "T=2ms: DCQCN recovery — rate gradually increases",
    ],
  },
}

export function CongestionMechanicsViz() {
  const [mech, setMech] = useState<Mechanism>("pfc_ecn")
  const d = details[mech]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        What happens when a port receives more traffic than it can send
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {mechanisms.map(m => (
          <button key={m.id} onClick={() => setMech(m.id)}
            className="w-full rounded-xl px-3 py-2.5 text-left text-xs transition-all sm:flex-1"
            style={{
              backgroundColor: mech === m.id ? details[m.id].color + "44" : "#0f172a",
              border: `1px solid ${mech === m.id ? details[m.id].border : "#1e293b"}`,
              color: mech === m.id ? "#fff" : "#64748b",
            }}>
            <div className="font-semibold">{m.label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{m.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Buffer visualisation */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>Switch buffer depth</span>
          <span style={{ color: d.border }}>{d.bufferFill}% full</span>
        </div>
        <div className="h-8 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
            style={{ width: `${d.bufferFill}%`, backgroundColor: d.border, minWidth: 40 }}>
            <span className="text-[10px] font-bold text-white">{d.bufferFill}%</span>
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-1 text-[10px] sm:flex-row sm:gap-4">
          <span className={d.drops ? "text-red-400 font-semibold" : "text-slate-700"}>
            {d.drops ? "✗ Drops occurring" : "✓ No drops"}
          </span>
          <span className={d.pauses ? "text-amber-400 font-semibold" : "text-slate-700"}>
            {d.pauses ? "⏸ PFC pauses active" : "— No pauses"}
          </span>
          <span className={d.marks ? "text-cyan-400 font-semibold" : "text-slate-700"}>
            {d.marks ? "◆ ECN marking active" : "— No ECN marks"}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Event timeline</div>
        <div className="space-y-1">
          {d.timeline.map((event, i) => (
            <div key={i} className="flex items-start gap-3 text-xs">
              <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ backgroundColor: d.color, color: d.border }}>
                {i + 1}
              </div>
              <span className="text-slate-300 leading-5">{event}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4 text-xs space-y-2"
        style={{ backgroundColor: d.color + "22", border: `1px solid ${d.border}33` }}>
        <div><span className="font-semibold" style={{ color: d.border }}>RDMA state: </span>
          <span className="text-slate-300">{d.rdmaState}</span></div>
        <div><span className="font-semibold text-white">Training impact: </span>
          <span className="text-slate-300">{d.trainingImpact}</span></div>
      </div>
    </div>
  )
}
export default CongestionMechanicsViz
