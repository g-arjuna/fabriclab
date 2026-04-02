// IbstatOutputViz.tsx
"use client"
import { useState } from "react"

type StateValue = "Active" | "Polling" | "Down" | "Init"

const stateDetails: Record<StateValue, { color: string; meaning: string; cause: string; action: string }> = {
  Active: { color: "#22c55e", meaning: "RDMA fully operational. Link is up and initialised by the Subnet Manager.", cause: "Normal operation.", action: "No action needed." },
  Polling: { color: "#f59e0b", meaning: "NIC is sending link-up signals but not receiving a valid response from the switch.", cause: "Switch port not yet up, cable issue, or switch still booting.", action: "Check switch port state. Check cable seating. Wait if switch is still booting." },
  Down: { color: "#ef4444", meaning: "No signal at all. The link does not exist.", cause: "Cable unplugged, broken cable, NIC hardware fault, switch port disabled.", action: "Check physical connection. Reseat cable. Check switch port admin state." },
  Init: { color: "#818cf8", meaning: "Physical link is up but IB state machine has not completed. SM has not assigned a LID yet.", cause: "UFM is starting, or node joined fabric after SM discovery cycle.", action: "Wait 30–60 seconds. If it does not become Active, check UFM and FM daemon." },
}

export function IbstatOutputViz() {
  const [state, setState] = useState<StateValue>("Active")
  const detail = stateDetails[state]

  const lids: Record<StateValue, string> = { Active: "12", Polling: "0", Down: "0", Init: "0" }
  const rates: Record<StateValue, string> = { Active: "400", Polling: "0", Down: "—", Init: "100" }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">ibstat output — explore each state</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(stateDetails) as StateValue[]).map(s => (
          <button key={s} onClick={() => setState(s)}
            className="rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-all"
            style={{ backgroundColor: state === s ? stateDetails[s].color + "33" : "#0f172a", border: `1px solid ${state === s ? stateDetails[s].color : "#1e293b"}`, color: stateDetails[s].color }}>
            {s}
          </button>
        ))}
      </div>
      <div className="mb-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0a0f1a] p-4 font-mono text-xs leading-6 text-slate-300">
        <div className="min-w-[320px]">
        <div className="text-slate-500">CA &apos;mlx5_0&apos;</div>
        <div className="pl-4">CA type: MT4129</div>
        <div className="pl-4">Firmware version: 28.38.1002</div>
        <div className="pl-4 text-slate-500">Port 1:</div>
        <div className="flex gap-2 pl-8">
          <span className="text-slate-500">State:</span>
          <span style={{ color: detail.color }}>{state}</span>
        </div>
        <div className="pl-8">Physical state: {state === "Down" ? "Disabled" : "LinkUp"}</div>
        <div className="pl-8">Rate: <span className={rates[state] === "400" ? "text-green-400" : "text-amber-400"}>{rates[state]}{rates[state] !== "—" ? " Gb/s" : ""}</span></div>
        <div className="pl-8">Base lid: <span className={lids[state] !== "0" ? "text-green-400" : "text-red-400"}>{lids[state]}</span></div>
        <div className="pl-8">SM lid: {state === "Down" ? <span className="text-red-400">0</span> : <span className="text-green-400">1</span>}</div>
        <div className="pl-8">Link layer: Ethernet</div>
        </div>
      </div>
      <div className="rounded-xl p-4 space-y-2 text-xs" style={{ backgroundColor: detail.color + "11", border: `1px solid ${detail.color}33` }}>
        <div><span className="font-semibold" style={{ color: detail.color }}>Meaning: </span><span className="text-slate-300">{detail.meaning}</span></div>
        <div><span className="font-semibold text-slate-400">Cause: </span><span className="text-slate-400">{detail.cause}</span></div>
        <div><span className="font-semibold text-slate-400">Action: </span><span className="text-slate-300">{detail.action}</span></div>
      </div>
    </div>
  )
}
export default IbstatOutputViz


// InterfaceCountersViz.tsx — separate file below
