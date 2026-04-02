"use client"

import { useState } from "react"

type LBMode = "slb" | "dlb" | "glb" | "sdlb"

const lbModes: { id: LBMode; label: string; subtitle: string; color: string; border: string }[] = [
  { id: "slb", label: "SLB", subtitle: "Static — ECMP hash", color: "#7f1d1d", border: "#ef4444" },
  { id: "dlb", label: "DLB", subtitle: "Dynamic — local utilisation", color: "#78350f", border: "#f59e0b" },
  { id: "glb", label: "GLB", subtitle: "Global — next-hop aware", color: "#14532d", border: "#22c55e" },
  { id: "sdlb", label: "sDLB", subtitle: "Per-packet spraying + RSHP", color: "#1e3a5f", border: "#60a5fa" },
]

const lbDetails: Record<
  LBMode,
  {
    howItWorks: string
    visibility: string
    entropy: string
    flowletHandling: string
    elephantHandling: string
    requiresRSHP: boolean
    ibEquivalent: string
    commandToCheck: string
    commandOutput: string
    recommendation: string
  }
> = {
  slb: {
    howItWorks:
      "Hashes the 5-tuple (src IP, dst IP, protocol, src port, dst port) to select an output path. Every packet in a flow follows the same path. The assignment never changes.",
    visibility: "None — no runtime state monitored",
    entropy:
      "Depends entirely on 5-tuple variation. RoCEv2 with fixed dst port 4791 has near-zero entropy -> predictable hash collisions.",
    flowletHandling:
      "Cannot detect flowlets. Simultaneous and sequential flowlets both hash to the same path and stay there permanently.",
    elephantHandling:
      "Cannot detect large flows. Elephant flows pile up on the hashed path for their entire duration.",
    requiresRSHP: false,
    ibEquivalent: "Original IB FTREE routing without adaptive mode",
    commandToCheck: "show ecmp load-balance",
    commandOutput: "Load-balance mode: hash\nAdaptive: disabled\nPer-packet: disabled",
    recommendation:
      "Do not use for AI training fabrics. Acceptable only for legacy deployments without DLB support.",
  },
  dlb: {
    howItWorks:
      "Monitors real-time bandwidth utilisation and buffer depth on each equal-cost output port. When a new flow arrives, the switch selects the output port with the lowest current load rather than hashing to a fixed port.",
    visibility: "Local — monitors its own output ports only",
    entropy: "Not entropy-dependent — uses real-time utilisation to override hash decisions.",
    flowletHandling:
      "Handles simultaneous flowlets well: new flows routed to less-loaded links. Sequential flowlets may stay pinned (flow rebalancing depends on timing).",
    elephantHandling:
      "Detects and redistributes new elephant flows. Existing flows may stay on original path until a rebalance interval.",
    requiresRSHP: false,
    ibEquivalent: "Not a direct equivalent — closest to IB SL-based routing",
    commandToCheck: "show ecmp load-balance",
    commandOutput:
      "Load-balance mode: adaptive\nAdaptive: enabled\nLocal utilisation: monitored\nPer-packet: disabled",
    recommendation:
      "Good baseline for AI fabrics. Use when per-packet spraying is not available or when reorder tolerance is a concern.",
  },
  glb: {
    howItWorks:
      "Extends DLB with next-to-next-hop (NNH) awareness. The switch considers not just the utilisation of its own uplinks but also the utilisation of links one hop further downstream. Avoids routing into locally-uncongested but downstream-congested paths.",
    visibility: "Remote — requires inter-switch utilisation state sharing",
    entropy:
      "Not entropy-dependent. Selects best end-to-end path based on combined local + downstream utilisation.",
    flowletHandling:
      "Better than DLB for simultaneous flowlets — accounts for downstream congestion that DLB cannot see. Sequential flowlets still depend on rebalancing intervals.",
    elephantHandling:
      "Best flow-level elephant handling — avoids routing into downstream bottlenecks that DLB would not detect.",
    requiresRSHP: false,
    ibEquivalent: "Closest to IB adaptive routing with full fabric state (UFM DFSSSP)",
    commandToCheck: "show ecmp load-balance",
    commandOutput:
      "Load-balance mode: adaptive\nAdaptive: enabled\nGlobal (NNH) awareness: enabled\nPer-packet: disabled",
    recommendation:
      "Use in large multi-tier fabrics where spine utilisation is heterogeneous. Adds protocol overhead vs DLB.",
  },
  sdlb: {
    howItWorks:
      "Distributes individual packets across all available equal-cost paths. Each packet can take a different path independent of all previous packets from the same flow. Header entropy is irrelevant — path selection is based entirely on current port utilisation.",
    visibility: "Per-packet — makes a fresh decision at line rate for every packet",
    entropy:
      "Entropy-independent. Fixed dst port 4791, identical IPs — irrelevant. Every packet goes to the least-loaded port at that instant.",
    flowletHandling:
      "Solves both flowlet types fundamentally. Simultaneous flowlets: each packet is independently distributed. Sequential flowlets: no flow state to be stuck with — each packet is fresh.",
    elephantHandling:
      "Optimal. Elephant flows are automatically spread across all paths at the packet level. No flow-level concentration.",
    requiresRSHP: true,
    ibEquivalent: "IB per-packet adaptive routing (hardware — always active on QM9700+)",
    commandToCheck: "show ecmp load-balance",
    commandOutput:
      "Load-balance mode: per-packet\nAdaptive: enabled\nPer-packet: enabled\nRSHP: enabled\nReorder tolerance: 200 microseconds",
    recommendation:
      "Target state for all Spectrum-X AI training fabrics with ConnectX-7 NICs. Requires RSHP on the NICs to handle packet reordering.",
  },
}

