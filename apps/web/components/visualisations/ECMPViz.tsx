"use client"

import { useState } from "react"

type Scenario = "ecmp_collision" | "adaptive_routing" | "spectrum_x"

const scenarios: { id: Scenario; label: string; subtitle: string }[] = [
  { id: "ecmp_collision",    label: "ECMP (traditional Ethernet)", subtitle: "The original problem" },
  { id: "adaptive_routing",  label: "InfiniBand adaptive routing", subtitle: "Per-packet load balancing" },
  { id: "spectrum_x",        label: "Spectrum-X adaptive routing", subtitle: "Ethernet implementation example" },
]

const explanations: Record<Scenario, {
  what: string
  problem: string
  result: string
  linkUtilisation: number[]
}> = {
  ecmp_collision: {
    what: "ECMP (Equal-Cost Multi-Path) routes entire flows — all packets in a TCP or RDMA flow — down the same path, chosen by hashing the 5-tuple (src IP, dst IP, src port, dst port, protocol). Once a flow is assigned to a path, it stays on that path for the entire duration.",
    problem: "When two large flows with distinct five-tuples hash to the same ECMP member, their combined offered load can exceed 400G. The link itself cannot carry more than line rate, so excess traffic queues and may eventually drop. Meanwhile other spine links can remain underutilized. Rehashing or moving flows without disrupting transport state is difficult.",
    result: "Result: persistent unequal utilization, queue growth, possible drops, and collective slowdown. Uneven utilization is a symptom rather than proof by itself; verify traffic placement and offered load.",
    linkUtilisation: [100, 100, 10, 5, 8, 3],
  },
  adaptive_routing: {
    what: "InfiniBand adaptive routing, when supported and enabled, can select among alternative output paths using local congestion information rather than pinning every packet of a flow to one path. Behavior depends on switch generation, fabric configuration, and transport ordering requirements.",
    problem: "Adaptive routing reduces persistent flow-collision hot spots, but it does not make congestion impossible. Incast, endpoint limits, topology oversubscription, and synchronized traffic can still overload queues. Packet reordering must be handled by the transport and receiver design.",
    result: "Result: typically improved distribution across eligible paths, not perfect balance or guaranteed line-rate collectives. This is one architectural reason InfiniBand can be attractive for large-scale training.",
    linkUtilisation: [87, 91, 84, 89, 86, 93],
  },
  spectrum_x: {
    what: "NVIDIA Spectrum-X documentation describes adaptive routing that sprays packets across available paths and receiver-side reordering/placement performed by the BlueField-3 SuperNIC. This is a specific hardware and software architecture; it is not a generic property of every Ethernet network or every ConnectX-7 deployment.",
    problem: "Packet spraying causes out-of-order arrival, so the Spectrum-X design uses the SuperNIC to reorder and directly place packets for the host/GPU data path, together with telemetry-based congestion control. Capabilities depend on the specific switch, NIC generation, firmware, and software stack.",
    result: "Result: Spectrum-X is an Ethernet implementation designed to reduce ECMP collision effects using adaptive routing, reordering, telemetry-based congestion control, and lossless behavior. Performance comparisons require workload- and topology-specific measurements; do not treat them as universal percentages.",
    linkUtilisation: [85, 88, 90, 83, 87, 92],
  },
}

export function ECMPViz() {
  const [scenario, setScenario] = useState<Scenario>("ecmp_collision")
  const exp = explanations[scenario]

  const maxUtil = 100
  const linkLabels = ["Spine 1→2", "Spine 1→3", "Spine 2→3", "Spine 2→4", "Spine 3→4", "Spine 3→5"]

  const utilColor = (pct: number) => {
    if (pct >= 95) return "#ef4444"
    if (pct >= 80) return "#f59e0b"
    return "#22c55e"
  }

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        ECMP collisions vs adaptive routing — the load balancing gap
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {scenarios.map(s => (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            className="rounded-xl px-3 py-2 text-xs transition-all text-left"
            style={{
              backgroundColor: scenario === s.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${scenario === s.id ? "#60a5fa" : "#1e293b"}`,
              color: scenario === s.id ? "#bfdbfe" : "#64748b",
            }}
          >
            <div className="font-semibold">{s.label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{s.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Link utilisation visualisation */}
      <div className="mb-5 rounded-xl bg-slate-800/50 p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
          Illustrative spine-link carried utilization (simulated, not measured)
        </p>
        <div className="space-y-2">
          {exp.linkUtilisation.map((pct, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className="w-24 text-slate-400 flex-shrink-0 text-[10px]">{linkLabels[i]}</span>
              <div className="flex-1 h-5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                  style={{
                    width: `${(pct / maxUtil) * 100}%`,
                    backgroundColor: utilColor(pct),
                    minWidth: 32,
                  }}
                >
                  <span className="text-[9px] font-bold text-white">{pct}%</span>
                </div>
              </div>
              {pct >= 95 && (
                <span className="text-[9px] text-red-400 flex-shrink-0">SATURATED</span>
              )}
              {pct < 20 && (
                <span className="text-[9px] text-slate-600 flex-shrink-0">idle</span>
              )}
            </div>
          ))}
        </div>
        {scenario === "ecmp_collision" && (
          <p className="mt-3 text-[10px] text-red-400">
            Illustrative offered load from colliding elephant flows exceeds capacity on two paths while other paths are underused. Carried utilization is capped at line rate; the excess is queued or dropped.
          </p>
        )}
        {scenario !== "ecmp_collision" && (
          <p className="mt-3 text-[10px] text-green-400">
            Illustrative balanced state. Values are simulated teaching examples, not measured results.
          </p>
        )}
      </div>

      {/* Explanation */}
      <div className="space-y-3">
        <div className="rounded-xl bg-slate-800/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">How it works</p>
          <p className="text-sm leading-7 text-slate-300">{exp.what}</p>
        </div>
        <div className="rounded-xl bg-slate-800/50 p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">The mechanism</p>
          <p className="text-sm leading-7 text-slate-300">{exp.problem}</p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: scenario === "ecmp_collision" ? "#7f1d1d33" : "#14532d33",
            border: `1px solid ${scenario === "ecmp_collision" ? "#ef444433" : "#22c55e33"}`,
          }}
        >
          <p className="text-sm leading-7 text-slate-300">{exp.result}</p>
        </div>
      </div>
    </div>
  )
}

export default ECMPViz
