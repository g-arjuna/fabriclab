"use client"
import { useState } from "react"

type TimelineScenario = "ecn_resolves" | "pfc_needed" | "capacity_failure"

const scenarios: { id: TimelineScenario; label: string; color: string; subtitle: string }[] = [
  { id: "ecn_resolves", label: "ECN resolves it", color: "#14532d", subtitle: "Normal — no PFC needed" },
  { id: "pfc_needed", label: "PFC backstop used", color: "#78350f", subtitle: "Brief pause, quick recovery" },
  { id: "capacity_failure", label: "Capacity exceeded", color: "#7f1d1d", subtitle: "Drops despite both mechanisms" },
]

const timelineEvents: Record<TimelineScenario, { time: string; event: string; mechanism: string; counters: string }[]> = {
  ecn_resolves: [
    { time: "T=0ms", event: "AllReduce starts. Multiple nodes send simultaneously. Port input rate briefly exceeds output rate.", mechanism: "—", counters: "buffer util rising" },
    { time: "T=0.05ms", event: "Buffer crosses ECN min-threshold (150 KB).", mechanism: "ECN", counters: "switch begins CE marking" },
    { time: "T=0.1ms", event: "Receivers receive CE-marked packets. Generate CNPs. Send to senders.", mechanism: "ECN", counters: "rx_ecn_marked growing on DGX" },
    { time: "T=0.15ms", event: "DCQCN in sender NICs reduces injection rates.", mechanism: "DCQCN", counters: "throughput reduces slightly" },
    { time: "T=0.5ms", event: "Buffer drains. ECN threshold no longer crossed. Marking stops.", mechanism: "ECN", counters: "rx_ecn_marked stops growing" },
    { time: "T=2ms", event: "DCQCN recovery. Rates return to full. AllReduce completes.", mechanism: "DCQCN", counters: "throughput returns to normal" },
  ],
  pfc_needed: [
    { time: "T=0ms", event: "Large burst — multiple nodes start AllReduce simultaneously with maximum-size gradients.", mechanism: "—", counters: "buffer util rising rapidly" },
    { time: "T=0.05ms", event: "ECN threshold crossed. CE marking begins.", mechanism: "ECN", counters: "rx_ecn_marked growing" },
    { time: "T=0.1ms", event: "DCQCN reduces rates but burst is too large for rate reduction to drain buffer in time.", mechanism: "DCQCN", counters: "buffer still rising despite rate reduction" },
    { time: "T=0.3ms", event: "Buffer crosses PFC threshold. Switch sends PAUSE frames for CoS 3.", mechanism: "PFC", counters: "PFC pause frames rising on switch" },
    { time: "T=0.5ms", event: "Senders receive PAUSE. Stop transmitting. In-flight packets absorbed by headroom.", mechanism: "PFC", counters: "rx_pfc_pause_frames rising on DGX" },
    { time: "T=1.2ms", event: "Buffer drains below PFC threshold. RESUME sent (or pause expires).", mechanism: "PFC", counters: "pause frames stop growing" },
    { time: "T=3ms", event: "AllReduce completes. DCQCN recovery to full rate.", mechanism: "DCQCN", counters: "throughput returns to normal" },
  ],
  capacity_failure: [
    { time: "T=0ms", event: "Sustained oversubscription — aggregate input rate exceeds output rate continuously.", mechanism: "—", counters: "buffer util at 100%" },
    { time: "T=0.05ms", event: "ECN marking at 100%. All packets marked.", mechanism: "ECN", counters: "rx_ecn_marked at maximum rate" },
    { time: "T=0.1ms", event: "DCQCN reduces rates to minimum floor. Buffer still full — new flows keep arriving.", mechanism: "DCQCN", counters: "throughput reduced but buffer stays full" },
    { time: "T=0.2ms", event: "PFC pauses senders. Buffer still full — aggregate input still exceeds output.", mechanism: "PFC", counters: "PFC pauses + drops both present" },
    { time: "T=ongoing", event: "Drops occur despite PFC. New flows continuously arrive, filling any drained capacity.", mechanism: "none — capacity limit", counters: "Output drops non-zero AND PFC pauses present" },
  ],
}

export function CongestionTimelineViz() {
  const [scenario, setScenario] = useState<TimelineScenario>("pfc_needed")

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Congestion event timeline — PFC and ECN working together
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {scenarios.map(s => (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            className="flex-1 rounded-xl px-3 py-2.5 text-left text-xs transition-all"
            style={{
              backgroundColor: scenario === s.id ? s.color : "#0f172a",
              border: `1px solid ${scenario === s.id ? s.color : "#1e293b"}`,
              color: scenario === s.id ? "#fff" : "#64748b",
            }}
          >
            <div className="font-semibold">{s.label}</div>
            <div className="mt-0.5 text-[10px] opacity-70">{s.subtitle}</div>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {timelineEvents[scenario].map((event, i) => {
          const mechColors: Record<string, string> = {
            ECN: "#1e3a5f",
            DCQCN: "#4c1d95",
            PFC: "#78350f",
            "none — capacity limit": "#7f1d1d",
            "—": "#1e293b",
          }
          const mechBorders: Record<string, string> = {
            ECN: "#60a5fa",
            DCQCN: "#a78bfa",
            PFC: "#f59e0b",
            "none — capacity limit": "#ef4444",
            "—": "#475569",
          }
          const bg = mechColors[event.mechanism] ?? "#1e293b"
          const border = mechBorders[event.mechanism] ?? "#475569"

          return (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-xs"
              style={{ backgroundColor: `${bg}33`, border: `1px solid ${border}33` }}
            >
              <span className="w-20 flex-shrink-0 font-mono text-slate-500">{event.time}</span>
              <div className="flex-1">
                <p className="leading-5 text-slate-300">{event.event}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-600">{event.counters}</p>
              </div>
              {event.mechanism !== "—" && (
                <span
                  className="flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                  style={{ backgroundColor: bg, color: border }}
                >
                  {event.mechanism}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {scenario === "capacity_failure" && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">
          <span className="font-semibold">Distinguishing config failure from capacity failure: </span>
          Config failure: drops with ECN marking zero → ECN not configured. Capacity failure: drops WITH ECN marking active AND PFC pauses present → fabric is undersized. Fix: more bandwidth or better traffic engineering.
        </div>
      )}
    </div>
  )
}

export default CongestionTimelineViz