export function LoadBalancingTaxonomyViz() {
  const [selected, setSelected] = useState<LBMode>("sdlb")
  const detail = lbDetails[selected]
  const mode = lbModes.find((item) => item.id === selected)

  if (!mode) return null

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Load balancing taxonomy — four modes, four trade-offs
      </p>

      <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {lbModes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            className="rounded-xl px-3 py-3 text-left text-xs transition-all"
            style={{
              backgroundColor: selected === item.id ? `${item.color}66` : "#0f172a",
              border: `1px solid ${selected === item.id ? item.border : "#1e293b"}`,
              color: selected === item.id ? "#fff" : "#64748b",
            }}
          >
            <div
              className="text-sm font-bold"
              style={{ color: selected === item.id ? item.border : "#64748b" }}
            >
              {item.label}
            </div>
            <div className="mt-0.5 text-[9px] leading-4 opacity-80">{item.subtitle}</div>
          </button>
        ))}
      </div>

      <div className="space-y-2 text-xs">
        <div className="rounded-xl bg-slate-800/50 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest" style={{ color: mode.border }}>
            How it works
          </div>
          <p className="leading-6 text-slate-300">{detail.howItWorks}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { label: "Visibility", value: detail.visibility },
            { label: "Entropy dependency", value: detail.entropy },
            { label: "Flowlet handling", value: detail.flowletHandling },
            { label: "Elephant flow handling", value: detail.elephantHandling },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded-xl p-3"
              style={{
                backgroundColor: `${mode.color}22`,
                border: `1px solid ${mode.border}22`,
              }}
            >
              <div className="mb-1 text-[10px] uppercase tracking-widest" style={{ color: mode.border }}>
                {row.label}
              </div>
              <p className="leading-5 text-slate-300">{row.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0a0f1a] p-3">
          <div className="mb-1.5 text-[10px] text-slate-500">CLI verification</div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5 text-cyan-300">
            {detail.commandOutput}
          </pre>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-400/20 bg-[#1e3a5f22] p-3">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-blue-400">IB equivalent</div>
            <p className="leading-5 text-slate-300">{detail.ibEquivalent}</p>
          </div>
          <div
            className={`rounded-xl p-3 ${detail.requiresRSHP ? "border border-amber-500/20 bg-amber-500/5" : "border border-white/8 bg-slate-800/30"}`}
          >
            <div
              className={`mb-1 text-[10px] uppercase tracking-widest ${detail.requiresRSHP ? "text-amber-400" : "text-slate-500"}`}
            >
              RSHP required
            </div>
            <p className="leading-5 text-slate-300">
              {detail.requiresRSHP
                ? "Yes — ConnectX-7 or later with reorder buffer"
                : "No — works on any switch"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
          <span className="text-[10px] uppercase tracking-widest text-green-500">Recommendation: </span>
          <span className="text-xs text-slate-300">{detail.recommendation}</span>
        </div>
      </div>
    </div>
  )
}

export default LoadBalancingTaxonomyViz
