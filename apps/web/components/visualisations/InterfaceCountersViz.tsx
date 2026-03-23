// InterfaceCountersViz.tsx
"use client"
import { useState } from "react"

type Scenario = "clean" | "drops_only" | "pauses_only" | "both"

const scenarios: { id: Scenario; label: string; color: string }[] = [
  { id: "clean", label: "Clean — no issues", color: "#14532d" },
  { id: "drops_only", label: "Drops, no pauses", color: "#7f1d1d" },
  { id: "pauses_only", label: "Pauses, no drops", color: "#78350f" },
  { id: "both", label: "Both drops and pauses", color: "#4c1d95" },
]

const scenarioData: Record<Scenario, { drops: string; pauses: string; buffer: string; diagnosis: string; cause: string; fix: string }> = {
  clean: { drops: "0", pauses: "0", buffer: "12%", diagnosis: "No congestion. Network is operating cleanly.", cause: "Normal operation — traffic rate is below port capacity.", fix: "No action needed." },
  drops_only: { drops: "47,291", pauses: "0", buffer: "94%", diagnosis: "Drops without pauses → ECN and PFC both missing or misconfigured.", cause: "Congestion is building but nothing is signalling senders to slow down. Buffer fills to 100% and packets are dropped.", fix: "Enable PFC and/or ECN. Check show dcb pfc and show dcb ets." },
  pauses_only: { drops: "0", pauses: "12,847", buffer: "71%", diagnosis: "Pauses without drops → PFC is working as intended.", cause: "Congestion is present but PFC is preventing drops by pausing the sender. This is correct lossless behaviour — though rapidly growing pauses may indicate a pause storm.", fix: "Monitor pause rate. If pauses keep growing, check for pause storm (ethtool -S). Consider enabling ECN for proactive congestion control." },
  both: { drops: "47,291", pauses: "12,847", buffer: "99%", diagnosis: "Both drops AND pauses → PFC is configured but overwhelmed.", cause: "PFC is sending PAUSE frames but the congestion is so severe that even after pausing, buffers still fill and overflow. Or: PFC is on wrong priority.", fix: "Check PFC priority matches RoCEv2 traffic marking. Enable ECN. Look for pause storm — a faulty switch or cable causing upstream congestion." },
}

export function InterfaceCountersViz() {
  const [scenario, setScenario] = useState<Scenario>("drops_only")
  const data = scenarioData[scenario]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">show interface counters — what each pattern means</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {scenarios.map(s => (
          <button key={s.id} onClick={() => setScenario(s.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{ backgroundColor: scenario === s.id ? s.color : "#0f172a", border: `1px solid ${scenario === s.id ? s.color : "#1e293b"}`, color: scenario === s.id ? "#fff" : "#64748b" }}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4 font-mono text-xs leading-6 text-slate-300 mb-4">
        <div className="text-slate-500">Interface eth0</div>
        <div className="pl-4">Input packets: <span className="text-slate-400">1,847,293,441</span></div>
        <div className="pl-4">Output packets: <span className="text-slate-400">1,847,104,219</span></div>
        <div className="pl-4">Output drops: <span className={data.drops === "0" ? "text-green-400" : "text-red-400"}>{data.drops}</span></div>
        <div className="pl-4">PFC pause frames: <span className={data.pauses === "0" ? "text-green-400" : "text-amber-400"}>{data.pauses}</span></div>
        <div className="pl-4">Buffer util: <span className={parseInt(data.buffer) > 80 ? "text-red-400" : "text-green-400"}>{data.buffer}</span></div>
      </div>
      <div className="space-y-2 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-3"><span className="font-semibold text-white">Diagnosis: </span><span className="text-slate-300">{data.diagnosis}</span></div>
        <div className="rounded-xl bg-slate-800/50 p-3"><span className="font-semibold text-slate-400">Root cause: </span><span className="text-slate-400">{data.cause}</span></div>
        <div className="rounded-xl bg-slate-800/50 p-3"><span className="font-semibold text-cyan-400">Fix: </span><span className="text-slate-300">{data.fix}</span></div>
      </div>
    </div>
  )
}
export default InterfaceCountersViz
