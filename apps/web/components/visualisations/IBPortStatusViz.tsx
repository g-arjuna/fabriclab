"use client"
import { useState } from "react"

// IBPortStatusViz
type IBPortState = "Active" | "Down" | "Polling" | "Init" | "Armed"

const ibPortStates: Record<IBPortState, {
  color: string
  width: string
  speed: string
  meaning: string
  cause: string
  action: string
  guidState: string
}> = {
  Active: {
    color: "#22c55e", width: "4x", speed: "NDR",
    meaning: "Port fully operational. SM assigned LID. Routing programmed. Traffic flows.",
    cause: "Normal operating state.",
    action: "No action.",
    guidState: "0x506b4b0300a1b200",
  },
  Down: {
    color: "#ef4444", width: "--", speed: "--",
    meaning: "No physical signal. Link does not exist.",
    cause: "Cable unplugged, broken cable, powered-off device, switch port errdisable.",
    action: "Check physical cable. Check device power. Check admin state (may have been shut down).",
    guidState: "0x000000000000000",
  },
  Polling: {
    color: "#f59e0b", width: "--", speed: "--",
    meaning: "Sending IB polling signals, no response. Physical layer may be present.",
    cause: "Device on other end is booting. Switch booting. Cable OK but device not IB-ready.",
    action: "Wait 3–5 minutes during bring-up. If persistent, check device IB driver and FM daemon.",
    guidState: "0x000000000000000",
  },
  Init: {
    color: "#818cf8", width: "4x", speed: "NDR",
    meaning: "Physical link up, IB state machine started, SM discovering this port.",
    cause: "Transitional state during SM sweep. Should become Active within 10 seconds.",
    action: "Wait. If stuck in Init for > 60 seconds, check SM health (show ib sm).",
    guidState: "0x506b4b0300a1b200",
  },
  Armed: {
    color: "#a78bfa", width: "4x", speed: "NDR",
    meaning: "SM has armed this port. Final step before Active. Very brief state.",
    cause: "Normal transition — SM is programming routing for this port.",
    action: "Should transition to Active within seconds. If stuck, SM may be under heavy load.",
    guidState: "0x506b4b0300a1b200",
  },
}

export function IBPortStatusViz() {
  const [state, setState] = useState<IBPortState>("Active")
  const s = ibPortStates[state]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">IB port states — click each to understand it</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(ibPortStates) as IBPortState[]).map(st => (
          <button key={st} onClick={() => setState(st)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              backgroundColor: state === st ? ibPortStates[st].color + "33" : "#0f172a",
              border: `1px solid ${state === st ? ibPortStates[st].color : "#1e293b"}`,
              color: ibPortStates[st].color,
            }}>
            {st}
          </button>
        ))}
      </div>
      <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4 font-mono text-xs leading-6 text-slate-300 mb-4">
        <div><span className="text-slate-500">Admin:</span> <span className="text-green-400">Up</span></div>
        <div><span className="text-slate-500">Oper: </span> <span style={{ color: s.color }}>{state}</span></div>
        <div><span className="text-slate-500">Width:</span> <span className={s.width !== "--" ? "text-green-400" : "text-slate-600"}>{s.width}</span></div>
        <div><span className="text-slate-500">Speed:</span> <span className={s.speed !== "--" ? "text-green-400" : "text-slate-600"}>{s.speed}</span></div>
        <div><span className="text-slate-500">PortGUID:</span> <span className="text-slate-400">{s.guidState}</span></div>
      </div>
      <div className="space-y-2 text-xs" style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: 12 }}>
        <p className="text-slate-300">{s.meaning}</p>
        <p className="text-slate-500"><span className="text-slate-400 font-semibold">Cause: </span>{s.cause}</p>
        <p className="text-slate-300"><span className="text-cyan-400 font-semibold">Action: </span>{s.action}</p>
      </div>
    </div>
  )
}
export default IBPortStatusViz
