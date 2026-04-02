"use client"

import { useState } from "react"

const scenarios = [
  {
    symptom: "Throughput dropped to 87.5% — one GPU silent",
    commands: ["ibstat", "show topology", "show switch port rail<N>"],
    diagnosis: "One NIC not Active or switch port error-disabled",
    rootCause: "Link flap → switch errdisable. Physical: faulty optic or cable.",
    color: "#7f1d1d",
  },
  {
    symptom: "Throughput degraded across all GPUs simultaneously",
    commands: ["show interface counters", "ethtool -S eth0", "show dcb pfc"],
    diagnosis: "Drops + pauses = PFC storm or misconfiguration",
    rootCause: "PFC on wrong priority, or upstream switch causing pause storm.",
    color: "#78350f",
  },
  {
    symptom: "Throughput degraded, no drops shown in counters",
    commands: ["ethtool -S eth0 (rx_pfc_pause_frames)", "show dcb pfc (watchdog)"],
    diagnosis: "Pause storm — NIC paused continuously, not dropping",
    rootCause: "rx_pfc_pause_frames growing fast. PFC deadlock without watchdog.",
    color: "#4c1d95",
  },
  {
    symptom: "High AllReduce latency, no drops or pauses",
    commands: ["show dcb ets", "show roce", "show interface counters (buffer %)"],
    diagnosis: "ECN not configured — congestion building silently",
    rootCause: "Buffer utilisation high but no early signal. Enable ECN/DCQCN.",
    color: "#1e3a5f",
  },
  {
    symptom: "Node not appearing in UFM after boot",
    commands: ["ibstat (Base lid = 0?)", "systemctl status nvidia-fabricmanager", "show ib sm"],
    diagnosis: "FM daemon not running or SM not managing this node",
    rootCause: "FM not started, UFM not running at node boot time.",
    color: "#065f46",
  },
]

export function ScenarioCommandMapViz() {
  const [active, setActive] = useState<number | null>(null)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">Symptom → command sequence — click each scenario</p>
      <div className="space-y-2">
        {scenarios.map((s, i) => (
          <button
            key={i}
            onClick={() => setActive(active === i ? null : i)}
            className="w-full rounded-xl px-4 py-3 text-left transition-all"
            style={{
              backgroundColor: active === i ? s.color + "44" : "#0f172a",
              border: `1px solid ${active === i ? s.color : s.color + "44"}`,
            }}
          >
            <div className="text-sm text-white">{s.symptom}</div>
            {active === i && (
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <div className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">Commands to run (in order)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.commands.map((c, j) => (
                      <div key={j} className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-600">{j + 1}.</span>
                        <code className="break-all rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-cyan-300">{c}</code>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-800/50 p-2">
                  <span className="text-slate-400">Likely diagnosis: </span>
                  <span className="text-slate-300">{s.diagnosis}</span>
                </div>
                <div className="rounded-lg bg-slate-800/50 p-2">
                  <span className="text-slate-400">Root cause: </span>
                  <span className="text-slate-300">{s.rootCause}</span>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ScenarioCommandMapViz
