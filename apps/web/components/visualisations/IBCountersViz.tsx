"use client"
import { useState } from "react"

// IBCountersViz
interface CounterDef {
  name: string
  goodValue: string
  warnValue: string
  badValue: string
  meaning: string
  rootCause: string
}

const counterDefs: CounterDef[] = [
  {
    name: "SymbolErrors",
    goodValue: "0",
    warnValue: "1–100",
    badValue: "100+ or growing",
    meaning: "Uncorrectable physical layer bit errors. The most sensitive early warning of cable and transceiver problems.",
    rootCause: "Dirty optical connector, cable near minimum bend radius, failing transceiver, electromagnetic interference.",
  },
  {
    name: "LinkErrors",
    goodValue: "0",
    warnValue: "1–5",
    badValue: "Growing",
    meaning: "Count of link layer recovery cycles. Each recovery briefly interrupts traffic.",
    rootCause: "Accumulated symbol errors forced a link recovery. Usually follows high SymbolErrors.",
  },
  {
    name: "RcvErrors",
    goodValue: "0",
    warnValue: "Any",
    badValue: "Any",
    meaning: "Receive-side packet errors passing physical layer but failing CRC or length check.",
    rootCause: "Switch ASIC bug, firmware issue, or packet corruption above the physical layer.",
  },
  {
    name: "XmtDiscards",
    goodValue: "0",
    warnValue: "0 (any is abnormal)",
    badValue: "Any",
    meaning: "Packets discarded on transmit — buffer overflow despite credit flow control. Should NEVER occur in healthy IB.",
    rootCause: "Routing loop, VL credit misconfiguration, SM routing table error.",
  },
  {
    name: "VL15Drops",
    goodValue: "0",
    warnValue: "0 (any is serious)",
    badValue: "Any",
    meaning: "Drops on the management VL. SM cannot communicate reliably. Can cause LID corruption.",
    rootCause: "SM server overloaded, management network packet loss, SM port congestion.",
  },
]

export function IBCountersViz() {
  const [selected, setSelected] = useState<number>(0)
  const c = counterDefs[selected]

  const sampleValues = [0, 147, 0, 2, 0]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">show ib counters — click each counter type</p>
      <div className="rounded-xl bg-[#0a0f1a] border border-white/10 p-4 font-mono text-[10px] leading-7 mb-4">
        <div className="text-slate-500 mb-2">IB Port Counters Summary — Switch QM9700-2</div>
        <div className="grid gap-1">
          <div className="grid grid-cols-6 text-slate-600 text-[9px] mb-1">
            <span>Interface</span>
            {counterDefs.map(cd => <span key={cd.name}>{cd.name.slice(0, 8)}..</span>)}
          </div>
          {[3, 7, 12].map((port, pi) => (
            <div key={port} className="grid grid-cols-6">
              <span className="text-slate-400">IB1/{port}</span>
              {sampleValues.map((val, ci) => {
                const actualVal = pi === 1 && ci === 0 ? 14827 : pi === 1 && ci === 1 ? 2 : pi === 2 && ci === 3 ? 47 : 0
                return (
                  <button key={ci} onClick={() => setSelected(ci)}
                    className={`text-left rounded px-1 transition-all ${selected === ci ? "bg-slate-800" : ""}`}
                    style={{ color: actualVal > 0 ? "#ef4444" : "#4ade80" }}>
                    {actualVal.toLocaleString()}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-4 space-y-3 text-xs border border-white/10 bg-slate-800/50">
        <div className="font-mono text-sm text-cyan-300">{c.name}</div>
        <div className="flex gap-4 text-[10px]">
          <span className="text-green-400">Good: {c.goodValue}</span>
          <span className="text-amber-400">Watch: {c.warnValue}</span>
          <span className="text-red-400">Bad: {c.badValue}</span>
        </div>
        <p className="text-slate-300 leading-5">{c.meaning}</p>
        <p className="text-slate-400 leading-5"><span className="font-semibold">Root cause: </span>{c.rootCause}</p>
      </div>
    </div>
  )
}
export default IBCountersViz
