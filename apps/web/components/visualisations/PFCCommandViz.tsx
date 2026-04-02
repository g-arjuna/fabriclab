// PFCCommandViz.tsx
"use client"
import { useState } from "react"

type PFCState = "enabled" | "disabled" | "wrong_priority"

const states: { id: PFCState; label: string; color: string }[] = [
  { id: "enabled", label: "PFC enabled correctly", color: "#14532d" },
  { id: "disabled", label: "PFC disabled", color: "#7f1d1d" },
  { id: "wrong_priority", label: "PFC on wrong priority", color: "#78350f" },
]

const outputs: Record<PFCState, { output: string; analysis: string; fix: string }> = {
  enabled: {
    output: `Interface eth0
  Priority Flow Control:  enabled
  PFC enabled priorities: 3 (cos3)
  Pause quanta:           0xffff
  Watchdog:               enabled
  Watchdog interval:      200ms`,
    analysis: "PFC is configured correctly. Priority 3 matches the CoS marking for RoCEv2 traffic (DSCP 26 maps to CoS 3). Watchdog is enabled — deadlocks will be broken automatically. Pause quanta at maximum gives receivers maximum time to react.",
    fix: "No action needed. This is the target configuration for lossless RoCEv2.",
  },
  disabled: {
    output: `Interface eth0
  Priority Flow Control:  disabled
  PFC enabled priorities: none
  Pause quanta:           N/A
  Watchdog:               disabled`,
    analysis: "PFC is completely disabled. Any congestion on this port will result in packet drops rather than pauses. RDMA queue pairs will enter error state on every drop. Training throughput will degrade and NCCL will log timeout errors.",
    fix: "Run: enable pfc\nThen verify: show dcb pfc\nEnsure priority 3 is enabled after re-enabling PFC.",
  },
  wrong_priority: {
    output: `Interface eth0
  Priority Flow Control:  enabled
  PFC enabled priorities: 0 (cos0)
  Pause quanta:           0xffff
  Watchdog:               enabled
  Watchdog interval:      200ms`,
    analysis: "PFC appears enabled — but it is configured for priority 0 (cos0) instead of priority 3 (cos3). RoCEv2 traffic is marked DSCP 26 which maps to CoS 3. The switch will PAUSE priority 0 traffic (management/best-effort) but let RoCEv2 priority 3 traffic drop. This is extremely hard to diagnose because show dcb pfc shows 'enabled'.",
    fix: "Reconfigure PFC to enable priority 3, not priority 0.\nAlso verify your DSCP-to-CoS marking is set correctly for RoCEv2 traffic.",
  },
}

export function PFCCommandViz() {
  const [state, setState] = useState<PFCState>("enabled")
  const data = outputs[state]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">show dcb pfc — three states to know</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {states.map(s => (
          <button key={s.id} onClick={() => setState(s.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{ backgroundColor: state === s.id ? s.color : "#0f172a", border: `1px solid ${state === s.id ? s.color : "#1e293b"}`, color: state === s.id ? "#fff" : "#64748b" }}>
            {s.label}
          </button>
        ))}
      </div>
      <pre className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4 font-mono text-xs leading-6 text-slate-300 mb-4 overflow-x-auto">{data.output}</pre>
      <div className="space-y-2 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-3"><span className="font-semibold text-white">Analysis: </span><span className="text-slate-300">{data.analysis}</span></div>
        <div className="rounded-xl bg-slate-800/50 p-3">
          <span className="font-semibold text-cyan-400">Fix: </span>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-cyan-300">
            {data.fix}
          </pre>
        </div>
      </div>
    </div>
  )
}
export default PFCCommandViz
