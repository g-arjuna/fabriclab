"use client"

import { useState } from "react"

type Scenario = "ecmp_collision" | "adaptive_routing" | "spectrum_x"

const scenarios: { id: Scenario; label: string; subtitle: string }[] = [
  { id: "ecmp_collision",    label: "ECMP (traditional Ethernet)", subtitle: "The original problem" },
  { id: "adaptive_routing",  label: "InfiniBand adaptive routing", subtitle: "Per-packet load balancing" },
  { id: "spectrum_x",        label: "Spectrum-X RSHP",             subtitle: "Ethernet catching up" },
]

const explanations: Record<Scenario, {
  what: string
  problem: string
  result: string
  linkUtilisation: number[]
}> = {
  ecmp_collision: {
    what: "ECMP (Equal-Cost Multi-Path) routes entire flows — all packets in a TCP or RDMA flow — down the same path, chosen by hashing the 5-tuple (src IP, dst IP, src port, dst port, protocol). Once a flow is assigned to a path, it stays on that path for the entire duration.",
    problem: "When two massive 400G AllReduce flows hash to the same spine link, that link is instantly saturated at 800G while trying to handle 400G capacity. Meanwhile other spine links sit completely idle. The cluster has plenty of total bandwidth — it is just distributed wrong. You cannot rebalance without dropping and re-establishing flows, which causes retransmissions.",
    result: "Result: hot spots, packet drops, retransmissions, stalled AllReduce operations. This was one of the primary reasons vanilla Ethernet was inadequate for large-scale AI training before Spectrum-X.",
    linkUtilisation: [100, 100, 10, 5, 8, 3],
  },
  adaptive_routing: {
    what: "InfiniBand adaptive routing makes path decisions per-packet, not per-flow. The switch measures congestion on each output port in real time — monitoring credit counts and queue depths — and forwards each packet on whichever path is least loaded at that instant.",
    problem: "No persistent hot spots. No flow collisions. If two large gradient tensors are both in flight simultaneously, their packets interleave across all available paths. Each path carries its fair share of load. The fabric self-balances continuously without any control-plane intervention.",
    result: "Result: near-perfect link utilisation across all paths. AllReduce operations complete at close to line rate regardless of how many simultaneous flows are active. This is one of the core reasons InfiniBand is preferred for large-scale training clusters.",
    linkUtilisation: [87, 91, 84, 89, 86, 93],
  },
  spectrum_x: {
    what: "NVIDIA Spectrum-X uses RSHP (Resilient Hashing and Per-packet reordering) to bring per-packet adaptive routing to Ethernet. When a flow is detected as large (an 'elephant flow'), the switch can dynamically reroute it mid-flight across multiple paths, with packet reordering handled at the receiver by the ConnectX-7 NIC.",
    problem: "Pure per-packet routing on standard Ethernet causes packet reordering, which RDMA historically could not tolerate. Spectrum-X solves this by adding reorder buffering in the NIC — packets arrive out of order but are held and resequenced before being delivered to the application. This makes per-packet routing safe for RDMA over Ethernet.",
    result: "Result: Spectrum-X brings InfiniBand-style adaptive routing to Ethernet. This is why NVIDIA could credibly claim RoCEv2 over Spectrum-X approaches InfiniBand performance — the load balancing gap was closed. Traditional Ethernet switches (without RSHP) still have the ECMP problem.",
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
          Spine link utilisation during simultaneous AllReduce operations
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
            Two flows hashed to the same path → 200% load on 2 links, near-zero on others.
            Total available bandwidth unused: ~60%.
          </p>
        )}
        {scenario !== "ecmp_collision" && (
          <p className="mt-3 text-[10px] text-green-400">
            Load balanced across all paths. All links operating at similar utilisation.
            Total available bandwidth utilised: ~88%.
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
