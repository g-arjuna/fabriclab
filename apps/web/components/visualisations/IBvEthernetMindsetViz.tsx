"use client"
import { useState } from "react"

type Dimension = "routing" | "config" | "failure" | "cli_role" | "recovery"

const dimensions: { id: Dimension; label: string }[] = [
  { id: "routing", label: "How routing works" },
  { id: "config", label: "How you configure it" },
  { id: "failure", label: "How failures appear" },
  { id: "cli_role", label: "What CLI is for" },
  { id: "recovery", label: "How it recovers" },
]

const comparison: Record<Dimension, { ethernet: string; infiniband: string; implication: string }> = {
  routing: {
    ethernet: "Distributed. Each switch runs BGP or OSPF independently. They exchange routes and each builds its own forwarding table.",
    infiniband: "Centralised. The Subnet Manager computes routing for the entire fabric and programs every switch. Switches are passive recipients of SM decisions.",
    implication: "You cannot fix IB routing by changing switch config. You must fix the SM (UFM). The switches will do whatever UFM tells them.",
  },
  config: {
    ethernet: "Direct. SSH to each switch, configure parameters. Changes take effect immediately on that switch.",
    infiniband: "Indirect. Configure parameters in UFM, which programs all switches. You almost never configure IB routing directly on ONYX.",
    implication: "ONYX CLI is primarily read-only for operations. 'configure terminal' on ONYX is for switch-local settings, not fabric routing.",
  },
  failure: {
    ethernet: "Isolated. A failed link affects routes that cross it. Other switches may not notice immediately. Convergence takes seconds to minutes via BGP/OSPF.",
    infiniband: "Fabric-wide. The SM detects topology changes within its sweep interval (seconds), then reprograms ALL switches in one consistent update. No partial states.",
    implication: "IB failures are all-or-nothing from a routing perspective. Either the SM has a complete view and programs correctly, or it doesn't.",
  },
  cli_role: {
    ethernet: "Configuration AND monitoring. You build the network by configuring each switch CLI. CLI is the primary operational interface.",
    infiniband: "Monitoring and diagnostics primarily. UFM owns routing. ONYX CLI tells you what the SM programmed and what the counters show.",
    implication: "If you are configuring IB routing on ONYX directly, you are probably doing something wrong. Use UFM.",
  },
  recovery: {
    ethernet: "Each switch reconverges independently via its routing protocol. Can take 30 seconds to 5 minutes. Different switches may have inconsistent views during convergence.",
    infiniband: "SM detects change, computes new optimal routes, programs ALL switches in one atomic update. Recovery is fast and always globally consistent.",
    implication: "IB recovery is more reliable but has a brief disruption window during the SM sweep. Training jobs may see a NCCL timeout during this window.",
  },
}

export function IBvEthernetMindsetViz() {
  const [dim, setDim] = useState<Dimension>("routing")
  const c = comparison[dim]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        InfiniBand vs Ethernet — the architectural difference
      </p>
      <div className="flex flex-wrap gap-2 mb-5">
        {dimensions.map(d => (
          <button key={d.id} onClick={() => setDim(d.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              backgroundColor: dim === d.id ? "#1e3a5f" : "#0f172a",
              border: `1px solid ${dim === d.id ? "#60a5fa" : "#1e293b"}`,
              color: dim === d.id ? "#bfdbfe" : "#64748b",
            }}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div className="rounded-xl p-4 bg-slate-800/50 border border-white/8">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Ethernet</div>
          <p className="text-sm leading-7 text-slate-300">{c.ethernet}</p>
        </div>
        <div className="rounded-xl p-4 bg-[#1e3a5f33] border border-blue-500/30">
          <div className="text-[10px] uppercase tracking-widest text-blue-400 mb-2">InfiniBand</div>
          <p className="text-sm leading-7 text-slate-300">{c.infiniband}</p>
        </div>
      </div>
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-cyan-200">
        <span className="font-semibold">Operational implication: </span>{c.implication}
      </div>
    </div>
  )
}
export default IBvEthernetMindsetViz
