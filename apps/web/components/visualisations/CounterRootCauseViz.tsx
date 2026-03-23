"use client"
import { useState } from "react"

// CounterRootCauseViz
type CounterPattern = "symbol_only" | "symbol_link" | "xmt_discards" | "vl15_drops" | "rcv_errors"

const patterns: { id: CounterPattern; label: string; color: string }[] = [
  { id: "symbol_only", label: "SymbolErrors growing, no LinkErrors", color: "#f59e0b" },
  { id: "symbol_link", label: "Both SymbolErrors AND LinkErrors growing", color: "#ef4444" },
  { id: "xmt_discards", label: "Non-zero XmtDiscards", color: "#818cf8" },
  { id: "vl15_drops", label: "Non-zero VL15Drops", color: "#f87171" },
  { id: "rcv_errors", label: "Non-zero RcvErrors", color: "#fb923c" },
]

const patternDetails: Record<CounterPattern, { diagnosis: string; rootCauses: string[]; immediateActions: string[]; urgency: string }> = {
  symbol_only: {
    diagnosis: "Early-stage physical layer degradation. Link still stable — no recoveries yet. Physical signal quality is marginal but holding.",
    rootCauses: ["Dirty optical connector (most common)", "Cable bent beyond minimum bend radius (15mm for OM4, 30mm for OS2)", "Transceiver approaching end of life (typically 3–5 years for VCSEL-based optics)", "Minor connector damage", "Temperature stress on the transceiver"],
    immediateActions: ["Clean the optical connectors with IEC 61300 approved cleaner", "Check cable routing — look for tight bends near patch panels", "Run ibdiagnet to establish if this is isolated or fabric-wide", "Monitor delta — if growing fast, act immediately; if stable, schedule maintenance"],
    urgency: "Monitor. Not yet causing failures but will worsen.",
  },
  symbol_link: {
    diagnosis: "Active link instability. SymbolErrors exceeded threshold causing link layer recovery. Each recovery interrupts traffic briefly — training jobs will see intermittent NCCL timeouts.",
    rootCauses: ["Failing optical transceiver (most common)", "Damaged cable — internal fiber break", "Loose QSFP connector not fully seated", "ESD damage to transceiver or NIC"],
    immediateActions: ["Replace the optical transceiver first (faster, lower risk)", "If problem persists, replace the cable", "Reseat both ends of the cable before replacing", "Schedule a maintenance window — active link cycling risks training job failures"],
    urgency: "High. This is causing real traffic interruptions now.",
  },
  xmt_discards: {
    diagnosis: "Transmit discards in InfiniBand indicate credit flow control failure. This SHOULD NOT HAPPEN. Credits prevent buffer overflow. Non-zero XmtDiscards means something is fundamentally wrong.",
    rootCauses: ["Routing loop (SM computed a loop in routing tables)", "VL (Virtual Lane) credit misconfiguration", "SM routing table corruption", "Rare ASIC bug"],
    immediateActions: ["Run ibdiagnet to check for routing loops and VL credit issues", "Check UFM event log for SM errors around the time discards started", "If routing loop confirmed, restart UFM during a maintenance window for fresh routing", "Engage NVIDIA support if persistent after SM restart"],
    urgency: "High. Routing loops waste bandwidth and can cause widespread fabric instability.",
  },
  vl15_drops: {
    diagnosis: "Virtual Lane 15 drops mean SM management traffic is being lost. The SM cannot communicate reliably with the fabric. This can cause LID reassignment failures, routing inconsistencies, and SM failover.",
    rootCauses: ["SM server CPU overloaded (UFM process consuming too much CPU)", "Management network packet loss between UFM server and switches", "VL15 buffer too small on an overloaded switch", "Bug in SM version"],
    immediateActions: ["Check UFM server CPU and memory — is UFM process healthy?", "Check management network for packet loss (ping from UFM server to switch mgmt IP)", "Check UFM event log for SM warnings", "Consider increasing VL15 buffer size on the affected switch"],
    urgency: "Critical. SM communication failure can destabilise the entire fabric.",
  },
  rcv_errors: {
    diagnosis: "Receive errors that passed physical layer but failed CRC or length validation. Unusual — these rarely occur from cable problems alone.",
    rootCauses: ["Switch ASIC bug (check ONYX release notes)", "Firmware incompatibility between NIC firmware and switch firmware", "Packet corruption at the memory interface inside the switch", "Software error in the NIC driver generating malformed packets"],
    immediateActions: ["Check ONYX and NIC firmware versions — is there a known bug?", "Compare with other ports — isolated vs widespread", "Run ibdiagnet to rule out routing issues", "Engage NVIDIA support with ibdiagnet output"],
    urgency: "Medium. Investigate — not commonly seen from infrastructure problems.",
  },
}

export function CounterRootCauseViz() {
  const [pattern, setPattern] = useState<CounterPattern>("symbol_link")
  const detail = patternDetails[pattern]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">Counter patterns and what they reveal</p>
      <div className="space-y-1.5 mb-5">
        {patterns.map(p => (
          <button key={p.id} onClick={() => setPattern(p.id)}
            className="w-full text-left rounded-xl px-4 py-2.5 text-xs transition-all flex items-center gap-3"
            style={{
              backgroundColor: pattern === p.id ? p.color + "22" : "#0f172a",
              border: `1px solid ${pattern === p.id ? p.color : "#1e293b"}`,
            }}>
            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-slate-300">{p.label}</span>
          </button>
        ))}
      </div>
      <div className="space-y-3 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Diagnosis</div>
          <p className="text-slate-300 leading-6">{detail.diagnosis}</p>
        </div>
        <div className="rounded-xl bg-slate-800/50 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Root causes</div>
          <ul className="space-y-1">
            {detail.rootCauses.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-400">
                <span className="text-slate-600 flex-shrink-0">{i + 1}.</span>{c}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-slate-800/50 p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Immediate actions</div>
          <ul className="space-y-1">
            {detail.immediateActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300">
                <span className="text-cyan-400 flex-shrink-0">→</span>{a}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-full px-4 py-2 text-xs font-semibold text-center"
          style={{ backgroundColor: patterns.find(p => p.id === pattern)!.color + "22", color: patterns.find(p => p.id === pattern)!.color }}>
          Urgency: {detail.urgency}
        </div>
      </div>
    </div>
  )
}
export default CounterRootCauseViz
