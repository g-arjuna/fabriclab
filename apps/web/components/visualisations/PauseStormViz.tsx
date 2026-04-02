"use client"
import { useState } from "react"

// PauseStormViz
type StormPhase = "normal" | "congestion" | "propagation" | "deadlock" | "watchdog"

const stormPhases: { id: StormPhase; label: string; color: string }[] = [
  { id: "normal", label: "Normal operation", color: "#14532d" },
  { id: "congestion", label: "Congestion starts", color: "#065f46" },
  { id: "propagation", label: "Pause propagates", color: "#78350f" },
  { id: "deadlock", label: "Circular deadlock", color: "#7f1d1d" },
  { id: "watchdog", label: "Watchdog fires", color: "#4c1d95" },
]

const stormDetails: Record<StormPhase, { description: string; what_you_see: string; counters: string }> = {
  normal: {
    description: "All ports flowing freely. Traffic is distributed across the fabric. No pause frames. Buffer utilisation below 20% on all ports.",
    what_you_see: "show interface counters: drops=0, PFC pause frames=0, buffer util=15%",
    counters: "ethtool: rx_pfc_pause_frames=0, tx_pfc_pause_frames=0",
  },
  congestion: {
    description: "A training job starts AllReduce. Multiple DGX nodes simultaneously send to the same destination switch port. Buffer utilisation rises on the congested port.",
    what_you_see: "show interface counters: drops=0, PFC pause frames growing, buffer util=72%",
    counters: "ethtool: rx_pfc_pause_frames growing, tx_pfc_pause_frames=0",
  },
  propagation: {
    description: "The congested switch sends PAUSE frames upstream. Its upstream neighbour now has traffic queuing behind the paused link. That switch's buffer fills. It sends PAUSE frames to ITS upstream neighbours.",
    what_you_see: "Multiple switch ports showing PFC pause frames. The pause has propagated 2–3 hops upstream from the original congestion point.",
    counters: "ethtool on multiple DGX nodes: rx_pfc_pause_frames growing on nodes that were not the original congestion source",
  },
  deadlock: {
    description: "CRITICAL: Two or more pause chains have created a circular dependency. Switch A is paused waiting for Switch B to drain. Switch B is paused waiting for Switch A to drain. Neither can progress. The fabric freezes in the affected segment.",
    what_you_see: "Multiple ports across multiple switches showing sustained PFC pause frames. Zero drops (PFC is working). Near-zero throughput. Training jobs hung indefinitely.",
    counters: "rx_pfc_pause_frames on affected NICs growing at maximum rate and not stopping. Watchdog not yet fired.",
  },
  watchdog: {
    description: "After 200ms of sustained pause, the PFC watchdog fires. It forcibly breaks the pause by dropping packets from the frozen queue. Traffic resumes at reduced rate. Brief RDMA retransmissions occur. Training continues.",
    what_you_see: "PFC pause frames counter stops growing. Brief spike in drops (watchdog action: drop). Throughput recovers. ethtool shows brief tx_dropped increment.",
    counters: "rx_pfc_pause_frames stops. tx_dropped brief increment. Normal operation resumes within 1–2 seconds.",
  },
}

export function PauseStormViz() {
  const [phase, setPhase] = useState<StormPhase>("deadlock")
  const detail = stormDetails[phase]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Pause storm progression — click each phase
      </p>
      <div className="flex flex-wrap gap-2 mb-5">
        {stormPhases.map(p => (
          <button key={p.id} onClick={() => setPhase(p.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              backgroundColor: phase === p.id ? p.color : "#0f172a",
              border: `1px solid ${phase === p.id ? p.color : "#1e293b"}`,
              color: phase === p.id ? "#fff" : "#64748b",
            }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="space-y-3 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-4">
          <p className="text-slate-300 leading-6">{detail.description}</p>
        </div>
        <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-3">
          <div className="text-[10px] text-slate-500 mb-1.5">What you see in the switch CLI</div>
          <p className="break-all font-mono text-[10px] leading-5 text-slate-300">{detail.what_you_see}</p>
        </div>
        <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-3">
          <div className="text-[10px] text-slate-500 mb-1.5">What you see in ethtool on the DGX</div>
          <p className="break-all font-mono text-[10px] leading-5 text-slate-300">{detail.counters}</p>
        </div>
      </div>
    </div>
  )
}
export default PauseStormViz
