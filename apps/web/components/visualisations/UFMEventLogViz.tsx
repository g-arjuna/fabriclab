"use client"

import { useState } from "react"

interface UFMEvent {
  time: string
  severity: "ERROR" | "WARNING" | "INFO"
  event: string
  component: string
  explanation: string
}

const events: UFMEvent[] = [
  { time: "02:14:33", severity: "ERROR", event: "Port down", component: "QM9700-2/port7", explanation: "The InfiniBand port on leaf switch QM9700-2, port 7, lost its link. This port connects to DGX-node-12's mlx5_7 NIC (Rail 7). The SM detected this topology change immediately." },
  { time: "02:14:35", severity: "WARNING", event: "Link recovery", component: "QM9700-2/port7", explanation: "The SM detected the link came back up momentarily. This is link flapping — the port is oscillating between Up and Down. Physical cause: failing optical transceiver or damaged cable." },
  { time: "02:14:37", severity: "ERROR", event: "Port down", component: "QM9700-2/port7", explanation: "Port went down again within 2 seconds. Multiple rapid down/up cycles confirm active link flapping — not a clean cable disconnect." },
  { time: "02:14:38", severity: "WARNING", event: "Link recovery", component: "QM9700-2/port7", explanation: "Brief recovery again. The switch errdisable mechanism has not yet triggered (needs more sustained flapping)." },
  { time: "02:14:41", severity: "ERROR", event: "Port down", component: "QM9700-2/port7", explanation: "Third down event. At this point the SM has started computing alternate routes to route around this unstable link." },
  { time: "02:21:18", severity: "ERROR", event: "SM rerouted around fault", component: "QM9700-2/port7", explanation: "After 7 minutes of instability, the SM decided to route around this port permanently. This triggers a fabric-wide routing table update." },
  { time: "02:21:22", severity: "INFO", event: "Routing tables reprogrammed", component: "All switches", explanation: "The SM completed its reroute computation and programmed new forwarding tables on all 32 switches simultaneously. Brief disruption during programming — existing connections briefly interrupted." },
  { time: "02:21:24", severity: "WARNING", event: "Training job NCCL timeout", component: "dgx-node-12", explanation: "DGX-node-12 experienced a NCCL AllReduce timeout during the 6-second window when routing tables were being reprogrammed. The NCCL job on this node aborted. The root cause chain: failing transceiver → link flapping → SM reroute → routing disruption → NCCL timeout." },
]

const severityColors: Record<UFMEvent["severity"], string> = {
  ERROR: "#ef4444",
  WARNING: "#f59e0b",
  INFO: "#60a5fa",
}

export function UFMEventLogViz() {
  const [selected, setSelected] = useState<number | null>(7)

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">UFM event log — click each event to read the story</p>
      <div className="mb-4 space-y-1">
        {events.map((e, i) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className="flex w-full flex-col items-start gap-2 rounded-xl px-3 py-2 text-left text-xs font-mono transition-all sm:flex-row sm:items-center sm:gap-3"
            style={{
              backgroundColor: selected === i ? severityColors[e.severity] + "22" : "#0f172a",
              border: `1px solid ${selected === i ? severityColors[e.severity] + "66" : "#1e293b"}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 text-[10px] text-slate-600">{e.time}</span>
              <span
                className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                style={{ backgroundColor: severityColors[e.severity] + "33", color: severityColors[e.severity] }}
              >
                {e.severity}
              </span>
            </div>
            <span className="text-slate-300 sm:flex-1">{e.event}</span>
            <span className="text-[9px] text-slate-600 sm:flex-shrink-0">{e.component}</span>
          </button>
        ))}
      </div>
      {selected !== null && (
        <div
          className="space-y-2 rounded-xl p-4 text-xs"
          style={{
            backgroundColor: severityColors[events[selected].severity] + "11",
            border: `1px solid ${severityColors[events[selected].severity] + "33"}`,
          }}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="font-mono text-slate-400">{events[selected].time}</span>
            <span style={{ color: severityColors[events[selected].severity] }} className="font-semibold">
              {events[selected].event}
            </span>
            <span className="text-slate-500">on {events[selected].component}</span>
          </div>
          <p className="leading-6 text-slate-300">{events[selected].explanation}</p>
        </div>
      )}
      <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-200">
        Read the events in sequence. The story: one failing transceiver → link flapping → SM reroute → NCCL job failure. The root cause (failing transceiver) happened 7 minutes before the training job failure. Without the event log, you would only see the NCCL timeout.
      </div>
    </div>
  )
}

export default UFMEventLogViz
