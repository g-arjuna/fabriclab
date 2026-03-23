// ManagementPhilosophyViz.tsx
"use client"

import { useState } from "react"

type Fabric = "infiniband" | "ethernet"

export function ManagementPhilosophyViz() {
  const [fabric, setFabric] = useState<Fabric>("infiniband")

  const content = {
    infiniband: {
      title: "InfiniBand: Centralised control",
      color: "#1e3a5f",
      border: "#60a5fa",
      model: "One UFM instance controls the entire fabric",
      steps: [
        { actor: "UFM", action: "Queries every switch and node using InfiniBand MAD (Management Datagrams)" },
        { actor: "UFM", action: "Discovers complete topology — every port, every cable, every GUID" },
        { actor: "UFM", action: "Assigns LIDs (16-bit addresses) to every port in the fabric" },
        { actor: "UFM", action: "Runs routing algorithm (FTREE, SSSP, or MINHOP) to compute optimal paths" },
        { actor: "UFM", action: "Programs forwarding tables on every switch" },
        { actor: "Switch", action: "Forwards packets based on UFM-programmed tables — passively" },
        { actor: "UFM", action: "Monitors for topology changes — re-routes within seconds when a link fails" },
      ],
      implication: "You do not configure InfiniBand switches directly for routing. UFM owns the routing table. The ONYX CLI gives you monitoring and diagnostics — not routing configuration. This is fundamentally different from enterprise networking where every switch independently builds its own table.",
    },
    ethernet: {
      title: "Ethernet: Distributed configuration",
      color: "#065f46",
      border: "#34d399",
      model: "Each switch configured independently",
      steps: [
        { actor: "Engineer", action: "SSH or console to each Spectrum switch individually" },
        { actor: "Engineer", action: "Configure PFC, ECN, DSCP marking on each switch and each port" },
        { actor: "Switch", action: "Builds its own ECMP routing table via BGP or OSPF" },
        { actor: "Switch", action: "Applies QoS policy locally based on configured rules" },
        { actor: "RSHP", action: "(Spectrum-X) Monitors port utilisation and reroutes flows dynamically" },
        { actor: "Engineer", action: "Must ensure all switches have consistent PFC/ECN configuration" },
        { actor: "Monitoring", action: "Aggregate view via Grafana, Prometheus, or NVIDIA Air" },
      ],
      implication: "Each switch owns its own configuration. A PFC misconfiguration on one leaf switch affects only that rail — but that is enough to stall a training job. You must maintain configuration consistency across all switches, typically via Ansible playbooks or a configuration management tool.",
    },
  }

  const c = content[fabric]

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Management philosophy — centralised vs distributed
      </p>

      <div className="flex gap-2 mb-5">
        {(["infiniband", "ethernet"] as Fabric[]).map(f => (
          <button
            key={f}
            onClick={() => setFabric(f)}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all text-left"
            style={{
              backgroundColor: fabric === f ? content[f].color : "#0f172a",
              border: `1px solid ${fabric === f ? content[f].border : "#1e293b"}`,
              color: fabric === f ? "#fff" : "#64748b",
            }}
          >
            <div>{content[f].title}</div>
            <div className="text-xs font-normal opacity-60 mt-1">{content[f].model}</div>
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-4">
        {c.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 text-xs">
            <div className="flex items-center gap-2 flex-shrink-0 w-20">
              <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: c.color, border: `1px solid ${c.border}`, color: c.border }}>
                {i + 1}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: c.border }}>{step.actor}</span>
            </div>
            <p className="text-slate-300 leading-5 pt-0.5">{step.action}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-slate-300 leading-7">
        <span className="font-semibold text-cyan-300">Operational implication: </span>
        {c.implication}
      </div>
    </div>
  )
}

export default ManagementPhilosophyViz
