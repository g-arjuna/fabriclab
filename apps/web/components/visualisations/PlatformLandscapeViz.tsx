"use client"

import { useState } from "react"

type Tier = "mandatory-ib" | "mandatory-roce" | "standard" | "optional"

interface Platform {
  name: string
  tier: Tier
  vendor: string
  role: string
  runsOn: string
  whyNeeded: string
  alternative?: string
}

const platforms: Platform[] = [
  { name: "DGX OS", tier: "mandatory-ib", vendor: "NVIDIA", role: "Compute node OS", runsOn: "DGX host", whyNeeded: "Ships with pre-configured NVIDIA drivers, CUDA, NCCL, and fabric manager daemon. Using vanilla Ubuntu works but requires manual driver and NCCL setup, and you lose NVSM integration.", alternative: "Vanilla Ubuntu 22.04 + manual NVIDIA driver install" },
  { name: "NVIDIA ONYX", tier: "mandatory-ib", vendor: "NVIDIA", role: "InfiniBand switch OS", runsOn: "Quantum switches", whyNeeded: "The only OS for Quantum-series switches. No alternative exists — it is embedded.", alternative: "None. ONYX is the only OS for Quantum switches." },
  { name: "Fabric Manager", tier: "mandatory-ib", vendor: "NVIDIA", role: "NVLink + IB initialisation", runsOn: "DGX host daemon", whyNeeded: "Required for NVSwitch fabric initialisation and ConnectX-7 registration with UFM. Training jobs will not start without it.", alternative: "None for DGX-based clusters." },
  { name: "MLNX-OFED", tier: "mandatory-ib", vendor: "NVIDIA/Mellanox", role: "RDMA driver stack", runsOn: "DGX host", whyNeeded: "Provides the kernel drivers and userspace libraries for ConnectX-7 RDMA. Without it, the NICs work as plain Ethernet only — no RDMA, no GPUDirect.", alternative: "Inbox rdma-core (less performant, missing some features)" },
  { name: "Cumulus Linux / SONiC", tier: "mandatory-roce", vendor: "NVIDIA / Open source", role: "Ethernet switch OS", runsOn: "Spectrum switches", whyNeeded: "Required for Spectrum-X deployments. RoCEv2 PFC and ECN configuration lives here.", alternative: "Cumulus and SONiC are both valid. SONiC is open-source and cloud-provider preferred." },
  { name: "UFM", tier: "standard", vendor: "NVIDIA", role: "InfiniBand fabric manager", runsOn: "Dedicated management server", whyNeeded: "Centrally manages routing, LID assignment, and monitoring for the entire IB fabric. Technically replaceable by OpenSM but UFM provides GUI, alerts, and analytics that OpenSM lacks.", alternative: "OpenSM (open source) — works but no GUI, no analytics, harder to operate at scale." },
  { name: "Base Command Manager", tier: "standard", vendor: "NVIDIA", role: "Cluster provisioning + job management", runsOn: "Head node", whyNeeded: "Handles DGX OS provisioning via PXE, integrates with Slurm for job scheduling, provides cluster health dashboard.", alternative: "Manual provisioning + Slurm directly. More work but fully functional." },
  { name: "DCGM", tier: "standard", vendor: "NVIDIA", role: "GPU health monitoring", runsOn: "Each DGX node (agent) + monitoring server (host)", whyNeeded: "Provides per-GPU metrics: temperature, utilisation, memory bandwidth, ECC errors. Required for meaningful training cluster monitoring.", alternative: "prometheus-dcgm-exporter (open source, exports DCGM metrics to Prometheus)" },
  { name: "Slurm", tier: "optional", vendor: "SchedMD (open source)", role: "Job scheduler", runsOn: "Head node + DGX nodes", whyNeeded: "Queue-based GPU job scheduling. Standard in HPC environments. BCM integrates with Slurm.", alternative: "Kubernetes + GPU operator (preferred for containerised workloads)" },
]

const tiers: { id: Tier; label: string; color: string; border: string; description: string }[] = [
  { id: "mandatory-ib", label: "Mandatory (InfiniBand)", color: "#1e3a5f", border: "#60a5fa", description: "Required for any DGX InfiniBand deployment. Cannot operate without these." },
  { id: "mandatory-roce", label: "Mandatory (RoCEv2/Ethernet)", color: "#065f46", border: "#34d399", description: "Required for Spectrum-X Ethernet deployments. Different path from InfiniBand." },
  { id: "standard", label: "Standard (strongly recommended)", color: "#4c1d95", border: "#a78bfa", description: "Technically optional but practically necessary at any meaningful scale." },
  { id: "optional", label: "Optional / Alternatives exist", color: "#1e293b", border: "#64748b", description: "Common choices but real alternatives exist depending on your environment." },
]

export function PlatformLandscapeViz() {
  const [selected, setSelected] = useState<Platform | null>(null)
  const [filterTier, setFilterTier] = useState<Tier | "all">("all")

  const visible = filterTier === "all"
    ? platforms
    : platforms.filter(p => p.tier === filterTier)

  const tier = (id: Tier) => tiers.find(t => t.id === id)!

  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="mb-4 text-xs uppercase tracking-widest text-slate-500">
        Platform landscape — what you actually need
      </p>

      {/* Tier filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFilterTier("all")}
          className="rounded-lg px-3 py-1.5 text-xs transition-all"
          style={{
            backgroundColor: filterTier === "all" ? "#1e293b" : "#0f172a",
            border: `1px solid ${filterTier === "all" ? "#475569" : "#1e293b"}`,
            color: filterTier === "all" ? "#e2e8f0" : "#475569",
          }}
        >
          All platforms
        </button>
        {tiers.map(t => (
          <button
            key={t.id}
            onClick={() => setFilterTier(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs transition-all"
            style={{
              backgroundColor: filterTier === t.id ? t.color : "#0f172a",
              border: `1px solid ${filterTier === t.id ? t.border : "#1e293b"}`,
              color: filterTier === t.id ? "#fff" : "#475569",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Platform list */}
      <div className="space-y-2">
        {visible.map(p => {
          const t = tier(p.tier)
          const isSelected = selected?.name === p.name
          return (
            <button
              key={p.name}
              onClick={() => setSelected(isSelected ? null : p)}
              className="w-full text-left rounded-xl px-4 py-3 transition-all"
              style={{
                backgroundColor: isSelected ? t.color + "44" : "#0f172a",
                border: `1px solid ${isSelected ? t.border : t.border + "33"}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: t.border }} />
                  <div>
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <span className="ml-2 text-xs text-slate-500">{p.vendor}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[9px] text-slate-600">{p.runsOn}</span>
                  <span className="text-slate-600">{isSelected ? "▲" : "▼"}</span>
                </div>
              </div>
              <div className="ml-5 mt-1 text-xs text-slate-500">{p.role}</div>

              {isSelected && (
                <div className="ml-5 mt-3 space-y-2 text-xs">
                  <div className="rounded-lg bg-black/20 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Why needed</div>
                    <p className="text-slate-300 leading-5">{p.whyNeeded}</p>
                  </div>
                  {p.alternative && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Alternative</div>
                      <p className="text-slate-400 leading-5">{p.alternative}</p>
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default PlatformLandscapeViz
